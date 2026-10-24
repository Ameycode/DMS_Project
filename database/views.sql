-- =============================================================================
-- EV Charging Slot and Billing Management System
-- Database Views for Reporting, Abstraction & Fast Hierarchy Lookups
-- =============================================================================

USE `ev_charging_db`;

-- Drop existing views
DROP VIEW IF EXISTS `v_charger_port_mapping`;
DROP VIEW IF EXISTS `v_active_bookings`;
DROP VIEW IF EXISTS `v_station_utilization`;
DROP VIEW IF EXISTS `v_revenue_summary`;
DROP VIEW IF EXISTS `v_customer_billing_history`;

-- -----------------------------------------------------------------------------
-- VIEW 1: v_charger_port_mapping
-- PRIMARY FEATURE VIEW: Resolves complete hierarchy (Station -> Charger -> Port)
-- Explicitly answers: "Which physical charger owns this port?"
-- -----------------------------------------------------------------------------
CREATE VIEW `v_charger_port_mapping` AS
SELECT 
    p.id AS port_id,
    p.port_code,
    p.port_number,
    p.connector_type,
    p.max_power_kw AS port_max_power_kw,
    p.current_status AS port_status,
    p.last_status_update,
    c.id AS charger_id,
    c.charger_code,
    c.label AS charger_label,
    c.technology_type AS charger_technology,
    c.manufacturer AS charger_manufacturer,
    c.max_power_kw AS charger_max_power_kw,
    c.operational_status AS charger_status,
    s.id AS station_id,
    s.station_code,
    s.name AS station_name,
    s.address AS station_address,
    s.city AS station_city,
    s.latitude AS station_latitude,
    s.longitude AS station_longitude,
    s.opening_time,
    s.closing_time,
    s.operational_status AS station_status,
    s.contact_number AS station_contact
FROM `ports` p
INNER JOIN `chargers` c ON p.charger_id = c.id
INNER JOIN `stations` s ON c.station_id = s.id;

-- -----------------------------------------------------------------------------
-- VIEW 2: v_active_bookings
-- Shows currently confirmed or in-progress charging bookings with port and charger mapping
-- -----------------------------------------------------------------------------
CREATE VIEW `v_active_bookings` AS
SELECT 
    b.id AS booking_id,
    b.booking_reference,
    b.start_time,
    b.end_time,
    b.status AS booking_status,
    b.estimated_kwh,
    b.estimated_cost,
    u.id AS user_id,
    u.full_name AS customer_name,
    u.email AS customer_email,
    u.phone AS customer_phone,
    u.ev_model,
    p.id AS port_id,
    p.port_code,
    p.connector_type,
    c.id AS charger_id,
    c.charger_code,
    c.label AS charger_label,
    s.id AS station_id,
    s.name AS station_name,
    s.city AS station_city
FROM `bookings` b
INNER JOIN `users` u ON b.user_id = u.id
INNER JOIN `ports` p ON b.port_id = p.id
INNER JOIN `chargers` c ON p.charger_id = c.id
INNER JOIN `stations` s ON c.station_id = s.id
WHERE b.status IN ('CONFIRMED', 'ACTIVE');

-- -----------------------------------------------------------------------------
-- VIEW 3: v_station_utilization
-- Aggregates port counts, live availability, and status breakdown per station
-- -----------------------------------------------------------------------------
CREATE VIEW `v_station_utilization` AS
SELECT 
    s.id AS station_id,
    s.station_code,
    s.name AS station_name,
    s.city,
    s.operational_status AS station_status,
    COUNT(DISTINCT c.id) AS total_chargers,
    COUNT(p.id) AS total_ports,
    SUM(CASE WHEN p.current_status = 'AVAILABLE' THEN 1 ELSE 0 END) AS available_ports,
    SUM(CASE WHEN p.current_status = 'RESERVED' THEN 1 ELSE 0 END) AS reserved_ports,
    SUM(CASE WHEN p.current_status = 'CHARGING' THEN 1 ELSE 0 END) AS charging_ports,
    SUM(CASE WHEN p.current_status = 'MAINTENANCE' THEN 1 ELSE 0 END) AS maintenance_ports,
    SUM(CASE WHEN p.current_status = 'UNAVAILABLE' THEN 1 ELSE 0 END) AS offline_ports,
    ROUND((SUM(CASE WHEN p.current_status IN ('CHARGING', 'RESERVED') THEN 1 ELSE 0 END) / NULLIF(COUNT(p.id), 0)) * 100, 2) AS utilization_rate_pct
FROM `stations` s
LEFT JOIN `chargers` c ON s.id = c.station_id
LEFT JOIN `ports` p ON c.id = p.charger_id
GROUP BY s.id, s.station_code, s.name, s.city, s.operational_status;

-- -----------------------------------------------------------------------------
-- VIEW 4: v_revenue_summary
-- Summarizes financial performance, energy dispatched, and billing metrics by station
-- -----------------------------------------------------------------------------
CREATE VIEW `v_revenue_summary` AS
SELECT 
    s.id AS station_id,
    s.station_code,
    s.name AS station_name,
    s.city,
    COUNT(DISTINCT b.id) AS total_bills_issued,
    SUM(CASE WHEN b.payment_status = 'PAID' THEN 1 ELSE 0 END) AS paid_bills_count,
    SUM(CASE WHEN b.payment_status = 'PENDING' THEN 1 ELSE 0 END) AS pending_bills_count,
    COALESCE(SUM(b.energy_consumed_kwh), 0) AS total_energy_kwh_delivered,
    COALESCE(SUM(b.energy_charge), 0) AS total_energy_charges_inr,
    COALESCE(SUM(b.service_fee), 0) AS total_service_fees_inr,
    COALESCE(SUM(b.tax_amount), 0) AS total_taxes_collected_inr,
    COALESCE(SUM(CASE WHEN b.payment_status = 'PAID' THEN b.total_amount ELSE 0 END), 0) AS total_realized_revenue_inr,
    COALESCE(SUM(CASE WHEN b.payment_status = 'PENDING' THEN b.total_amount ELSE 0 END), 0) AS outstanding_receivable_inr
FROM `stations` s
LEFT JOIN `chargers` c ON s.id = c.station_id
LEFT JOIN `ports` p ON c.id = p.charger_id
LEFT JOIN `bookings` bk ON p.id = bk.port_id
LEFT JOIN `bills` b ON bk.id = b.booking_id
GROUP BY s.id, s.station_code, s.name, s.city;

-- -----------------------------------------------------------------------------
-- VIEW 5: v_customer_billing_history
-- Full financial audit view for customer invoices
-- -----------------------------------------------------------------------------
CREATE VIEW `v_customer_billing_history` AS
SELECT 
    b.id AS bill_id,
    b.invoice_number,
    b.user_id,
    u.full_name AS customer_name,
    u.email AS customer_email,
    bk.booking_reference,
    s.name AS station_name,
    c.charger_code,
    c.label AS charger_label,
    p.port_code,
    p.connector_type,
    cs.session_code,
    cs.meter_start_kwh,
    cs.meter_end_kwh,
    b.energy_consumed_kwh,
    b.tariff_rate_per_kwh,
    b.energy_charge,
    b.service_fee,
    b.tax_amount,
    b.total_amount,
    b.payment_status,
    b.created_at AS bill_date,
    pay.payment_reference,
    pay.payment_method,
    pay.transaction_date
FROM `bills` b
INNER JOIN `users` u ON b.user_id = u.id
INNER JOIN `bookings` bk ON b.booking_id = bk.id
INNER JOIN `ports` p ON bk.port_id = p.id
INNER JOIN `chargers` c ON p.charger_id = c.id
INNER JOIN `stations` s ON c.station_id = s.id
LEFT JOIN `charging_sessions` cs ON b.session_id = cs.id
LEFT JOIN `payments` pay ON b.id = pay.bill_id;
