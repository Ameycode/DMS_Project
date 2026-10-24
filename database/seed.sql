-- =============================================================================
-- EV Charging Slot and Billing Management System
-- Coherent Demonstration Seed Data (MySQL 8.x)
-- =============================================================================

USE `ev_charging_db`;

-- Temporarily disable foreign key checks to safely truncate/populate
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE `notifications`;
TRUNCATE TABLE `audit_logs`;
TRUNCATE TABLE `feedback`;
TRUNCATE TABLE `maintenance_records`;
TRUNCATE TABLE `payments`;
TRUNCATE TABLE `bills`;
TRUNCATE TABLE `charging_sessions`;
TRUNCATE TABLE `bookings`;
TRUNCATE TABLE `tariffs`;
TRUNCATE TABLE `ports`;
TRUNCATE TABLE `chargers`;
TRUNCATE TABLE `stations`;
TRUNCATE TABLE `users`;
SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- 1. USERS
-- Standard test password for all seed accounts: "Password@123"
-- Bcrypt Hash: $2a$10$wT0o3q6G5z5y2eI3N5Zl/.oWJkWv9X0E1u4xM/iA6SGBuV2N7x6hG
-- -----------------------------------------------------------------------------
INSERT INTO `users` (`id`, `full_name`, `email`, `phone`, `password_hash`, `role`, `ev_model`, `compatible_connector`) VALUES
(1, 'System Administrator', 'admin@evcharge.com', '+91-9876543210', '$2a$10$wT0o3q6G5z5y2eI3N5Zl/.oWJkWv9X0E1u4xM/iA6SGBuV2N7x6hG', 'ADMIN', NULL, NULL),
(2, 'Suresh Kumar (Operator)', 'operator@evcharge.com', '+91-9876543211', '$2a$10$wT0o3q6G5z5y2eI3N5Zl/.oWJkWv9X0E1u4xM/iA6SGBuV2N7x6hG', 'OPERATOR', NULL, NULL),
(3, 'Rahul Sharma', 'rahul@gmail.com', '+91-9811223344', '$2a$10$wT0o3q6G5z5y2eI3N5Zl/.oWJkWv9X0E1u4xM/iA6SGBuV2N7x6hG', 'CUSTOMER', 'Tata Nexon EV Max', 'CCS2'),
(4, 'Priya Nair', 'priya@gmail.com', '+91-9822334455', '$2a$10$wT0o3q6G5z5y2eI3N5Zl/.oWJkWv9X0E1u4xM/iA6SGBuV2N7x6hG', 'CUSTOMER', 'MG ZS EV Excite', 'CCS2'),
(5, 'Anand Deshmukh', 'anand@gmail.com', '+91-9833445566', '$2a$10$wT0o3q6G5z5y2eI3N5Zl/.oWJkWv9X0E1u4xM/iA6SGBuV2N7x6hG', 'CUSTOMER', 'Hyundai Ioniq 5', 'CCS2'),
(6, 'Kavita Patel', 'kavita@gmail.com', '+91-9844556677', '$2a$10$wT0o3q6G5z5y2eI3N5Zl/.oWJkWv9X0E1u4xM/iA6SGBuV2N7x6hG', 'CUSTOMER', 'Tata Tiago EV', 'Type 2'),
(7, 'Vikram Mehta', 'vikram@gmail.com', '+91-9855667788', '$2a$10$wT0o3q6G5z5y2eI3N5Zl/.oWJkWv9X0E1u4xM/iA6SGBuV2N7x6hG', 'CUSTOMER', 'Nissan Leaf (Import)', 'CHAdeMO');

-- -----------------------------------------------------------------------------
-- 2. STATIONS
-- -----------------------------------------------------------------------------
INSERT INTO `stations` (`id`, `station_code`, `name`, `address`, `city`, `latitude`, `longitude`, `opening_time`, `closing_time`, `operational_status`, `contact_number`) VALUES
(1, 'STN-001', 'City Centre EV Superhub', '104 MG Road, Central Business District', 'Bengaluru', 12.9715987, 77.5945627, '06:00:00', '23:30:00', 'ACTIVE', '+91-80-22233445'),
(2, 'STN-002', 'Tech Park Mega Charge', 'Phase 1, Electronic City, Hosur Road', 'Bengaluru', 12.8452140, 77.6601680, '00:00:00', '23:59:59', 'ACTIVE', '+91-80-33344556'),
(3, 'STN-003', 'Highway Express Charging Oasis', 'NH 48 KM 42, Nelamangala Tollway', 'Tumakuru Road', 13.0987120, 77.3892110, '00:00:00', '23:59:59', 'ACTIVE', '+91-80-44455667'),
(4, 'STN-004', 'Airport Green Mobility Hub', 'Terminal 2 Boulevard, Kempegowda Airport', 'Devanahalli', 13.1986350, 77.7065920, '00:00:00', '23:59:59', 'ACTIVE', '+91-80-55566778');

-- -----------------------------------------------------------------------------
-- 3. CHARGERS
-- Physical hardware cabinets linked to stations
-- -----------------------------------------------------------------------------
INSERT INTO `chargers` (`id`, `charger_code`, `station_id`, `label`, `technology_type`, `manufacturer`, `max_power_kw`, `operational_status`) VALUES
(1, 'CHG-001', 1, 'Delta Ultra Fast DC 180kW', 'Fast DC', 'Delta Electronics', 180.00, 'ACTIVE'),
(2, 'CHG-002', 1, 'ABB Terra Dual DC 120kW', 'Fast DC', 'ABB', 120.00, 'ACTIVE'),
(3, 'CHG-003', 1, 'Schneider EVlink AC 44kW', 'Slow AC', 'Schneider Electric', 44.00, 'ACTIVE'),
(4, 'CHG-004', 2, 'Kempower Heavy Duty Fast DC 200kW', 'Ultra Fast DC', 'Kempower', 200.00, 'ACTIVE'),
(5, 'CHG-005', 2, 'Exicom Harmony DC 60kW', 'Fast DC', 'Exicom', 60.00, 'ACTIVE'),
(6, 'CHG-006', 3, 'Alpitronic Hypercharger HYC300', 'Ultra Fast DC', 'Alpitronic', 300.00, 'ACTIVE'),
(7, 'CHG-007', 3, 'Delta Tri-Standard DC/AC 72kW', 'Fast DC', 'Delta Electronics', 72.00, 'ACTIVE'),
(8, 'CHG-008', 4, 'Siemens Sicharge D 160kW', 'Fast DC', 'Siemens', 160.00, 'ACTIVE');

-- -----------------------------------------------------------------------------
-- 4. PORTS
-- Physical ports mapped to their parent charger
-- -----------------------------------------------------------------------------
INSERT INTO `ports` (`id`, `port_code`, `charger_id`, `port_number`, `connector_type`, `max_power_kw`, `current_status`) VALUES
-- Ports for CHG-001 (Station 1 - Delta 180kW)
(1, 'PORT-001', 1, 1, 'CCS2', 120.00, 'AVAILABLE'),
(2, 'PORT-002', 1, 2, 'CCS2', 60.00, 'AVAILABLE'),

-- Ports for CHG-002 (Station 1 - ABB 120kW)
(3, 'PORT-003', 2, 1, 'CCS2', 60.00, 'RESERVED'),
(4, 'PORT-004', 2, 2, 'CHAdeMO', 50.00, 'AVAILABLE'),

-- Ports for CHG-003 (Station 1 - Schneider AC 44kW)
(5, 'PORT-005', 3, 1, 'Type 2', 22.00, 'AVAILABLE'),
(6, 'PORT-006', 3, 2, 'Type 2', 22.00, 'AVAILABLE'),

-- Ports for CHG-004 (Station 2 - Kempower 200kW)
(7, 'PORT-007', 4, 1, 'CCS2', 150.00, 'CHARGING'),
(8, 'PORT-008', 4, 2, 'CCS2', 50.00, 'AVAILABLE'),

-- Ports for CHG-005 (Station 2 - Exicom 60kW)
(9, 'PORT-009', 5, 1, 'CCS2', 30.00, 'AVAILABLE'),
(10, 'PORT-010', 5, 2, 'GB/T', 30.00, 'AVAILABLE'),

-- Ports for CHG-006 (Station 3 - Alpitronic HYC300)
(11, 'PORT-011', 6, 1, 'CCS2', 150.00, 'AVAILABLE'),
(12, 'PORT-012', 6, 2, 'CCS2', 150.00, 'AVAILABLE'),

-- Ports for CHG-007 (Station 3 - Delta 72kW)
(13, 'PORT-013', 7, 1, 'CCS2', 50.00, 'MAINTENANCE'),
(14, 'PORT-014', 7, 2, 'Type 2', 22.00, 'AVAILABLE'),

-- Ports for CHG-008 (Station 4 - Siemens 160kW)
(15, 'PORT-015', 8, 1, 'CCS2', 120.00, 'AVAILABLE'),
(16, 'PORT-016', 8, 2, 'CHAdeMO', 50.00, 'AVAILABLE');

-- -----------------------------------------------------------------------------
-- 5. TARIFFS
-- -----------------------------------------------------------------------------
INSERT INTO `tariffs` (`id`, `station_id`, `connector_type`, `rate_per_kwh`, `service_fee`, `tax_percentage`, `is_active`) VALUES
(1, NULL, 'CCS2', 18.00, 20.00, 18.00, TRUE),
(2, NULL, 'Type 2', 12.00, 15.00, 18.00, TRUE),
(3, NULL, 'CHAdeMO', 16.50, 20.00, 18.00, TRUE),
(4, NULL, 'GB/T', 14.00, 15.00, 18.00, TRUE),
(5, NULL, 'Tesla', 20.00, 25.00, 18.00, TRUE),
-- Station-specific premium rates for Highway Oasis (STN-003)
(6, 3, 'CCS2', 21.00, 30.00, 18.00, TRUE);

-- -----------------------------------------------------------------------------
-- 6. BOOKINGS
-- -----------------------------------------------------------------------------
INSERT INTO `bookings` (`id`, `booking_reference`, `user_id`, `port_id`, `start_time`, `end_time`, `status`, `estimated_kwh`, `estimated_cost`) VALUES
-- Completed past booking 1
(1, 'BK-20261020-10112', 3, 1, '2026-10-20 09:00:00', '2026-10-20 09:45:00', 'COMPLETED', 28.50, 628.94),
-- Completed past booking 2
(2, 'BK-20261021-20415', 4, 2, '2026-10-21 14:00:00', '2026-10-21 15:00:00', 'COMPLETED', 32.00, 703.28),
-- Completed past booking 3 (AC charging)
(3, 'BK-20261022-30872', 6, 5, '2026-10-22 10:00:00', '2026-10-22 12:00:00', 'COMPLETED', 18.00, 272.58),
-- Currently Active (Charging right now at PORT-007)
(4, 'BK-20261023-40199', 5, 7, '2026-10-23 22:00:00', '2026-10-23 23:00:00', 'ACTIVE', 40.00, 873.20),
-- Reserved upcoming booking at PORT-003
(5, 'BK-20261024-50821', 3, 3, '2026-10-24 10:00:00', '2026-10-24 11:00:00', 'CONFIRMED', 30.00, 660.80);

-- -----------------------------------------------------------------------------
-- 7. CHARGING SESSIONS
-- -----------------------------------------------------------------------------
INSERT INTO `charging_sessions` (`id`, `session_code`, `booking_id`, `port_id`, `user_id`, `session_status`, `start_time`, `end_time`, `meter_start_kwh`, `meter_end_kwh`, `energy_consumed_kwh`, `is_simulated`) VALUES
(1, 'SESS-20261020-001', 1, 1, 3, 'COMPLETED', '2026-10-20 09:02:15', '2026-10-20 09:44:10', 1240.20, 1268.70, 28.50, TRUE),
(2, 'SESS-20261021-002', 2, 2, 4, 'COMPLETED', '2026-10-21 14:03:00', '2026-10-21 14:58:30', 890.50, 922.50, 32.00, TRUE),
(3, 'SESS-20261022-003', 3, 5, 6, 'COMPLETED', '2026-10-22 10:05:00', '2026-10-22 11:55:00', 450.00, 468.00, 18.00, TRUE),
(4, 'SESS-20261023-004', 4, 7, 5, 'IN_PROGRESS', '2026-10-23 22:05:00', NULL, 3110.00, NULL, NULL, TRUE);

-- -----------------------------------------------------------------------------
-- 8. BILLS
-- -----------------------------------------------------------------------------
INSERT INTO `bills` (`id`, `invoice_number`, `booking_id`, `session_id`, `user_id`, `energy_consumed_kwh`, `tariff_rate_per_kwh`, `energy_charge`, `service_fee`, `tax_amount`, `total_amount`, `payment_status`) VALUES
-- Bill 1 (Rahul)
(1, 'INV-20261020-0001', 1, 1, 3, 28.50, 18.00, 513.00, 20.00, 95.94, 628.94, 'PAID'),
-- Bill 2 (Priya)
(2, 'INV-20261021-0002', 2, 2, 4, 32.00, 18.00, 576.00, 20.00, 107.28, 703.28, 'PAID'),
-- Bill 3 (Kavita)
(3, 'INV-20261022-0003', 3, 3, 6, 18.00, 12.00, 216.00, 15.00, 41.58, 272.58, 'PENDING');

-- -----------------------------------------------------------------------------
-- 9. PAYMENTS
-- -----------------------------------------------------------------------------
INSERT INTO `payments` (`id`, `payment_reference`, `bill_id`, `amount`, `payment_method`, `payment_status`, `transaction_date`, `gateway_response`) VALUES
(1, 'PAY-20261020-99881', 1, 628.94, 'UPI', 'SUCCESS', '2026-10-20 09:47:00', 'Simulated UPI Success: Ref# UPI-20261020-881'),
(2, 'PAY-20261021-99882', 2, 703.28, 'CREDIT_CARD', 'SUCCESS', '2026-10-21 15:02:11', 'Simulated Credit Card Auth: Approved');

-- -----------------------------------------------------------------------------
-- 10. MAINTENANCE RECORDS
-- -----------------------------------------------------------------------------
INSERT INTO `maintenance_records` (`id`, `port_id`, `reported_by`, `issue_description`, `severity`, `status`, `resolution_notes`, `reported_at`, `resolved_at`) VALUES
(1, 13, 2, 'Connector lock pin latch mechanical resistance detected during handshake.', 'HIGH', 'OPEN', NULL, '2026-10-23 08:30:00', NULL);

-- -----------------------------------------------------------------------------
-- 11. FEEDBACK
-- -----------------------------------------------------------------------------
INSERT INTO `feedback` (`id`, `station_id`, `user_id`, `booking_id`, `rating`, `comment`) VALUES
(1, 1, 3, 1, 5, 'Super seamless charging! Clear charger labelling made it effortless to locate PORT-001 on Charger CHG-001.'),
(2, 1, 4, 2, 4, 'Very fast CCS2 dispenser. Good cafe nearby on MG Road.'),
(3, 1, 6, 3, 5, 'Clean AC charging port and very reasonable tariff per unit.');

-- -----------------------------------------------------------------------------
-- 12. AUDIT LOGS
-- -----------------------------------------------------------------------------
INSERT INTO `audit_logs` (`user_id`, `action`, `entity_name`, `entity_id`, `old_values`, `new_values`) VALUES
(1, 'SYSTEM_INIT', 'stations', 1, NULL, JSON_OBJECT('station_code', 'STN-001', 'name', 'City Centre EV Superhub')),
(1, 'PORT_MAP', 'ports', 1, NULL, JSON_OBJECT('port_code', 'PORT-001', 'charger_code', 'CHG-001')),
(2, 'FLAG_MAINTENANCE', 'ports', 13, JSON_OBJECT('status', 'AVAILABLE'), JSON_OBJECT('status', 'MAINTENANCE'));

-- -----------------------------------------------------------------------------
-- 13. NOTIFICATIONS
-- -----------------------------------------------------------------------------
INSERT INTO `notifications` (`user_id`, `title`, `message`, `type`, `is_read`) VALUES
(3, 'Welcome to EV Charge Hub', 'Your account has been registered successfully. Explore stations and book slots easily.', 'INFO', TRUE),
(3, 'Booking Confirmed', 'Slot confirmed for Port PORT-001 on Charger CHG-001.', 'SUCCESS', TRUE),
(4, 'Invoice Generated', 'Your invoice INV-20261021-0002 has been generated and paid.', 'SUCCESS', TRUE),
(6, 'Payment Reminder', 'Invoice INV-20261022-0003 of ₹272.58 is pending payment.', 'WARNING', FALSE);
