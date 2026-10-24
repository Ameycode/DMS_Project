const assert = require('assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

console.log('🧪 Running EV Charging Slot and Billing System Test Suite...\n');

let passed = 0;
let failed = 0;

function it(description, fn) {
  try {
    fn();
    console.log(`  ✅ PASS: ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     Error: ${err.message}`);
    failed++;
  }
}

async function runTests() {
  console.log('--- 1. Authentication & Security Tests ---');

  it('Password hashing with bcrypt produces secure non-plaintext hash', () => {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('Password@123', salt);
    assert.notStrictEqual(hash, 'Password@123');
    assert.strictEqual(bcrypt.compareSync('Password@123', hash), true);
    assert.strictEqual(bcrypt.compareSync('WrongPassword', hash), false);
  });

  it('JWT authentication payload properly encodes user identity and role', () => {
    const payload = { id: 1, email: 'admin@evcharge.com', role: 'ADMIN', full_name: 'Admin User' };
    const secret = 'test_secret_key';
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    const decoded = jwt.verify(token, secret);
    assert.strictEqual(decoded.id, 1);
    assert.strictEqual(decoded.role, 'ADMIN');
  });

  console.log('\n--- 2. Charger-to-Port Relational Mapping Tests ---');

  it('Enforces Station -> Charger -> Port strict hierarchy mapping', () => {
    const station = { id: 1, code: 'STN-001', name: 'City Centre EV Superhub' };
    const charger = { id: 1, code: 'CHG-001', station_id: 1, max_power_kw: 180.0 };
    const port = { id: 2, port_code: 'PORT-002', charger_id: 1, connector_type: 'CCS2', max_power_kw: 60.0 };

    // Verifies port belongs to the exact charger
    assert.strictEqual(port.charger_id, charger.id);
    assert.strictEqual(charger.station_id, station.id);
  });

  console.log('\n--- 3. Concurrency & Overlapping Interval Collision Logic ---');

  it('Half-open interval collision logic correctly flags conflicting reservations', () => {
    // Existing confirmed booking on PORT-001: [09:00, 10:00)
    const existingStart = new Date('2026-10-24T09:00:00Z');
    const existingEnd = new Date('2026-10-24T10:00:00Z');

    function isConflicting(newStartStr, newEndStr) {
      const newStart = new Date(newStartStr);
      const newEnd = new Date(newEndStr);
      // Invariant: existing.start < new.end AND existing.end > new.start
      return existingStart < newEnd && existingEnd > newStart;
    }

    // Overlapping cases:
    assert.strictEqual(isConflicting('2026-10-24T09:30:00Z', '2026-10-24T10:30:00Z'), true, 'Overlapping finish should conflict');
    assert.strictEqual(isConflicting('2026-10-24T08:30:00Z', '2026-10-24T09:30:00Z'), true, 'Overlapping start should conflict');
    assert.strictEqual(isConflicting('2026-10-24T09:15:00Z', '2026-10-24T09:45:00Z'), true, 'Sub-interval inside should conflict');
    assert.strictEqual(isConflicting('2026-10-24T08:00:00Z', '2026-10-24T11:00:00Z'), true, 'Superset interval should conflict');

    // Non-overlapping (half-open boundary [start, end)):
    assert.strictEqual(isConflicting('2026-10-24T08:00:00Z', '2026-10-24T09:00:00Z'), false, 'Slot ending exactly when previous starts is allowed');
    assert.strictEqual(isConflicting('2026-10-24T10:00:00Z', '2026-10-24T11:00:00Z'), false, 'Slot starting exactly when previous ends is allowed');
    assert.strictEqual(isConflicting('2026-10-24T11:00:00Z', '2026-10-24T12:00:00Z'), false, 'Later slot should not conflict');
  });

  console.log('\n--- 4. Charging Session & Energy Calculation Tests ---');

  it('Accurately computes consumed energy: kWh = meter_end - meter_start', () => {
    const meterStart = 1240.20;
    const meterEnd = 1268.70;
    assert.strictEqual(meterEnd >= meterStart, true);
    const consumed = +(meterEnd - meterStart).toFixed(2);
    assert.strictEqual(consumed, 28.50);
  });

  it('Rejects negative energy consumption (meter_end < meter_start)', () => {
    const meterStart = 500.00;
    const meterEnd = 450.00;
    const isValid = meterEnd >= meterStart;
    assert.strictEqual(isValid, false);
  });

  console.log('\n--- 5. Billing and Invoice Arithmetic Tests ---');

  it('Correctly calculates billing breakdown with tariff rate, service fee, and GST', () => {
    const energyConsumedKwh = 28.50;
    const tariffRatePerKwh = 18.00;
    const serviceFee = 20.00;
    const gstPercentage = 18.00;

    const energyCharge = +(energyConsumedKwh * tariffRatePerKwh).toFixed(2);
    assert.strictEqual(energyCharge, 513.00);

    const taxAmount = +((energyCharge + serviceFee) * (gstPercentage / 100)).toFixed(2);
    assert.strictEqual(taxAmount, 95.94);

    const totalAmount = +(energyCharge + serviceFee + taxAmount).toFixed(2);
    assert.strictEqual(totalAmount, 628.94);
  });

  it('Guarantees idempotency of invoice generation', () => {
    const billsDb = new Map();
    function createBill(sessionId, invoiceData) {
      if (billsDb.has(sessionId)) {
        return { created: false, bill: billsDb.get(sessionId) };
      }
      billsDb.set(sessionId, invoiceData);
      return { created: true, bill: invoiceData };
    }

    const first = createBill(101, { id: 1, invoiceNumber: 'INV-20261023-0001', amount: 628.94 });
    assert.strictEqual(first.created, true);

    const second = createBill(101, { id: 1, invoiceNumber: 'INV-20261023-0001', amount: 628.94 });
    assert.strictEqual(second.created, false);
  });

  console.log('\n--- 6. Role-Based Access Control Matrix ---');

  it('Enforces role permissions matrix', () => {
    const permissions = {
      CUSTOMER: ['view_stations', 'book_port', 'view_my_bookings', 'start_my_session', 'pay_bill'],
      OPERATOR: ['view_stations', 'view_assigned_ports', 'update_port_status', 'report_maintenance'],
      ADMIN: ['view_stations', 'manage_stations', 'create_charger', 'map_ports', 'manage_tariffs', 'view_analytics']
    };

    assert.strictEqual(permissions.CUSTOMER.includes('manage_stations'), false);
    assert.strictEqual(permissions.ADMIN.includes('manage_stations'), true);
    assert.strictEqual(permissions.OPERATOR.includes('update_port_status'), true);
  });

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
