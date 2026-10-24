# Relational Database Design & Normalization Analysis

## 1. Normalization Proof up to Third Normal Form (3NF)

A relational database is in **Third Normal Form (3NF)** if and only if it is in **Second Normal Form (2NF)** and no non-prime attribute is transitively dependent on any candidate key.

### First Normal Form (1NF) Compliance:
- **Atomicity**: Every column stores strictly atomic, scalar values (no multivalued attributes, arrays, or delimited CSV strings).
- **Unique Records**: Every table possesses a defined `PRIMARY KEY`.
- **Consistent Domains**: Attribute data types (e.g., `DECIMAL(8,2)`, `DATETIME`, `INT`, `VARCHAR`) are strictly preserved.

### Second Normal Form (2NF) Compliance:
- A relation is in 2NF if it is in 1NF and every non-prime attribute is **fully functionally dependent** on the primary key (no partial dependencies on a composite key).
- In our schema:
  - Tables using surrogate auto-increment primary keys (`users`, `stations`, `chargers`, `ports`, `bookings`, `bills`, `charging_sessions`) are inherently free from partial dependencies because the primary key consists of a single attribute.
  - In `ports`, the composite candidate key `(charger_id, port_number)` uniquely identifies a physical port dispenser gun. However, all other attributes (`connector_type`, `max_power_kw`, `current_status`) depend entirely on this identification.

### Third Normal Form (3NF) Compliance:
- A relation is in 3NF if it is in 2NF and **no transitive dependency** exists ($X \to Y$ and $Y \to Z$ where $Z$ is a non-prime attribute).
- **Design Decision: Station & Charger details are NEVER duplicated into Ports or Bookings!**
  - **Non-3NF Violation Avoided**: An unnormalized design might store `station_name`, `station_address`, and `charger_label` directly in the `ports` or `bookings` table. If a station address changes, an update anomaly would occur.
  - **3NF Canonical Design**:
    $$\text{bookings} \xrightarrow{\text{FK}} \text{ports} \xrightarrow{\text{FK}} \text{chargers} \xrightarrow{\text{FK}} \text{stations}$$
    To retrieve `station_name` for a booking, the application executes an **INNER JOIN**. All station attributes depend **only** on `stations.id`. All charger attributes depend **only** on `chargers.id`.

---

## 2. Relational Schema Representation

```
USERS (
    id [PK], full_name, email [UK], phone, password_hash, role, 
    ev_model, compatible_connector, created_at, updated_at
)

STATIONS (
    id [PK], station_code [UK], name, address, city, latitude, 
    longitude, opening_time, closing_time, operational_status, 
    contact_number, created_at, updated_at
)

CHARGERS (
    id [PK], charger_code [UK], station_id [FK -> STATIONS.id], 
    label, technology_type, manufacturer, max_power_kw, 
    operational_status, created_at, updated_at
)

PORTS (
    id [PK], port_code [UK], charger_id [FK -> CHARGERS.id], 
    port_number, connector_type, max_power_kw, current_status, 
    last_status_update, created_at, updated_at,
    UK: (charger_id, port_number)
)

TARIFFS (
    id [PK], station_id [FK -> STATIONS.id, NULLABLE], 
    connector_type, rate_per_kwh, service_fee, tax_percentage, 
    is_active, created_at, updated_at
)

BOOKINGS (
    id [PK], booking_reference [UK], user_id [FK -> USERS.id], 
    port_id [FK -> PORTS.id], start_time, end_time, status, 
    estimated_kwh, estimated_cost, cancellation_reason, created_at, updated_at,
    CHECK: (end_time > start_time)
)

CHARGING_SESSIONS (
    id [PK], session_code [UK], booking_id [FK -> BOOKINGS.id, UK], 
    port_id [FK -> PORTS.id], user_id [FK -> USERS.id], session_status, 
    start_time, end_time, meter_start_kwh, meter_end_kwh, 
    energy_consumed_kwh, is_simulated, created_at, updated_at,
    CHECK: (meter_end_kwh IS NULL OR meter_end_kwh >= meter_start_kwh)
)

BILLS (
    id [PK], invoice_number [UK], booking_id [FK -> BOOKINGS.id, UK], 
    session_id [FK -> CHARGING_SESSIONS.id, UK], user_id [FK -> USERS.id], 
    energy_consumed_kwh, tariff_rate_per_kwh, energy_charge, 
    service_fee, tax_amount, total_amount, payment_status, 
    created_at, updated_at
)

PAYMENTS (
    id [PK], payment_reference [UK], bill_id [FK -> BILLS.id], 
    amount, payment_method, payment_status, transaction_date, 
    gateway_response
)

MAINTENANCE_RECORDS (
    id [PK], port_id [FK -> PORTS.id], reported_by [FK -> USERS.id], 
    issue_description, severity, status, resolution_notes, 
    reported_at, resolved_at
)

FEEDBACK (
    id [PK], station_id [FK -> STATIONS.id], user_id [FK -> USERS.id], 
    booking_id [FK -> BOOKINGS.id, NULLABLE], rating, comment, created_at,
    CHECK: (rating BETWEEN 1 AND 5)
)

AUDIT_LOGS (
    id [PK], user_id [FK -> USERS.id, NULLABLE], action, entity_name, 
    entity_id, old_values [JSON], new_values [JSON], ip_address, timestamp
)

NOTIFICATIONS (
    id [PK], user_id [FK -> USERS.id], title, message, type, 
    is_read, created_at
)
```

---

## 3. Concurrency Control & ACID Transaction Isolation

### Preventing Double Booking using Row-Level Pessimistic Locking
To prevent race conditions where two simultaneous HTTP requests attempt to reserve the same port dispenser for overlapping intervals:

1. **Transaction Isolation**: InnoDB uses **Row-Level Locking**.
2. **Transaction Demarcation**:
   ```sql
   START TRANSACTION;

   -- Lock the port record to serialize all concurrent booking attempts on this port
   SELECT id, current_status FROM ports WHERE id = :port_id FOR UPDATE;

   -- Check half-open interval overlap [start_time, end_time)
   SELECT COUNT(*) INTO @conflict_count 
   FROM bookings 
   WHERE port_id = :port_id 
     AND status IN ('CONFIRMED', 'ACTIVE')
     AND start_time < :new_end_time 
     AND end_time > :new_start_time
   FOR UPDATE;

   -- If @conflict_count > 0, ROLLBACK immediately and emit HTTP 409
   IF @conflict_count > 0 THEN
       ROLLBACK;
   ELSE
       INSERT INTO bookings (...) VALUES (...);
       COMMIT;
   END IF;
   ```
3. **Half-Open Interval Invariant**:
   A reservation $[T_1, T_2)$ overlaps with $[T_3, T_4)$ if:
   $$T_1 < T_4 \quad \text{AND} \quad T_2 > T_3$$
   This enables a subsequent customer to book at 10:00:00 immediately when the prior driver's slot ends at 10:00:00.

---

## 4. Query Performance Indexes

- `idx_bookings_port_times` ON `bookings (port_id, start_time, end_time)`:
  Enables $O(\log N)$ b-tree lookup during concurrency conflict checks.
- `idx_ports_charger_id` ON `ports (charger_id)`:
  Enables instant assembly of the Charger-to-Port visual hierarchy.
- `idx_chargers_station_id` ON `chargers (station_id)`:
  Accelerates station overview joins.
- `idx_bills_user_payment` ON `bills (user_id, payment_status)`:
  Speeds up user invoice history lookups and outstanding receivables reporting.
