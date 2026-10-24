# REST API Documentation & Endpoint Specification

Base URL: `http://localhost:5000/api`

All protected endpoints require the HTTP Header:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## 1. Authentication (`/api/auth`)

### `POST /api/auth/register`
Creates a new customer profile.
- **Request Body**:
  ```json
  {
    "full_name": "Rahul Sharma",
    "email": "rahul@gmail.com",
    "phone": "+91-9811223344",
    "password": "Password@123",
    "ev_model": "Tata Nexon EV Max",
    "compatible_connector": "CCS2"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "message": "Account registered successfully.",
    "token": "eyJhbGciOi...",
    "user": { "id": 3, "full_name": "Rahul Sharma", "email": "rahul@gmail.com", "role": "CUSTOMER" }
  }
  ```

### `POST /api/auth/login`
Authenticates user and signs JWT token.
- **Request Body**:
  ```json
  {
    "email": "admin@evcharge.com",
    "password": "Password@123"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Authentication successful.",
    "token": "eyJhbGciOi...",
    "user": { "id": 1, "email": "admin@evcharge.com", "role": "ADMIN" }
  }
  ```

---

## 2. Charging Stations (`/api/stations`)

### `GET /api/stations`
Fetches all stations with optional search and city filters.
- **Query Parameters**:
  - `city` (string, optional): e.g. `Bengaluru`
  - `search` (string, optional): e.g. `City Centre`
  - `connector` (string, optional): e.g. `CCS2`
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "count": 4,
    "stations": [
      {
        "id": 1,
        "station_code": "STN-001",
        "name": "City Centre EV Superhub",
        "city": "Bengaluru",
        "total_chargers": 3,
        "total_ports": 6,
        "available_ports": 4,
        "avg_rating": 4.7
      }
    ]
  }
  ```

### `GET /api/stations/:id`
Retrieves single station and resolves the complete nested **Station ➔ Charger ➔ Port** hierarchy tree!
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "station": {
      "id": 1,
      "station_code": "STN-001",
      "name": "City Centre EV Superhub",
      "chargers": [
        {
          "charger_id": 1,
          "charger_code": "CHG-001",
          "label": "Delta Ultra Fast DC 180kW",
          "max_power_kw": 180.00,
          "ports": [
            {
              "port_id": 1,
              "port_code": "PORT-001",
              "connector_type": "CCS2",
              "max_power_kw": 120.00,
              "current_status": "AVAILABLE"
            },
            {
              "port_id": 2,
              "port_code": "PORT-002",
              "connector_type": "CCS2",
              "max_power_kw": 60.00,
              "current_status": "AVAILABLE"
            }
          ]
        }
      ]
    }
  }
  ```

---

## 3. Physical Ports & Hierarchy Mapping (`/api/ports`)

### `GET /api/ports/mapping/hierarchy`
Directly queries the MySQL database view `v_charger_port_mapping` to explicitly answer:
*"Which charger owns this port?"* and *"Which ports belong to this charger?"*
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "mapping": [
      {
        "port_id": 1,
        "port_code": "PORT-001",
        "port_number": 1,
        "connector_type": "CCS2",
        "port_max_power_kw": 120.00,
        "port_status": "AVAILABLE",
        "charger_code": "CHG-001",
        "charger_label": "Delta Ultra Fast DC 180kW",
        "station_code": "STN-001",
        "station_name": "City Centre EV Superhub",
        "station_city": "Bengaluru"
      }
    ]
  }
  ```

### `PATCH /api/ports/:id/status`
Authorized operator/admin endpoint to toggle operational status.
- **Request Body**: `{ "current_status": "MAINTENANCE" }`
- **Response `200 OK`**: `{ "success": true, "message": "Port status updated." }`

---

## 4. Slot Bookings (`/api/bookings`)

### `POST /api/bookings`
Reserves a specific physical port for a half-open time interval $[start\_time, end\_time)$.
- **Concurrency Protection**: Locks port row with `FOR UPDATE` and verifies no overlapping reservation exists.
- **Request Body**:
  ```json
  {
    "port_id": 2,
    "start_time": "2026-10-24T10:00:00.000Z",
    "end_time": "2026-10-24T11:00:00.000Z",
    "estimated_kwh": 30.00
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "message": "Charging slot booked successfully with complete concurrency protection.",
    "booking": {
      "id": 6,
      "booking_reference": "BK-20261023-88219",
      "port_id": 2,
      "port_code": "PORT-002",
      "estimated_cost": "660.80",
      "status": "CONFIRMED"
    }
  }
  ```
- **Response `409 Conflict` (Double Booking Collision)**:
  ```json
  {
    "success": false,
    "message": "Double booking prevented: Port PORT-002 is already reserved for an overlapping time interval."
  }
  ```

---

## 5. Charging Sessions & Invoicing (`/api/sessions` & `/api/billing`)

### `POST /api/sessions/start`
Starts a simulated EV charging session. Transitions port status to `CHARGING`.
- **Request Body**: `{ "booking_id": 6, "meter_start_kwh": 1250.00 }`
- **Response `201 Created`**:
  ```json
  {
    "success": true,
    "message": "Charging session started successfully (Simulated EV mode).",
    "session": { "id": 5, "session_code": "SESS-20261023-4412", "session_status": "IN_PROGRESS" }
  }
  ```

### `POST /api/sessions/:id/complete`
Finalizes charging session, enforces non-negative meter monotonicity, releases port back to `AVAILABLE`, and automatically creates the bill invoice.
- **Request Body**: `{ "meter_end_kwh": 1278.50 }`
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Charging session successfully completed. Bill has been generated.",
    "data": {
      "session_id": 5,
      "energy_consumed_kwh": 28.50,
      "invoice_number": "INV-20261023-9912",
      "breakdown": {
        "energy_consumed_kwh": 28.50,
        "tariff_rate_per_kwh": 18.00,
        "energy_charge": 513.00,
        "service_fee": 20.00,
        "tax_amount": 95.94,
        "total_amount": 628.94
      }
    }
  }
  ```

### `POST /api/billing/:id/pay`
Simulates online payment settlement for an invoice.
- **Request Body**: `{ "payment_method": "UPI" }`
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "message": "Payment simulated and processed successfully.",
    "payment": {
      "payment_reference": "PAY-20261023-55912",
      "amount": 628.94,
      "method": "UPI",
      "status": "SUCCESS"
    }
  }
  ```
