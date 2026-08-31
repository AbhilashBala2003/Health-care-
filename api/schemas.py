from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, date

# --- User Schemas ---
class UserBase(BaseModel):
    email: EmailStr
    role: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True

# --- Facility Schemas ---
class FacilityBase(BaseModel):
    name: str
    region: str
    address: str
    budget_cap: float

class FacilityCreate(FacilityBase):
    user_id: int

class FacilityResponse(FacilityBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True

# --- Professional Schemas ---
class ProfessionalBase(BaseModel):
    name: str
    specialty: str
    hourly_rate: float
    lat: Optional[float] = None
    lng: Optional[float] = None
    image_url: Optional[str] = None

class ProfessionalCreate(ProfessionalBase):
    user_id: int

class ProfessionalResponse(ProfessionalBase):
    id: int
    user_id: int
    compliance_status: str

    class Config:
        from_attributes = True

# --- ComplianceDoc Schemas ---
class ComplianceDocBase(BaseModel):
    doc_type: str
    doc_url: str
    expiry_date: date

class ComplianceDocCreate(ComplianceDocBase):
    professional_id: int

class ComplianceDocResponse(ComplianceDocBase):
    id: int
    professional_id: int
    status: str

    class Config:
        from_attributes = True

# --- Shift Schemas ---
class ShiftBase(BaseModel):
    role_required: str
    specialty: str
    date_time: datetime
    end_time: datetime
    rate: float
    budget_department: str
    break_minutes: int

class ShiftCreate(ShiftBase):
    facility_id: int

class ShiftUpdate(BaseModel):
    status: Optional[str] = None
    clock_in: Optional[datetime] = None
    clock_out: Optional[datetime] = None

class ShiftResponse(ShiftBase):
    id: int
    facility_id: int
    status: str
    clock_in: Optional[datetime] = None
    clock_out: Optional[datetime] = None
    facility: Optional[FacilityResponse] = None

    class Config:
        from_attributes = True

# --- Offer Schemas ---
class OfferBase(BaseModel):
    shift_id: int
    professional_id: int
    match_score: float
    explanation: str

class OfferCreate(OfferBase):
    pass

class OfferResponse(OfferBase):
    id: int
    status: str
    professional: Optional[ProfessionalResponse] = None
    shift: Optional[ShiftResponse] = None

    class Config:
        from_attributes = True

# --- Timesheet Schemas ---
class TimesheetBase(BaseModel):
    clock_in: datetime
    clock_out: datetime
    break_minutes: int
    signature_base64: Optional[str] = None

class TimesheetCreate(TimesheetBase):
    shift_id: int
    professional_id: int

class TimesheetUpdate(BaseModel):
    status: str
    dispute_narrative: Optional[str] = None

class TimesheetResponse(TimesheetBase):
    id: int
    shift_id: int
    professional_id: int
    status: str
    dispute_narrative: Optional[str] = None
    professional: Optional[ProfessionalResponse] = None
    shift: Optional[ShiftResponse] = None

    class Config:
        from_attributes = True

# --- Invoice Schemas ---
class InvoiceBase(BaseModel):
    invoice_number: str
    total_amount: float
    issued_date: date

class InvoiceResponse(InvoiceBase):
    id: int
    facility_id: int
    status: str
    facility: Optional[FacilityResponse] = None

    class Config:
        from_attributes = True

# --- Login Success Schema ---
class LoginSuccessResponse(BaseModel):
    user: UserResponse
    professional: Optional[ProfessionalResponse] = None
    facility: Optional[FacilityResponse] = None
