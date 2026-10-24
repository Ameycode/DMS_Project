-- =============================================================================
-- EV Charging Slot and Billing Management System
-- Stored Procedures Demonstrating ACID Transactions & Concurrency Control
-- =============================================================================

USE `ev_charging_db`;

DROP PROCEDURE IF EXISTS `sp_book_charging_slot`;
DROP PROCEDURE IF EXISTS `sp_complete_charging_session`;
DROP PROCEDURE IF EXISTS `sp_get_charger_port_hierarchy`;

DELIMITER $$

-- -----------------------------------------------------------------------------
-- PROCEDURE 1: sp_book_charging_slot
-- Demonstrates:
-- 1. ACID Transactions (Atomicity, Consistency, Isolation, Durability)
-- 2. Concurrency Control with Pessimistic Locking (SELECT ... FOR UPDATE)
-- 3. Half-Open Interval Collision Detection: [start_time, end_time)
-- 4. Foreign Key and Business Invariant Verification
-- -----------------------------------------------------------------------------
CREATE PROCEDURE `sp_book_charging_slot`(
    IN  p_user_id        INT,
    IN  p_port_id        INT,
    IN  p_start_time     DATETIME,
    IN  p_end_time       DATETIME,
    IN  p_estimated_kwh  DECIMAL(6,2),
    OUT p_booking_id     INT,
    OUT p_booking_ref    VARCHAR(30),
    OUT p_status_code    VARCHAR(20),
    OUT p_message        VARCHAR(255)
)
proc_label: BEGIN
    DECLARE v_port_status VARCHAR(20);
    DECLARE v_charger_status VARCHAR(20);
    DECLARE v_station_status VARCHAR(20);
    DECLARE v_connector VARCHAR(50);
    DECLARE v_tariff_rate DECIMAL(8,2) DEFAULT 15.00;
    DECLARE v_service_fee DECIMAL(8,2) DEFAULT 20.00;
    DECLARE v_tax_pct DECIMAL(5,2) DEFAULT 18.00;
    DECLARE v_station_id INT;
    DECLARE v_conflict_count INT DEFAULT 0;
    DECLARE v_estimated_cost DECIMAL(10,2) DEFAULT 0.00;
    DECLARE v_energy_charge DECIMAL(10,2);
    DECLARE v_tax_amount DECIMAL(10,2);

    -- Declare error handler for SQL exceptions to guarantee ROLLBACK
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_booking_id = NULL;
        SET p_booking_ref = NULL;
        SET p_status_code = 'SQL_ERROR';
        SET p_message = 'Internal database exception encountered. Transaction rolled back.';
    END;

    -- Basic validation
    IF p_end_time <= p_start_time THEN
        SET p_status_code = 'INVALID_TIME';
        SET p_message = 'Booking end time must be strictly after start time.';
        LEAVE proc_label;
    END IF;

    -- Start Atomic Transaction
    START TRANSACTION;

    -- 1. Lock port record to serialize concurrent bookings for this physical port
    SELECT p.current_status, c.operational_status, s.operational_status, p.connector_type, s.id
    INTO v_port_status, v_charger_status, v_station_status, v_connector, v_station_id
    FROM `ports` p
    INNER JOIN `chargers` c ON p.charger_id = c.id
    INNER JOIN `stations` s ON c.station_id = s.id
    WHERE p.id = p_port_id
    FOR UPDATE;

    IF v_port_status IS NULL THEN
        ROLLBACK;
        SET p_status_code = 'PORT_NOT_FOUND';
        SET p_message = 'Selected charging port does not exist in the database.';
        LEAVE proc_label;
    END IF;

    -- 2. Verify hardware operational health
    IF v_port_status = 'MAINTENANCE' OR v_port_status = 'UNAVAILABLE' THEN
        ROLLBACK;
        SET p_status_code = 'PORT_MAINTENANCE';
        SET p_message = 'Port is currently out of service or under maintenance.';
        LEAVE proc_label;
    END IF;

    IF v_charger_status <> 'ACTIVE' OR v_station_status <> 'ACTIVE' THEN
        ROLLBACK;
        SET p_status_code = 'STATION_OFFLINE';
        SET p_message = 'The parent charger or station is currently offline.';
        LEAVE proc_label;
    END IF;

    -- 3. Check for overlapping interval on the EXACT physical port
    -- Invariant: existing.start_time < new.end_time AND existing.end_time > new.start_time
    SELECT COUNT(*) INTO v_conflict_count
    FROM `bookings`
    WHERE port_id = p_port_id
      AND status IN ('CONFIRMED', 'ACTIVE')
      AND start_time < p_end_time
      AND end_time > p_start_time
    FOR UPDATE;

    IF v_conflict_count > 0 THEN
        ROLLBACK;
        SET p_status_code = 'SLOT_CONFLICT';
        SET p_message = 'Double-booking rejected: The requested time interval overlaps with an existing reservation on this port.';
        LEAVE proc_label;
    END IF;

    -- 4. Calculate estimated cost using configured tariff
    SELECT rate_per_kwh, service_fee, tax_percentage
    INTO v_tariff_rate, v_service_fee, v_tax_pct
    FROM `tariffs`
    WHERE (station_id = v_station_id OR station_id IS NULL)
      AND connector_type = v_connector
      AND is_active = TRUE
    ORDER BY station_id DESC
    LIMIT 1;

    SET v_energy_charge = p_estimated_kwh * v_tariff_rate;
    SET v_tax_amount = (v_energy_charge + v_service_fee) * (v_tax_pct / 100);
    SET v_estimated_cost = v_energy_charge + v_service_fee + v_tax_amount;

    -- 5. Generate unique booking reference BK-YYYYMMDD-XXXX
    SET p_booking_ref = CONCAT('BK-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(FLOOR(RAND() * 90000 + 10000), 5, '0'));

    -- 6. Insert confirmed booking record
    INSERT INTO `bookings` (
        booking_reference, user_id, port_id, start_time, end_time,
        status, estimated_kwh, estimated_cost
    ) VALUES (
        p_booking_ref, p_user_id, p_port_id, p_start_time, p_end_time,
        'CONFIRMED', p_estimated_kwh, v_estimated_cost
    );

    SET p_booking_id = LAST_INSERT_ID();

    -- 7. Audit log of booking creation
    INSERT INTO `audit_logs` (user_id, action, entity_name, entity_id, new_values)
    VALUES (
        p_user_id,
        'CREATE_BOOKING',
        'bookings',
        p_booking_id,
        JSON_OBJECT('booking_ref', p_booking_ref, 'port_id', p_port_id, 'start', p_start_time, 'end', p_end_time)
    );

    -- 8. Customer notification
    INSERT INTO `notifications` (user_id, title, message, type)
    VALUES (
        p_user_id,
        'Booking Confirmed',
        CONCAT('Your slot for Port #', p_port_id, ' (Ref: ', p_booking_ref, ') has been successfully confirmed.'),
        'SUCCESS'
    );

    COMMIT;

    SET p_status_code = 'SUCCESS';
    SET p_message = 'Charging slot booked successfully with complete concurrency protection.';
END proc_label$$

-- -----------------------------------------------------------------------------
-- PROCEDURE 2: sp_complete_charging_session
-- Concludes a simulated session, computes final metered bill, and creates invoice
-- -----------------------------------------------------------------------------
CREATE PROCEDURE `sp_complete_charging_session`(
    IN  p_session_id     INT,
    IN  p_meter_end_kwh  DECIMAL(8,2),
    OUT p_bill_id        INT,
    OUT p_invoice_no     VARCHAR(30),
    OUT p_total_amount   DECIMAL(10,2),
    OUT p_status_code    VARCHAR(20),
    OUT p_message        VARCHAR(255)
)
proc_label: BEGIN
    DECLARE v_booking_id INT;
    DECLARE v_port_id INT;
    DECLARE v_user_id INT;
    DECLARE v_meter_start DECIMAL(8,2);
    DECLARE v_current_session_status VARCHAR(20);
    DECLARE v_energy_consumed DECIMAL(8,2);
    DECLARE v_connector VARCHAR(50);
    DECLARE v_station_id INT;
    DECLARE v_tariff_rate DECIMAL(8,2) DEFAULT 15.00;
    DECLARE v_service_fee DECIMAL(8,2) DEFAULT 20.00;
    DECLARE v_tax_pct DECIMAL(5,2) DEFAULT 18.00;
    DECLARE v_energy_charge DECIMAL(10,2);
    DECLARE v_tax_amount DECIMAL(10,2);
    DECLARE v_final_total DECIMAL(10,2);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_bill_id = NULL;
        SET p_invoice_no = NULL;
        SET p_total_amount = 0.00;
        SET p_status_code = 'SQL_ERROR';
        SET p_message = 'Internal error during session completion. Transaction rolled back.';
    END;

    START TRANSACTION;

    -- Lock session record FOR UPDATE
    SELECT cs.booking_id, cs.port_id, cs.user_id, cs.meter_start_kwh, cs.session_status,
           p.connector_type, s.id
    INTO v_booking_id, v_port_id, v_user_id, v_meter_start, v_current_session_status,
         v_connector, v_station_id
    FROM `charging_sessions` cs
    INNER JOIN `ports` p ON cs.port_id = p.id
    INNER JOIN `chargers` c ON p.charger_id = c.id
    INNER JOIN `stations` s ON c.station_id = s.id
    WHERE cs.id = p_session_id
    FOR UPDATE;

    IF v_booking_id IS NULL THEN
        ROLLBACK;
        SET p_status_code = 'SESSION_NOT_FOUND';
        SET p_message = 'Specified charging session ID does not exist.';
        LEAVE proc_label;
    END IF;

    IF v_current_session_status <> 'IN_PROGRESS' THEN
        ROLLBACK;
        SET p_status_code = 'ALREADY_COMPLETED';
        SET p_message = 'This charging session has already been finalized or interrupted.';
        LEAVE proc_label;
    END IF;

    IF p_meter_end_kwh < v_meter_start THEN
        ROLLBACK;
        SET p_status_code = 'INVALID_METER';
        SET p_message = 'Meter end reading cannot be less than initial meter start reading.';
        LEAVE proc_label;
    END IF;

    -- Calculate consumption
    SET v_energy_consumed = p_meter_end_kwh - v_meter_start;

    -- Determine applicable tariff
    SELECT rate_per_kwh, service_fee, tax_percentage
    INTO v_tariff_rate, v_service_fee, v_tax_pct
    FROM `tariffs`
    WHERE (station_id = v_station_id OR station_id IS NULL)
      AND connector_type = v_connector
      AND is_active = TRUE
    ORDER BY station_id DESC
    LIMIT 1;

    SET v_energy_charge = v_energy_consumed * v_tariff_rate;
    SET v_tax_amount = (v_energy_charge + v_service_fee) * (v_tax_pct / 100);
    SET v_final_total = v_energy_charge + v_service_fee + v_tax_amount;

    -- Update session details
    UPDATE `charging_sessions`
    SET end_time = NOW(),
        meter_end_kwh = p_meter_end_kwh,
        energy_consumed_kwh = v_energy_consumed,
        session_status = 'COMPLETED'
    WHERE id = p_session_id;

    -- Update booking status
    UPDATE `bookings`
    SET status = 'COMPLETED'
    WHERE id = v_booking_id;

    -- Release port back to AVAILABLE status
    UPDATE `ports`
    SET current_status = 'AVAILABLE'
    WHERE id = v_port_id;

    -- Generate unique invoice number INV-YYYYMMDD-XXXX
    SET p_invoice_no = CONCAT('INV-', DATE_FORMAT(NOW(), '%Y%m%d'), '-', LPAD(FLOOR(RAND() * 90000 + 10000), 5, '0'));

    -- Create final bill
    INSERT INTO `bills` (
        invoice_number, booking_id, session_id, user_id,
        energy_consumed_kwh, tariff_rate_per_kwh, energy_charge,
        service_fee, tax_amount, total_amount, payment_status
    ) VALUES (
        p_invoice_no, v_booking_id, p_session_id, v_user_id,
        v_energy_consumed, v_tariff_rate, v_energy_charge,
        v_service_fee, v_tax_amount, v_final_total, 'PENDING'
    );

    SET p_bill_id = LAST_INSERT_ID();
    SET p_total_amount = v_final_total;

    -- Audit log
    INSERT INTO `audit_logs` (user_id, action, entity_name, entity_id, new_values)
    VALUES (
        v_user_id,
        'COMPLETE_SESSION_GENERATE_BILL',
        'bills',
        p_bill_id,
        JSON_OBJECT('session_id', p_session_id, 'invoice_no', p_invoice_no, 'amount', v_final_total)
    );

    -- Notification
    INSERT INTO `notifications` (user_id, title, message, type)
    VALUES (
        v_user_id,
        'Charging Completed & Invoice Ready',
        CONCAT('Your charging session is complete. Consumed: ', v_energy_consumed, ' kWh. Bill amount: ₹', v_final_total),
        'INFO'
    );

    COMMIT;

    SET p_status_code = 'SUCCESS';
    SET p_message = 'Charging session successfully finalized and bill generated.';
END proc_label$$

-- -----------------------------------------------------------------------------
-- PROCEDURE 3: sp_get_charger_port_hierarchy
-- Explicitly retrieves Charger-to-Port hierarchy for a given Station
-- -----------------------------------------------------------------------------
CREATE PROCEDURE `sp_get_charger_port_hierarchy`(
    IN p_station_id INT
)
BEGIN
    SELECT 
        s.id AS station_id,
        s.station_code,
        s.name AS station_name,
        s.city AS station_city,
        c.id AS charger_id,
        c.charger_code,
        c.label AS charger_label,
        c.technology_type AS charger_type,
        c.max_power_kw AS charger_max_kw,
        c.operational_status AS charger_status,
        p.id AS port_id,
        p.port_code,
        p.port_number,
        p.connector_type,
        p.max_power_kw AS port_max_kw,
        p.current_status AS port_status
    FROM `stations` s
    INNER JOIN `chargers` c ON s.id = c.station_id
    INNER JOIN `ports` p ON c.id = p.charger_id
    WHERE (p_station_id IS NULL OR s.id = p_station_id)
    ORDER BY s.id, c.id, p.port_number;
END$$

DELIMITER ;
