# SIH Project — AI-Enabled Mine Subsidence Monitoring & Early Warning System

An end-to-end prototype for monitoring underground mine conditions using sensor data, a FastAPI backend, machine-learning based anomaly/risk analysis, and a React dashboard.

## 📁 Project Structure

```text
SIH-project-main/
│
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── requirements.txt
│   │
│   └── ml/
│       ├── anomaly_detector.py
│       ├── feature_engineering.py
│       ├── risk_engine.py
│       ├── train_model.py
│       └── artifacts/
│           ├── isolation_forest.joblib
│           ├── model_metadata.json
│           └── training_features.csv
│
├── frontend/
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── App.jsx
│       ├── SensorChart.jsx
│       └── components/
│
└── simulator/
    └── sensor_simulator.py
```

## 🛠️ Technologies

### Backend
- Python
- FastAPI
- Uvicorn
- SQLAlchemy
- SQLite
- Pandas / NumPy
- Scikit-learn
- Joblib

### Frontend
- React
- Vite
- Recharts

### ML
- Isolation Forest anomaly detection
- Feature engineering
- Rule/score-based risk analysis

---

# 🚀 Run the Project on a New Laptop

Follow the steps below in order.

## 1. Prerequisites

Install the following:

- **Git**
- **Python 3.10+**
- **Node.js 18+**
- npm (comes with Node.js)

Check the installations:

```bash
git --version
python --version
node --version
npm --version
```

> On some Windows systems, use `py --version` instead of `python --version`.

---

# 2. Clone the Repository

Open Command Prompt / PowerShell / Git Bash:

```bash
git clone https://github.com/dhanusiyasri/SIH-project.git
cd SIH-project
```

If the cloned folder has a different name, enter the actual repository folder before continuing.

---

# 3. Backend Setup

Open a terminal in the project root and run:

```bash
cd backend
```

## 3.1 Create Python Virtual Environment

Create a separate virtual environment for the backend:

```bash
python -m venv venv
```

### Windows — Command Prompt

```cmd
venv\Scripts\activate
```

### Windows — PowerShell

```powershell
venv\Scripts\Activate.ps1
```

After activation, the terminal should look similar to:

```text
(venv) C:\...\SIH-project\backend>
```

### If PowerShell blocks activation

Run:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then activate again:

```powershell
venv\Scripts\Activate.ps1
```

## 3.2 Install Python Dependencies

Make sure `(venv)` is visible in the terminal, then:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

The backend dependencies include:

- fastapi
- uvicorn
- sqlalchemy
- pydantic
- requests
- numpy
- pandas
- scikit-learn
- joblib

## 3.3 Start the Backend

From the `backend` directory, with the virtual environment activated:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8080
```

The API will be available at:

```text
http://127.0.0.1:8080
```

FastAPI's interactive API documentation:

```text
http://127.0.0.1:8080/docs
```

Keep this terminal running.

> **Important:** Do not close the backend terminal while using the frontend or simulator.

---

# 4. Frontend Setup

Open a **new terminal**.

From the project root:

```bash
cd frontend
```

Install the Node.js dependencies:

```bash
npm install
```

Start the React/Vite development server:

```bash
npm run dev
```

Vite will display the local URL in the terminal, normally:

```text
http://localhost:5173
```

Open that URL in your browser.

> Keep this terminal running too.

---

# 5. Run the Sensor Simulator

The repository includes a Python sensor simulator that can send simulated sensor readings to the backend.

Open another terminal.

From the project root:

```bash
cd backend
venv\Scripts\activate
cd ../simulator
python sensor_simulator.py
```

If the simulator is designed to communicate with the local backend, make sure the backend is already running on port `8080`.

> If you are using PowerShell, activate the environment with:
>
> ```powershell
> ..\backend\venv\Scripts\Activate.ps1
> ```

---

# 6. Recommended Startup Order

Whenever you want to run the complete project, use **three terminals**.

### Terminal 1 — Backend

```bash
cd SIH-project/backend
venv\Scripts\activate
uvicorn main:app --reload --host 0.0.0.0 --port 8080
```

### Terminal 2 — Frontend

```bash
cd SIH-project/frontend
npm run dev
```

### Terminal 3 — Sensor Simulator

```bash
cd SIH-project/backend
venv\Scripts\activate
cd ../simulator
python sensor_simulator.py
```

Then open:

```text
http://localhost:5173
```

---

# 🗄️ Database

The backend uses **SQLite** through SQLAlchemy.

The repository already contains:

```text
backend/sensor_data.db
```

The database is used to store sensor-related data used by the backend.

For a fresh installation, keep the database file in the `backend` directory unless the application code is intentionally changed to use another database.

---

# 🤖 Machine Learning

The backend contains the ML components under:

```text
backend/ml/
```

### Main ML files

| File | Purpose |
|---|---|
| `anomaly_detector.py` | Detects abnormal sensor patterns |
| `feature_engineering.py` | Processes sensor data into ML features |
| `risk_engine.py` | Calculates risk-related outputs |
| `train_model.py` | Model training utility |

Pre-trained/model artifacts are already included:

```text
backend/ml/artifacts/
├── isolation_forest.joblib
├── model_metadata.json
└── training_features.csv
```

Therefore, a teammate does **not necessarily need to train the model again just to run the existing application**.

---

# 🔌 Hardware vs Simulator

This repository currently provides a **sensor simulator** so that the software can be tested without connecting physical ESP32 sensor nodes.

The intended overall flow is:

```text
ESP32 + Sensors
       │
       ▼
 Sensor Data
       │
       ▼
 FastAPI Backend
       │
       ▼
 Database
       │
       ▼
 Feature Engineering
       │
       ▼
 AI Anomaly Detection
       │
       ▼
 Risk Analysis
       │
       ▼
 React Dashboard
```

For software-only testing, the simulator can be used in place of the physical ESP32.

---

# 📡 Sensor Data

The project is designed around sensor measurements such as:

- Tilt / inclination
- Vibration
- Deformation

The intended hardware stack includes:

- ESP32
- MPU6050/MPU6500-type motion/tilt sensor
- SW-420 vibration sensor
- FSR-based deformation indicator

The simulator allows the backend and dashboard workflow to be tested before connecting the physical hardware.

---

# 🧪 Testing the API

After starting the backend, open:

```text
http://127.0.0.1:8080/docs
```

The Swagger UI allows you to inspect and test the available API endpoints directly from the browser.

You can also check the backend root endpoint if available:

```text
http://127.0.0.1:8080/
```

---

# ⚠️ Common Problems

## 1. `python` is not recognized

Try:

```bash
py --version
```

If `py` works, create the virtual environment using:

```bash
py -m venv venv
```

Then activate it normally.

If neither command works, install Python and make sure it is added to PATH.

---

## 2. PowerShell does not allow `Activate.ps1`

Run:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then:

```powershell
venv\Scripts\Activate.ps1
```

---

## 3. `pip install` fails

First make sure the virtual environment is active:

```text
(venv)
```

Then:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

---

## 4. Port 8080 is already in use

Run the backend on another port:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8081
```

If you change the backend port, make sure the frontend/simulator API URL is changed accordingly wherever it is configured in the source code.

---

## 5. `npm install` fails

Check:

```bash
node --version
npm --version
```

Then try:

```bash
npm cache clean --force
npm install
```

---

## 6. Frontend cannot communicate with backend

Check that:

1. Backend is running.
2. Backend is running on the expected port (`8080` by default).
3. Frontend is running.
4. The API URL used by the frontend points to the correct backend address.
5. The browser console does not show a CORS/network error.

Open the backend documentation to confirm that the API is reachable:

```text
http://127.0.0.1:8080/docs
```

---

## 7. Simulator cannot send data

Make sure the backend is started **before** starting the simulator.

Recommended order:

```text
Backend → Frontend → Simulator
```

---

# 🧹 Deactivate Virtual Environment

When you finish working:

```bash
deactivate
```

To activate it again later:

```bash
cd backend
venv\Scripts\activate
```

---

# 🔐 Important: Do Not Commit `venv`

The `venv` folder is specific to each laptop and should not be uploaded to GitHub.

Add this to `.gitignore`:

```gitignore
venv/
.venv/
__pycache__/
*.pyc
.env
```

Each team member should create their own environment:

```bash
python -m venv venv
```

and install the dependencies:

```bash
pip install -r requirements.txt
```

---

# 📌 Quick Start

For someone who already has Git, Python, and Node.js installed:

```bash
git clone https://github.com/dhanusiyasri/SIH-project.git
cd SIH-project
```

### Terminal 1

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8080
```

### Terminal 2

```bash
cd SIH-project/frontend
npm install
npm run dev
```

### Terminal 3

```bash
cd SIH-project/backend
venv\Scripts\activate
cd ../simulator
python sensor_simulator.py
```

Then open:

```text
http://localhost:5173
```

---

# 👥 For Team Members

If you are setting up this project on your laptop for the first time:

1. Clone the repository.
2. Install Python and Node.js.
3. Create the backend `venv`.
4. Install `requirements.txt`.
5. Start FastAPI.
6. Run `npm install` in `frontend`.
7. Start the React frontend.
8. Start the sensor simulator.
9. Open the Vite URL in your browser.
10. Use the dashboard and FastAPI `/docs` page to verify the system.

---

## 📄 License

This project was developed as part of a **Smart India Hackathon (SIH)** project.
