from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date

from .database import engine, SessionLocal, Base, get_db
from .seed import seed_db
from . import models, schemas, crud

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Abi-MediOracle Healthcare Workforce Portal API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup event to seed database
@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        seed_db(db)
    finally:
        db.close()

@app.get("/api")
def read_root():
    return {
        "status": "online",
        "portal": "Abi-MediOracle Healthcare Workforce API",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

# --- AUTH ENDPOINTS ---
@app.post("/api/auth/login", response_model=schemas.LoginSuccessResponse)
def login(login_data: schemas.UserLogin, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, login_data.email)
    if not db_user or db_user.hashed_password != f"hash_{login_data.password}":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    prof_resp = None
    fac_resp = None
    
    if db_user.role == "professional":
        prof = crud.get_professional_by_user_id(db, db_user.id)
        if prof:
            prof_resp = schemas.ProfessionalResponse.model_validate(prof)
            
    elif db_user.role == "facility":
        fac = crud.get_facility_by_user_id(db, db_user.id)
        if fac:
            fac_resp = schemas.FacilityResponse.model_validate(fac)
            
    user_resp = schemas.UserResponse.model_validate(db_user)
    
    return schemas.LoginSuccessResponse(
        user=user_resp,
        professional=prof_resp,
        facility=fac_resp
    )

# --- FACILITY ENDPOINTS ---
@app.get("/api/facilities", response_model=List[schemas.FacilityResponse])
def read_facilities(db: Session = Depends(get_db)):
    return crud.get_facilities(db)

@app.get("/api/facilities/{facility_id}/dashboard")
def get_facility_dashboard(facility_id: int, db: Session = Depends(get_db)):
    facility = crud.get_facility(db, facility_id)
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
        
    shifts = db.query(models.Shift).filter(models.Shift.facility_id == facility_id).all()
    invoices = db.query(models.Invoice).filter(models.Invoice.facility_id == facility_id).all()
    
    total_shifts = len(shifts)
    confirmed_shifts = sum(1 for s in shifts if s.status in ["confirmed", "in_progress", "completed"])
    open_shifts = sum(1 for s in shifts if s.status == "open")
    disputed_shifts = sum(1 for s in shifts if s.status == "disputed")
    
    fill_rate = (confirmed_shifts / total_shifts * 100.0) if total_shifts > 0 else 0.0
    
    # Calculate budget spendings
    approved_timesheets = db.query(models.Timesheet).join(models.Shift).filter(
        models.Shift.facility_id == facility_id,
        models.Timesheet.status == "approved"
    ).all()
    
    actual_spent = 0.0
    for ts in approved_timesheets:
        delta = ts.clock_out - ts.clock_in
        hours = delta.total_seconds() / 3600.0 - (ts.break_minutes / 60.0)
        hours = max(hours, 0)
        actual_spent += hours * ts.shift.rate * 1.20 # Includes service fee
        
    # Department budget breakdown
    dept_spending = {}
    for s in shifts:
        if s.status == "completed" and s.timesheet and s.timesheet.status == "approved":
            ts = s.timesheet
            delta = ts.clock_out - ts.clock_in
            hours = delta.total_seconds() / 3600.0 - (ts.break_minutes / 60.0)
            hours = max(hours, 0)
            cost = round(hours * s.rate * 1.20, 2)
            dept_spending[s.budget_department] = dept_spending.get(s.budget_department, 0.0) + cost
            
    return {
        "facility_name": facility.name,
        "budget_cap": facility.budget_cap,
        "budget_spent": round(actual_spent, 2),
        "total_shifts": total_shifts,
        "confirmed_shifts": confirmed_shifts,
        "open_shifts": open_shifts,
        "disputed_shifts": disputed_shifts,
        "fill_rate": round(fill_rate, 1),
        "department_spending": dept_spending
    }

# --- PROFESSIONAL ENDPOINTS ---
@app.get("/api/professionals", response_model=List[schemas.ProfessionalResponse])
def read_professionals(db: Session = Depends(get_db)):
    return crud.get_professionals(db)

@app.get("/api/professionals/{professional_id}/dashboard")
def get_professional_dashboard(professional_id: int, db: Session = Depends(get_db)):
    prof = crud.get_professional(db, professional_id)
    if not prof:
        raise HTTPException(status_code=404, detail="Professional not found")
        
    timesheets = db.query(models.Timesheet).filter(models.Timesheet.professional_id == professional_id).all()
    
    total_earned = 0.0
    hours_worked = 0.0
    instant_pay_eligible = 0.0
    
    for ts in timesheets:
        delta = ts.clock_out - ts.clock_in
        hours = delta.total_seconds() / 3600.0 - (ts.break_minutes / 60.0)
        hours = max(hours, 0)
        
        earnings = hours * ts.shift.rate
        hours_worked += hours
        
        if ts.status == "approved":
            total_earned += earnings
        elif ts.status == "pending":
            # Approved shifts get paid in cycles; pending approved status is eligible for instant pay in our mock
            instant_pay_eligible += earnings * 0.8 # 80% advances
            
    return {
        "name": prof.name,
        "specialty": prof.specialty,
        "compliance_status": prof.compliance_status,
        "total_earned": round(total_earned, 2),
        "hours_worked": round(hours_worked, 1),
        "instant_pay_eligible": round(instant_pay_eligible, 2),
        "hourly_rate": prof.hourly_rate
    }

# --- SHIFT ENDPOINTS ---
@app.get("/api/shifts", response_model=List[schemas.ShiftResponse])
def get_shifts(role: Optional[str] = None, status: Optional[str] = None, db: Session = Depends(get_db)):
    return crud.get_shifts(db, role, status)

@app.post("/api/shifts", response_model=schemas.ShiftResponse)
def create_shift(shift: schemas.ShiftCreate, db: Session = Depends(get_db)):
    return crud.create_shift(db, shift)

@app.get("/api/shifts/{shift_id}", response_model=schemas.ShiftResponse)
def get_shift_by_id(shift_id: int, db: Session = Depends(get_db)):
    db_shift = crud.get_shift(db, shift_id)
    if not db_shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    return db_shift

# --- AI MATCHMAKING & OFFERS ENDPOINTS ---
@app.get("/api/shifts/{shift_id}/offers", response_model=List[schemas.OfferResponse])
def get_shift_offers(shift_id: int, db: Session = Depends(get_db)):
    # Returns the list of matching candidates with their confidence score
    return crud.get_offers_for_shift(db, shift_id)

@app.get("/api/offers/professional/{professional_id}", response_model=List[schemas.OfferResponse])
def get_professional_offers(professional_id: int, db: Session = Depends(get_db)):
    return crud.get_offers_for_professional(db, professional_id)

@app.post("/api/offers/{offer_id}/accept", response_model=schemas.OfferResponse)
def accept_shift_offer(offer_id: int, db: Session = Depends(get_db)):
    db_offer = crud.accept_offer(db, offer_id)
    if not db_offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    return db_offer

# --- TIMESHEET ENDPOINTS ---
@app.get("/api/timesheets", response_model=List[schemas.TimesheetResponse])
def get_timesheets(db: Session = Depends(get_db)):
    return crud.get_timesheets(db)

@app.post("/api/timesheets", response_model=schemas.TimesheetResponse)
def submit_timesheet(timesheet: schemas.TimesheetCreate, db: Session = Depends(get_db)):
    # Check if shift exists
    db_shift = crud.get_shift(db, timesheet.shift_id)
    if not db_shift:
        raise HTTPException(status_code=404, detail="Shift not found")
        
    return crud.create_timesheet(db, timesheet)

@app.put("/api/timesheets/{timesheet_id}", response_model=schemas.TimesheetResponse)
def update_timesheet_status(timesheet_id: int, update: schemas.TimesheetUpdate, db: Session = Depends(get_db)):
    db_timesheet = crud.update_timesheet(db, timesheet_id, update)
    if not db_timesheet:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    return db_timesheet

# --- COMPLIANCE DOCUMENT ENDPOINTS ---
@app.get("/api/compliance/docs", response_model=List[schemas.ComplianceDocResponse])
def get_compliance_docs(professional_id: Optional[int] = None, db: Session = Depends(get_db)):
    return crud.get_compliance_docs(db, professional_id)

@app.post("/api/compliance/docs", response_model=schemas.ComplianceDocResponse)
def upload_compliance_doc(doc: schemas.ComplianceDocCreate, db: Session = Depends(get_db)):
    return crud.create_compliance_doc(db, doc)

@app.put("/api/compliance/docs/{doc_id}/verify")
def verify_compliance_doc(doc_id: int, status: str, db: Session = Depends(get_db)):
    if status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid verification status")
    db_doc = crud.update_compliance_doc_status(db, doc_id, status)
    if not db_doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"status": "success", "document_id": doc_id, "doc_status": db_doc.status}

@app.get("/api/compliance/queue")
def get_compliance_queue(db: Session = Depends(get_db)):
    # Returns list of professionals and their documents that are pending approval
    pending_docs = db.query(models.ComplianceDoc).filter(models.ComplianceDoc.status == "pending").all()
    queue = []
    for doc in pending_docs:
        prof = doc.professional
        queue.append({
            "doc_id": doc.id,
            "professional_id": prof.id,
            "professional_name": prof.name,
            "specialty": prof.specialty,
            "doc_type": doc.doc_type,
            "doc_url": doc.doc_url,
            "expiry_date": doc.expiry_date,
            "status": doc.status
        })
    return queue

# --- BILLING & INVOICES ENDPOINTS ---
@app.get("/api/invoices", response_model=List[schemas.InvoiceResponse])
def get_invoices(facility_id: Optional[int] = None, db: Session = Depends(get_db)):
    return crud.get_invoices(db, facility_id)

@app.put("/api/invoices/{invoice_id}/pay")
def pay_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    invoice.status = "paid"
    db.commit()
    db.refresh(invoice)
    return {"status": "success", "invoice_id": invoice_id, "invoice_status": invoice.status}
