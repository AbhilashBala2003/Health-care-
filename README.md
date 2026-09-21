# Nexgile MediOracle - Healthcare Workforce Portal

An end-to-end Healthcare Workforce Management and Shift Booking platform built with **React (Vite)** on the frontend and **FastAPI (Python)** on the backend. Designed for healthcare facilities, medical professionals (nurses, doctors, caregivers), and system administrators.

---

## 🌟 Key Features

- **Multi-Role Portals**: Tailored interfaces for Healthcare Facilities, Medical Professionals, and System Administrators.
- **Shift & Workforce Management**: Post, browse, apply, and schedule medical shifts in real time.
- **Automated Credential Verification**: Verify medical licenses, certifications, and compliance status.
- **Smart Matching Engine**: Match open shifts with qualified professionals based on skills, availability, and location.
- **Financial & Invoicing Suite**: Generate invoices, track hourly payouts, and monitor payroll metrics.
- **Analytics & Insights**: Real-time dashboard charts and reporting on staffing fill rates and expenditure.

---

## 🏗 Project Architecture & Tech Stack

- **Frontend**: React 18, Vite, Lucide React (Icons), Modern Vanilla CSS
- **Backend**: Python 3.9+, FastAPI, SQLAlchemy, Pydantic, Uvicorn
- **Database**: SQLite (default local development) / PostgreSQL (production ready)
- **Deployment**: Vercel ready (`vercel.json`)

---

## 📋 Prerequisites

Ensure you have the following installed on your system:

- **Node.js**: `v18.0.0` or higher ([Download Node.js](https://nodejs.org/))
- **npm**: `v9.0.0` or higher (bundled with Node.js)
- **Python**: `v3.9` or higher ([Download Python](https://www.python.org/))
- **Git**: Installed and configured on your machine

---

## 🚀 Quick Setup & Installation Guide

### 1. Clone the Repository

```bash
git clone https://github.com/AbhilashBala2003/Health-care-.git
cd Health-care-
```

---

### 2. Backend Setup (FastAPI)

1. **Navigate to the project root directory** (if not already there):
   ```bash
   cd Health-care-
   ```

2. **Create a Python Virtual Environment**:
   - **Windows (PowerShell / Command Prompt)**:
     ```bash
     python -m venv venv
     .\venv\Scripts\activate
     ```
   - **macOS / Linux**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. **Install Backend Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Configuration (Optional)**:
   By default, the application runs using a local SQLite database (`sql_app.db`). If you wish to use PostgreSQL, create a `.env` file in the root directory:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/dbname
   ```

5. **Start the Backend API Server**:
   ```bash
   uvicorn api.index:app --reload --port 8000
   ```
   - Interactive API Documentation (Swagger UI): `http://127.0.0.1:8000/docs`
   - API Root Endpoint: `http://127.0.0.1:8000/api`

---

### 3. Frontend Setup (React + Vite)

1. **Install Frontend Dependencies**:
   ```bash
   npm install
   ```

2. **Start the Vite Development Server**:
   ```bash
   npm run dev
   ```

3. **Access the Application**:
   Open your web browser and navigate to `http://localhost:5173`.

---

## 🛠 Available Scripts

In the project root directory, you can run:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Runs the React frontend app in development mode |
| `npm run build` | Builds the static production app to the `dist` folder |
| `npm run preview` | Previews the production build locally |
| `uvicorn api.index:app --reload` | Runs the FastAPI backend server locally with hot-reloading |

---

## 📂 Project Structure

```text
├── api/                  # Python FastAPI Backend
│   ├── index.py          # Main FastAPI app & routing
│   ├── crud.py           # Database CRUD operations
│   ├── database.py       # SQLAlchemy engine & session setup
│   ├── models.py         # SQLAlchemy ORM models
│   ├── schemas.py        # Pydantic schemas for data validation
│   └── seed.py           # Initial database seeding script
├── src/                  # React Frontend Application
│   ├── App.jsx           # Core dashboard & UI component workflow
│   ├── index.css         # Application stylesheet
│   └── main.jsx          # React entry point
├── dist/                 # Production web build artifacts
├── index.html            # Vite HTML shell
├── package.json          # Node dependencies and scripts
├── requirements.txt      # Python dependencies
├── vercel.json           # Vercel deployment configuration
└── README.md             # Documentation & Setup guide
```

---

## 🌐 Deployment (Vercel)

This project is pre-configured for Vercel deployment using `vercel.json`.

1. Install Vercel CLI: `npm i -g vercel`
2. Deploy to Vercel:
   ```bash
   vercel
   ```

---

## 📄 License

This project is open-source under the MIT License.
