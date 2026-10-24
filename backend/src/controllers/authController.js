const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_ev_jwt_key_2026_dbms_mini';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

async function register(req, res, next) {
  try {
    const { full_name, email, phone, password, ev_model, compatible_connector, role } = req.body;

    if (!full_name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email, phone number, and password are required.'
      });
    }

    // Check if user already exists
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // Validate assigned role
    const assignedRole = (role && ['CUSTOMER', 'OPERATOR', 'ADMIN'].includes(role)) ? role : 'CUSTOMER';

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Insert new user
    const [result] = await pool.query(
      `INSERT INTO users (full_name, email, phone, password_hash, role, ev_model, compatible_connector)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        full_name.trim(),
        email.trim().toLowerCase(),
        phone.trim(),
        password_hash,
        assignedRole,
        ev_model ? ev_model.trim() : null,
        compatible_connector || 'CCS2'
      ]
    );

    const userId = result.insertId;

    // Create welcome notification
    await pool.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES (?, ?, ?, ?)`,
      [
        userId,
        'Welcome to EV Charge Hub',
        'Your profile has been created successfully. Explore stations and book available ports seamlessly.',
        'SUCCESS'
      ]
    );

    // Generate token
    const token = jwt.sign(
      { id: userId, email: email.trim().toLowerCase(), role: assignedRole, full_name: full_name.trim() },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      token,
      user: {
        id: userId,
        full_name: full_name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role: assignedRole,
        ev_model,
        compatible_connector: compatible_connector || 'CCS2'
      }
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const [rows] = await pool.query(
      `SELECT id, full_name, email, phone, password_hash, role, ev_model, compatible_connector
       FROM users WHERE email = ?`,
      [email.trim().toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: 'Authentication successful.',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        ev_model: user.ev_model,
        compatible_connector: user.compatible_connector
      }
    });
  } catch (error) {
    next(error);
  }
}

async function getProfile(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT id, full_name, email, phone, role, ev_model, compatible_connector, created_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User record not found.' });
    }

    res.json({ success: true, user: rows[0] });
  } catch (error) {
    next(error);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { full_name, phone, ev_model, compatible_connector } = req.body;

    await pool.query(
      `UPDATE users
       SET full_name = COALESCE(?, full_name),
           phone = COALESCE(?, phone),
           ev_model = COALESCE(?, ev_model),
           compatible_connector = COALESCE(?, compatible_connector)
       WHERE id = ?`,
      [full_name, phone, ev_model, compatible_connector, req.user.id]
    );

    const [rows] = await pool.query(
      `SELECT id, full_name, email, phone, role, ev_model, compatible_connector
       FROM users WHERE id = ?`,
      [req.user.id]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: rows[0]
    });
  } catch (error) {
    next(error);
  }
}

async function getAllUsers(req, res, next) {
  try {
    const [users] = await pool.query(
      `SELECT id, full_name, email, phone, role, ev_model, compatible_connector, created_at
       FROM users ORDER BY role ASC, full_name ASC`
    );
    res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  getAllUsers
};
