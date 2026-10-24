-- =============================================================================
-- EV Charging Slot and Billing Management System
-- Database Triggers for Data Integrity and Automated Auditing
-- =============================================================================

USE `ev_charging_db`;

DROP TRIGGER IF EXISTS `trg_audit_port_status_change`;
DROP TRIGGER IF EXISTS `trg_prevent_invalid_session_meter`;
DROP TRIGGER IF EXISTS `trg_update_port_on_maintenance`;
DROP TRIGGER IF EXISTS `trg_restore_port_on_maintenance_resolved`;

DELIMITER $$

-- -----------------------------------------------------------------------------
-- TRIGGER 1: trg_audit_port_status_change
-- Fires AFTER UPDATE ON ports
-- Automatically audits operational status transitions (AVAILABLE, CHARGING, etc.)
-- -----------------------------------------------------------------------------
CREATE TRIGGER `trg_audit_port_status_change`
AFTER UPDATE ON `ports`
FOR EACH ROW
BEGIN
    IF OLD.current_status <> NEW.current_status THEN
        INSERT INTO `audit_logs` (
            user_id,
            action,
            entity_name,
            entity_id,
            old_values,
            new_values
        ) VALUES (
            NULL,
            'PORT_STATUS_TRANSITION',
            'ports',
            NEW.id,
            JSON_OBJECT('status', OLD.current_status, 'port_code', OLD.port_code),
            JSON_OBJECT('status', NEW.current_status, 'port_code', NEW.port_code)
        );
    END IF;
END$$

-- -----------------------------------------------------------------------------
-- TRIGGER 2: trg_prevent_invalid_session_meter
-- Fires BEFORE UPDATE ON charging_sessions
-- Enforces physical meter monotonicity: end_reading >= start_reading
-- -----------------------------------------------------------------------------
CREATE TRIGGER `trg_prevent_invalid_session_meter`
BEFORE UPDATE ON `charging_sessions`
FOR EACH ROW
BEGIN
    IF NEW.meter_end_kwh IS NOT NULL AND NEW.meter_end_kwh < NEW.meter_start_kwh THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Integrity violation: Final meter reading cannot be lower than start meter reading.';
    END IF;
END$$

-- -----------------------------------------------------------------------------
-- TRIGGER 3: trg_update_port_on_maintenance
-- Fires AFTER INSERT ON maintenance_records
-- Automatically flags the physical port as MAINTENANCE upon logging an issue
-- -----------------------------------------------------------------------------
CREATE TRIGGER `trg_update_port_on_maintenance`
AFTER INSERT ON `maintenance_records`
FOR EACH ROW
BEGIN
    IF NEW.status = 'OPEN' THEN
        UPDATE `ports`
        SET current_status = 'MAINTENANCE'
        WHERE id = NEW.port_id;
    END IF;
END$$

-- -----------------------------------------------------------------------------
-- TRIGGER 4: trg_restore_port_on_maintenance_resolved
-- Fires AFTER UPDATE ON maintenance_records
-- Automatically restores the port status to AVAILABLE when issue is resolved
-- -----------------------------------------------------------------------------
CREATE TRIGGER `trg_restore_port_on_maintenance_resolved`
AFTER UPDATE ON `maintenance_records`
FOR EACH ROW
BEGIN
    IF OLD.status <> 'RESOLVED' AND NEW.status = 'RESOLVED' THEN
        UPDATE `ports`
        SET current_status = 'AVAILABLE'
        WHERE id = NEW.port_id;
    END IF;
END$$

DELIMITER ;
