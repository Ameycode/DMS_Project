const { pool } = require('../config/db');

async function getAllMaintenance(req, res, next) {
  try {
    const { status } = req.query;

    let query = `
      SELECT 
        m.*,
        p.port_code,
        p.connector_type,
        c.charger_code,
        s.name AS station_name,
        u.full_name AS reporter_name
      FROM maintenance_records m
      INNER JOIN ports p ON m.port_id = p.id
      INNER JOIN chargers c ON p.charger_id = c.id
      INNER JOIN stations s ON c.station_id = s.id
      INNER JOIN users u ON m.reported_by = u.id
      WHERE 1=1
    `;

    const params = [];
    if (status) {
      query += ` AND m.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY m.reported_at DESC`;

    const [records] = await pool.query(query, params);
    res.json({ success: true, count: records.length, records });
  } catch (error) {
    next(error);
  }
}

async function reportIssue(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const { port_id, issue_description, severity } = req.body;
    const userId = req.user.id;

    if (!port_id || !issue_description) {
      return res.status(400).json({ success: false, message: 'port_id and issue_description are required.' });
    }

    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO maintenance_records (port_id, reported_by, issue_description, severity, status)
       VALUES (?, ?, ?, ?, 'OPEN')`,
      [port_id, userId, issue_description.trim(), severity || 'MEDIUM']
    );

    // Update port status to MAINTENANCE
    await conn.query(`UPDATE ports SET current_status = 'MAINTENANCE' WHERE id = ?`, [port_id]);

    await conn.commit();

    res.status(201).json({
      success: true,
      message: 'Maintenance ticket created and port marked as MAINTENANCE.',
      recordId: result.insertId
    });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
}

async function resolveIssue(req, res, next) {
  const conn = await pool.getConnection();
  try {
    const issueId = parseInt(req.params.id, 10);
    const { resolution_notes } = req.body;

    await conn.beginTransaction();

    const [record] = await conn.query(`SELECT port_id FROM maintenance_records WHERE id = ?`, [issueId]);
    if (record.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    await conn.query(
      `UPDATE maintenance_records
       SET status = 'RESOLVED',
           resolution_notes = ?,
           resolved_at = NOW()
       WHERE id = ?`,
      [resolution_notes || 'Resolved and tested operational.', issueId]
    );

    // Restore port status
    await conn.query(`UPDATE ports SET current_status = 'AVAILABLE' WHERE id = ?`, [record[0].port_id]);

    await conn.commit();

    res.json({ success: true, message: 'Ticket resolved and port restored to AVAILABLE.' });
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
}

module.exports = {
  getAllMaintenance,
  reportIssue,
  resolveIssue
};
