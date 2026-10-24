const { pool } = require('../config/db');

async function startSession(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const { booking_id, meter_start_kwh } = req.body;
    const userId = req.user.id;

    if (!booking_id || meter_start_kwh === undefined || meter_start_kwh === null) {
      return res.status(400).json({ success: false, message: 'Booking ID and starting meter reading are required.' });
    }

    const startMeter = Number(meter_start_kwh);
    if (!Number.isFinite(startMeter) || startMeter < 0) {
      return res.status(400).json({ success: false, message: 'Starting meter reading must be a non-negative number.' });
    }

    await conn.beginTransaction();

    // 1. Lock booking record
    const [bookings] = await conn.query(
      `SELECT b.*, p.port_code, p.id AS port_id
       FROM bookings b
       INNER JOIN ports p ON b.port_id = p.id
       WHERE b.id = ?
       FOR UPDATE`,
      [booking_id]
    );

    if (bookings.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = bookings[0];

    // Check ownership or operator/admin
    if (req.user.role === 'CUSTOMER' && booking.user_id !== userId) {
      await conn.rollback();
      return res.status(403).json({ success: false, message: 'Unauthorized: Booking belongs to another user.' });
    }

    if (booking.status !== 'CONFIRMED' && booking.status !== 'ACTIVE') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot start session. Booking status is '${booking.status}'.`
      });
    }

    // Check if session already exists
    const [existingSession] = await conn.query(
      `SELECT id, session_code, session_status FROM charging_sessions WHERE booking_id = ?`,
      [booking_id]
    );

    if (existingSession.length > 0) {
      await conn.rollback();
      return res.status(409).json({
        success: false,
        message: 'A charging session for this booking already exists.',
        session: existingSession[0]
      });
    }

    // Generate unique session code
    const nowStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const sessionCode = `SESS-${nowStr}-${randomSuffix}`;
    // Insert session
    const [sessResult] = await conn.query(
      `INSERT INTO charging_sessions (session_code, booking_id, port_id, user_id, session_status, start_time, meter_start_kwh, is_simulated)
       VALUES (?, ?, ?, ?, 'IN_PROGRESS', NOW(), ?, TRUE)`,
      [sessionCode, booking_id, booking.port_id, booking.user_id, startMeter]
    );

    const sessionId = sessResult.insertId;

    // Update booking status to ACTIVE
    await conn.query(`UPDATE bookings SET status = 'ACTIVE' WHERE id = ?`, [booking_id]);

    // Update port status to CHARGING
    await conn.query(`UPDATE ports SET current_status = 'CHARGING' WHERE id = ?`, [booking.port_id]);

    // Audit log
    await conn.query(
      `INSERT INTO audit_logs (user_id, action, entity_name, entity_id, new_values)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        'START_CHARGING_SESSION',
        'charging_sessions',
        sessionId,
        JSON.stringify({ session_code: sessionCode, meter_start: startMeter, port_id: booking.port_id })
      ]
    );

    // Notification
    await conn.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, ?, ?, ?)`,
      [
        booking.user_id,
        'Charging Started (Simulated)',
        `Charging session ${sessionCode} has commenced on Port ${booking.port_code}. Initial meter: ${startMeter} kWh.`,
        'INFO'
      ]
    );

    await conn.commit();

    res.status(201).json({
      success: true,
      message: 'Charging session started successfully (Simulated EV mode).',
      session: {
        id: sessionId,
        session_code: sessionCode,
        booking_id,
        port_id: booking.port_id,
        session_status: 'IN_PROGRESS',
        meter_start_kwh: startMeter,
        start_time: new Date()
      }
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
}

async function completeSession(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const sessionId = parseInt(req.params.id, 10);
    const { meter_end_kwh } = req.body;
    const userId = req.user.id;

    if (meter_end_kwh === undefined || meter_end_kwh === null) {
      return res.status(400).json({ success: false, message: 'meter_end_kwh is required to finalize charging.' });
    }

    const meterEnd = parseFloat(meter_end_kwh);
    if (!Number.isFinite(meterEnd) || meterEnd < 0) {
      return res.status(400).json({
        success: false,
        message: 'Ending meter reading must be a non-negative number.'
      });
    }

    await conn.beginTransaction();

    // 1. Lock session record
    const [sessions] = await conn.query(
      `SELECT cs.*, b.booking_reference, p.port_code, p.connector_type, c.station_id, s.name AS station_name
       FROM charging_sessions cs
       INNER JOIN bookings b ON cs.booking_id = b.id
       INNER JOIN ports p ON cs.port_id = p.id
       INNER JOIN chargers c ON p.charger_id = c.id
       INNER JOIN stations s ON c.station_id = s.id
       WHERE cs.id = ?
       FOR UPDATE`,
      [sessionId]
    );

    if (sessions.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Charging session not found.' });
    }

    const session = sessions[0];

    // Auth check
    if (req.user.role === 'CUSTOMER' && session.user_id !== userId) {
      await conn.rollback();
      return res.status(403).json({ success: false, message: 'Unauthorized for this session.' });
    }

    if (session.session_status !== 'IN_PROGRESS') {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: `Session is already finalized with status '${session.session_status}'.`
      });
    }

    if (meterEnd < parseFloat(session.meter_start_kwh)) {
      await conn.rollback();
      return res.status(400).json({
        success: false,
        message: `Final meter reading (${meterEnd} kWh) cannot be less than initial meter (${session.meter_start_kwh} kWh).`
      });
    }

    // Calculate energy consumed: end - start
    const energyConsumed = +(meterEnd - parseFloat(session.meter_start_kwh)).toFixed(2);

    // 2. Fetch Tariff
    const [tariffs] = await conn.query(
      `SELECT rate_per_kwh, service_fee, tax_percentage
       FROM tariffs
       WHERE (station_id = ? OR station_id IS NULL)
         AND connector_type = ?
         AND is_active = TRUE
       ORDER BY station_id DESC LIMIT 1`,
      [session.station_id, session.connector_type]
    );

    if (tariffs.length === 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'No active tariff found for this connector type.' });
    }

    const tariff = tariffs[0];
    const ratePerKwh = parseFloat(tariff.rate_per_kwh);
    const serviceFee = parseFloat(tariff.service_fee);
    const taxPct = parseFloat(tariff.tax_percentage);

    const energyCharge = +(energyConsumed * ratePerKwh).toFixed(2);
    const taxAmount = +((energyCharge + serviceFee) * (taxPct / 100)).toFixed(2);
    const totalAmount = +(energyCharge + serviceFee + taxAmount).toFixed(2);

    // 3. Update session
    await conn.query(
      `UPDATE charging_sessions
       SET session_status = 'COMPLETED',
           end_time = NOW(),
           meter_end_kwh = ?,
           energy_consumed_kwh = ?
       WHERE id = ?`,
      [meterEnd, energyConsumed, sessionId]
    );

    // 4. Update booking
    await conn.query(
      `UPDATE bookings SET status = 'COMPLETED' WHERE id = ?`,
      [session.booking_id]
    );

    // 5. Release Port
    await conn.query(
      `UPDATE ports SET current_status = 'AVAILABLE' WHERE id = ?`,
      [session.port_id]
    );

    // 6. Check if bill already exists (idempotency guard)
    const [existingBill] = await conn.query(
      `SELECT id FROM bills WHERE session_id = ? OR booking_id = ?`,
      [sessionId, session.booking_id]
    );

    let billId;
    let invoiceNumber;

    if (existingBill.length > 0) {
      billId = existingBill[0].id;
      invoiceNumber = existingBill[0].invoice_number;
    } else {
      const nowStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      invoiceNumber = `INV-${nowStr}-${randomSuffix}`;

      const [billResult] = await conn.query(
        `INSERT INTO bills (
          invoice_number, booking_id, session_id, user_id,
          energy_consumed_kwh, tariff_rate_per_kwh, energy_charge,
          service_fee, tax_amount, total_amount, payment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
        [
          invoiceNumber,
          session.booking_id,
          sessionId,
          session.user_id,
          energyConsumed,
          ratePerKwh,
          energyCharge,
          serviceFee,
          taxAmount,
          totalAmount
        ]
      );

      billId = billResult.insertId;
    }

    // Audit log
    await conn.query(
      `INSERT INTO audit_logs (user_id, action, entity_name, entity_id, new_values)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        'COMPLETE_SESSION',
        'charging_sessions',
        sessionId,
        JSON.stringify({
          energy_consumed_kwh: energyConsumed,
          meter_end_kwh: meterEnd,
          invoice_number: invoiceNumber,
          total_amount: totalAmount
        })
      ]
    );

    // Notification
    await conn.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, ?, ?, ?)`,
      [
        session.user_id,
        'Charging Complete & Bill Issued',
        `Charging finished! Consumed: ${energyConsumed} kWh. Invoice ${invoiceNumber} issued for ₹${totalAmount}.`,
        'SUCCESS'
      ]
    );

    await conn.commit();

    res.json({
      success: true,
      message: 'Charging session successfully completed. Bill has been generated.',
      data: {
        session_id: sessionId,
        energy_consumed_kwh: energyConsumed,
        bill_id: billId,
        invoice_number: invoiceNumber,
        breakdown: {
          meter_start: session.meter_start_kwh,
          meter_end: meterEnd,
          energy_consumed_kwh: energyConsumed,
          tariff_rate_per_kwh: ratePerKwh,
          energy_charge: energyCharge,
          service_fee: serviceFee,
          tax_amount: taxAmount,
          total_amount: totalAmount
        }
      }
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
}

async function getSessionById(req, res, next) {
  try {
    const sessionId = parseInt(req.params.id, 10);

    const [rows] = await pool.query(
      `SELECT 
        cs.*,
        b.booking_reference,
        b.start_time AS booking_start,
        b.end_time AS booking_end,
        p.port_code,
        p.connector_type,
        p.max_power_kw,
        c.charger_code,
        c.label AS charger_label,
        s.name AS station_name,
        s.city AS station_city,
        u.full_name AS customer_name,
        u.email AS customer_email,
        bill.id AS bill_id,
        bill.invoice_number,
        bill.total_amount,
        bill.payment_status
       FROM charging_sessions cs
       INNER JOIN bookings b ON cs.booking_id = b.id
       INNER JOIN ports p ON cs.port_id = p.id
       INNER JOIN chargers c ON p.charger_id = c.id
       INNER JOIN stations s ON c.station_id = s.id
       INNER JOIN users u ON cs.user_id = u.id
       LEFT JOIN bills bill ON cs.id = bill.session_id
       WHERE cs.id = ?`,
      [sessionId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Session not found.' });
    }

    res.json({ success: true, session: rows[0] });
  } catch (error) {
    next(error);
  }
}

async function getActiveSessions(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT 
        cs.id,
        cs.session_code,
        cs.start_time,
        cs.meter_start_kwh,
        p.port_code,
        p.connector_type,
        c.charger_code,
        s.name AS station_name,
        u.full_name AS customer_name,
        u.phone AS customer_phone
       FROM charging_sessions cs
       INNER JOIN ports p ON cs.port_id = p.id
       INNER JOIN chargers c ON p.charger_id = c.id
       INNER JOIN stations s ON c.station_id = s.id
       INNER JOIN users u ON cs.user_id = u.id
       WHERE cs.session_status = 'IN_PROGRESS'
       ORDER BY cs.start_time DESC`
    );

    res.json({ success: true, count: rows.length, active_sessions: rows });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  startSession,
  completeSession,
  getSessionById,
  getActiveSessions
};
