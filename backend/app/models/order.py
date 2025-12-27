from sqlalchemy import Column, Integer, String, Boolean, Date, Time, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum

from app.models.base import Base


class OrderStatus(str, enum.Enum):
    SCHEDULED = "scheduled"      # Waiting for pickup
    IN_PROGRESS = "in_progress"  # Courier took the task
    COMPLETED = "completed"      # Courier finished
    CANCELLED = "cancelled"      # Cancelled by user
    PENDING_UNDO = "pending_undo"  # Courier marked complete, can be undone


class TimeSlot(str, enum.Enum):
    MORNING = "08:00-10:00"
    DAY = "12:00-14:00"
    EVENING = "16:00-18:00"
    NIGHT = "20:00-22:00"


class Tariff(str, enum.Enum):
    SINGLE = "single"         # One-time pickup
    TRIAL = "trial"           # Trial subscription
    MONTHLY = "monthly"       # Monthly subscription


class TariffPrice(Base):
    """Store tariff prices that admins can edit"""
    __tablename__ = "tariff_prices"

    id = Column(Integer, primary_key=True, index=True)
    tariff_id = Column(String(50), unique=True, nullable=False)  # 'single', 'trial', 'monthly'
    name = Column(String(100), nullable=False)
    price = Column(Integer, nullable=False)  # Price in rubles
    old_price = Column(Integer, nullable=True)  # For strikethrough display
    period = Column(String(50), nullable=True)  # '2 недели', etc
    description = Column(String(500), nullable=False)
    is_active = Column(Boolean, default=True)
    is_urgent = Column(Boolean, default=False)  # For "Срочный вынос" badge


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    address_id = Column(Integer, ForeignKey("addresses.id"), nullable=False)
    courier_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Scheduling
    date = Column(Date, nullable=False)
    time_slot = Column(SQLEnum(TimeSlot), nullable=False)
    
    # Status
    status = Column(SQLEnum(OrderStatus), default=OrderStatus.SCHEDULED)
    
    # Actual pickup info (filled by courier)
    bags_count = Column(Integer, default=1)
    photo_url = Column(String(500), nullable=True)
    
    # Source
    is_subscription = Column(Boolean, default=False)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=True)
    
    # User preference (Leave at door vs Hand over)
    comment = Column(String(200), nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="orders", foreign_keys=[user_id])
    address = relationship("Address", back_populates="orders")
    courier = relationship("User", foreign_keys=[courier_id])
    subscription = relationship("Subscription", back_populates="orders")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    address_id = Column(Integer, ForeignKey("addresses.id"), nullable=False)
    tariff = Column(SQLEnum(Tariff), nullable=False)
    
    # Credits
    total_credits = Column(Integer, nullable=False)  # Total pickups in package
    used_credits = Column(Integer, default=0)
    
    # Schedule (for auto-generation)
    # Days of week: 1=Mon, 3=Wed, 5=Fri etc.
    schedule_days = Column(String(20))  # e.g., "1,3,5" for Mon, Wed, Fri
    default_time_slot = Column(SQLEnum(TimeSlot))
    
    # Subscription period
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    frequency = Column(String(20), nullable=True)  # 'daily', 'every_other_day', 'twice_week'
    
    is_active = Column(Boolean, default=True)
    
    # Last date when orders were generated (to avoid duplicates)
    last_generated_date = Column(Date, nullable=True)
    
    # Relationships
    orders = relationship("Order", back_populates="subscription")
    user = relationship("User")
    address = relationship("Address")


class TrialUsage(Base):
    """Track trial usage per apartment to prevent abuse"""
    __tablename__ = "trial_usages"

    id = Column(Integer, primary_key=True, index=True)
    complex_id = Column(Integer, ForeignKey("residential_complexes.id"), nullable=False)
    building = Column(String(20), nullable=False)
    apartment = Column(String(10), nullable=False)
    
    # This table ensures one trial per apartment
    # Unique constraint: (complex_id, building, apartment)
