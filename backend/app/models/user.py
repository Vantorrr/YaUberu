from sqlalchemy import Column, Integer, String, Boolean, BigInteger, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum

from app.models.base import Base


class UserRole(str, enum.Enum):
    CLIENT = "client"
    COURIER = "courier"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    telegram_id = Column(BigInteger, unique=True, index=True, nullable=False)
    phone = Column(String(20), unique=True, index=True)
    name = Column(String(100))
    role = Column(SQLEnum(UserRole), default=UserRole.CLIENT)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    addresses = relationship("Address", back_populates="user")
    orders = relationship("Order", back_populates="user", foreign_keys="Order.user_id")
    balance = relationship("Balance", back_populates="user", uselist=False)


class Address(Base):
    __tablename__ = "addresses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Address fields
    complex_id = Column(Integer, ForeignKey("residential_complexes.id", ondelete="SET NULL"), nullable=True)
    street = Column(String(200), nullable=True)  # Улица
    building = Column(String(20), nullable=False)  # Номер дома
    entrance = Column(String(10))
    floor = Column(String(10))
    apartment = Column(String(10), nullable=False)
    intercom = Column(String(50))
    
    is_default = Column(Boolean, default=False)
    
    # Unique key for anti-fraud (complex + building + apartment)
    # This will be enforced at application level
    
    # Relationships
    user = relationship("User", back_populates="addresses")
    complex = relationship("ResidentialComplex")
    orders = relationship("Order", back_populates="address")


class ResidentialComplex(Base):
    __tablename__ = "residential_complexes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    short_name = Column(String(20))  # For courier display
    is_active = Column(Boolean, default=True)
    
    buildings = relationship("ComplexBuilding", back_populates="complex", cascade="all, delete-orphan")


class ComplexBuilding(Base):
    __tablename__ = "complex_buildings"

    id = Column(Integer, primary_key=True, index=True)
    complex_id = Column(Integer, ForeignKey("residential_complexes.id"), nullable=False)
    building_number = Column(String(50), nullable=False)
    
    complex = relationship("ResidentialComplex", back_populates="buildings")


class Balance(Base):
    __tablename__ = "balances"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    credits = Column(Integer, default=0)  # Subscription pickups (trial/monthly)
    single_credits = Column(Integer, default=0)  # Single pickups (можно перенести на любую дату)
    
    # Relationships
    user = relationship("User", back_populates="balance")
    transactions = relationship("BalanceTransaction", back_populates="balance")


class BalanceTransaction(Base):
    __tablename__ = "balance_transactions"

    id = Column(Integer, primary_key=True, index=True)
    balance_id = Column(Integer, ForeignKey("balances.id"), nullable=False)
    amount = Column(Integer, nullable=False)  # Positive = credit, Negative = debit
    description = Column(String(200))
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    
    # Relationships
    balance = relationship("Balance", back_populates="transactions")

