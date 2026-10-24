const { pool } = require('../config/db');

async function getAllPorts(req, res, next) {
  try {
    const { station_id, charger_id, connector_type, status } = req.query;

    let query = `
      SELECT 
        p.id AS port_id,
        p.port_code,
        p.port_number,
        p.connector_type,
        p.max_power_kw,
        p.current_status,
        p.last_status_update,
        c.id AS charger_id,
        c.charger_code,
        c.label AS charger_label,
        c.technology_type AS charger_technology,
        s.id AS station_id,
        s.station_code,
        s.name AS station_name,
        s.city AS station_city
      FROM ports p
      INNER JOIN chargers c ON p.charger_id = c.id
      INNER JOIN stations s ON c.station_id = s.id
      WHERE 1=1
    `;

    const params = [];

    if (station_id) {
      query += ` AND s.id = ?`;
      params.push(parseInt(station_id, 10));
    }

    if (charger_id) {
      query += ` AND c.id = ?`;
      params.push(parseInt(charger_id, 10));
    }

    if (connector_type) {
      query += ` AND p.connector_type = ?`;
      params.push(connector_type);
    }

    if (status) {
      query += ` AND p.current_status = ?`;
      params.push(status);
    }

    query += ` ORDER BY s.name ASC, c.charger_code ASC, p.port_number ASC`;

    const [ports] = await pool.query(query, params);
    res.json({ success: true, count: ports.length, ports });
  } catch (error) {
    next(error);
  }
}

async function getPortById(req, res, next) {
  try {
    const portId = parseInt(req.params.id, 10);

    const [portRows] = await pool.query(
      `SELECT 
        p.id AS port_id,
        p.port_code,
        p.port_number,
        p.connector_type,
        p.max_power_kw,
        p.current_status,
        p.last_status_update,
        c.id AS charger_id,
        c.charger_code,
        c.label AS charger_label,
        c.technology_type AS charger_technology,
        c.manufacturer AS charger_manufacturer,
        c.max_power_kw AS charger_max_power_kw,
        s.id AS station_id,
        s.station_code,
        s.name AS station_name,
        s.address AS station_address,
        s.city AS station_city,
        s.contact_number AS station_contact
       FROM ports p
       INNER JOIN chargers c ON p.charger_id = c.id
       INNER JOIN stations s ON c.station_id = s.id
       WHERE p.id = ?`,
      [portId]
    );

    if (portRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Port record not found.' });
    }

    // Fetch upcoming bookings for this port
    const [upcomingBookings] = await pool.query(
      `SELECT id, booking_reference, start_time, end_time, status
       FROM bookings
       WHERE port_id = ?
         AND status IN ('CONFIRMED', 'ACTIVE')
         AND end_time >= NOW()
       ORDER BY start_time ASC LIMIT 5`,
      [portId]
    );

    // Fetch applicable tariff directly from MySQL tariffs table
    let [tariffs] = await pool.query(
      `SELECT rate_per_kwh, service_fee, tax_percentage
       FROM tariffs
       WHERE (station_id = ? OR station_id IS NULL)
         AND connector_type = ?
         AND is_active = TRUE
       ORDER BY station_id DESC LIMIT 1`,
      [portRows[0].station_id, portRows[0].connector_type]
    );

    if (tariffs.length === 0) {
      const [fallback] = await pool.query(
        `SELECT rate_per_kwh, service_fee, tax_percentage FROM tariffs WHERE is_active = TRUE LIMIT 1`
      );
      tariffs = fallback;
    }

    res.json({
      success: true,
      port: {
        ...portRows[0],
        upcoming_bookings: upcomingBookings,
        tariff: tariffs[0]
      }
    });
  } catch (error) {
    next(error);
  }
}

async function updatePortStatus(req, res, next) {
  try {
    const portId = parseInt(req.params.id, 10);
    const { current_status } = req.body;

    const validStatuses = ['AVAILABLE', 'RESERVED', 'CHARGING', 'UNAVAILABLE', 'MAINTENANCE'];
    if (!validStatuses.includes(current_status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const [oldPort] = await pool.query('SELECT current_status, port_code FROM ports WHERE id = ?', [portId]);
    if (oldPort.length === 0) {
      return res.status(404).json({ success: false, message: 'Port not found.' });
    }

    await pool.query(
      `UPDATE ports SET current_status = ? WHERE id = ?`,
      [current_status, portId]
    );

    // Manual audit log if trigger is bypassed or for user attribution
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_name, entity_id, old_values, new_values)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        'MANUAL_PORT_STATUS_UPDATE',
        'ports',
        portId,
        JSON.stringify({ status: oldPort[0].current_status, port_code: oldPort[0].port_code }),
        JSON.stringify({ status: current_status, port_code: oldPort[0].port_code })
      ]
    );

    res.json({
      success: true,
      message: `Port ${oldPort[0].port_code} status updated to ${current_status}.`
    });
  } catch (error) {
    next(error);
  }
}

async function createPort(req, res, next) {
  try {
    const { port_code, charger_id, port_number, connector_type, max_power_kw, current_status } = req.body;

    if (!port_code || !charger_id || !port_number || !connector_type || !max_power_kw) {
      return res.status(400).json({
        success: false,
        message: 'Port code, parent charger ID, port number, connector type, and max power rating are required.'
      });
    }

    // Verify parent charger exists
    const [charger] = await pool.query('SELECT id, charger_code FROM chargers WHERE id = ?', [charger_id]);
    if (charger.length === 0) {
      return res.status(404).json({ success: false, message: 'Parent charger ID not found.' });
    }

    const [result] = await pool.query(
      `INSERT INTO ports (port_code, charger_id, port_number, connector_type, max_power_kw, current_status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        port_code.toUpperCase().trim(),
        charger_id,
        parseInt(port_number, 10),
        connector_type,
        parseFloat(max_power_kw),
        current_status || 'AVAILABLE'
      ]
    );

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_name, entity_id, new_values)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, 'CREATE_PORT', 'ports', result.insertId, JSON.stringify(req.body)]
    );

    res.status(201).json({
      success: true,
      message: `Port ${port_code} mapped to charger ${charger[0].charger_code} successfully.`,
      portId: result.insertId
    });
  } catch (error) {
    next(error);
  }
}

async function getChargerPortHierarchyView(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM v_charger_port_mapping ORDER BY station_name, charger_code, port_number');
    res.json({ success: true, mapping: rows });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllPorts,
  getPortById,
  updatePortStatus,
  createPort,
  updatePortStatus,
  getChargerPortHierarchyView
};
