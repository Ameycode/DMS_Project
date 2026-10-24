# VoltSlot: EV Charging Slot & Billing Management System
> **College-Level Relational Database Management System (DBMS) Project**  
> Built with React.js (Vite), Node.js (Express), and MySQL 8.x (3NF Normalized).

---

## 1. Project Abstract & Objectives

In commercial EV charging plazas, drivers frequently encounter confusion regarding **which physical charger cabinet owns which charging port dispenser**. Furthermore, race conditions often result in double bookings for the same port during peak hours.

**VoltSlot** is a full-stack DBMS application engineered to solve these challenges through:
1. **Unambiguous Relational Hierarchy**: A strict foreign key dependency chain enforcing $\text{Station} \longrightarrow \text{Charger} \longrightarrow \text{Port}$.
2. **ACID Concurrency Protection**: Preventing double booking of the exact physical port via MySQL row-level pessimistic locking (`SELECT ... FOR UPDATE`) over half-open time intervals $[start, end)$.
3. **Simulated EV Metering**: Capturing initial and final meter readings, enforcing non-negative energy monotonicity, and calculating net energy consumption in kWh.
4. **Automated Dynamic Invoicing**: Instant computation of electricity tariffs per kWh, fixed service fees, 18% GST, and printable tax invoice generation.
5. **Role-Based Access Control (RBAC)**: Dedicated interfaces and security middleware for EV Customers, Station Operators, and System Administrators.

---

## 2. Technology Stack

- **Frontend**: React.js 18 with Vite, Tailwind CSS, Lucide React icons, Recharts for analytics.
- **Backend**: Node.js & Express.js REST API.
- **Database Engine**: MySQL 8.x (InnoDB engine with Row-Level Locking).
- **Database Connectivity**: `mysql2/promise` with parameterized queries.
- **Security & Auth**: `bcryptjs` password hashing and JWT (JSON Web Tokens).

---

## 3. Pre-Seeded Demonstration Accounts

All accounts use the uniform test password: **`Password@123`**

| Role | Email Address | Password | Privileges & Capabilities |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@evcharge.com` | `Password@123` | Full dashboard, Station/Charger/Port CRUD, Tariffs, Audit logs, Financial reports |
| **Station Operator** | `operator@evcharge.com` | `Password@123` | Monitor assigned ports, override operational statuses, log defects, view active sessions |
| **EV Customer** | `rahul@gmail.com` | `Password@123` | Browse stations, inspect charger-to-port mapping, book slots, simulate charging, settle invoices |
| **EV Customer (2)** | `priya@gmail.com` | `Password@123` | Additional customer with MG ZS EV (CCS2 connector) |
| **EV Customer (3)** | `kavita@gmail.com` | `Password@123` | Customer with Tata Tiago EV (Type 2 AC connector) |

> ⚡ **Tip for Examiner**: On the Login screen, click any of the **1-Click Fast Sign-In** buttons to authenticate immediately without manual typing!

---

## 4. Setup & Execution Instructions (Local Windows)

### Prerequisites:
- Node.js (v18+ or v20+)
- MySQL Server 8.0 (Service running on port 3306)

### Step 1: Database Setup & Migration
1. Ensure your MySQL Server is running (e.g. `MySQL80` service).
2. Open `backend/.env` and specify your MySQL root password:
   ```env
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password_here
   DB_NAME=ev_charging_db
   ```
3. Initialize the database schema, views, stored procedures, triggers, and seed data:
   ```powershell
   cd backend
   npm run init-db
   ```
   *Alternatively, you can open MySQL Workbench and execute `database/schema.sql`, `database/views.sql`, `database/procedures.sql`, `database/triggers.sql`, and `database/seed.sql` in sequence.*

### Step 2: Start the Backend REST API
In a terminal window:
```powershell
cd backend
npm start
```
The API server starts on **http://localhost:5000**. Verify health status at **http://localhost:5000/api/health**.

### Step 3: Start the Frontend Application
In a second terminal window:
```powershell
cd frontend
npm run dev
```
Open **http://localhost:3000** in your browser.

### Step 4: Run Automated Tests
```powershell
cd backend
npm test
```
Executes the comprehensive automated test suite verifying password hashing, JWT claims, charger-to-port mapping, concurrency intervals, meter calculations, and billing formulas.

---

## 5. College Viva Demonstration Walkthrough (10 Steps)

1. **Sign In**: Navigate to `/login` and click the **Customer** 1-click button to sign in as *Rahul Sharma*.
2. **Find Stations**: Open the **Find Stations** directory. Filter by city *Bengaluru* or connector *CCS2*.
3. **Inspect Hierarchy**: Open *City Centre EV Superhub*. Observe how each physical charger (e.g. `CHG-001`, `CHG-002`) is rendered as a distinct card housing its own ports (`PORT-001`, `PORT-002`).
4. **Charger-to-Port Ownership**: Open the **Charger-Port Map** tab. Query `PORT-002` to see MySQL resolve its parent charger cabinet and station location via `v_charger_port_mapping`.
5. **Book a Port**: Select `PORT-002` (CCS2 • 60 kW) and click **Book This Port**. Select time, view tariff calculation, and click **Confirm Reservation**.
6. **Double-Booking Prevention Test**: Attempt to book an overlapping slot on the exact same port. The backend database lock rejects the transaction and displays a conflict notice.
7. **Simulate Charging**: Open **My Bookings**, locate your confirmed reservation, and click **Start Simulated Charging**. Adjust the battery SoC slider to advance the meter reading.
8. **Finalize Session & Billing**: Click **Complete Session & Generate Bill**. Verify that consumed energy ($kWh = End - Start$) is computed and the invoice is created.
9. **Simulate Payment**: Open the tax invoice, select *UPI*, and click **Pay Now**. Print or save the printable invoice PDF.
10. **Admin & Operator Review**: Sign in as *Admin* (`admin@evcharge.com`) to inspect Recharts analytics, daily revenue, station utilization, and the immutable audit log table.

---

## 6. Project Structure

```
ev-charging-management/
├── backend/
│   ├── src/
│   │   ├── config/db.js              # MySQL connection pool
│   │   ├── controllers/              # REST business logic
│   │   ├── middleware/auth.js        # JWT and role-based middleware
│   │   ├── routes/                   # Modular API route definitions
│   │   ├── scripts/initDb.js         # Automated DB migration script
│   │   └── server.js                 # Express server entry point
│   ├── tests/api.test.js             # Automated business logic tests
│   └── package.json
├── database/
│   ├── schema.sql                    # 3NF relational schema (13 tables)
│   ├── views.sql                     # Views (v_charger_port_mapping, etc.)
│   ├── procedures.sql                # Stored procedures (sp_book_charging_slot)
│   ├── triggers.sql                  # Triggers (trg_audit_port_status_change)
│   ├── seed.sql                      # Realistic sample demonstration data
│   └── reports.sql                   # 15 Advanced demonstration SQL queries
├── frontend/
│   ├── src/
│   │   ├── components/               # ChargerPortCard, modals, navbar
│   │   ├── context/AuthContext.jsx   # Global auth & session state
│   │   ├── pages/                    # 11 Full-stack pages
│   │   ├── services/api.js           # API client with token injection
│   │   ├── App.jsx                   # Page routing coordinator
│   │   └── main.jsx
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── docs/
│   ├── ER_DIAGRAM.md                 # Mermaid ER diagram & cardinalities
│   ├── DATABASE_DESIGN.md            # 3NF normalization proof & indexes
│   ├── API_DOCUMENTATION.md          # REST API specifications
│   ├── TEST_CASES.md                 # Test matrix and results
│   └── VIVA_QUESTIONS.md             # Top 25 DBMS viva questions & answers
├── README.md
├── .env.example
└── package.json                      # Root orchestrator
```

---

## 7. Features Tested & Verification Summary

- [x] Strict Charger-to-Port database hierarchy mapping
- [x] Half-open time interval concurrency collision detection
- [x] ACID transaction rollback on booking conflict
- [x] Monotonic meter energy calculation ($\Delta kWh = End - Start$)
- [x] Dynamic tariff, service fee, and 18% GST billing
- [x] Printable and downloadable tax invoices
- [x] Role-Based Access Control (Admin, Operator, Customer)
- [x] Automated database triggers for port maintenance and auditing
- [x] 15 executable SQL demonstration queries in `reports.sql`
- [x] Responsive UI on desktop, tablet, and mobile
