const { pool } = require('../config/db');

async function getAllStations(req, res, next) {
  try {
    const { city, search, connector, status } = req.query;

    let query = `
      SELECT 
        s.id,
        s.station_code,
        s.name,
        s.address,
        s.city,
        s.latitude,
        s.longitude,
        s.opening_time,
        s.closing_time,
        s.operational_status,
        s.contact_number,
        COUNT(DISTINCT c.id) AS total_chargers,
        COUNT(DISTINCT p.id) AS total_ports,
        SUM(CASE WHEN p.current_status = 'AVAILABLE' THEN 1 ELSE 0 END) AS available_ports,
        COALESCE(AVG(f.rating), 4.5) AS avg_rating,
        COUNT(DISTINCT f.id) AS total_reviews
      FROM stations s
      LEFT JOIN chargers c ON s.id = c.station_id AND c.operational_status = 'ACTIVE'
      LEFT JOIN ports p ON c.id = p.charger_id
      LEFT JOIN feedback f ON s.id = f.station_id
      WHERE 1=1
    `;

    const params = [];

    if (city) {
      query += ` AND LOWER(s.city) = LOWER(?)`;
      params.push(city.trim());
    }

    if (status) {
      query += ` AND s.operational_status = ?`;
      params.push(status);
    }

    if (search) {
      query += ` AND (LOWER(s.name) LIKE LOWER(?) OR LOWER(s.address) LIKE LOWER(?) OR LOWER(s.city) LIKE LOWER(?))`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    if (connector) {
      query += ` AND EXISTS (
        SELECT 1 FROM chargers ch
        INNER JOIN ports pt ON ch.id = pt.charger_id
        WHERE ch.station_id = s.id AND pt.connector_type = ?
      )`;
      params.push(connector);
    }

    query += ` GROUP BY s.id ORDER BY s.name ASC`;

    const [stations] = await pool.query(query, params);
    res.json({ success: true, count: stations.length, stations });
  } catch (error) {
    next(error);
  }
}

async function getStationById(req, res, next) {
  try {
    const stationId = parseInt(req.params.id, 10);

    // 1. Fetch Station Details
    const [stationRows] = await pool.query(
      `SELECT * FROM stations WHERE id = ?`,
      [stationId]
    );

    if (stationRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Charging station not found.' });
    }

    const station = stationRows[0];

    // 2. Fetch Chargers belonging to this station
    const [chargers] = await pool.query(
      `SELECT 
        id AS charger_id,
        charger_code,
        station_id,
        label,
        technology_type,
        manufacturer,
        max_power_kw,
        operational_status,
        created_at
       FROM chargers
       WHERE station_id = ?
       ORDER BY charger_code ASC`,
      [stationId]
    );

    // 3. Fetch all Ports belonging to these chargers
    const chargerIds = chargers.map(c => c.charger_id);
    let ports = [];

    if (chargerIds.length > 0) {
      const [portRows] = await pool.query(
        `SELECT 
          p.id AS port_id,
          p.port_code,
          p.charger_id,
          p.port_number,
          p.connector_type,
          p.max_power_kw,
          p.current_status,
          p.last_status_update,
          c.charger_code,
          c.label AS charger_label
         FROM ports p
         INNER JOIN chargers c ON p.charger_id = c.id
         WHERE p.charger_id IN (?)
         ORDER BY p.port_number ASC`,
        [chargerIds]
      );
      ports = portRows;
    }

    // Nest ports under their corresponding parent charger
    const chargersWithPorts = chargers.map(chg => ({
      ...chg,
      ports: ports.filter(p => p.charger_id === chg.charger_id)
    }));

    // 4. Fetch Station Reviews
    const [feedback] = await pool.query(
      `SELECT f.id, f.rating, f.comment, f.created_at, u.full_name AS customer_name
       FROM feedback f
       INNER JOIN users u ON f.user_id = u.id
       WHERE f.station_id = ?
       ORDER BY f.created_at DESC LIMIT 10`,
      [stationId]
    );

    res.json({
      success: true,
      station: {
        ...station,
        chargers: chargersWithPorts,
        feedback
      }
    });
  } catch (error) {
    next(error);
  }
}

async function createStation(req, res, next) {
  try {
    const { station_code, name, address, city, latitude, longitude, opening_time, closing_time, operational_status, contact_number } = req.body;

    if (!station_code || !name || !address || !city || !contact_number) {
      return res.status(400).json({
        success: false,
        message: 'Station code, name, address, city, and contact number are required.'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO stations (station_code, name, address, city, latitude, longitude, opening_time, closing_time, operational_status, contact_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        station_code.toUpperCase().trim(),
        name.trim(),
        address.trim(),
        city.trim(),
        latitude || 12.9716,
        longitude || 77.5946,
        opening_time || '06:00:00',
        closing_time || '23:30:00',
        operational_status || 'ACTIVE',
        contact_number.trim()
      ]
    );

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_name, entity_id, new_values)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, 'CREATE_STATION', 'stations', result.insertId, JSON.stringify(req.body)]
    );

    res.status(201).json({
      success: true,
      message: 'Station created successfully.',
      stationId: result.insertId
    });
  } catch (error) {
    next(error);
  }
}

async function updateStation(req, res, next) {
  try {
    const stationId = parseInt(req.params.id, 10);
    const { name, address, city, latitude, longitude, opening_time, closing_time, operational_status, contact_number } = req.body;

    await pool.query(
      `UPDATE stations
       SET name = COALESCE(?, name),
           address = COALESCE(?, address),
           city = COALESCE(?, city),
           latitude = COALESCE(?, latitude),
           longitude = COALESCE(?, longitude),
           opening_time = COALESCE(?, opening_time),
           closing_time = COALESCE(?, closing_time),
           operational_status = COALESCE(?, operational_status),
           contact_number = COALESCE(?, contact_number)
       WHERE id = ?`,
      [name, address, city, latitude, longitude, opening_time, closing_time, operational_status, contact_number, stationId]
    );

    res.json({ success: true, message: 'Station updated successfully.' });
  } catch (error) {
    next(error);
  }
}

async function deleteStation(req, res, next) {
  try {
    const stationId = parseInt(req.params.id, 10);

    // Check if station has chargers
    const [chargers] = await pool.query('SELECT id FROM chargers WHERE station_id = ?', [stationId]);
    if (chargers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete station: It contains physical chargers. Please remove or reassign associated chargers first.'
      });
    }

    await pool.query('DELETE FROM stations WHERE id = ?', [stationId]);
    res.json({ success: true, message: 'Station deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllStations,
  getStationById,
  createStation,
  updateStation,
  deleteStation
};
