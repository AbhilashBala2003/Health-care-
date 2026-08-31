from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False)  # "facility", "professional", "admin"

    # Relationships
    facility = relationship("Facility", back_populates="user", uselist=False)
    professional = relationship("Professional", back_populates="user", uselist=False)

class Facility(Base):
    __tablename__ = "facilities"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    name = Column(String, nullable=False)
    region = Column(String, nullable=False)  # Dublin, HSE East, etc.
    address = Column(String, nullable=False)
    budget_cap = Column(Float, default=10000.0)

    # Relationships
    user = relationship("User", back_populates="facility")
    shifts = relationship("Shift", back_populates="facility")
    invoices = relationship("Invoice", back_populates="facility")

class Professional(Base):
    __tablename__ = "professionals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    name = Column(String, nullable=False)
    specialty = Column(String, nullable=False)  # "Nurse", "HCA", "Midwife", "Pharmacist"
    compliance_status = Column(String, default="pending")  # "pending", "vetted", "restricted"
    hourly_rate = Column(Float, nullable=False)
    lat = Column(Float, nullable=True)  # Dublin location coordinates
    lng = Column(Float, nullable=True)
    image_url = Column(String, nullable=True)

    # Relationships
    user = relationship("User", back_populates="professional")
    offers = relationship("Offer", back_populates="professional")
    timesheets = relationship("Timesheet", back_populates="professional")
    compliance_docs = relationship("ComplianceDoc", back_populates="professional")

class Shift(Base):
    __tablename__ = "shifts"

    id = Column(Integer, primary_key=True, index=True)
    facility_id = Column(Integer, ForeignKey("facilities.id"), nullable=False)
    role_required = Column(String, nullable=False)  # "Nurse", "HCA", etc.
    specialty = Column(String, nullable=False)  # "ICU", "Geriatric", "Maternity", etc.
    date_time = Column(DateTime, nullable=False)  # Start date/time
    end_time = Column(DateTime, nullable=False)  # End date/time
    rate = Column(Float, nullable=False)
    status = Column(String, default="open")  # "draft", "open", "offered", "confirmed", "in_progress", "completed", "cancelled", "disputed"
    budget_department = Column(String, nullable=False)  # "Emergency", "Pediatrics", etc.
    break_minutes = Column(Integer, default=30)
    clock_in = Column(DateTime, nullable=True)
    clock_out = Column(DateTime, nullable=True)

    # Relationships
    facility = relationship("Facility", back_populates="shifts")
    offers = relationship("Offer", back_populates="shift", cascade="all, delete-orphan")
    timesheet = relationship("Timesheet", back_populates="shift", uselist=False, cascade="all, delete-orphan")

class Offer(Base):
    __tablename__ = "offers"

    id = Column(Integer, primary_key=True, index=True)
    shift_id = Column(Integer, ForeignKey("shifts.id"), nullable=False)
    professional_id = Column(Integer, ForeignKey("professionals.id"), nullable=False)
    match_score = Column(Float, nullable=False)
    explanation = Column(String, nullable=False)
    status = Column(String, default="sent")  # "sent", "accepted", "declined", "expired"

    # Relationships
    shift = relationship("Shift", back_populates="offers")
    professional = relationship("Professional", back_populates="offers")

class Timesheet(Base):
    __tablename__ = "timesheets"

    id = Column(Integer, primary_key=True, index=True)
    shift_id = Column(Integer, ForeignKey("shifts.id"), unique=True, nullable=False)
    professional_id = Column(Integer, ForeignKey("professionals.id"), nullable=False)
    clock_in = Column(DateTime, nullable=False)
    clock_out = Column(DateTime, nullable=False)
    break_minutes = Column(Integer, default=30)
    signature_base64 = Column(Text, nullable=True)  # Draw pad image
    status = Column(String, default="pending")  # "pending", "approved", "disputed"
    dispute_narrative = Column(Text, nullable=True)

    # Relationships
    shift = relationship("Shift", back_populates="timesheet")
    professional = relationship("Professional", back_populates="timesheets")

class ComplianceDoc(Base):
    __tablename__ = "compliance_docs"

    id = Column(Integer, primary_key=True, index=True)
    professional_id = Column(Integer, ForeignKey("professionals.id"), nullable=False)
    doc_type = Column(String, nullable=False)  # "NMBI", "Garda Vetting", "ACLS", "Immunization"
    doc_url = Column(String, nullable=False)
    status = Column(String, default="pending")  # "pending", "approved", "rejected"
    expiry_date = Column(Date, nullable=False)

    # Relationships
    professional = relationship("Professional", back_populates="compliance_docs")

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    facility_id = Column(Integer, ForeignKey("facilities.id"), nullable=False)
    invoice_number = Column(String, unique=True, nullable=False)
    total_amount = Column(Float, nullable=False)
    status = Column(String, default="draft")  # "draft", "sent", "paid", "overdue"
    issued_date = Column(Date, nullable=False)

    # Relationships
    facility = relationship("Facility", back_populates="invoices")
