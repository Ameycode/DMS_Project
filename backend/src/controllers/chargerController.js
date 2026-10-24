const { pool } = require('../config/db');

async function getAllChargers(req, res, next) {
  try {
    const { station_id, status } = req.query;

    let query = `
      SELECT 
        c.id,
        c.charger_code,
        c.station_id,
        s.station_code,
        s.name AS station_name,
        s.city AS station_city,
        c.label,
        c.technology_type,
        c.manufacturer,
        c.max_power_kw,
        c.operational_status,
        COUNT(p.id) AS total_ports,
        SUM(CASE WHEN p.current_status = 'AVAILABLE' THEN 1 ELSE 0 END) AS available_ports
      FROM chargers c
      INNER JOIN stations s ON c.station_id = s.id
      LEFT JOIN ports p ON c.id = p.charger_id
      WHERE 1=1
    `;

    const params = [];

    if (station_id) {
      query += ` AND c.station_id = ?`;
      params.push(parseInt(station_id, 10));
    }

    if (status) {
      query += ` AND c.operational_status = ?`;
      params.push(status);
    }

    query += ` GROUP BY c.id ORDER BY s.name ASC, c.charger_code ASC`;

    const [chargers] = await pool.query(query, params);
    res.json({ success: true, count: chargers.length, chargers });
  } catch (error) {
    next(error);
  }
}

async function getChargerById(req, res, next) {
  try {
    const chargerId = parseInt(req.params.id, 10);

    const [chargerRows] = await pool.query(
      `SELECT 
        c.*,
        s.station_code,
        s.name AS station_name,
        s.city AS station_city,
        s.address AS station_address
       FROM chargers c
       INNER JOIN stations s ON c.station_id = s.id
       WHERE c.id = ?`,
      [chargerId]
    );

    if (chargerRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Charger cabinet not found.' });
    }

    const [ports] = await pool.query(
      `SELECT * FROM ports WHERE charger_id = ? ORDER BY port_number ASC`,
      [chargerId]
    );

    res.json({
      success: true,
      charger: {
        ...chargerRows[0],
        ports
      }
    });
  } catch (error) {
    next(error);
  }
}

async function createCharger(req, res, next) {
  try {
    const { charger_code, station_id, label, technology_type, manufacturer, max_power_kw, operational_status } = req.body;

    if (!charger_code || !station_id || !label || !max_power_kw) {
      return res.status(400).json({
        success: false,
        message: 'Charger code, parent station ID, label, and max power rating are required.'
      });
    }

    // Verify parent station exists
    const [station] = await pool.query('SELECT id FROM stations WHERE id = ?', [station_id]);
    if (station.length === 0) {
      return res.status(404).json({ success: false, message: 'Parent station ID does not exist.' });
    }

    const [result] = await pool.query(
      `INSERT INTO chargers (charger_code, station_id, label, technology_type, manufacturer, max_power_kw, operational_status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        charger_code.toUpperCase().trim(),
        station_id,
        label.trim(),
        technology_type || 'Fast DC',
        manufacturer || 'Unknown',
        parseFloat(max_power_kw),
        operational_status || 'ACTIVE'
      ]
    );

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_name, entity_id, new_values)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, 'CREATE_CHARGER', 'chargers', result.insertId, JSON.stringify(req.body)]
    );

    res.status(201).json({
      success: true,
      message: 'Charger added and mapped to station successfully.',
      chargerId: result.insertId
    });
  } catch (error) {
    next(error);
  }
}

async function updateCharger(req, res, next) {
  try {
    const chargerId = parseInt(req.params.id, 10);
    const { label, technology_type, manufacturer, max_power_kw, operational_status } = req.body;

    await pool.query(
      `UPDATE chargers
       SET label = COALESCE(?, label),
           technology_type = COALESCE(?, technology_type),
           manufacturer = COALESCE(?, manufacturer),
           max_power_kw = COALESCE(?, max_power_kw),
           operational_status = COALESCE(?, operational_status)
       WHERE id = ?`,
      [label, technology_type, manufacturer, max_power_kw, operational_status, chargerId]
    );

    res.json({ success: true, message: 'Charger updated successfully.' });
  } catch (error) {
    next(error);
  }
}

async function deleteCharger(req, res, next) {
  try {
    const chargerId = parseInt(req.params.id, 10);

    const [ports] = await pool.query('SELECT id FROM ports WHERE charger_id = ?', [chargerId]);
    if (ports.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete charger: It currently owns mapped ports. Please remove associated ports first.'
      });
    }

    await pool.query('DELETE FROM chargers WHERE id = ?', [chargerId]);
    res.json({ success: true, message: 'Charger deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllChargers,
  getChargerById,
  createCharger,
  updateCharger,
  deleteCharger
};
