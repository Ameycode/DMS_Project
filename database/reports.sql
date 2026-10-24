-- =============================================================================
-- EV Charging Slot and Billing Management System
-- Demonstration SQL Reports & Advanced Relational Queries (reports.sql)
-- Demonstrating: INNER/LEFT JOINs, Aggregate functions (SUM, COUNT, AVG),
-- GROUP BY, HAVING, Correlated Subqueries, and Complex Expressions
-- =============================================================================

USE `ev_charging_db`;

-- -----------------------------------------------------------------------------
-- QUERY 1: All Charging Stations with Operational Status and Station Codes
-- -----------------------------------------------------------------------------
SELECT 
    s.id,
    s.station_code,
    s.name AS station_name,
    s.city,
    s.address,
    s.opening_time,
    s.closing_time,
    s.operational_status,
    s.contact_number
FROM `stations` s
ORDER BY s.city, s.name;

-- -----------------------------------------------------------------------------
-- QUERY 2: All Chargers at a Particular Station (e.g., Station ID = 1)
-- Demonstrates: Single-table foreign key filtering with hardware attributes
-- -----------------------------------------------------------------------------
SELECT 
    c.id AS charger_id,
    c.charger_code,
    c.label AS charger_model,
    c.technology_type,
    c.manufacturer,
    c.max_power_kw,
    c.operational_status
FROM `chargers` c
WHERE c.station_id = 1
ORDER BY c.charger_code;

-- -----------------------------------------------------------------------------
-- QUERY 3: All Ports Belonging to a Specified Charger (e.g., Charger 'CHG-001')
-- Demonstrates: Foreign key lookup to answer "Which ports belong to this charger?"
-- -----------------------------------------------------------------------------
SELECT 
    p.id AS port_id,
    p.port_code,
    p.port_number,
    p.connector_type,
    p.max_power_kw,
    p.current_status,
    p.last_status_update
FROM `ports` p
INNER JOIN `chargers` c ON p.charger_id = c.id
WHERE c.charger_code = 'CHG-001'
ORDER BY p.port_number;

-- -----------------------------------------------------------------------------
-- QUERY 4: The Parent Charger and Station of a Specified Port (e.g., 'PORT-002')
-- Demonstrates: 3-Table Multi-Join resolving "Which charger and station owns this port?"
-- -----------------------------------------------------------------------------
SELECT 
    p.port_code,
    p.connector_type,
    p.max_power_kw AS port_rating_kw,
    p.current_status AS port_status,
    c.charger_code AS parent_charger_code,
    c.label AS parent_charger_name,
    c.technology_type,
    s.station_code,
    s.name AS station_name,
    s.address AS station_location,
    s.city
FROM `ports` p
INNER JOIN `chargers` c ON p.charger_id = c.id
INNER JOIN `stations` s ON c.station_id = s.id
WHERE p.port_code = 'PORT-002';

-- -----------------------------------------------------------------------------
-- QUERY 5: Available Ports Filtered by Connector Type (e.g., 'CCS2')
-- Demonstrates: Multi-table JOIN with compound WHERE filters
-- -----------------------------------------------------------------------------
SELECT 
    s.name AS station_name,
    s.city,
    c.charger_code,
    c.label AS charger_model,
    p.port_code,
    p.connector_type,
    p.max_power_kw,
    p.current_status
FROM `ports` p
INNER JOIN `chargers` c ON p.charger_id = c.id
INNER JOIN `stations` s ON c.station_id = s.id
WHERE p.connector_type = 'CCS2'
  AND p.current_status = 'AVAILABLE'
  AND s.operational_status = 'ACTIVE'
  AND c.operational_status = 'ACTIVE'
ORDER BY p.max_power_kw DESC;

-- -----------------------------------------------------------------------------
-- QUERY 6: Customer Booking History (e.g., User ID = 3 - Rahul Sharma)
-- Demonstrates: Comprehensive multi-table audit trail for user reservations
-- -----------------------------------------------------------------------------
SELECT 
    b.booking_reference,
    b.start_time,
    b.end_time,
    b.status AS booking_status,
    s.name AS station_name,
    c.charger_code,
    p.port_code,
    p.connector_type,
    b.estimated_cost,
    bill.invoice_number,
    bill.total_amount,
    bill.payment_status
FROM `bookings` b
INNER JOIN `ports` p ON b.port_id = p.id
INNER JOIN `chargers` c ON p.charger_id = c.id
INNER JOIN `stations` s ON c.station_id = s.id
LEFT JOIN `bills` bill ON b.id = bill.booking_id
WHERE b.user_id = 3
ORDER BY b.start_time DESC;

-- -----------------------------------------------------------------------------
-- QUERY 7: Upcoming Bookings for a Specified Port (e.g., Port ID = 3)
-- Demonstrates: Temporal filtering for future scheduled slots
-- -----------------------------------------------------------------------------
SELECT 
    b.id AS booking_id,
    b.booking_reference,
    u.full_name AS customer_name,
    u.phone AS customer_phone,
    u.ev_model,
    b.start_time,
    b.end_time,
    b.status
FROM `bookings` b
INNER JOIN `users` u ON b.user_id = u.id
WHERE b.port_id = 3
  AND b.status IN ('CONFIRMED', 'ACTIVE')
  AND b.end_time >= NOW()
ORDER BY b.start_time ASC;

-- -----------------------------------------------------------------------------
-- QUERY 8: Overlapping Booking Collision Detection Query
-- Demonstrates: Half-open interval test [start_time, end_time) to guard concurrency
-- -----------------------------------------------------------------------------
SET @check_port_id = 1;
SET @req_start = '2026-10-20 09:30:00';
SET @req_end   = '2026-10-20 10:15:00';

SELECT 
    b.id AS conflicting_booking_id,
    b.booking_reference,
    b.port_id,
    b.start_time,
    b.end_time,
    b.status,
    'CONFLICT_DETECTED' AS collision_status
FROM `bookings` b
WHERE b.port_id = @check_port_id
  AND b.status IN ('CONFIRMED', 'ACTIVE')
  AND b.start_time < @req_end
  AND b.end_time > @req_start;

-- -----------------------------------------------------------------------------
-- QUERY 9: Total Realized Revenue and Financial Aggregates
-- Demonstrates: Aggregate functions (SUM, COUNT, AVG) with conditional logic
-- -----------------------------------------------------------------------------
SELECT 
    COUNT(b.id) AS total_invoices_issued,
    SUM(CASE WHEN b.payment_status = 'PAID' THEN 1 ELSE 0 END) AS total_paid_invoices,
    SUM(CASE WHEN b.payment_status = 'PENDING' THEN 1 ELSE 0 END) AS total_pending_invoices,
    COALESCE(SUM(b.energy_consumed_kwh), 0) AS total_kwh_billed,
    COALESCE(SUM(b.energy_charge), 0) AS total_energy_charges_inr,
    COALESCE(SUM(b.service_fee), 0) AS total_service_fees_inr,
    COALESCE(SUM(b.tax_amount), 0) AS total_gst_collected_inr,
    COALESCE(SUM(CASE WHEN b.payment_status = 'PAID' THEN b.total_amount ELSE 0 END), 0) AS total_realized_revenue_inr,
    COALESCE(SUM(CASE WHEN b.payment_status = 'PENDING' THEN b.total_amount ELSE 0 END), 0) AS total_receivables_inr
FROM `bills` b;

-- -----------------------------------------------------------------------------
-- QUERY 10: Monthly Revenue Trend
-- Demonstrates: DATE_FORMAT formatting, GROUP BY, and chronological aggregation
-- -----------------------------------------------------------------------------
SELECT 
    DATE_FORMAT(b.created_at, '%Y-%m') AS billing_month,
    COUNT(b.id) AS bills_count,
    ROUND(SUM(b.energy_consumed_kwh), 2) AS monthly_kwh_dispensed,
    ROUND(SUM(CASE WHEN b.payment_status = 'PAID' THEN b.total_amount ELSE 0 END), 2) AS monthly_revenue_inr
FROM `bills` b
GROUP BY DATE_FORMAT(b.created_at, '%Y-%m')
ORDER BY billing_month DESC;

-- -----------------------------------------------------------------------------
-- QUERY 11: Energy Consumption and Revenue by Station
-- Demonstrates: Multi-table JOIN with GROUP BY and aggregate computation
-- -----------------------------------------------------------------------------
SELECT 
    s.station_code,
    s.name AS station_name,
    s.city,
    COUNT(DISTINCT cs.id) AS sessions_completed,
    COALESCE(ROUND(SUM(cs.energy_consumed_kwh), 2), 0) AS total_energy_kwh,
    COALESCE(ROUND(SUM(b.total_amount), 2), 0) AS gross_station_revenue_inr
FROM `stations` s
INNER JOIN `chargers` c ON s.id = c.station_id
INNER JOIN `ports` p ON c.id = p.charger_id
INNER JOIN `charging_sessions` cs ON p.id = cs.port_id
LEFT JOIN `bills` b ON cs.id = b.session_id
WHERE cs.session_status = 'COMPLETED'
GROUP BY s.id, s.station_code, s.name, s.city
ORDER BY total_energy_kwh DESC;

-- -----------------------------------------------------------------------------
-- QUERY 12: Most Frequently Booked Ports (Utilization Ranking)
-- Demonstrates: Multi-table JOIN, GROUP BY, COUNT, and sorting
-- -----------------------------------------------------------------------------
SELECT 
    p.port_code,
    c.charger_code,
    c.label AS charger_model,
    s.name AS station_name,
    p.connector_type,
    p.max_power_kw,
    COUNT(b.id) AS total_bookings_count,
    ROUND(AVG(TIMESTAMPDIFF(MINUTE, b.start_time, b.end_time)), 1) AS avg_duration_minutes
FROM `ports` p
INNER JOIN `chargers` c ON p.charger_id = c.id
INNER JOIN `stations` s ON c.station_id = s.id
LEFT JOIN `bookings` b ON p.id = b.port_id
GROUP BY p.id, p.port_code, c.charger_code, c.label, s.name, p.connector_type, p.max_power_kw
ORDER BY total_bookings_count DESC;

-- -----------------------------------------------------------------------------
-- QUERY 13: Customers with Highest Charging Expenditure (Top EV Drivers)
-- Demonstrates: GROUP BY with HAVING filter and aggregate SUM
-- -----------------------------------------------------------------------------
SELECT 
    u.id AS user_id,
    u.full_name,
    u.email,
    u.phone,
    u.ev_model,
    COUNT(b.id) AS invoices_count,
    ROUND(SUM(b.energy_consumed_kwh), 2) AS total_kwh_consumed,
    ROUND(SUM(b.total_amount), 2) AS total_expenditure_inr
FROM `users` u
INNER JOIN `bills` b ON u.id = b.user_id
WHERE b.payment_status = 'PAID'
GROUP BY u.id, u.full_name, u.email, u.phone, u.ev_model
HAVING total_expenditure_inr > 0
ORDER BY total_expenditure_inr DESC;

-- -----------------------------------------------------------------------------
-- QUERY 14: Stations with Port Utilization or Reservation Density
-- Demonstrates: Subquery in SELECT clause and percentage computation
-- -----------------------------------------------------------------------------
SELECT 
    s.station_code,
    s.name AS station_name,
    (SELECT COUNT(*) FROM `chargers` WHERE station_id = s.id) AS total_chargers,
    (SELECT COUNT(*) FROM `ports` p INNER JOIN `chargers` c ON p.charger_id = c.id WHERE c.station_id = s.id) AS total_ports,
    (SELECT COUNT(*) FROM `ports` p INNER JOIN `chargers` c ON p.charger_id = c.id WHERE c.station_id = s.id AND p.current_status IN ('CHARGING', 'RESERVED')) AS active_or_reserved_ports,
    (SELECT COUNT(*) FROM `ports` p INNER JOIN `chargers` c ON p.charger_id = c.id WHERE c.station_id = s.id AND p.current_status = 'AVAILABLE') AS available_ports
FROM `stations` s
WHERE s.operational_status = 'ACTIVE';

-- -----------------------------------------------------------------------------
-- QUERY 15: Unpaid Bills and Pending Receivables Audit
-- Demonstrates: LEFT JOIN for unpaid invoices requiring customer action
-- -----------------------------------------------------------------------------
SELECT 
    b.invoice_number,
    u.full_name AS customer_name,
    u.phone AS customer_phone,
    u.email AS customer_email,
    s.name AS station_name,
    c.charger_code,
    p.port_code,
    b.energy_consumed_kwh,
    b.total_amount AS pending_amount_inr,
    b.created_at AS bill_generated_date,
    DATEDIFF(NOW(), b.created_at) AS days_outstanding
FROM `bills` b
INNER JOIN `users` u ON b.user_id = u.id
INNER JOIN `bookings` bk ON b.booking_id = bk.id
INNER JOIN `ports` p ON bk.port_id = p.id
INNER JOIN `chargers` c ON p.charger_id = c.id
INNER JOIN `stations` s ON c.station_id = s.id
WHERE b.payment_status = 'PENDING'
ORDER BY b.created_at ASC;
