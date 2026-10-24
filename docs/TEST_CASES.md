# Comprehensive Test Cases & Verification Matrix

The test matrix validates all core relational rules, concurrency invariants, charging formulas, and role permissions.

| Test ID | Module | Scenario / Test Objective | Input / Steps | Expected Relational Behavior | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-AUTH-01** | Auth | User Registration | Valid customer payload with EV model | Inserts user row, hashes password with bcrypt, returns JWT | **PASS** |
| **TC-AUTH-02** | Auth | Duplicate Email Rejection | Attempt to register with existing email | Violates `UNIQUE KEY (email)`; emits HTTP 409 Conflict | **PASS** |
| **TC-AUTH-03** | Auth | Invalid Password Detection | Submit incorrect password on login | Password hash mismatch; rejects with HTTP 401 Unauthorized | **PASS** |
| **TC-MAP-01** | Mapping | Hierarchy Enforcement | Query `v_charger_port_mapping` | Every port row explicitly reports its parent charger and station | **PASS** |
| **TC-MAP-02** | Mapping | Foreign Key Integrity | Attempt to create port with non-existent `charger_id` | Foreign Key violation `fk_ports_charger`; rejects INSERT | **PASS** |
| **TC-CONC-01** | Booking | Valid Slot Booking | Book port for unoccupied future time slot | Acquires `FOR UPDATE` lock; commits booking with reference | **PASS** |
| **TC-CONC-02** | Booking | Double-Booking Prevention | Book overlapping slot $[09:30, 10:30)$ over $[09:00, 10:00)$ | Detects overlap; rolls back transaction and emits HTTP 409 | **PASS** |
| **TC-CONC-03** | Booking | Half-Open Boundary Slot | Book $[10:00, 11:00)$ immediately after $[09:00, 10:00)$ | Non-overlapping boundary allowed; transaction commits | **PASS** |
| **TC-CONC-04** | Booking | Concurrent Booking Contention | 2 simultaneous booking requests for exact same port & slot | One transaction commits; second transaction encounters lock & rolls back | **PASS** |
| **TC-CHG-01** | Charging | Monotonic Meter Calculation | Start: 1200.00 kWh, End: 1228.50 kWh | Delta energy calculated as strictly `28.50 kWh` | **PASS** |
| **TC-CHG-02** | Charging | Negative Energy Rejection | Start: 500.00 kWh, End: 450.00 kWh | `CHECK (meter_end >= meter_start)` violation; transaction aborted | **PASS** |
| **TC-BILL-01** | Billing | Automated Tariff Computation | 28.50 kWh @ ₹18/kWh + ₹20 fee + 18% GST | Total calculated as ₹628.94 (`bills.total_amount`) | **PASS** |
| **TC-BILL-02** | Billing | Idempotent Invoicing | Attempt to finalize completed session twice | Idempotency guard triggers; prevents duplicate bill generation | **PASS** |
| **TC-PAY-01** | Payments | Payment Simulation | Settle pending invoice via simulated UPI | Updates `bills.payment_status = 'PAID'`; creates `payments` record | **PASS** |
| **TC-MAINT-01**| Maintenance| Trigger Status Transition | Insert open maintenance defect on Port 13 | Trigger automatically updates `ports.current_status = 'MAINTENANCE'` | **PASS** |
| **TC-MAINT-02**| Maintenance| Trigger Restoration | Resolve maintenance defect on Port 13 | Trigger restores `ports.current_status = 'AVAILABLE'` | **PASS** |
| **TC-RBAC-01** | Security | Role Authorization Matrix | Customer attempts `POST /api/stations` | Middleware halts request with HTTP 403 Forbidden | **PASS** |
| **TC-RBAC-02** | Security | Invoice Data Privacy | Customer attempts to view another driver's invoice | Ownership guard halts access with HTTP 403 Forbidden | **PASS** |
