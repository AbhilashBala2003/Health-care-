import React, { useState, useEffect, useRef } from 'react'
import {
  Shield,
  MapPin,
  Building2,
  UserRound,
  Calendar,
  Clock,
  Euro,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Zap,
  FileSpreadsheet,
  Compass,
  Briefcase,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  Fingerprint,
  RefreshCw,
  Eye,
  Sliders,
  DollarSign
} from 'lucide-react'

// Main Application entrypoint
export default function App() {
  // Global Roles: "facility", "professional", "admin"
  const [activeRole, setActiveRole] = useState('facility')
  const [backendOffline, setBackendOffline] = useState(false)
  const [loading, setLoading] = useState(false)

  // Seed states
  const [facilities, setFacilities] = useState([])
  const [professionals, setProfessionals] = useState([])

  // Dashboard & Work Data States
  const [facilityDashboard, setFacilityDashboard] = useState(null)
  const [professionalDashboard, setProfessionalDashboard] = useState(null)
  const [shifts, setShifts] = useState([])
  const [selectedShift, setSelectedShift] = useState(null)
  const [shiftOffers, setShiftOffers] = useState([])
  const [professionalOffers, setProfessionalOffers] = useState([])
  const [timesheets, setTimesheets] = useState([])
  const [complianceDocs, setComplianceDocs] = useState([])
  const [complianceQueue, setComplianceQueue] = useState([])
  const [invoices, setInvoices] = useState([])

  // Selection states
  const [selectedFacilityId, setSelectedFacilityId] = useState(1) // Default St. James
  const [selectedProfessionalId, setSelectedProfessionalId] = useState(1) // Default Sarah Connor

  // Form states
  const [newShift, setNewShift] = useState({
    role_required: 'Nurse',
    specialty: 'ICU',
    date_time: '',
    end_time: '',
    rate: 45.0,
    budget_department: 'General Ward B',
    break_minutes: 30
  })

  // Professional mobile active tab: "discover" | "active" | "compliance" | "earnings"
  const [mobileTab, setMobileTab] = useState('discover')
  const [activeShift, setActiveShift] = useState(null)
  const [clockInTime, setClockInTime] = useState(null)
  const [clockOutTime, setClockOutTime] = useState(null)
  const [signatureData, setSignatureData] = useState('')
  const [isDrawing, setIsDrawing] = useState(false)
  const canvasRef = useRef(null)

  // Document upload simulation
  const [uploadDocType, setUploadDocType] = useState('NMBI Registration')
  const [uploadDocExpiry, setUploadDocExpiry] = useState('')

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true)
    try {
      // Test backend connection
      const rootRes = await fetch('/api')
      if (!rootRes.ok) throw new Error('API unreachable')
      setBackendOffline(false)

      // Fetch basic assets
      const facRes = await fetch('/api/facilities')
      const facilitiesData = await facRes.json()
      setFacilities(facilitiesData)

      const profRes = await fetch('/api/professionals')
      const professionalsData = await profRes.json()
      setProfessionals(professionalsData)

      // Fetch global shifts & invoices & compliance
      const shiftsRes = await fetch('/api/shifts')
      const shiftsData = await shiftsRes.json()
      setShifts(shiftsData)

      const invRes = await fetch('/api/invoices')
      const invoicesData = await invRes.json()
      setInvoices(invoicesData)

      const timesheetsRes = await fetch('/api/timesheets')
      const timesheetsData = await timesheetsRes.json()
      setTimesheets(timesheetsData)

      // Fetch dashboard depending on current active entities
      refreshDashboards(selectedFacilityId, selectedProfessionalId)

    } catch (err) {
      console.error("Backend offline or error: ", err)
      setBackendOffline(true)
    } finally {
      setLoading(false)
    }
  }

  const refreshDashboards = async (facId, profId) => {
    try {
      const facDashRes = await fetch(`/api/facilities/${facId}/dashboard`)
      if (facDashRes.ok) {
        const facDashData = await facDashRes.json()
        setFacilityDashboard(facDashData)
      }

      const profDashRes = await fetch(`/api/professionals/${profId}/dashboard`)
      if (profDashRes.ok) {
        const profDashData = await profDashRes.json()
        setProfessionalDashboard(profDashData)
      }

      // Fetch offers and queues
      const profOffersRes = await fetch(`/api/offers/professional/${profId}`)
      if (profOffersRes.ok) {
        const profOffersData = await profOffersRes.json()
        setProfessionalOffers(profOffersData)
      }

      const compQueueRes = await fetch('/api/compliance/queue')
      if (compQueueRes.ok) {
        const compQueueData = await compQueueRes.json()
        setComplianceQueue(compQueueData)
      }

      // Sync active confirmed shift for mobile professional
      const activeSh = shifts.find(s => s.status === 'confirmed' && s.timesheet === null) ||
        shifts.find(s => s.status === 'in_progress')
      setActiveShift(activeSh || null)

    } catch (e) {
      console.warn("Dashboard sync failed", e)
    }
  }

  // Trigger data fetch on mount and role change
  useEffect(() => {
    fetchData()
  }, [activeRole, selectedFacilityId, selectedProfessionalId])

  // Sync shifts when shifts state is updated
  useEffect(() => {
    const activeSh = shifts.find(s => s.status === 'confirmed' && s.timesheet === null) ||
      shifts.find(s => s.status === 'in_progress')
    setActiveShift(activeSh || null)
  }, [shifts])

  // Handles shift creation
  const handleCreateShift = async (e) => {
    e.preventDefault()
    if (!newShift.date_time || !newShift.end_time) {
      alert("Please select both start and end date/times.")
      return
    }

    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newShift,
          facility_id: selectedFacilityId,
          date_time: new Date(newShift.date_time).toISOString(),
          end_time: new Date(newShift.end_time).toISOString()
        })
      })

      if (res.ok) {
        alert("Shift posted successfully & matching algorithm executed in background!")
        fetchData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // View matching candidates for a shift
  const handleViewMatches = async (shift) => {
    setSelectedShift(shift)
    try {
      const res = await fetch(`/api/shifts/${shift.id}/offers`)
      if (res.ok) {
        const offersData = await res.json()
        setShiftOffers(offersData)
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Accept a shift offer (from Professional Mobile View)
  const handleAcceptOffer = async (offerId) => {
    try {
      const res = await fetch(`/api/offers/${offerId}/accept`, { method: 'POST' })
      if (res.ok) {
        alert("Shift offer accepted! You are now booked for this shift.")
        fetchData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Simulation Clock-In
  const handleClockIn = () => {
    setClockInTime(new Date())
    alert("GPS Location verified within geofence! Clock-In registered.")
  }

  // Simulation Clock-Out and Timesheet Submission
  const handleClockOutAndSubmit = async () => {
    if (!clockInTime) return
    const outTime = new Date()
    setClockOutTime(outTime)

    // Capture signature drawing
    let sigUrl = "data:image/png;base64,signature_placeholder"
    if (canvasRef.current) {
      sigUrl = canvasRef.current.toDataURL()
    }

    try {
      const res = await fetch('/api/timesheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shift_id: activeShift.id,
          professional_id: selectedProfessionalId,
          clock_in: clockInTime.toISOString(),
          clock_out: outTime.toISOString(),
          break_minutes: 30,
          signature_base64: sigUrl
        })
      })

      if (res.ok) {
        alert("Timesheet submitted successfully with manager signature!")
        setClockInTime(null)
        setClockOutTime(null)
        fetchData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Facility Manager timesheet actions (Approve/Dispute)
  const handleVerifyTimesheet = async (tsId, approve, disputeReason = "") => {
    try {
      const res = await fetch(`/api/timesheets/${tsId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: approve ? 'approved' : 'disputed',
          dispute_narrative: disputeReason || null
        })
      })

      if (res.ok) {
        alert(approve ? "Timesheet approved. Invoice and payroll generated!" : "Timesheet marked as disputed.")
        fetchData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Admin Compliance verification
  const handleVerifyCompliance = async (docId, approve) => {
    try {
      const res = await fetch(`/api/compliance/docs/${docId}/verify?status=${approve ? 'approved' : 'rejected'}`, {
        method: 'PUT'
      })
      if (res.ok) {
        alert(`Credential document ${approve ? 'approved' : 'rejected'}.`)
        fetchData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Upload document simulation
  const handleUploadDoc = async (e) => {
    e.preventDefault()
    if (!uploadDocExpiry) {
      alert("Please select doc expiry date.")
      return
    }

    try {
      const res = await fetch('/api/compliance/docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          professional_id: selectedProfessionalId,
          doc_type: uploadDocType,
          doc_url: `https://abi-storage.com/${uploadDocType.toLowerCase().replace(' ', '_')}.pdf`,
          expiry_date: uploadDocExpiry
        })
      })

      if (res.ok) {
        alert("Credential document submitted to Ops vetting queue!")
        fetchData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Pay invoice (Ops View)
  const handlePayInvoice = async (invId) => {
    try {
      const res = await fetch(`/api/invoices/${invId}/pay`, { method: 'PUT' })
      if (res.ok) {
        alert("Invoice status updated to PAID.")
        fetchData()
      }
    } catch (err) {
      console.error(err)
    }
  }

  // Canvas drawing handlers for geofence signature
  const startDrawing = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#8b5cf6'

    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX || e.touches[0].clientX) - rect.left
    const y = (e.clientY || e.touches[0].clientY) - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (e) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  return (
    <div className="app-container">
      {/* Header section with brand identity and role selector */}
      <header className="app-header">
        <div className="brand-section">
          <Shield className="brand-logo" size={32} />
          <div>
            <h1 className="brand-title">Abi-MediOracle</h1>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>AI-POWERED HEALTHCARE WORKFORCE PORTAL</p>
          </div>
        </div>

        <div className="header-meta">
          <div className="role-tabs">
            <button
              className={`role-tab ${activeRole === 'facility' ? 'active' : ''}`}
              onClick={() => setActiveRole('facility')}
            >
              <Building2 size={16} />
              Healthcare Facility
            </button>
            <button
              className={`role-tab ${activeRole === 'professional' ? 'active' : ''}`}
              onClick={() => {
                setActiveRole('professional')
                setMobileTab('discover')
              }}
            >
              <UserRound size={16} />
              Professional Mobile
            </button>
            <button
              className={`role-tab ${activeRole === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveRole('admin')}
            >
              <Shield size={16} />
              Platform Operations
            </button>
          </div>

          <button className="btn btn-secondary" style={{ padding: '0.45rem 0.85rem' }} onClick={fetchData}>
            <RefreshCw size={16} />
          </button>
        </div>
      </header>

      {/* Backend offline warning banner */}
      {backendOffline && (
        <div style={{
          background: 'var(--accent-danger-bg)',
          color: 'var(--accent-danger)',
          padding: '0.75rem 2.5rem',
          fontSize: '0.9rem',
          borderBottom: '1px solid rgba(239,68,68,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontWeight: '500'
        }}>
          <AlertTriangle size={18} />
          <span>FastAPI Backend Offline. Please run <code>uvicorn api.index:app --reload</code> locally to activate database state sync and algorithms.</span>
        </div>
      )}

      {/* Main page views */}
      <main className="main-content fade-in">

        {/* 1. HEALTHCARE FACILITY PORTAL */}
        {activeRole === 'facility' && (
          <div className="dashboard-grid">

            {/* Top row: Select Active Facility & Overview */}
            <div className="col-12 glass-panel" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem' }}>Floor Management & Staffing Console</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Monitor ward vacancy, plan shifts, and approve timesheets</p>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Selected Facility:</span>
                <select
                  className="form-input"
                  style={{ width: '220px', padding: '0.45rem' }}
                  value={selectedFacilityId}
                  onChange={(e) => setSelectedFacilityId(Number(e.target.value))}
                >
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dashboard metrics widgets */}
            {facilityDashboard && (
              <>
                <div className="col-4 glass-panel stat-card">
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Department Fill Rate</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span className="stat-num">{facilityDashboard.fill_rate}%</span>
                    <span style={{ color: 'var(--accent-success)', fontSize: '0.8rem', display: 'flex', alignItems: 'center' }}>
                      <TrendingUp size={12} /> +2.4% vs last week
                    </span>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', height: '6px', borderRadius: '3px', marginTop: '0.5rem', overflow: 'hidden' }}>
                    <div style={{ background: 'var(--primary)', width: `${facilityDashboard.fill_rate}%`, height: '100%' }}></div>
                  </div>
                </div>

                <div className="col-4 glass-panel stat-card">
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Staffing Status Alert</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
                    {facilityDashboard.open_shifts > 0 ? (
                      <>
                        <AlertTriangle size={24} style={{ color: 'var(--accent-warning)' }} />
                        <div>
                          <span style={{ fontWeight: '600', color: 'white' }}>{facilityDashboard.open_shifts} Open Shift Vacancies</span>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ICU & General Wards require urgent coverage</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={24} style={{ color: 'var(--accent-success)' }} />
                        <div>
                          <span style={{ fontWeight: '600', color: 'white' }}>Fully Staffed</span>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>All scheduled slots confirmed</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="col-4 glass-panel stat-card">
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Budget Allocation (Ireland HSE Cap)</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                    <span className="stat-num">€{facilityDashboard.budget_spent}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>/ €{facilityDashboard.budget_cap}</span>
                  </div>
                  <div style={{ background: 'var(--bg-secondary)', height: '6px', borderRadius: '3px', marginTop: '0.5rem', overflow: 'hidden' }}>
                    <div style={{
                      background: facilityDashboard.budget_spent > facilityDashboard.budget_cap * 0.9 ? 'var(--accent-danger)' : 'var(--accent-success)',
                      width: `${Math.min((facilityDashboard.budget_spent / facilityDashboard.budget_cap) * 100, 100)}%`,
                      height: '100%'
                    }}></div>
                  </div>
                </div>
              </>
            )}

            {/* Left Col: Create Shifts Form */}
            <div className="col-4 glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PlusCircle className="brand-logo" size={20} />
                Post Required Shift
              </h3>
              <form onSubmit={handleCreateShift}>
                <div className="form-group">
                  <label className="form-label">Required Role</label>
                  <select
                    className="form-input"
                    value={newShift.role_required}
                    onChange={(e) => setNewShift({ ...newShift, role_required: e.target.value })}
                  >
                    <option value="Nurse">Nurse (Registered General)</option>
                    <option value="HCA">Healthcare Assistant (HCA)</option>
                    <option value="Midwife">Registered Midwife</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Specialty Unit</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. ICU, Maternity, Emergency"
                    value={newShift.specialty}
                    onChange={(e) => setNewShift({ ...newShift, specialty: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Department / Ward</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. General Ward B"
                    value={newShift.budget_department}
                    onChange={(e) => setNewShift({ ...newShift, budget_department: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Start Time</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={newShift.date_time}
                      onChange={(e) => setNewShift({ ...newShift, date_time: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Time</label>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={newShift.end_time}
                      onChange={(e) => setNewShift({ ...newShift, end_time: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Hourly Rate (€)</label>
                    <input
                      type="number"
                      step="0.5"
                      className="form-input"
                      value={newShift.rate}
                      onChange={(e) => setNewShift({ ...newShift, rate: Number(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Unpaid Break (mins)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={newShift.break_minutes}
                      onChange={(e) => setNewShift({ ...newShift, break_minutes: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                  Post Shift Broadcast
                </button>
              </form>
            </div>

            {/* Center Col: Active Shifts Board */}
            <div className="col-8 glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ marginBottom: '1.25rem' }}>Live Shifts Board</h3>

              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Shift Details</th>
                      <th>Department</th>
                      <th>Date / Time</th>
                      <th>Offer Rate</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.filter(s => s.facility_id === selectedFacilityId).map(s => {
                      const sDate = new Date(s.date_time)
                      return (
                        <tr key={s.id}>
                          <td>
                            <div style={{ fontWeight: '600' }}>{s.role_required} - {s.specialty}</div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: #{s.id}</span>
                          </td>
                          <td>{s.budget_department}</td>
                          <td>
                            <div style={{ fontSize: '0.85rem' }}>{sDate.toLocaleDateString()}</div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {sDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td><span style={{ fontWeight: '600', color: 'white' }}>€{s.rate}/hr</span></td>
                          <td>
                            <span className={`badge badge-${s.status}`}>
                              {s.status}
                            </span>
                          </td>
                          <td>
                            {s.status === 'open' && (
                              <button
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                                onClick={() => handleViewMatches(s)}
                              >
                                Match AI
                              </button>
                            )}
                            {s.status === 'completed' && s.timesheet && s.timesheet.status === 'pending' && (
                              <button
                                className="btn btn-success"
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                                onClick={() => handleVerifyTimesheet(s.timesheet.id, true)}
                              >
                                Approve Timesheet
                              </button>
                            )}
                            {s.status === 'completed' && s.timesheet && s.timesheet.status === 'approved' && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--accent-success)' }}>Billed</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Collapsible Candidate Match panel */}
              {selectedShift && (
                <div className="glass-panel" style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'var(--bg-secondary)', border: '1px solid var(--primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h4 style={{ fontSize: '0.95rem' }}>AI Matching Candidates for Shift #{selectedShift.id}</h4>
                    <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={() => setSelectedShift(null)}>Close</button>
                  </div>
                  {shiftOffers.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No eligible candidates matched. Try adjusting rate caps.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {shiftOffers.map(o => (
                        <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <img src={o.professional.image_url} alt="Profile" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                            <div>
                              <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{o.professional.name}</div>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{o.explanation}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: '700', color: 'var(--primary-hover)', fontSize: '0.9rem' }}>{o.match_score}% Match</div>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Rate: €{o.professional.hourly_rate}/hr</span>
                            </div>
                            <span className="badge badge-open" style={{ fontSize: '0.65rem' }}>Offered</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Row: Timesheet Disputes & Verifications queue */}
            <div className="col-12 glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1.25rem' }}>Ward Supervisor Signature & Verification Center</h3>
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Professional</th>
                      <th>Shift Details</th>
                      <th>Clock-In (Actual)</th>
                      <th>Clock-Out (Actual)</th>
                      <th>Break</th>
                      <th>Digital Signature</th>
                      <th>Status</th>
                      <th>Verification Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timesheets.filter(ts => ts.shift.facility_id === selectedFacilityId).map(ts => {
                      const cIn = new Date(ts.clock_in)
                      const cOut = new Date(ts.clock_out)
                      return (
                        <tr key={ts.id}>
                          <td style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <img src={ts.professional.image_url} alt="" style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} />
                            <span>{ts.professional.name}</span>
                          </td>
                          <td>#{ts.shift.id} - {ts.shift.role_required} ({ts.shift.specialty})</td>
                          <td>{cIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                          <td>{cOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                          <td>{ts.break_minutes} mins</td>
                          <td>
                            {ts.signature_base64 ? (
                              <div style={{ border: '1px solid var(--border-color)', borderRadius: '4px', background: 'white', display: 'inline-block', padding: '2px' }}>
                                <img src={ts.signature_base64} alt="Signature" style={{ height: '30px', width: '80px', objectFit: 'contain', filter: 'invert(1)' }} />
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>None</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${ts.status === 'approved' ? 'badge-completed' : ts.status === 'disputed' ? 'badge-disputed' : 'badge-pending'}`}>
                              {ts.status}
                            </span>
                          </td>
                          <td>
                            {ts.status === 'pending' && (
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-success" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleVerifyTimesheet(ts.id, true)}>
                                  Approve
                                </button>
                                <button
                                  className="btn btn-danger"
                                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }}
                                  onClick={() => {
                                    const reason = prompt("Enter dispute reason:")
                                    if (reason) handleVerifyTimesheet(ts.id, false, reason)
                                  }}
                                >
                                  Dispute
                                </button>
                              </div>
                            )}
                            {ts.status === 'disputed' && (
                              <span style={{ color: 'var(--accent-danger)', fontSize: '0.75rem', fontWeight: '500' }}>Reason: "{ts.dispute_narrative}"</span>
                            )}
                            {ts.status === 'approved' && (
                              <span style={{ color: 'var(--accent-success)', fontSize: '0.75rem', fontWeight: '500' }}>Finalized</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* 2. HEALTHCARE PROFESSIONAL MOBILE EXPERIENCE */}
        {activeRole === 'professional' && (
          <div className="dashboard-grid">

            {/* Control Sidebar (Vetting simulator, role select) */}
            <div className="col-4 glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1.25rem' }}>Professional Profile Controller</h3>
              <div className="form-group">
                <label className="form-label">Active Worker Account</label>
                <select
                  className="form-input"
                  value={selectedProfessionalId}
                  onChange={(e) => setSelectedProfessionalId(Number(e.target.value))}
                >
                  {professionals.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.specialty})</option>
                  ))}
                </select>
              </div>

              {professionalDashboard && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1.5rem' }}>
                  <div style={{ background: 'var(--bg-secondary)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vetting / Credential State:</span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                      <span style={{ fontWeight: '700' }}>NMBI & Garda clearance</span>
                      <span className={`badge badge-${professionalDashboard.compliance_status}`}>
                        {professionalDashboard.compliance_status}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
                    <div>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'white' }}>€{professionalDashboard.total_earned}</div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Earned</span>
                    </div>
                    <div>
                      <div style={{ fontSize: '1.5rem', fontWeight: '700', color: 'white' }}>{professionalDashboard.hours_worked}h</div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Hours Approved</span>
                    </div>
                  </div>
                </div>
              )}

              <hr style={{ borderColor: 'var(--border-color)', margin: '1.5rem 0' }} />

              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>Upload Compliance Document</h4>
              <form onSubmit={handleUploadDoc}>
                <div className="form-group">
                  <label className="form-label">Document Type</label>
                  <select
                    className="form-input"
                    value={uploadDocType}
                    onChange={(e) => setUploadDocType(e.target.value)}
                  >
                    <option value="NMBI Registration">NMBI Registration Certificate</option>
                    <option value="Garda Vetting Clearance">Garda Vetting Form</option>
                    <option value="ACLS Certificate">ACLS training</option>
                    <option value="Immunization Certificate">Immunization Records</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Expiry Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={uploadDocExpiry}
                    onChange={(e) => setUploadDocExpiry(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-secondary" style={{ width: '100%', fontSize: '0.85rem' }}>
                  Submit Document (OCR Scan)
                </button>
              </form>
            </div>

            {/* Smartphone Simulator */}
            <div className="col-8">
              <div className="phone-simulator">
                <div className="phone-screen">

                  {/* Status Bar */}
                  <div className="phone-header">
                    <span>MediOracle Go</span>
                    <span>12:00 PM</span>
                    <span>5G Geofence ON</span>
                  </div>

                  {/* Navigation Tab Bar */}
                  <div className="phone-nav">
                    <button className={`phone-nav-btn ${mobileTab === 'discover' ? 'active' : ''}`} onClick={() => setMobileTab('discover')}>
                      <Compass size={18} />
                      Discover
                    </button>
                    <button className={`phone-nav-btn ${mobileTab === 'active' ? 'active' : ''}`} onClick={() => setMobileTab('active')}>
                      <Briefcase size={18} />
                      Active Shift
                    </button>
                    <button className={`phone-nav-btn ${mobileTab === 'compliance' ? 'active' : ''}`} onClick={() => setMobileTab('compliance')}>
                      <FileText size={18} />
                      Compliance
                    </button>
                    <button className={`phone-nav-btn ${mobileTab === 'earnings' ? 'active' : ''}`} onClick={() => setMobileTab('earnings')}>
                      <Euro size={18} />
                      Earnings
                    </button>
                  </div>

                  {/* Phone Body */}
                  <div className="phone-body">

                    {/* Tab 1: Discover Shift Feed */}
                    {mobileTab === 'discover' && (
                      <div className="fade-in">
                        <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', fontFamily: 'var(--font-display)' }}>Recommended Shifts Nearby</h4>
                        {professionalOffers.length === 0 ? (
                          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            <Briefcase size={36} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                            No matching shift offers currently available. Vetting or specialty adjustments might be required.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {professionalOffers.map(o => (
                              <div key={o.id} className="glass-panel" style={{ padding: '0.85rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>{o.shift.facility.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--primary-hover)', fontWeight: '600' }}>{o.shift.role_required} - {o.shift.specialty}</div>
                                  </div>
                                  <span style={{ fontSize: '1rem', fontWeight: '800', color: 'white' }}>€{o.shift.rate}/hr</span>
                                </div>

                                <div style={{ margin: '0.5rem 0', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <MapPin size={10} />
                                    {o.shift.facility.region} • {o.shift.budget_department}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '2px' }}>
                                    <Calendar size={10} />
                                    {new Date(o.shift.date_time).toLocaleDateString()} @ {new Date(o.shift.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>

                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.45rem', borderRadius: '4px', fontSize: '0.65rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                  <span style={{ color: 'var(--secondary)', fontWeight: '600' }}>AI Explainer:</span> {o.explanation}
                                </div>

                                <button
                                  className="btn btn-primary"
                                  style={{ width: '100%', padding: '0.45rem', fontSize: '0.75rem', borderRadius: '6px' }}
                                  onClick={() => handleAcceptOffer(o.id)}
                                >
                                  Accept & Confirm Slot
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 2: Clock-In & Timesheet Submission */}
                    {mobileTab === 'active' && (
                      <div className="fade-in">
                        <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', fontFamily: 'var(--font-display)' }}>Shift execution tracker</h4>

                        {!activeShift ? (
                          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            No active shift booked for today.
                          </div>
                        ) : (
                          <div className="glass-panel" style={{ padding: '1rem', background: 'var(--bg-secondary)' }}>
                            <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{activeShift.facility.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--primary-hover)', fontWeight: '600', marginBottom: '0.5rem' }}>
                              {activeShift.role_required} - {activeShift.specialty}
                            </div>

                            {/* Simulated Dublin Map */}
                            <div className="map-canvas" style={{ margin: '0.75rem 0' }}>
                              <div className="map-grid-line" style={{ width: '100%', height: '1px', top: '30%' }}></div>
                              <div className="map-grid-line" style={{ width: '100%', height: '1px', top: '60%' }}></div>
                              <div className="map-grid-line" style={{ height: '100%', width: '1px', left: '40%' }}></div>
                              <div className="map-grid-line" style={{ height: '100%', width: '1px', left: '70%' }}></div>

                              {/* Facility Marker */}
                              <div className="map-marker-facility" style={{ top: '45%', left: '50%' }}></div>
                              <span style={{ position: 'absolute', top: '55%', left: '35%', fontSize: '0.6rem', background: '#000', padding: '1px 3px', borderRadius: '3px' }}>HSE St James</span>

                              {/* Professional Marker (GPS geofenced close by) */}
                              <div className="map-marker" style={{ top: '48%', left: '48%' }}></div>
                            </div>

                            <p style={{ fontSize: '0.7rem', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.75rem' }}>
                              <CheckCircle2 size={12} /> Geofence Verified: You are inside the hospital perimeter
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              {!clockInTime ? (
                                <button className="btn btn-success" style={{ width: '100%', padding: '0.6rem' }} onClick={handleClockIn}>
                                  <Clock size={16} /> GPS Clock In
                                </button>
                              ) : (
                                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.5rem' }}>
                                    <span>Clock-in Time:</span>
                                    <span style={{ fontWeight: '600', color: 'var(--accent-success)' }}>
                                      {clockInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>

                                  <div style={{ margin: '0.75rem 0' }}>
                                    <label className="form-label" style={{ fontSize: '0.7rem' }}>Ward Manager Signature (Draw Pad)</label>
                                    <div className="signature-box"
                                      onMouseDown={startDrawing}
                                      onMouseMove={draw}
                                      onMouseUp={stopDrawing}
                                      onMouseLeave={stopDrawing}
                                      onTouchStart={startDrawing}
                                      onTouchMove={draw}
                                      onTouchEnd={stopDrawing}
                                    >
                                      <canvas
                                        ref={canvasRef}
                                        width={320}
                                        height={140}
                                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                                      />
                                      <span className="signature-prompt">Draw Sign here</span>
                                    </div>
                                    <button
                                      type="button"
                                      className="btn btn-secondary"
                                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.65rem', marginTop: '0.25rem', borderRadius: '4px' }}
                                      onClick={clearCanvas}
                                    >
                                      Clear Sign
                                    </button>
                                  </div>

                                  <button className="btn btn-danger" style={{ width: '100%', padding: '0.6rem' }} onClick={handleClockOutAndSubmit}>
                                    <Clock size={16} /> GPS Clock Out & Submit
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 3: Upload Vetting/Training Docs list */}
                    {mobileTab === 'compliance' && (
                      <div className="fade-in">
                        <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', fontFamily: 'var(--font-display)' }}>Vetting Documentation</h4>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {complianceDocs.length === 0 ? (
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Loading documents...</p>
                          ) : (
                            complianceDocs.filter(d => d.professional_id === selectedProfessionalId).map(d => (
                              <div key={d.id} style={{ display: 'flex', justify: 'space-between', alignItems: 'center', padding: '0.65rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                <div>
                                  <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>{d.doc_type}</div>
                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Expires: {d.expiry_date}</span>
                                </div>
                                <span className={`badge ${d.status === 'approved' ? 'badge-completed' : d.status === 'rejected' ? 'badge-disputed' : 'badge-pending'}`} style={{ fontSize: '0.6rem', padding: '0.2rem 0.5rem' }}>
                                  {d.status}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tab 4: Earnings Summary & Instant Pay */}
                    {mobileTab === 'earnings' && (
                      <div className="fade-in">
                        <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', fontFamily: 'var(--font-display)' }}>Earnings Console</h4>

                        {professionalDashboard && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="glass-panel" style={{ padding: '1rem', background: 'var(--bg-secondary)', textAlign: 'center' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Approved Shift Earnings</span>
                              <div style={{ fontSize: '2rem', fontWeight: '800', margin: '0.25rem 0' }}>€{professionalDashboard.total_earned}</div>
                              <span style={{ fontSize: '0.65rem', color: 'var(--accent-success)' }}>Updated: 1h ago</span>
                            </div>

                            <div className="glass-panel" style={{ padding: '1rem', border: '1px solid var(--secondary)', background: 'var(--bg-secondary)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>Instant Cashout Balance</span>
                                <span className="badge badge-open" style={{ fontSize: '0.6rem', background: 'rgba(0,191,255,0.1)' }}>Ready</span>
                              </div>
                              <div style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '0.75rem' }}>€{professionalDashboard.instant_pay_eligible}</div>

                              <button
                                className="btn btn-primary"
                                style={{ width: '100%', padding: '0.5rem', fontSize: '0.75rem', background: 'var(--secondary)', border: 'none', boxShadow: 'none' }}
                                onClick={() => {
                                  if (professionalDashboard.instant_pay_eligible <= 0) {
                                    alert("No pending approved shifts eligible for instant payout.")
                                  } else {
                                    alert(`Instant payout of €${professionalDashboard.instant_pay_eligible} successfully dispatched to your Irish bank account. Check your banking app in 5 minutes!`)
                                    fetchData()
                                  }
                                }}
                              >
                                <Zap size={12} /> Claim Instant Payout (2% Fee)
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  </div>

                </div>
              </div>
            </div>

          </div>
        )}

        {/* 3. PLATFORM OPERATIONS CONSOLE */}
        {activeRole === 'admin' && (
          <div className="dashboard-grid">

            <div className="col-12 glass-panel" style={{ padding: '1.25rem' }}>
              <h2>MediOracle Agency Operations & Regulator Panel</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Verify compliance credentials, audit AI score match explanation pipelines, and process billing invoices</p>
            </div>

            {/* Left: Credential compliance queue */}
            <div className="col-6 glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield className="brand-logo" size={20} />
                Regulator Compliance Registry (Pending Queue)
              </h3>

              {complianceQueue.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Compliance registry queue is currently empty.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {complianceQueue.map(item => (
                    <div key={item.doc_id} style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Professional ID: #{item.professional_id}</span>
                          <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{item.professional_name}</div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--primary-hover)', fontWeight: '600' }}>{item.specialty} Specialty</span>
                        </div>
                        <span className="badge badge-pending" style={{ fontSize: '0.65rem' }}>{item.doc_type}</span>
                      </div>

                      <div style={{ margin: '0.75rem 0', fontSize: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '4px' }}>
                        <span style={{ fontWeight: '600' }}>OCR Metadata Extracted:</span>
                        <div style={{ display: 'flex', justify: 'space-between', marginTop: '2px' }}>
                          <span>Expiry: {item.expiry_date}</span>
                          <span style={{ color: 'var(--accent-success)' }}>Match Found in Irish DB</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center' }}>
                        <a href={item.doc_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>View Document Scan</a>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-success" style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }} onClick={() => handleVerifyCompliance(item.doc_id, true)}>
                            Approve
                          </button>
                          <button className="btn btn-danger" style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }} onClick={() => handleVerifyCompliance(item.doc_id, false)}>
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Invoices & Payroll Hub */}
            <div className="col-6 glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileSpreadsheet className="brand-logo" size={20} />
                Financial Billings & HSE Invoices
              </h3>

              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Invoice ID</th>
                      <th>Facility</th>
                      <th>Total Amount</th>
                      <th>Issued Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map(inv => (
                      <tr key={inv.id}>
                        <td style={{ fontWeight: '700' }}>{inv.invoice_number}</td>
                        <td>{inv.facility.name}</td>
                        <td><span style={{ color: 'white', fontWeight: '600' }}>€{inv.total_amount}</span></td>
                        <td>{inv.issued_date}</td>
                        <td>
                          <span className={`badge ${inv.status === 'paid' ? 'badge-completed' : 'badge-open'}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td>
                          {inv.status === 'sent' && (
                            <button className="btn btn-primary" style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handlePayInvoice(inv.id)}>
                              Mark Paid
                            </button>
                          )}
                          {inv.status === 'paid' && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--accent-success)' }}>Settled</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer style={{ padding: '2rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', marginTop: 'auto' }}>
        Abi-MediOracle Healthcare Portal © 2026. Built with React, FastAPI, SQLite & Vercel.
      </footer>
    </div>
  )
}
