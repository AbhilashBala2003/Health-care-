from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date
from . import models, database, crud, schemas

def seed_db(db: Session):
    # Check if we already have users in the DB
    if db.query(models.User).first():
        return
        
    print("Seeding database...")
    
    # 1. Create Users
    # Structure: UserCreate(email, password, role)
    users_data = [
        ("admin@abi.com", "admin123", "admin"),
        ("stjames@hse.ie", "james123", "facility"),
        ("beacon@clinic.ie", "beacon123", "facility"),
        ("sarah.nurse@gmail.com", "sarah123", "professional"),
        ("michael.hca@gmail.com", "michael123", "professional"),
        ("priya.midwife@gmail.com", "priya123", "professional"),
        ("david.nurse@gmail.com", "david123", "professional")
    ]
    
    users = {}
    for email, password, role in users_data:
        db_user = crud.create_user(db, schemas.UserCreate(email=email, password=password, role=role))
        users[email] = db_user
        
    # 2. Create Facilities
    st_james_fac = crud.create_facility(db, schemas.FacilityCreate(
        user_id=users["stjames@hse.ie"].id,
        name="St. James's Hospital (HSE East)",
        region="Dublin 8",
        address="James's St, Ushers, Dublin 8, D08 NHY1",
        budget_cap=25000.0
    ))
    
    beacon_fac = crud.create_facility(db, schemas.FacilityCreate(
        user_id=users["beacon@clinic.ie"].id,
        name="Beacon Hospital & Clinic",
        region="Dublin 18",
        address="Blackthorn Rd, Sandyford, Dublin 18, D18 AK68",
        budget_cap=45000.0
    ))
    
    # 3. Create Professionals
    # Latitude/Longitude mapped to Dublin areas
    sarah_prof = crud.create_professional(db, schemas.ProfessionalCreate(
        user_id=users["sarah.nurse@gmail.com"].id,
        name="Sarah Connor, R.G.N.",
        specialty="Nurse",
        hourly_rate=42.50,
        lat=53.3522, # Phibsborough, Dublin
        lng=-6.2752,
        image_url="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200"
    ))
    # Mark Sarah as fully vetted
    crud.update_professional_compliance(db, sarah_prof.id, "vetted")
    
    michael_prof = crud.create_professional(db, schemas.ProfessionalCreate(
        user_id=users["michael.hca@gmail.com"].id,
        name="Michael Vance, H.C.A.",
        specialty="HCA",
        hourly_rate=25.00,
        lat=53.3244, # Rathmines, Dublin
        lng=-6.2635,
        image_url="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200"
    ))
    # Mark Michael as fully vetted
    crud.update_professional_compliance(db, michael_prof.id, "vetted")
    
    priya_prof = crud.create_professional(db, schemas.ProfessionalCreate(
        user_id=users["priya.midwife@gmail.com"].id,
        name="Priya Sharma, Midwife",
        specialty="Midwife",
        hourly_rate=48.00,
        lat=53.3831, # Whitehall, Dublin
        lng=-6.2396,
        image_url="https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=200"
    ))
    # Priya remains pending
    crud.update_professional_compliance(db, priya_prof.id, "pending")
    
    david_prof = crud.create_professional(db, schemas.ProfessionalCreate(
        user_id=users["david.nurse@gmail.com"].id,
        name="David O'Connor, R.G.N.",
        specialty="Nurse",
        hourly_rate=40.00,
        lat=53.2989, # Dun Laoghaire, Dublin
        lng=-6.1342,
        image_url="https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=200"
    ))
    # David is restricted
    crud.update_professional_compliance(db, david_prof.id, "restricted")
    
    # 4. Create Compliance Documents
    # Sarah Connor Docs (Vetted/Approved)
    crud.create_compliance_doc(db, schemas.ComplianceDocCreate(
        professional_id=sarah_prof.id,
        doc_type="NMBI Registration",
        doc_url="https://example.com/docs/nmbi_sarah.pdf",
        expiry_date=date.today() + timedelta(days=120)
    ))
    crud.create_compliance_doc(db, schemas.ComplianceDocCreate(
        professional_id=sarah_prof.id,
        doc_type="Garda Vetting Clearance",
        doc_url="https://example.com/docs/garda_sarah.pdf",
        expiry_date=date.today() + timedelta(days=250)
    ))
    crud.create_compliance_doc(db, schemas.ComplianceDocCreate(
        professional_id=sarah_prof.id,
        doc_type="ACLS Certificate",
        doc_url="https://example.com/docs/acls_sarah.pdf",
        expiry_date=date.today() + timedelta(days=90)
    ))
    # Approve Sarah's docs to make her vetted
    for doc in db.query(models.ComplianceDoc).filter(models.ComplianceDoc.professional_id == sarah_prof.id).all():
        crud.update_compliance_doc_status(db, doc.id, "approved")
        
    # Michael Vance Docs (Vetted/Approved)
    crud.create_compliance_doc(db, schemas.ComplianceDocCreate(
        professional_id=michael_prof.id,
        doc_type="Garda Vetting Clearance",
        doc_url="https://example.com/docs/garda_michael.pdf",
        expiry_date=date.today() + timedelta(days=180)
    ))
    crud.create_compliance_doc(db, schemas.ComplianceDocCreate(
        professional_id=michael_prof.id,
        doc_type="Manual Handling Training",
        doc_url="https://example.com/docs/mh_michael.pdf",
        expiry_date=date.today() + timedelta(days=60)
    ))
    for doc in db.query(models.ComplianceDoc).filter(models.ComplianceDoc.professional_id == michael_prof.id).all():
        crud.update_compliance_doc_status(db, doc.id, "approved")
        
    # Priya Sharma Docs (Pending)
    crud.create_compliance_doc(db, schemas.ComplianceDocCreate(
        professional_id=priya_prof.id,
        doc_type="NMBI Registration",
        doc_url="https://example.com/docs/nmbi_priya.pdf",
        expiry_date=date.today() + timedelta(days=15)
    ))
    crud.create_compliance_doc(db, schemas.ComplianceDocCreate(
        professional_id=priya_prof.id,
        doc_type="Garda Vetting Clearance",
        doc_url="https://example.com/docs/garda_priya.pdf",
        expiry_date=date.today() + timedelta(days=365)
    ))
    
    # David O'Connor Docs (Rejected/Restricted)
    crud.create_compliance_doc(db, schemas.ComplianceDocCreate(
        professional_id=david_prof.id,
        doc_type="NMBI Registration",
        doc_url="https://example.com/docs/nmbi_david_expired.pdf",
        expiry_date=date.today() - timedelta(days=5) # Expired!
    ))
    for doc in db.query(models.ComplianceDoc).filter(models.ComplianceDoc.professional_id == david_prof.id).all():
        crud.update_compliance_doc_status(db, doc.id, "rejected")
        
    # 5. Create Shifts (Historical, Confirmed, and Open)
    now = datetime.now()
    
    # Historical Shift 1 (Completed & Approved, Paid)
    shift_hist_1 = crud.create_shift(db, schemas.ShiftCreate(
        facility_id=st_james_fac.id,
        role_required="Nurse",
        specialty="ICU",
        date_time=now - timedelta(days=3, hours=8),
        end_time=now - timedelta(days=3),
        rate=50.00,
        budget_department="Emergency ICU",
        break_minutes=30
    ))
    # Complete, approve, invoice this shift
    crud.update_shift_status(db, shift_hist_1.id, "completed", 
                              clock_in=shift_hist_1.date_time, 
                              clock_out=shift_hist_1.end_time)
    ts1 = crud.create_timesheet(db, schemas.TimesheetCreate(
        shift_id=shift_hist_1.id,
        professional_id=sarah_prof.id,
        clock_in=shift_hist_1.date_time,
        clock_out=shift_hist_1.end_time,
        break_minutes=30,
        signature_base64="data:image/png;base64,mocksignature"
    ))
    crud.update_timesheet(db, ts1.id, schemas.TimesheetUpdate(status="approved"))
    
    # Historical Shift 2 (Completed & Disputed)
    shift_hist_2 = crud.create_shift(db, schemas.ShiftCreate(
        facility_id=beacon_fac.id,
        role_required="HCA",
        specialty="Geriatric",
        date_time=now - timedelta(days=2, hours=10),
        end_time=now - timedelta(days=2),
        rate=28.00,
        budget_department="Elderly Care Ward 4",
        break_minutes=45
    ))
    crud.update_shift_status(db, shift_hist_2.id, "completed", 
                              clock_in=shift_hist_2.date_time - timedelta(minutes=15), # Clocked in early
                              clock_out=shift_hist_2.end_time)
    ts2 = crud.create_timesheet(db, schemas.TimesheetCreate(
        shift_id=shift_hist_2.id,
        professional_id=michael_prof.id,
        clock_in=shift_hist_2.date_time - timedelta(minutes=15),
        clock_out=shift_hist_2.end_time,
        break_minutes=45,
        signature_base64="data:image/png;base64,mocksignature"
    ))
    crud.update_timesheet(db, ts2.id, schemas.TimesheetUpdate(
        status="disputed", 
        dispute_narrative="Worker clocked in 15 mins before ward manager authorized and was resting in canteen."
    ))
    
    # Open Shift 1 (Available, Match scoring will work)
    crud.create_shift(db, schemas.ShiftCreate(
        facility_id=st_james_fac.id,
        role_required="Nurse",
        specialty="General Wards",
        date_time=now + timedelta(days=1, hours=8),
        end_time=now + timedelta(days=1, hours=16),
        rate=45.00,
        budget_department="Ward B",
        break_minutes=30
    ))
    
    # Open Shift 2 (Available, HCA role)
    crud.create_shift(db, schemas.ShiftCreate(
        facility_id=beacon_fac.id,
        role_required="HCA",
        specialty="Outpatients",
        date_time=now + timedelta(days=2, hours=9),
        end_time=now + timedelta(days=2, hours=17),
        rate=26.50,
        budget_department="Ambulatory Care",
        break_minutes=30
    ))
    
    # Open Shift 3 (Available, Midwife role)
    crud.create_shift(db, schemas.ShiftCreate(
        facility_id=st_james_fac.id,
        role_required="Midwife",
        specialty="Maternity",
        date_time=now + timedelta(days=3, hours=20),
        end_time=now + timedelta(days=4, hours=4), # Night shift
        rate=55.00,
        budget_department="Labor Ward",
        break_minutes=30
    ))
    
    # Let's commit all database changes
    db.commit()
    print("Database seeding completed!")
