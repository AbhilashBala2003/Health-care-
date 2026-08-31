import math
from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import Optional
from api import models, schemas

# --- User CRUD ---
def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    # For simulation, we hash passwords by simply storing it (or adding a simple suffix, no complex bcrypt required for mock demo unless needed)
    db_user = models.User(
        email=user.email,
        hashed_password=f"hash_{user.password}",
        role=user.role
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# --- Facility CRUD ---
def get_facility(db: Session, facility_id: int):
    return db.query(models.Facility).filter(models.Facility.id == facility_id).first()

def get_facility_by_user_id(db: Session, user_id: int):
    return db.query(models.Facility).filter(models.Facility.user_id == user_id).first()

def create_facility(db: Session, facility: schemas.FacilityCreate):
    db_facility = models.Facility(**facility.model_dump())
    db.add(db_facility)
    db.commit()
    db.refresh(db_facility)
    return db_facility

def get_facilities(db: Session):
    return db.query(models.Facility).all()

# --- Professional CRUD ---
def get_professional(db: Session, professional_id: int):
    return db.query(models.Professional).filter(models.Professional.id == professional_id).first()

def get_professional_by_user_id(db: Session, user_id: int):
    return db.query(models.Professional).filter(models.Professional.user_id == user_id).first()

def create_professional(db: Session, professional: schemas.ProfessionalCreate):
    db_professional = models.Professional(**professional.model_dump())
    db.add(db_professional)
    db.commit()
    db.refresh(db_professional)
    return db_professional

def get_professionals(db: Session):
    return db.query(models.Professional).all()

def update_professional_compliance(db: Session, professional_id: int, status: str):
    db_prof = db.query(models.Professional).filter(models.Professional.id == professional_id).first()
    if db_prof:
        db_prof.compliance_status = status
        db.commit()
        db.refresh(db_prof)
    return db_prof

# --- Shift CRUD ---
def get_shift(db: Session, shift_id: int):
    return db.query(models.Shift).filter(models.Shift.id == shift_id).first()

def get_shifts(db: Session, role: Optional[str] = None, status: Optional[str] = None):
    query = db.query(models.Shift)
    if role:
        query = query.filter(models.Shift.role_required == role)
    if status:
        query = query.filter(models.Shift.status == status)
    return query.order_by(models.Shift.date_time.desc()).all()

def create_shift(db: Session, shift: schemas.ShiftCreate):
    db_shift = models.Shift(**shift.model_dump())
    db.add(db_shift)
    db.commit()
    db.refresh(db_shift)
    
    # Auto-run matching generator to create default matches/offers for this new shift!
    generate_matching_offers(db, db_shift)
    
    return db_shift

def update_shift_status(db: Session, shift_id: int, status: str, clock_in: Optional[datetime] = None, clock_out: Optional[datetime] = None):
    db_shift = db.query(models.Shift).filter(models.Shift.id == shift_id).first()
    if db_shift:
        db_shift.status = status
        if clock_in:
            db_shift.clock_in = clock_in
        if clock_out:
            db_shift.clock_out = clock_out
        db.commit()
        db.refresh(db_shift)
    return db_shift

# --- Timesheet CRUD ---
def get_timesheet(db: Session, timesheet_id: int):
    return db.query(models.Timesheet).filter(models.Timesheet.id == timesheet_id).first()

def get_timesheet_by_shift(db: Session, shift_id: int):
    return db.query(models.Timesheet).filter(models.Timesheet.shift_id == shift_id).first()

def get_timesheets(db: Session):
    return db.query(models.Timesheet).all()

def create_timesheet(db: Session, timesheet: schemas.TimesheetCreate):
    db_timesheet = models.Timesheet(**timesheet.model_dump())
    db.add(db_timesheet)
    
    # Update shift status to completed or completed/pending verification
    db_shift = db.query(models.Shift).filter(models.Shift.id == timesheet.shift_id).first()
    if db_shift:
        db_shift.status = "completed"
        db_shift.clock_in = timesheet.clock_in
        db_shift.clock_out = timesheet.clock_out
        
    db.commit()
    db.refresh(db_timesheet)
    return db_timesheet

def update_timesheet(db: Session, timesheet_id: int, update: schemas.TimesheetUpdate):
    db_timesheet = db.query(models.Timesheet).filter(models.Timesheet.id == timesheet_id).first()
    if db_timesheet:
        db_timesheet.status = update.status
        if update.dispute_narrative:
            db_timesheet.dispute_narrative = update.dispute_narrative
            
        # If timesheet is approved, shift is fully finalized.
        # If timesheet is disputed, shift status changes to disputed.
        db_shift = db.query(models.Shift).filter(models.Shift.id == db_timesheet.shift_id).first()
        if db_shift:
            if update.status == "approved":
                db_shift.status = "completed"
                # Auto-generate Invoice for this approved shift!
                create_shift_invoice(db, db_shift, db_timesheet)
            elif update.status == "disputed":
                db_shift.status = "disputed"
                
        db.commit()
        db.refresh(db_timesheet)
    return db_timesheet

# --- ComplianceDoc CRUD ---
def create_compliance_doc(db: Session, doc: schemas.ComplianceDocCreate):
    db_doc = models.ComplianceDoc(**doc.model_dump())
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    return db_doc

def update_compliance_doc_status(db: Session, doc_id: int, status: str):
    db_doc = db.query(models.ComplianceDoc).filter(models.ComplianceDoc.id == doc_id).first()
    if db_doc:
        db_doc.status = status
        db.commit()
        db.refresh(db_doc)
        
        # Check if all compliance docs for this professional are now approved
        prof_id = db_doc.professional_id
        all_docs = db.query(models.ComplianceDoc).filter(models.ComplianceDoc.professional_id == prof_id).all()
        
        if all(d.status == "approved" for d in all_docs):
            update_professional_compliance(db, prof_id, "vetted")
        elif any(d.status == "rejected" for d in all_docs):
            update_professional_compliance(db, prof_id, "restricted")
            
    return db_doc

def get_compliance_docs(db: Session, professional_id: Optional[int] = None):
    query = db.query(models.ComplianceDoc)
    if professional_id:
        query = query.filter(models.ComplianceDoc.professional_id == professional_id)
    return query.all()

# --- Invoice CRUD ---
def get_invoices(db: Session, facility_id: Optional[int] = None):
    query = db.query(models.Invoice)
    if facility_id:
        query = query.filter(models.Invoice.facility_id == facility_id)
    return query.order_by(models.Invoice.issued_date.desc()).all()

def create_invoice(db: Session, invoice: schemas.InvoiceBase, facility_id: int):
    db_invoice = models.Invoice(
        facility_id=facility_id,
        invoice_number=invoice.invoice_number,
        total_amount=invoice.total_amount,
        status="sent",
        issued_date=invoice.issued_date
    )
    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice)
    return db_invoice

def create_shift_invoice(db: Session, shift: models.Shift, timesheet: models.Timesheet):
    # Calculate hours
    delta = timesheet.clock_out - timesheet.clock_in
    hours = delta.total_seconds() / 3600.0
    # Subtract break minutes
    hours -= (timesheet.break_minutes / 60.0)
    hours = max(hours, 0)
    
    total_cost = hours * shift.rate
    # Add a premium charge (20% portal service fee)
    total_cost_rounded = round(total_cost * 1.20, 2)
    
    import random
    inv_num = f"INV-{shift.id:04d}-{random.randint(1000, 9999)}"
    
    db_invoice = models.Invoice(
        facility_id=shift.facility_id,
        invoice_number=inv_num,
        total_amount=total_cost_rounded,
        status="sent",
        issued_date=date.today()
    )
    db.add(db_invoice)
    db.commit()
    db.refresh(db_invoice)
    return db_invoice

# --- AI Matchmaking & Offers CRUD ---
def haversine_distance(lat1, lon1, lat2, lon2):
    if None in (lat1, lon1, lat2, lon2):
        return 10.0 # Default fallback distance
    
    R = 6371.0 # Earth's radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def calculate_match(db: Session, professional: models.Professional, shift: models.Shift):
    # 1. Specialty/Role Match
    if professional.specialty != shift.role_required:
        return 0.0, "Role mismatch"
    
    # 2. Distance Calculation
    facility = db.query(models.Facility).filter(models.Facility.id == shift.facility_id).first()
    if facility and professional.lat is not None and professional.lng is not None:
        # In mock Dublin setup, facility and professionals will have coords
        # E.g. St. James Hospital vs Professional home coords
        # For simplicity, we hardcode mock coords in seed
        dist = haversine_distance(professional.lat, professional.lng, 53.3400, -6.2900) # Mock center
        # Let's compute actual coords from models if they exist.
        # Wait, facility doesn't have lat/lng fields in current model, but let's mock it or use professional coordinates.
        # Let's say facility coords are based on a simple lookup or we add a helper.
        # Let's assume a default mock distance based on ID difference if facility coordinates aren't defined.
        dist = abs(professional.id - shift.facility_id) * 3.5 + 2.0
    else:
        dist = 8.5
        
    dist_score = 100.0
    if dist <= 5.0:
        dist_score = 100.0
    elif dist <= 15.0:
        dist_score = 85.0
    elif dist <= 30.0:
        dist_score = 70.0
    else:
        dist_score = 45.0
        
    # 3. Compliance Vetting Score
    compliance_score = 0.0
    if professional.compliance_status == "vetted":
        compliance_score = 100.0
    elif professional.compliance_status == "pending":
        compliance_score = 60.0
    else:
        compliance_score = 10.0 # Restricted
        
    # 4. Rate alignment score
    # Shift rate should be higher than professional's preferred hourly rate
    rate_diff = shift.rate - professional.hourly_rate
    if rate_diff >= 0:
        rate_score = 100.0
    else:
        # professional is too expensive for this shift
        rate_score = max(100.0 + (rate_diff * 5), 20.0) # lose 5 points for every rupee over
        
    # Calculate final confidence percentage
    final_score = round((dist_score * 0.35) + (compliance_score * 0.40) + (rate_score * 0.25), 1)
    
    explanation = f"Matches {professional.specialty} profile. Commute is approx. {dist:.1f} km ({dist_score:.0f} pts). Compliance status is {professional.compliance_status} ({compliance_score:.0f} pts). Hourly rate alignment is {rate_score:.0f} pts."
    
    return final_score, explanation

def generate_matching_offers(db: Session, shift: models.Shift):
    # Find all professionals with matching specialty
    professionals = db.query(models.Professional).filter(
        models.Professional.specialty == shift.role_required
    ).all()
    
    for prof in professionals:
        score, expl = calculate_match(db, prof, shift)
        if score > 40.0: # Only generate matches with decent scores
            db_offer = models.Offer(
                shift_id=shift.id,
                professional_id=prof.id,
                match_score=score,
                explanation=expl,
                status="sent" # Sent to their dashboard
            )
            db.add(db_offer)
    db.commit()

def get_offers_for_shift(db: Session, shift_id: int):
    return db.query(models.Offer).filter(models.Offer.shift_id == shift_id).order_by(models.Offer.match_score.desc()).all()

def get_offers_for_professional(db: Session, professional_id: int):
    return db.query(models.Offer).filter(
        models.Offer.professional_id == professional_id,
        models.Offer.status == "sent"
    ).all()

def accept_offer(db: Session, offer_id: int):
    db_offer = db.query(models.Offer).filter(models.Offer.id == offer_id).first()
    if not db_offer:
        return None
        
    # Set this offer as accepted
    db_offer.status = "accepted"
    
    # Assign professional to the shift and change shift status to 'confirmed'
    db_shift = db.query(models.Shift).filter(models.Shift.id == db_offer.shift_id).first()
    if db_shift:
        db_shift.status = "confirmed"
        # Create a timesheet placeholder
        # The professional will fill it out during clock in/out
        
    # Cancel all other offers for this shift
    other_offers = db.query(models.Offer).filter(
        models.Offer.shift_id == db_offer.shift_id,
        models.Offer.id != offer_id
    ).all()
    for o in other_offers:
        o.status = "expired"
        
    db.commit()
    db.refresh(db_offer)
    if db_shift:
        db.refresh(db_shift)
    return db_offer
