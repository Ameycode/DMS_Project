const { pool } = require('../config/db');

async function submitFeedback(req, res, next) {
  try {
    const { station_id, booking_id, rating, comment } = req.body;
    const userId = req.user.id;

    if (!station_id || !rating) {
      return res.status(400).json({ success: false, message: 'station_id and rating are required.' });
    }

    const numRating = parseInt(rating, 10);
    if (numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be an integer between 1 and 5.' });
    }

    const [result] = await pool.query(
      `INSERT INTO feedback (station_id, user_id, booking_id, rating, comment)
       VALUES (?, ?, ?, ?, ?)`,
      [station_id, userId, booking_id || null, numRating, comment ? comment.trim() : null]
    );

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully. Thank you for rating!',
      feedbackId: result.insertId
    });
  } catch (error) {
    next(error);
  }
}

async function getStationFeedback(req, res, next) {
  try {
    const stationId = parseInt(req.params.stationId, 10);

    const [feedback] = await pool.query(
      `SELECT f.*, u.full_name AS customer_name
       FROM feedback f
       INNER JOIN users u ON f.user_id = u.id
       WHERE f.station_id = ?
       ORDER BY f.created_at DESC`,
      [stationId]
    );

    res.json({ success: true, count: feedback.length, feedback });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  submitFeedback,
  getStationFeedback
};
