const { pool } = require('../config/db');

async function getAllTariffs(req, res, next) {
  try {
    const [tariffs] = await pool.query(
      `SELECT t.*, s.name AS station_name, s.station_code
       FROM tariffs t
       LEFT JOIN stations s ON t.station_id = s.id
       ORDER BY t.connector_type ASC`
    );
    res.json({ success: true, count: tariffs.length, tariffs });
  } catch (error) {
    next(error);
  }
}

async function updateTariff(req, res, next) {
  try {
    const tariffId = parseInt(req.params.id, 10);
    const { rate_per_kwh, service_fee, tax_percentage, is_active } = req.body;

    await pool.query(
      `UPDATE tariffs
       SET rate_per_kwh = COALESCE(?, rate_per_kwh),
           service_fee = COALESCE(?, service_fee),
           tax_percentage = COALESCE(?, tax_percentage),
           is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [rate_per_kwh, service_fee, tax_percentage, is_active, tariffId]
    );

    res.json({ success: true, message: 'Tariff updated successfully.' });
  } catch (error) {
    next(error);
  }
}

async function createTariff(req, res, next) {
  try {
    const { station_id, connector_type, rate_per_kwh, service_fee, tax_percentage } = req.body;

    if (!connector_type || !rate_per_kwh) {
      return res.status(400).json({ success: false, message: 'connector_type and rate_per_kwh are required.' });
    }

    const [result] = await pool.query(
      `INSERT INTO tariffs (station_id, connector_type, rate_per_kwh, service_fee, tax_percentage)
       VALUES (?, ?, ?, ?, ?)`,
      [station_id || null, connector_type, rate_per_kwh, service_fee || 20.00, tax_percentage || 18.00]
    );

    res.status(201).json({ success: true, message: 'Tariff created.', tariffId: result.insertId });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllTariffs,
  updateTariff,
  createTariff
};
