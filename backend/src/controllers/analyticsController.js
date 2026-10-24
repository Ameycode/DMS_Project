const { pool } = require('../config/db');

async function getDashboardSummary(req, res, next) {
  try {
    // 1. Station, Charger, Port statistics
    const [hardwareStats] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM stations WHERE operational_status = 'ACTIVE') AS total_stations,
        (SELECT COUNT(*) FROM chargers WHERE operational_status = 'ACTIVE') AS total_chargers,
        (SELECT COUNT(*) FROM ports) AS total_ports,
        (SELECT COUNT(*) FROM ports WHERE current_status = 'AVAILABLE') AS available_ports,
        (SELECT COUNT(*) FROM ports WHERE current_status = 'RESERVED') AS reserved_ports,
        (SELECT COUNT(*) FROM ports WHERE current_status = 'CHARGING') AS charging_ports,
        (SELECT COUNT(*) FROM ports WHERE current_status = 'MAINTENANCE') AS maintenance_ports,
        (SELECT COUNT(*) FROM ports WHERE current_status = 'UNAVAILABLE') AS unavailable_ports
    `);

    // 2. Booking and Session metrics
    const [bookingStats] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM bookings) AS total_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 'CONFIRMED') AS confirmed_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 'ACTIVE') AS active_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 'COMPLETED') AS completed_bookings,
        (SELECT COUNT(*) FROM bookings WHERE status = 'CANCELLED') AS cancelled_bookings,
        (SELECT COUNT(*) FROM charging_sessions WHERE session_status = 'IN_PROGRESS') AS active_sessions
    `);

    // 3. Financial Metrics
    const [financialStats] = await pool.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN total_amount ELSE 0 END), 0) AS total_revenue_collected,
        COALESCE(SUM(CASE WHEN payment_status = 'PENDING' THEN total_amount ELSE 0 END), 0) AS pending_revenue,
        COALESCE(SUM(energy_consumed_kwh), 0) AS total_energy_dispensed_kwh,
        (SELECT COUNT(*) FROM users WHERE role = 'CUSTOMER') AS total_customers
      FROM bills
    `);

    // 4. Daily Revenue Trend (Last 14 days)
    const [dailyRevenue] = await pool.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m-%d') AS date,
        ROUND(COALESCE(SUM(CASE WHEN payment_status = 'PAID' THEN total_amount ELSE 0 END), 0), 2) AS revenue,
        ROUND(COALESCE(SUM(energy_consumed_kwh), 0), 2) AS kwh
      FROM bills
      GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
      ORDER BY date ASC
      LIMIT 14
    `);

    // 5. Energy by Station
    const [stationEnergy] = await pool.query(`
      SELECT 
        s.name AS station_name,
        ROUND(COALESCE(SUM(cs.energy_consumed_kwh), 0), 2) AS energy_kwh,
        ROUND(COALESCE(SUM(b.total_amount), 0), 2) AS revenue
      FROM stations s
      LEFT JOIN chargers c ON s.id = c.station_id
      LEFT JOIN ports p ON c.id = p.charger_id
      LEFT JOIN charging_sessions cs ON p.id = cs.port_id AND cs.session_status = 'COMPLETED'
      LEFT JOIN bills b ON cs.id = b.session_id
      GROUP BY s.id, s.name
      ORDER BY energy_kwh DESC
    `);

    // 6. Connector Types Distribution
    const [connectorStats] = await pool.query(`
      SELECT 
        connector_type,
        COUNT(*) AS count
      FROM ports
      GROUP BY connector_type
      ORDER BY count DESC
    `);

    // 7. Recent Audit Logs
    const [recentAudits] = await pool.query(`
      SELECT 
        a.id,
        a.action,
        a.entity_name,
        a.entity_id,
        a.timestamp,
        u.full_name AS actor_name,
        u.role AS actor_role
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.timestamp DESC
      LIMIT 10
    `);

    res.json({
      success: true,
      summary: {
        ...hardwareStats[0],
        ...bookingStats[0],
        ...financialStats[0]
      },
      charts: {
        dailyRevenue,
        stationEnergy,
        connectorStats
      },
      recentAudits
    });
  } catch (error) {
    next(error);
  }
}

async function getNotifications(req, res, next) {
  try {
    const userId = req.user.id;
    const [notifications] = await pool.query(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`,
      [userId]
    );

    res.json({ success: true, count: notifications.length, notifications });
  } catch (error) {
    next(error);
  }
}

async function markNotificationRead(req, res, next) {
  try {
    const notifId = parseInt(req.params.id, 10);
    await pool.query(`UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?`, [notifId, req.user.id]);
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboardSummary,
  getNotifications,
  markNotificationRead
};
