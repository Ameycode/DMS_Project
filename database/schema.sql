-- =============================================================================
-- EV Charging Slot and Billing Management System
-- Relational Database Schema (MySQL 8.x)
-- Normalized to 3NF (Third Normal Form)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `ev_charging_db`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `ev_charging_db`;

-- Drop tables in reverse foreign key order for clean resets
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `feedback`;
DROP TABLE IF EXISTS `maintenance_records`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `bills`;
DROP TABLE IF EXISTS `charging_sessions`;
DROP TABLE IF EXISTS `bookings`;
DROP TABLE IF EXISTS `tariffs`;
DROP TABLE IF EXISTS `ports`;
DROP TABLE IF EXISTS `chargers`;
DROP TABLE IF EXISTS `stations`;
DROP TABLE IF EXISTS `users`;

-- -----------------------------------------------------------------------------
-- 1. USERS TABLE
-- Stores customers, station operators, and administrators
-- -----------------------------------------------------------------------------
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(120) NOT NULL UNIQUE,
  `phone` VARCHAR(20) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('CUSTOMER', 'OPERATOR', 'ADMIN') NOT NULL DEFAULT 'CUSTOMER',
  `ev_model` VARCHAR(100) DEFAULT NULL,
  `compatible_connector` VARCHAR(50) DEFAULT 'CCS2',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_email` (`email`)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 2. STATIONS TABLE
-- Physical charging station locations
-- -----------------------------------------------------------------------------
CREATE TABLE `stations` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `station_code` VARCHAR(20) NOT NULL UNIQUE,
  `name` VARCHAR(150) NOT NULL,
  `address` VARCHAR(255) NOT NULL,
  `city` VARCHAR(80) NOT NULL,
  `latitude` DECIMAL(10, 7) NOT NULL,
  `longitude` DECIMAL(10, 7) NOT NULL,
  `opening_time` TIME NOT NULL DEFAULT '06:00:00',
  `closing_time` TIME NOT NULL DEFAULT '23:00:00',
  `operational_status` ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE') NOT NULL DEFAULT 'ACTIVE',
  `contact_number` VARCHAR(20) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_stations_city` (`city`),
  INDEX `idx_stations_status` (`operational_status`)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 3. CHARGERS TABLE
-- Physical charger hardware cabinets situated at a specific station
-- (Core DBMS feature: Every charger belongs to exactly ONE station)
-- -----------------------------------------------------------------------------
CREATE TABLE `chargers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `charger_code` VARCHAR(20) NOT NULL UNIQUE,
  `station_id` INT NOT NULL,
  `label` VARCHAR(100) NOT NULL,
  `technology_type` VARCHAR(50) NOT NULL COMMENT 'e.g. Ultra Fast DC, Fast DC, Rapid AC, Slow AC',
  `manufacturer` VARCHAR(100) DEFAULT NULL,
  `max_power_kw` DECIMAL(6, 2) NOT NULL,
  `operational_status` ENUM('ACTIVE', 'OFFLINE', 'MAINTENANCE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_chargers_station` FOREIGN KEY (`station_id`)
    REFERENCES `stations`(`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  INDEX `idx_chargers_station_id` (`station_id`),
  INDEX `idx_chargers_status` (`operational_status`)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 4. PORTS TABLE
-- Specific physical connector ports belonging to a charger cabinet
-- (Core DBMS feature: Every port belongs to exactly ONE physical charger)
-- -----------------------------------------------------------------------------
CREATE TABLE `ports` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `port_code` VARCHAR(20) NOT NULL UNIQUE,
  `charger_id` INT NOT NULL,
  `port_number` INT NOT NULL COMMENT 'Physical port 1, 2 on the dispenser',
  `connector_type` ENUM('CCS2', 'Type 2', 'CHAdeMO', 'GB/T', 'Tesla') NOT NULL,
  `max_power_kw` DECIMAL(6, 2) NOT NULL,
  `current_status` ENUM('AVAILABLE', 'RESERVED', 'CHARGING', 'UNAVAILABLE', 'MAINTENANCE') NOT NULL DEFAULT 'AVAILABLE',
  `last_status_update` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `uk_charger_port_dispenser` UNIQUE (`charger_id`, `port_number`),
  CONSTRAINT `fk_ports_charger` FOREIGN KEY (`charger_id`)
    REFERENCES `chargers`(`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  INDEX `idx_ports_charger_id` (`charger_id`),
  INDEX `idx_ports_connector` (`connector_type`),
  INDEX `idx_ports_status` (`current_status`)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 5. TARIFFS TABLE
-- Electricity pricing per kWh, service fees and applicable taxes
-- -----------------------------------------------------------------------------
CREATE TABLE `tariffs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `station_id` INT DEFAULT NULL COMMENT 'NULL represents default platform tariff',
  `connector_type` ENUM('CCS2', 'Type 2', 'CHAdeMO', 'GB/T', 'Tesla') NOT NULL,
  `rate_per_kwh` DECIMAL(8, 2) NOT NULL,
  `service_fee` DECIMAL(8, 2) NOT NULL DEFAULT 20.00,
  `tax_percentage` DECIMAL(5, 2) NOT NULL DEFAULT 18.00 COMMENT 'GST %',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_tariffs_station` FOREIGN KEY (`station_id`)
    REFERENCES `stations`(`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  INDEX `idx_tariffs_station_connector` (`station_id`, `connector_type`)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 6. BOOKINGS TABLE
-- Slot reservations on a specific physical port
-- Concurrency invariant: No two bookings on the SAME port may overlap in time
-- -----------------------------------------------------------------------------
CREATE TABLE `bookings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `booking_reference` VARCHAR(30) NOT NULL UNIQUE,
  `user_id` INT NOT NULL,
  `port_id` INT NOT NULL,
  `start_time` DATETIME NOT NULL,
  `end_time` DATETIME NOT NULL,
  `status` ENUM('CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'CONFIRMED',
  `estimated_kwh` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
  `estimated_cost` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `cancellation_reason` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_bookings_user` FOREIGN KEY (`user_id`)
    REFERENCES `users`(`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_bookings_port` FOREIGN KEY (`port_id`)
    REFERENCES `ports`(`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `chk_booking_interval` CHECK (`end_time` > `start_time`),
  INDEX `idx_bookings_port_times` (`port_id`, `start_time`, `end_time`),
  INDEX `idx_bookings_user` (`user_id`),
  INDEX `idx_bookings_status` (`status`)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 7. CHARGING SESSIONS TABLE
-- Real/Simulated energy transfer events tied to a confirmed booking and port
-- -----------------------------------------------------------------------------
CREATE TABLE `charging_sessions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `session_code` VARCHAR(30) NOT NULL UNIQUE,
  `booking_id` INT NOT NULL UNIQUE,
  `port_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `session_status` ENUM('IN_PROGRESS', 'COMPLETED', 'INTERRUPTED') NOT NULL DEFAULT 'IN_PROGRESS',
  `start_time` DATETIME NOT NULL,
  `end_time` DATETIME DEFAULT NULL,
  `meter_start_kwh` DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
  `meter_end_kwh` DECIMAL(8, 2) DEFAULT NULL,
  `energy_consumed_kwh` DECIMAL(8, 2) DEFAULT NULL,
  `is_simulated` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_sessions_booking` FOREIGN KEY (`booking_id`)
    REFERENCES `bookings`(`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_sessions_port` FOREIGN KEY (`port_id`)
    REFERENCES `ports`(`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`)
    REFERENCES `users`(`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `chk_meter_readings` CHECK (`meter_end_kwh` IS NULL OR `meter_end_kwh` >= `meter_start_kwh`),
  INDEX `idx_sessions_booking` (`booking_id`),
  INDEX `idx_sessions_port` (`port_id`),
  INDEX `idx_sessions_status` (`session_status`)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 8. BILLS TABLE
-- Invoices generated upon charging session completion
-- -----------------------------------------------------------------------------
CREATE TABLE `bills` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_number` VARCHAR(30) NOT NULL UNIQUE,
  `booking_id` INT NOT NULL UNIQUE,
  `session_id` INT DEFAULT NULL UNIQUE,
  `user_id` INT NOT NULL,
  `energy_consumed_kwh` DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
  `tariff_rate_per_kwh` DECIMAL(8, 2) NOT NULL,
  `energy_charge` DECIMAL(10, 2) NOT NULL,
  `service_fee` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `tax_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(10, 2) NOT NULL,
  `payment_status` ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_bills_booking` FOREIGN KEY (`booking_id`)
    REFERENCES `bookings`(`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_bills_session` FOREIGN KEY (`session_id`)
    REFERENCES `charging_sessions`(`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_bills_user` FOREIGN KEY (`user_id`)
    REFERENCES `users`(`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  INDEX `idx_bills_user_payment` (`user_id`, `payment_status`),
  INDEX `idx_bills_created` (`created_at`)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 9. PAYMENTS TABLE
-- Payment transactions against issued bills
-- -----------------------------------------------------------------------------
CREATE TABLE `payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `payment_reference` VARCHAR(40) NOT NULL UNIQUE,
  `bill_id` INT NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `payment_method` ENUM('UPI', 'CREDIT_CARD', 'DEBIT_CARD', 'NET_BANKING', 'WALLET') NOT NULL DEFAULT 'UPI',
  `payment_status` ENUM('SUCCESS', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'SUCCESS',
  `transaction_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `gateway_response` VARCHAR(255) DEFAULT 'Payment Simulated Successfully',
  CONSTRAINT `fk_payments_bill` FOREIGN KEY (`bill_id`)
    REFERENCES `bills`(`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  INDEX `idx_payments_bill` (`bill_id`),
  INDEX `idx_payments_status` (`payment_status`)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 10. MAINTENANCE RECORDS TABLE
-- Defect logging and port repair tracking
-- -----------------------------------------------------------------------------
CREATE TABLE `maintenance_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `port_id` INT NOT NULL,
  `reported_by` INT NOT NULL,
  `issue_description` TEXT NOT NULL,
  `severity` ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') NOT NULL DEFAULT 'MEDIUM',
  `status` ENUM('OPEN', 'IN_PROGRESS', 'RESOLVED') NOT NULL DEFAULT 'OPEN',
  `resolution_notes` TEXT DEFAULT NULL,
  `reported_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT `fk_maint_port` FOREIGN KEY (`port_id`)
    REFERENCES `ports`(`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_maint_reporter` FOREIGN KEY (`reported_by`)
    REFERENCES `users`(`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  INDEX `idx_maint_port` (`port_id`),
  INDEX `idx_maint_status` (`status`)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 11. FEEDBACK TABLE
-- Customer station ratings and reviews
-- -----------------------------------------------------------------------------
CREATE TABLE `feedback` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `station_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `booking_id` INT DEFAULT NULL,
  `rating` INT NOT NULL,
  `comment` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `chk_feedback_rating` CHECK (`rating` BETWEEN 1 AND 5),
  CONSTRAINT `fk_feedback_station` FOREIGN KEY (`station_id`)
    REFERENCES `stations`(`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_feedback_user` FOREIGN KEY (`user_id`)
    REFERENCES `users`(`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_feedback_booking` FOREIGN KEY (`booking_id`)
    REFERENCES `bookings`(`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  INDEX `idx_feedback_station` (`station_id`)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 12. AUDIT LOGS TABLE
-- Trace administrative updates, security actions, and port status transitions
-- -----------------------------------------------------------------------------
CREATE TABLE `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT DEFAULT NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_name` VARCHAR(50) NOT NULL,
  `entity_id` INT DEFAULT NULL,
  `old_values` JSON DEFAULT NULL,
  `new_values` JSON DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT '127.0.0.1',
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_audit_entity` (`entity_name`, `entity_id`),
  INDEX `idx_audit_timestamp` (`timestamp`)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- 13. NOTIFICATIONS TABLE
-- Real-time and persistent alerts for customers and operators
-- -----------------------------------------------------------------------------
CREATE TABLE `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `title` VARCHAR(120) NOT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM('INFO', 'SUCCESS', 'WARNING', 'ALERT') NOT NULL DEFAULT 'INFO',
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`)
    REFERENCES `users`(`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  INDEX `idx_notifications_user_read` (`user_id`, `is_read`)
) ENGINE=InnoDB;
