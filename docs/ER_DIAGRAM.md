# Entity-Relationship (ER) Diagram & Structural Analysis

## 1. Conceptual ER Architecture

The **EV Charging Slot and Billing Management System** is modeled in compliance with relational database standards and normalized up to **Third Normal Form (3NF)**.

### Primary Problem Solved in Schema Design:
Preventing ambiguity regarding **which physical charger owns which port**. In real EV plazas, multiple dispensers exist at one station, and each dispenser houses multiple charging connector cables/guns. The relational schema enforces an inviolable foreign key chain:
$$\text{stations } (1) \longrightarrow (N) \text{ chargers } (1) \longrightarrow (N) \text{ ports}$$

---

## 2. Mermaid Entity-Relationship Diagram

```mermaid
erDiagram
    users ||--o{ bookings : "places"
    users ||--o{ charging_sessions : "initiates"
    users ||--o{ bills : "receives"
    users ||--o{ feedback : "submits"
    users ||--o{ maintenance_records : "reports"
    users ||--o{ notifications : "receives"

    stations ||--|{ chargers : "houses"
    stations ||--o{ feedback : "receives"
    stations ||--o{ tariffs : "configures"

    chargers ||--|{ ports : "dispenses"

    ports ||--o{ bookings : "reserved_for"
    ports ||--o{ charging_sessions : "delivers_energy"
    ports ||--o{ maintenance_records : "undergoes"

    bookings ||--o| charging_sessions : "activates"
    bookings ||--o| bills : "invoiced_under"
    bookings ||--o| feedback : "reviewed_in"

    charging_sessions ||--o| bills : "generates"

    bills ||--o| payments : "settled_by"

    users {
        int id PK
        string full_name
        string email UK
        string phone
        string password_hash
        enum role "CUSTOMER, OPERATOR, ADMIN"
        string ev_model
        string compatible_connector
    }

    stations {
        int id PK
        string station_code UK "e.g. STN-001"
        string name
        string address
        string city
        decimal latitude
        decimal longitude
        time opening_time
        time closing_time
        enum operational_status "ACTIVE, INACTIVE, MAINTENANCE"
        string contact_number
    }

    chargers {
        int id PK
        string charger_code UK "e.g. CHG-001"
        int station_id FK
        string label
        string technology_type "Fast DC, Slow AC"
        string manufacturer
        decimal max_power_kw
        enum operational_status "ACTIVE, OFFLINE, MAINTENANCE"
    }

    ports {
        int id PK
        string port_code UK "e.g. PORT-001"
        int charger_id FK
        int port_number "1 or 2"
        enum connector_type "CCS2, Type 2, CHAdeMO, GB/T, Tesla"
        decimal max_power_kw
        enum current_status "AVAILABLE, RESERVED, CHARGING, UNAVAILABLE, MAINTENANCE"
    }

    tariffs {
        int id PK
        int station_id FK "nullable for global defaults"
        enum connector_type "CCS2, Type 2, CHAdeMO, GB/T, Tesla"
        decimal rate_per_kwh
        decimal service_fee
        decimal tax_percentage "18% GST"
        boolean is_active
    }

    bookings {
        int id PK
        string booking_reference UK "BK-YYYYMMDD-XXXX"
        int user_id FK
        int port_id FK
        datetime start_time
        datetime end_time
        enum status "CONFIRMED, ACTIVE, COMPLETED, CANCELLED, EXPIRED"
        decimal estimated_kwh
        decimal estimated_cost
        string cancellation_reason
    }

    charging_sessions {
        int id PK
        string session_code UK "SESS-YYYYMMDD-XXXX"
        int booking_id FK
        int port_id FK
        int user_id FK
        enum session_status "IN_PROGRESS, COMPLETED, INTERRUPTED"
        datetime start_time
        datetime end_time
        decimal meter_start_kwh
        decimal meter_end_kwh
        decimal energy_consumed_kwh
        boolean is_simulated
    }

    bills {
        int id PK
        string invoice_number UK "INV-YYYYMMDD-XXXX"
        int booking_id FK
        int session_id FK
        int user_id FK
        decimal energy_consumed_kwh
        decimal tariff_rate_per_kwh
        decimal energy_charge
        decimal service_fee
        decimal tax_amount
        decimal total_amount
        enum payment_status "PENDING, PAID, FAILED, REFUNDED"
    }

    payments {
        int id PK
        string payment_reference UK "PAY-YYYYMMDD-XXXX"
        int bill_id FK
        decimal amount
        enum payment_method "UPI, CREDIT_CARD, DEBIT_CARD, NET_BANKING, WALLET"
        enum payment_status "SUCCESS, FAILED, REFUNDED"
        timestamp transaction_date
        string gateway_response
    }

    maintenance_records {
        int id PK
        int port_id FK
        int reported_by FK
        text issue_description
        enum severity "LOW, MEDIUM, HIGH, CRITICAL"
        enum status "OPEN, IN_PROGRESS, RESOLVED"
        text resolution_notes
        timestamp reported_at
        timestamp resolved_at
    }

    feedback {
        int id PK
        int station_id FK
        int user_id FK
        int booking_id FK
        int rating "1 to 5"
        text comment
        timestamp created_at
    }

    audit_logs {
        int id PK
        int user_id FK
        string action
        string entity_name
        int entity_id
        json old_values
        json new_values
        timestamp timestamp
    }

    notifications {
        int id PK
        int user_id FK
        string title
        text message
        enum type "INFO, SUCCESS, WARNING, ALERT"
        boolean is_read
        timestamp created_at
    }
```

---

## 3. Cardinality & Relationship Breakdown

| Parent Table | Child Table | Relationship | Cardinality | Enforced Foreign Key | Business Invariant |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `stations` | `chargers` | One-to-Many | 1 : N | `chargers.station_id` ➔ `stations.id` | A physical charger belongs to exactly ONE station. |
| `chargers` | `ports` | One-to-Many | 1 : N | `ports.charger_id` ➔ `chargers.id` | A port belongs to exactly ONE charger dispenser. |
| `ports` | `bookings` | One-to-Many | 1 : N | `bookings.port_id` ➔ `ports.id` | Slot bookings are made on a specific port dispenser. |
| `users` | `bookings` | One-to-Many | 1 : N | `bookings.user_id` ➔ `users.id` | A registered user can book multiple charging slots. |
| `bookings` | `charging_sessions` | One-to-One | 1 : 1 | `charging_sessions.booking_id` ➔ `bookings.id` | Exactly one session activates a confirmed reservation. |
| `charging_sessions`| `bills` | One-to-One | 1 : 1 | `bills.session_id` ➔ `charging_sessions.id` | Prevents duplicate invoicing of the same charging session. |
| `bills` | `payments` | One-to-Many | 1 : N | `payments.bill_id` ➔ `bills.id` | Multiple payment attempts or refunds per invoice. |
| `ports` | `maintenance_records` | One-to-Many | 1 : N | `maintenance_records.port_id` ➔ `ports.id` | Tracks individual port hardware maintenance history. |
