const { pool } = require('../config/db');

async function getUserBills(req, res, next) {
  try {
    const userId = req.user.id;

    const [bills] = await pool.query(
      `SELECT 
        b.*,
        bk.booking_reference,
        s.name AS station_name,
        s.city AS station_city,
        c.charger_code,
        c.label AS charger_label,
        p.port_code,
        p.connector_type,
        pay.payment_reference,
        pay.payment_method,
        pay.transaction_date
       FROM bills b
       INNER JOIN bookings bk ON b.booking_id = bk.id
       INNER JOIN ports p ON bk.port_id = p.id
       INNER JOIN chargers c ON p.charger_id = c.id
       INNER JOIN stations s ON c.station_id = s.id
       LEFT JOIN payments pay ON b.id = pay.bill_id
       WHERE b.user_id = ?
       ORDER BY b.created_at DESC`,
      [userId]
    );

    res.json({ success: true, count: bills.length, bills });
  } catch (error) {
    next(error);
  }
}

async function getBillById(req, res, next) {
  try {
    const billId = parseInt(req.params.id, 10);

    const [bills] = await pool.query(
      `SELECT 
        b.*,
        u.full_name AS customer_name,
        u.email AS customer_email,
        u.phone AS customer_phone,
        u.ev_model,
        bk.booking_reference,
        bk.start_time AS booking_start,
        bk.end_time AS booking_end,
        cs.session_code,
        cs.start_time AS session_start,
        cs.end_time AS session_end,
        cs.meter_start_kwh,
        cs.meter_end_kwh,
        p.port_code,
        p.connector_type,
        p.max_power_kw,
        c.charger_code,
        c.label AS charger_label,
        c.technology_type AS charger_technology,
        s.station_code,
        s.name AS station_name,
        s.address AS station_address,
        s.city AS station_city,
        s.contact_number AS station_contact,
        pay.payment_reference,
        pay.payment_method,
        pay.transaction_date,
        pay.gateway_response
       FROM bills b
       INNER JOIN users u ON b.user_id = u.id
       INNER JOIN bookings bk ON b.booking_id = bk.id
       INNER JOIN ports p ON bk.port_id = p.id
       INNER JOIN chargers c ON p.charger_id = c.id
       INNER JOIN stations s ON c.station_id = s.id
       LEFT JOIN charging_sessions cs ON b.session_id = cs.id
       LEFT JOIN payments pay ON b.id = pay.bill_id
       WHERE b.id = ?`,
      [billId]
    );

    if (bills.length === 0) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    const bill = bills[0];

    // Auth check: customer can only view own bill
    if (req.user.role === 'CUSTOMER' && bill.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this invoice.' });
    }

    res.json({ success: true, invoice: bill });
  } catch (error) {
    next(error);
  }
}

async function simulatePayment(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const billId = parseInt(req.params.id, 10);
    const { payment_method } = req.body;
    const userId = req.user.id;

    await conn.beginTransaction();

    const [bills] = await conn.query(
      `SELECT * FROM bills WHERE id = ? FOR UPDATE`,
      [billId]
    );

    if (bills.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Bill not found.' });
    }

    const bill = bills[0];

    if (req.user.role === 'CUSTOMER' && bill.user_id !== userId) {
      await conn.rollback();
      return res.status(403).json({ success: false, message: 'Unauthorized to settle this bill.' });
    }

    if (bill.payment_status === 'PAID') {
      await conn.rollback();
      return res.status(400).json({ success: false, message: 'This invoice has already been paid.' });
    }

    const nowStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(10000 + Math.random() * 90000);
    const paymentRef = `PAY-${nowStr}-${rand}`;
    const method = payment_method || 'UPI';

    // Insert payment record
    await conn.query(
      `INSERT INTO payments (payment_reference, bill_id, amount, payment_method, payment_status, gateway_response)
       VALUES (?, ?, ?, ?, 'SUCCESS', ?)`,
      [
        paymentRef,
        billId,
        bill.total_amount,
        method,
        `Simulated Gateway Success - TransID: ${paymentRef}`
      ]
    );

    // Update bill payment_status
    await conn.query(
      `UPDATE bills SET payment_status = 'PAID' WHERE id = ?`,
      [billId]
    );

    // Audit log
    await conn.query(
      `INSERT INTO audit_logs (user_id, action, entity_name, entity_id, new_values)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId,
        'PROCESS_PAYMENT',
        'payments',
        billId,
        JSON.stringify({ bill_id: billId, amount: bill.total_amount, method, payment_ref: paymentRef })
      ]
    );

    // Notification
    await conn.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, ?, ?, ?)`,
      [
        bill.user_id,
        'Payment Successful',
        `Payment of ₹${bill.total_amount} for Invoice ${bill.invoice_number} received via ${method}. Ref: ${paymentRef}`,
        'SUCCESS'
      ]
    );

    await conn.commit();

    res.json({
      success: true,
      message: 'Payment simulated and processed successfully.',
      payment: {
        payment_reference: paymentRef,
        bill_id: billId,
        amount: bill.total_amount,
        method,
        status: 'SUCCESS'
      }
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
}

async function getAllBills(req, res, next) {
  try {
    const { status, date } = req.query;

    let query = `
      SELECT 
        b.*,
        u.full_name AS customer_name,
        u.email AS customer_email,
        s.name AS station_name,
        c.charger_code,
        p.port_code,
        pay.payment_reference,
        pay.payment_method
       FROM bills b
       INNER JOIN users u ON b.user_id = u.id
       INNER JOIN bookings bk ON b.booking_id = bk.id
       INNER JOIN ports p ON bk.port_id = p.id
       INNER JOIN chargers c ON p.charger_id = c.id
       INNER JOIN stations s ON c.station_id = s.id
       LEFT JOIN payments pay ON b.id = pay.bill_id
       WHERE 1=1
    `;

    const params = [];

    if (status) {
      query += ` AND b.payment_status = ?`;
      params.push(status);
    }

    if (date) {
      query += ` AND DATE(b.created_at) = ?`;
      params.push(date);
    }

    query += ` ORDER BY b.created_at DESC`;

    const [bills] = await pool.query(query, params);
    res.json({ success: true, count: bills.length, bills });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getUserBills,
  getBillById,
  simulatePayment,
  getAllBills
};
