from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from yookassa import Configuration, Payment as YookassaPayment
from yookassa.domain.notification import WebhookNotification
import json
import uuid
from datetime import date, datetime, timedelta

from app.config import settings
from app.models import get_db, User, Order, OrderStatus, TimeSlot, Address, Balance, BalanceTransaction, Subscription, Tariff, Payment, ResidentialComplex, UserRole
from app.api.deps import get_current_user
from app.api.orders import CreateOrderRequest
from app.services.notifications import notify_all_couriers_new_order, notify_admins_new_order, notify_client_order_created

router = APIRouter()

# Initialize Yookassa
Configuration.account_id = settings.YOOKASSA_SHOP_ID
Configuration.secret_key = settings.YOOKASSA_SECRET_KEY

@router.post("/create")
async def create_payment(
    request: CreateOrderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a payment in Yookassa and save pending payment in DB
    """
    # 1. Calculate price
    amount = 0
    description = ""
    
    # Simple logic for now, should fetch from TariffPrice table in production
    if request.tariff_type == 'single':
        amount = 390 if request.is_urgent else 199 # Example prices
        description = "Разовый вынос мусора"
    elif request.tariff_type == 'trial':
        amount = 199 # Trial price
        description = "Подписка 'Пробный старт' (7 выносов)"
    elif request.tariff_type == 'monthly':
        # TODO: Dynamic price calculation based on bags/frequency/duration
        # For MVP taking a fixed price or calculate based on some logic passed in request?
        # Ideally frontend passes the calculated price or we verify it here.
        # Let's assume frontend sends the parameters correctly and we calculate standard price.
        # For MVP hardcode or simple calculation:
        amount = 1890 # Example monthly price
        description = "Подписка 'Месяц Комфорт'"
    
    if amount == 0:
        raise HTTPException(status_code=400, detail="Invalid tariff type or price")

    # 2. Create payment in Yookassa
    idempotence_key = str(uuid.uuid4())
    
    # Prepare receipt (required by 54-FZ for Russia)
    receipt = {
        "customer": {
            "phone": str(current_user.phone_number) if current_user.phone_number else f"+7{current_user.telegram_id}"
        },
        "items": [
            {
                "description": description,
                "quantity": "1.00",
                "amount": {
                    "value": str(amount),
                    "currency": "RUB"
                },
                "vat_code": 1  # НДС 20%
            }
        ]
    }
    
    payment = YookassaPayment.create({
        "amount": {
            "value": str(amount),
            "currency": "RUB"
        },
        "confirmation": {
            "type": "redirect",
            "return_url": f"{settings.FRONTEND_URL}/app/order/success"
        },
        "capture": True,
        "description": description,
        "receipt": receipt,
        "metadata": {
            "user_id": current_user.id,
            "tariff_type": request.tariff_type
        }
    }, idempotence_key)

    # 3. Save pending payment to DB
    db_payment = Payment(
        user_id=current_user.id,
        yookassa_payment_id=payment.id,
        amount=amount,
        status="pending",
        description=description,
        tariff_type=request.tariff_type,
        order_data=request.model_dump_json() # Save order details to restore later
    )
    db.add(db_payment)
    await db.commit()

    return {"confirmation_url": payment.confirmation.confirmation_url}


@router.post("/webhook")
async def yookassa_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Handle webhooks from Yookassa
    """
    try:
        body = await request.json()
        notification_object = WebhookNotification(body)
        payment_data = notification_object.object
        
        yookassa_id = payment_data.id
        status = payment_data.status
        
        print(f"[WEBHOOK] Received webhook for payment {yookassa_id}, status: {status}")

        if status == "succeeded":
            # 1. Find payment in DB
            result = await db.execute(select(Payment).where(Payment.yookassa_payment_id == yookassa_id))
            payment = result.scalar_one_or_none()
            
            if not payment:
                print(f"[WEBHOOK] Payment {yookassa_id} not found in DB")
                return {"status": "error", "message": "Payment not found"}
            
            if payment.status == "succeeded":
                 print(f"[WEBHOOK] Payment {yookassa_id} already processed")
                 return {"status": "ok"} # Already processed

            # 2. Update payment status
            payment.status = "succeeded"
            
            # 3. Process the Order/Subscription logic
            user_result = await db.execute(select(User).where(User.id == payment.user_id))
            user = user_result.scalar_one()
            
            # Parse order data
            try:
                order_data = json.loads(payment.order_data)
                request_obj = CreateOrderRequest(**order_data) # Reconstruct request
            except Exception as e:
                print(f"[WEBHOOK] Failed to parse order data: {e}")
                return {"status": "error", "message": "Invalid order data"}

            # --- LOGIC COPIED/ADAPTED FROM ORDERS.PY ---
            
            # A. Update Balance (Add credits purchased)
            balance_result = await db.execute(select(Balance).where(Balance.user_id == user.id))
            balance = balance_result.scalar_one_or_none()
            if not balance:
                balance = Balance(user_id=user.id, credits=0)
                db.add(balance)
            
            # Credits logic
            credits_to_add = 0
            cost_to_deduct = 0
            
            if request_obj.tariff_type == 'single':
                credits_to_add = 1
                cost_to_deduct = 1
            elif request_obj.tariff_type == 'trial':
                credits_to_add = 7 # 7 pickups for trial
                cost_to_deduct = 0 # Subscription logic handles deduction? Usually trial includes first pickup? Let's assume we just create subscription and scheduler/user creates orders. 
                # BUT user selected a date/time in the form! So we should create the FIRST order immediately.
                cost_to_deduct = 1 
            elif request_obj.tariff_type == 'monthly':
                 credits_to_add = 15 # Example
                 cost_to_deduct = 1
            
            # Add credits transaction
            balance.credits += credits_to_add
            t1 = BalanceTransaction(
                balance_id=balance.id,
                amount=credits_to_add,
                description=f"Пополнение: {payment.description}"
            )
            db.add(t1)
            
            # B. Create Order (if needed - usually yes because user selected time)
            # Find address
            address_result = await db.execute(select(Address).where(Address.id == request_obj.address_id))
            address = address_result.scalar_one_or_none()
            
            # Create Order object
            order = Order(
                user_id=user.id,
                address_id=request_obj.address_id,
                date=request_obj.date,
                time_slot=request_obj.time_slot,
                status=OrderStatus.SCHEDULED,
                comment=request_obj.comment
            )
            db.add(order)
            await db.flush() # get ID
            
            # Deduct credit for this specific order
            balance.credits -= cost_to_deduct
            t2 = BalanceTransaction(
                balance_id=balance.id,
                amount=-cost_to_deduct,
                description=f"Заказ #{order.id} (Оплачен)",
                order_id=order.id
            )
            db.add(t2)
            
            # C. Create Subscription (if trial/monthly)
            if request_obj.tariff_type in ['trial', 'monthly']:
                 # Simplified subscription creation (similar to orders.py but using data from request/payment)
                 # Determine duration/frequency from request or defaults
                 duration_days = 14 if request_obj.tariff_type == 'trial' else 30
                 
                 sub = Subscription(
                    user_id=user.id,
                    address_id=request_obj.address_id,
                    tariff=Tariff.TRIAL if request_obj.tariff_type == 'trial' else Tariff.MONTHLY,
                    total_credits=credits_to_add,
                    used_credits=1, # We just used 1 for the first order
                    schedule_days="1,3,5", # Default
                    default_time_slot=request_obj.time_slot,
                    is_active=True,
                    start_date=date.today(),
                    end_date=date.today() + timedelta(days=duration_days),
                    frequency='every_other_day',
                    bags_count=1 # Default
                 )
                 db.add(sub)
                 await db.flush()
                 order.subscription_id = sub.id
                 order.is_subscription = True

            await db.commit()
            
            # --- NOTIFICATIONS ---
            # (Simplified version of notify logic)
            try:
                 # Helper to get address string
                address_parts = []
                if hasattr(address, 'street') and address.street: address_parts.append(address.street)
                if address.complex_id:
                     c_res = await db.execute(select(ResidentialComplex).where(ResidentialComplex.id == address.complex_id))
                     c_obj = c_res.scalar_one_or_none()
                     if c_obj: address_parts.append(c_obj.name)
                address_parts.append(f"д. {address.building}, кв. {address.apartment}")
                address_str = ", ".join(address_parts)
                time_slot_str = request_obj.time_slot
                
                # Notify Admins
                await notify_admins_new_order(
                    admin_telegram_ids=settings.admin_ids,
                    order_id=order.id,
                    address=address_str,
                    time_slot=time_slot_str,
                    client_name=user.name or "Клиент"
                )
                
                # Notify Client
                if user.telegram_id:
                     await notify_client_order_created(user.telegram_id, order.id, address_str, time_slot_str)

                # Notify Couriers
                couriers_res = await db.execute(select(User).where(User.role == UserRole.COURIER, User.is_active == True))
                couriers = couriers_res.scalars().all()
                courier_ids = [c.telegram_id for c in couriers if c.telegram_id]
                await notify_all_couriers_new_order(courier_ids, order.id, address_str, time_slot_str, request_obj.comment)

            except Exception as e:
                print(f"[WEBHOOK NOTIFY ERROR] {e}")

            print(f"[WEBHOOK] Successfully processed payment {yookassa_id} and created order {order.id}")
            
    except Exception as e:
        print(f"[WEBHOOK ERROR] {e}")
        return {"status": "error", "message": str(e)}

    return {"status": "ok"}

