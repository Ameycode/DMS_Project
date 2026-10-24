const { pool } = require('../config/db');

async function createBooking(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const { port_id, start_time, end_time, estimated_kwh } = req.body;
    const userId = req.user.id;

    if (!port_id || !start_time || !end_time || estimated_kwh === undefined || estimated_kwh === null) {
      return res.status(400).json({
        success: false,
        message: 'Port ID, start time, end time, and estimated energy usage are required.'
      });
    }

    const estKwh = Number(estimated_kwh);
    if (!Number.isFinite(estKwh) || estKwh <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Estimated energy usage must be a positive number.'
      });
    }

    const start = new Date(start_time);
    const end = new Date(end_time);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date/time format.'
      });
    }

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: 'Booking end time must be strictly after start time.'
      });
    }

    // Begin ACID transaction with pessimistic lock
    await conn.beginTransaction();

    // 1. Lock the specific physical port dispenser
    const [ports] = await conn.query(
      `SELECT p.*, c.station_id, c.charger_code, c.operational_status AS charger_status, s.operational_status AS station_status
       FROM ports p
       INNER JOIN chargers c ON p.charger_id = c.id
       INNER JOIN stations s ON c.station_id = s.id
       WHERE p.id = ?
       FOR UPDATE`,
      [port_id]
    );

    if (ports.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Selected port does not exist.' });
    }

    const port = ports[0];

    if (port.current_status === 'MAINTENANCE' || port.current_status === 'UNAVAILABLE') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: `Port ${port.port_code} is currently ${port.current_status}. Bookings cannot be accepted.`
      });
    }

    if (port.charger_status !== 'ACTIVE' || port.station_status !== 'ACTIVE') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: 'The parent charger cabinet or station is currently offline.'
      });
    }

    // 2. Concurrency check: Test for half-open interval overlap [start_time, end_time)
    // Formula: existing.start_time < new.end_time AND existing.end_time > new.start_time
    const [conflicts] = await conn.query(
      `SELECT id, booking_reference, start_time, end_time, status
       FROM bookings
       WHERE port_id = ?
         AND status IN ('CONFIRMED', 'ACTIVE')
         AND start_time < ?
         AND end_time > ?
       FOR UPDATE`,
      [port_id, end, start]
    );

    if (conflicts.length > 0) {
      await conn.rollback();
      return res.status(409).json({
        success: false,
        message: `Double booking prevented: Port ${port.port_code} is already reserved for an overlapping time interval.`,
        conflict: conflicts[0]
      });
    }

    // 3. Fetch tariff from MySQL tariffs table
    let [tariffs] = await conn.query(
      `SELECT rate_per_kwh, service_fee, tax_percentage
       FROM tariffs
       WHERE (station_id = ? OR station_id IS NULL)
         AND connector_type = ?
         AND is_active = TRUE
       ORDER BY station_id DESC LIMIT 1`,
      [port.station_id, port.connector_type]
    );

    if (tariffs.length === 0) {
      const [fallback] = await conn.query(
        `SELECT rate_per_kwh, service_fee, tax_percentage FROM tariffs WHERE is_active = TRUE LIMIT 1`
      );
      tariffs = fallback;
    }

    if (tariffs.length === 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'No active tariff found in database for this connector type.' });
    }

    const tariff = tariffs[0];
    const energyCharge = estKwh * parseFloat(tariff.rate_per_kwh);
    const taxAmount = (energyCharge + parseFloat(tariff.service_fee)) * (parseFloat(tariff.tax_percentage) / 100);
    const estimatedCost = energyCharge + parseFloat(tariff.service_fee) + taxAmount;

    // 4. Generate unique booking reference
    const nowStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const bookingRef = `BK-${nowStr}-${randomSuffix}`;

    // 5. Insert booking
    const [insertResult] = await conn.query(
      `INSERT INTO bookings (booking_reference, user_id, port_id, start_time, end_time, status, estimated_kwh, estimated_cost)
       VALUES (?, ?, ?, ?, ?, 'CONFIRMED', ?, ?)`,
      [bookingRef, userId, port_id, start, end, estKwh, estimatedCost.toFixed(2)]
    );

    const bookingId = insertResult.insertId;

    // 6. Audit log
    await conn.query(
      `INSERT INTO audit_logs (user_id, action, entity_name, entity_id, new_values)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        'CREATE_BOOKING',
        'bookings',
        bookingId,
        JSON.stringify({ booking_reference: bookingRef, port_id, start, end, estimatedCost })
      ]
    );

    // 7. Notification
    await conn.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, ?, ?, ?)`,
      [
        userId,
        'Booking Confirmed',
        `Slot reserved for Port ${port.port_code} on Charger ${port.charger_code}. Ref: ${bookingRef}`,
        'SUCCESS'
      ]
    );

    await conn.commit();

    res.status(201).json({
      success: true,
      message: 'Charging slot booked successfully with complete concurrency protection.',
      booking: {
        id: bookingId,
        booking_reference: bookingRef,
        port_id,
        port_code: port.port_code,
        charger_code: port.charger_code,
        start_time: start,
        end_time: end,
        estimated_kwh: estKwh,
        estimated_cost: estimatedCost.toFixed(2),
        status: 'CONFIRMED'
      }
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
}

async function cancelBooking(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const bookingId = parseInt(req.params.id, 10);
    const { reason } = req.body;

    await conn.beginTransaction();

    const [bookings] = await conn.query(
      `SELECT b.*, p.port_code, p.id AS port_id
       FROM bookings b
       INNER JOIN ports p ON b.port_id = p.id
       WHERE b.id = ?
       FOR UPDATE`,
      [bookingId]
    );

    if (bookings.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = bookings[0];

    // Authorization: customer can only cancel their own, admin can cancel any
    if (req.user.role === 'CUSTOMER' && booking.user_id !== req.user.id) {
      await conn.rollback();
      return res.status(403).json({ success: false, message: 'Unauthorized to cancel this booking.' });
    }

    if (booking.status !== 'CONFIRMED') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: `Booking cannot be cancelled. Current status is ${booking.status}.`
      });
    }

    await conn.query(
      `UPDATE bookings
       SET status = 'CANCELLED', cancellation_reason = ?
       WHERE id = ?`,
      [reason || 'Cancelled by user', bookingId]
    );

    // If port was marked RESERVED, set back to AVAILABLE
    await conn.query(
      `UPDATE ports SET current_status = 'AVAILABLE' WHERE id = ? AND current_status = 'RESERVED'`,
      [booking.port_id]
    );

    // Audit log
    await conn.query(
      `INSERT INTO audit_logs (user_id, action, entity_name, entity_id, new_values)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'CANCEL_BOOKING',
        'bookings',
        bookingId,
        JSON.stringify({ reason: reason || 'User cancellation' })
      ]
    );

    // Notification
    await conn.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, ?, ?, ?)`,
      [
        booking.user_id,
        'Booking Cancelled',
        `Your reservation ${booking.booking_reference} for Port ${booking.port_code} has been cancelled.`,
        'INFO'
      ]
    );

    await conn.commit();
    res.json({ success: true, message: 'Booking cancelled successfully.' });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
}

async function getUserBookings(req, res, next) {
  try {
    const userId = req.user.id;

    const [bookings] = await pool.query(
      `SELECT 
        b.id,
        b.booking_reference,
        b.start_time,
        b.end_time,
        b.status,
        b.estimated_kwh,
        b.estimated_cost,
        b.created_at,
        p.id AS port_id,
        p.port_code,
        p.connector_type,
        p.max_power_kw,
        c.id AS charger_id,
        c.charger_code,
        c.label AS charger_label,
        s.id AS station_id,
        s.name AS station_name,
        s.city AS station_city,
        s.address AS station_address,
        cs.id AS session_id,
        cs.session_code,
        cs.session_status,
        cs.meter_start_kwh,
        cs.meter_end_kwh,
        bill.id AS bill_id,
        bill.invoice_number,
        bill.total_amount,
        bill.payment_status
       FROM bookings b
       INNER JOIN ports p ON b.port_id = p.id
       INNER JOIN chargers c ON p.charger_id = c.id
       INNER JOIN stations s ON c.station_id = s.id
       LEFT JOIN charging_sessions cs ON b.id = cs.booking_id
       LEFT JOIN bills bill ON b.id = bill.booking_id
       WHERE b.user_id = ?
       ORDER BY b.start_time DESC`,
      [userId]
    );

    res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    next(error);
  }
}

async function getAllBookings(req, res, next) {
  try {
    const { status, date, port_id } = req.query;

    let query = `
      SELECT 
        b.id,
        b.booking_reference,
        b.user_id,
        u.full_name AS customer_name,
        u.email AS customer_email,
        u.phone AS customer_phone,
        b.start_time,
        b.end_time,
        b.status,
        b.estimated_kwh,
        b.estimated_cost,
        b.created_at,
        p.port_code,
        p.connector_type,
        c.charger_code,
        c.label AS charger_label,
        s.name AS station_name,
        s.city AS station_city,
        bill.invoice_number,
        bill.total_amount,
        bill.payment_status
       FROM bookings b
       INNER JOIN users u ON b.user_id = u.id
       INNER JOIN ports p ON b.port_id = p.id
       INNER JOIN chargers c ON p.charger_id = c.id
       INNER JOIN stations s ON c.station_id = s.id
       LEFT JOIN bills bill ON b.id = bill.booking_id
       WHERE 1=1
    `;

    const params = [];

    if (status) {
      query += ` AND b.status = ?`;
      params.push(status);
    }

    if (port_id) {
      query += ` AND b.port_id = ?`;
      params.push(parseInt(port_id, 10));
    }

    if (date) {
      query += ` AND DATE(b.start_time) = ?`;
      params.push(date);
    }

    query += ` ORDER BY b.start_time DESC`;

    const [bookings] = await pool.query(query, params);
    res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    next(error);
  }
}

async function checkPortAvailability(req, res, next) {
  try {
    const { port_id, start_time, end_time } = req.query;

    if (!port_id || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: 'port_id, start_time, and end_time query parameters are required.'
      });
    }

    const [conflicts] = await pool.query(
      `SELECT id, booking_reference, start_time, end_time
       FROM bookings
       WHERE port_id = ?
         AND status IN ('CONFIRMED', 'ACTIVE')
         AND start_time < ?
         AND end_time > ?`,
      [port_id, new Date(end_time), new Date(start_time)]
    );

    res.json({
      success: true,
      available: conflicts.length === 0,
      conflict_count: conflicts.length,
      conflicts
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createBooking,
  cancelBooking,
  getUserBookings,
  getAllBookings,
  checkPortAvailability
};
