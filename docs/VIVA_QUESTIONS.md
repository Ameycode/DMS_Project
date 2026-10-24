# DBMS Viva Voce Guide: Top 25 Questions & Model Answers

This guide is prepared specifically for college viva examinations, project defenses, and external examiner reviews.

---

### Q1: What is the core problem this project solves in terms of database design?
**Answer:** In commercial EV charging plazas, drivers often face confusion regarding **which charger cabinet owns which charging port gun**. A naive system might store ports as loose objects without strict hierarchy. Our project enforces a normalized relational chain:
$$\text{stations } (1:N) \longrightarrow \text{chargers } (1:N) \longrightarrow \text{ports}$$
Every port dispenser gun is bound to a single physical charger cabinet via a `FOREIGN KEY (charger_id) REFERENCES chargers(id) ON DELETE RESTRICT`. A port can never exist independently or be booked at a station where its charger is not located.

---

### Q2: What Normalization level does this schema achieve? Explain with an example.
**Answer:** The schema achieves **Third Normal Form (3NF)**:
1. **1NF**: Every field holds atomic values; no arrays or comma-delimited values.
2. **2NF**: Every table has a primary key and all non-key attributes are fully functionally dependent on the entire primary key.
3. **3NF**: There are **no transitive dependencies**. For instance, in `bookings`, we only store `port_id`. We do **not** store `station_name` or `charger_label` in `bookings`. Station details depend solely on `stations.id`. We retrieve station and charger details through SQL `INNER JOIN`s, eliminating update and deletion anomalies.

---

### Q3: How do you prevent double-booking of a port when two users book simultaneously?
**Answer:** Concurrency control is enforced at the database level using **ACID Transactions** and **Pessimistic Row-Level Locking**:
```sql
START TRANSACTION;
SELECT * FROM ports WHERE id = :port_id FOR UPDATE;

SELECT COUNT(*) INTO @conflicts FROM bookings
WHERE port_id = :port_id 
  AND status IN ('CONFIRMED', 'ACTIVE')
  AND start_time < :new_end_time 
  AND end_time > :new_start_time
FOR UPDATE;

-- If @conflicts > 0, ROLLBACK; otherwise INSERT and COMMIT;
```
`SELECT ... FOR UPDATE` locks the port's rows in MySQL's InnoDB engine. Any concurrent transaction attempting to read or write the same port is serialized until the active transaction completes with `COMMIT` or `ROLLBACK`.

---

### Q4: Explain the half-open interval rule $[start\_time, end\_time)$ used for slot bookings.
**Answer:** A time slot $[T_1, T_2)$ is open on the right. Two slots $[A, B)$ and $[C, D)$ overlap if and only if:
$$A < D \quad \text{AND} \quad B > C$$
This allows a customer to start charging at **10:00:00** exactly when the previous reservation terminates at **10:00:00**, maximizing port utilization without physical connector conflict.

---

### Q5: How are ACID properties demonstrated in this project?
**Answer:**
- **Atomicity**: During slot booking, port verification, conflict checking, booking insertion, audit logging, and notification creation occur as an all-or-nothing unit. If any step fails, `ROLLBACK` undoes all partial updates.
- **Consistency**: All foreign key constraints (`fk_ports_charger`), checks (`end_time > start_time`), and unique constraints (`booking_reference`) are validated before committing.
- **Isolation**: InnoDB uses `REPEATABLE READ` with explicit `FOR UPDATE` locking to prevent dirty reads, non-repeatable reads, and phantom collisions during concurrent booking submissions.
- **Durability**: Once a transaction emits `COMMIT`, updates are permanently written to MySQL's write-ahead redo logs (WAL) on disk.

---

### Q6: What is the difference between a Stored Procedure and a Trigger in your database?
**Answer:**
- **Stored Procedure** (`sp_book_charging_slot`, `sp_complete_charging_session`): Explicitly invoked by application code. Contains control-flow logic (`IF/THEN`), transaction boundaries (`START TRANSACTION`, `COMMIT`, `ROLLBACK`), input/output parameters, and executes complex multi-table workflows.
- **Database Trigger** (`trg_audit_port_status_change`, `trg_update_port_on_maintenance`): Implicitly and automatically executed by MySQL in response to DML operations (`AFTER UPDATE ON ports`, `AFTER INSERT ON maintenance_records`). Used for non-bypassable data auditing and automated status transitions.

---

### Q7: Why do you use `DECIMAL(8,2)` instead of `FLOAT` or `DOUBLE` for tariffs and bills?
**Answer:** `FLOAT` and `DOUBLE` are approximate floating-point representations based on IEEE 754, which cause rounding errors (e.g. `0.1 + 0.2 = 0.30000000000000004`). In financial accounting and billing systems, exact fixed-point decimal arithmetic is required. `DECIMAL(8,2)` guarantees exact representation of monetary amounts without rounding discrepancies.

---

### Q8: What is a Database View, and why did you create `v_charger_port_mapping`?
**Answer:** A View is a virtual table defined by an underlying SQL query. We created `v_charger_port_mapping` to encapsulate the 3-table join (`stations` $\bowtie$ `chargers` $\bowtie$ `ports`). It provides:
1. **Abstraction**: Simplifies complex queries for backend APIs.
2. **Security**: Exposes only relevant operational columns.
3. **Consistency**: Guarantees a single source of truth for the Charger-to-Port hierarchy.

---

### Q9: What happens if an administrator attempts to delete a charger that has existing ports?
**Answer:** The foreign key constraint `fk_ports_charger` is configured with `ON DELETE RESTRICT`. MySQL rejects the `DELETE` query with error code `ER_ROW_IS_REFERENCED_2` (1451), preventing orphaned child records and preserving historical booking integrity.

---

### Q10: How does the simulated meter guarantee data integrity?
**Answer:**
1. Formula: $\text{Energy Consumed (kWh)} = \text{Meter End Reading} - \text{Meter Start Reading}$.
2. Invariant: $\text{Meter End} \ge \text{Meter Start} \ge 0$.
3. Enforced in three independent layers:
   - React input validation
   - Express backend controller verification
   - MySQL `CHECK (meter_end_kwh >= meter_start_kwh)` constraint and `BEFORE UPDATE` trigger `trg_prevent_invalid_session_meter`.

---

### Q11: How do database indexes improve the performance of this system?
**Answer:**
- `idx_bookings_port_times` on `(port_id, start_time, end_time)` reduces the time complexity of checking overlapping bookings from an $O(N)$ full table scan to an $O(\log N)$ B-Tree index range search.
- `idx_ports_charger_id` speeds up parent-child joins between chargers and ports.

---

### Q12: Why are passwords hashed with bcrypt instead of MD5 or SHA-256?
**Answer:** MD5 and basic SHA-256 are fast hash functions vulnerable to precomputed rainbow table attacks and brute force via GPUs. `bcrypt` incorporates a random salt and a configurable work factor (cost parameter) that makes brute-force attacks computationally infeasible.

---

### Q13: What is the purpose of the `audit_logs` table?
**Answer:** The `audit_logs` table provides immutable traceability for administrative and hardware state changes. It records the timestamp, user ID, action type, affected table name, record ID, and JSON snapshots of old and new values.

---

### Q14: How does role-based access control (RBAC) work in this application?
**Answer:** RBAC is enforced in the backend Express middleware (`verifyToken`, `requireRole`). Even if an unauthorized user attempts to trigger an Admin or Operator REST endpoint (e.g. `POST /api/stations` or `PATCH /api/ports/:id/status`), the middleware decodes the JWT claims and returns `HTTP 403 Forbidden` before any SQL query executes.

---

### Q15: How does the system handle billing idempotency?
**Answer:** A session can only be completed once. The `bills` table defines a `UNIQUE KEY (session_id)`. If an endpoint receives duplicate completion requests, the unique constraint and transaction rollback prevent duplicate invoice creation.
