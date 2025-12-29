from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from yookassa import Configuration, Payment as YookassaPayment
from yookassa.domain.notification import WebhookNotification
import json
import uuid
from datetime import date, datetime, timedelta

from app.config import settings
from app.models import get_db, User, Order, OrderStatus, TimeSlot, Address, Balance, BalanceTransaction, Subscription, Tariff, Payment, ResidentialComplex, UserRole, TariffPrice
from app.api.deps import get_current_user
from app.api.orders import CreateOrderRequest, TariffDetails
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
    # 0. Load tariff prices from DB
    tariff_res = await db.execute(select(TariffPrice).where(TariffPrice.is_active == True))
    tariffs_list = tariff_res.scalars().all()
    
    # Parse into dict
    tariff_prices = {}
    for t in tariffs_list:
        tariff_prices[t.tariff_id] = {
            'price': t.price,
            'old_price': t.old_price,
            'name': t.name
        }
    
    # 1. Calculate price
    amount = 0
    description = ""
    
    # Calculate price based on tariff type
    if request.tariff_type == 'single':
        single_price = tariff_prices.get('single', {}).get('price', 150)
        urgent_price = tariff_prices.get('single', {}).get('old_price', 450) or single_price * 3
        amount = urgent_price if request.is_urgent else single_price
        description = tariff_prices.get('single', {}).get('name', "Разовый вынос мусора")
    elif request.tariff_type == 'trial':
        amount = tariff_prices.get('trial', {}).get('price', 199)
        description = tariff_prices.get('trial', {}).get('name', "Подписка 'Пробный старт'") + " (7 выносов)"
    elif request.tariff_type == 'monthly':
        # Dynamic price calculation based on bags/frequency/duration
        if request.tariff_details:
            # Get base price from DB (approximate from monthly price)
            monthly_tariff_price = tariff_prices.get('monthly', {}).get('price', 945)
            base_price = int(monthly_tariff_price / 7)  # Approximate base per pickup
            
            frequencyMultiplier = {
                'daily': 1,
                'every_other_day': 0.5,
                'twice_week': 2/7
            }
            daysInPeriod = request.tariff_details.duration
            pickupsCount = int(daysInPeriod * frequencyMultiplier.get(request.tariff_details.frequency, 0.5))
            totalPrice = base_price * pickupsCount * request.tariff_details.bags_count
            
            # Apply discount based on duration
            if daysInPeriod >= 60:
                discount = 0.3
            elif daysInPeriod >= 30:
                discount = 0.2
            elif daysInPeriod >= 14:
                discount = 0.1
            else:
                discount = 0
            
            amount = int(totalPrice * (1 - discount))
            description = f"{tariff_prices.get('monthly', {}).get('name', 'Подписка Месяц Комфорт')} ({pickupsCount} выносов)"
        else:
            amount = tariff_prices.get('monthly', {}).get('price', 945)
            description = tariff_prices.get('monthly', {}).get('name', "Подписка 'Месяц Комфорт'")
    
    if amount == 0:
        raise HTTPException(status_code=400, detail="Invalid tariff type or price")

    # 2. Create payment in Yookassa
    idempotence_key = str(uuid.uuid4())
    
    # Prepare receipt (required by 54-FZ for Russia)
    # YooKassa requires either phone or email in receipt
    customer = {}
    if current_user.phone:
        customer["phone"] = str(current_user.phone)
        print(f"[PAYMENT] Using phone: {current_user.phone}")
    else:
        # Use email as fallback since telegram_id is too long for phone
        customer["email"] = f"user_{current_user.telegram_id}@ya-uberu.ru"
        print(f"[PAYMENT] Using email fallback: {customer['email']}")
    
    print(f"[PAYMENT] Customer dict: {customer}")
    
    receipt = {
        "customer": customer,
        "items": [
            {
                "description": description,
                "quantity": "1.00",
                "amount": {
                    "value": str(amount),
                    "currency": "RUB"
                },
                "vat_code": 1,
                "payment_subject": "service",
                "payment_mode": "full_payment"
            }
        ]
    }
    
    print(f"[PAYMENT] Full receipt: {receipt}")
    
    payment_data = {
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
    }
    
    print(f"[PAYMENT] Creating payment with data: {payment_data}")
    
    payment = YookassaPayment.create(payment_data, idempotence_key)

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
                credits_to_add = 7 # 7 pickups for trial (14 days every other day)
                cost_to_deduct = 1  # First order is created immediately
            elif request_obj.tariff_type == 'monthly':
                 # Calculate credits based on tariff details
                 if request_obj.tariff_details:
                     frequencyMultiplier = {
                         'daily': 1,
                         'every_other_day': 0.5,
                         'twice_week': 2/7
                     }
                     daysInPeriod = request_obj.tariff_details.duration
                     pickupsCount = int(daysInPeriod * frequencyMultiplier.get(request_obj.tariff_details.frequency, 0.5))
                     credits_to_add = pickupsCount
                 else:
                     credits_to_add = 15  # Fallback
                 cost_to_deduct = 1  # First order is created immediately
            
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
                 # Get tariff details
                 duration_days = 14  # Default for trial
                 frequency = 'every_other_day'  # Default
                 bags_count = 1  # Default
                 
                 if request_obj.tariff_type == 'monthly' and request_obj.tariff_details:
                     duration_days = request_obj.tariff_details.duration
                     frequency = request_obj.tariff_details.frequency
                     bags_count = request_obj.tariff_details.bags_count
                 
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
                    frequency=frequency,
                    bags_count=bags_count
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
                time_slot_str = request_obj.time_slot.value if hasattr(request_obj.time_slot, 'value') else str(request_obj.time_slot)
                # Format date if it's a date object, otherwise it might be a string depending on how pydantic parsed it
                date_val = request_obj.date
                date_str = date_val.strftime('%d.%m.%Y') if hasattr(date_val, 'strftime') else str(date_val)
                
                # Notify Admins
                await notify_admins_new_order(
                    admin_telegram_ids=settings.admin_ids,
                    order_id=order.id,
                    address=address_str,
                    date_str=date_str,
                    time_slot=time_slot_str,
                    client_name=user.name or "Клиент"
                )
                
                # Notify Client
                if user.telegram_id:
                     await notify_client_order_created(user.telegram_id, order.id, address_str, date_str, time_slot_str)

                # Notify Couriers
                couriers_res = await db.execute(select(User).where(User.role == UserRole.COURIER, User.is_active == True))
                couriers = couriers_res.scalars().all()
                courier_ids = [c.telegram_id for c in couriers if c.telegram_id]
                await notify_all_couriers_new_order(courier_ids, order.id, address_str, date_str, time_slot_str, request_obj.comment, tariff_type=request_obj.tariff_type, order_date=date_val)

            except Exception as e:
                print(f"[WEBHOOK NOTIFY ERROR] {e}")

            print(f"[WEBHOOK] Successfully processed payment {yookassa_id} and created order {order.id}")
            
    except Exception as e:
        print(f"[WEBHOOK ERROR] {e}")
        return {"status": "error", "message": str(e)}

    return {"status": "ok"}

