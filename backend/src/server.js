const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { testConnection } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/stations', require('./routes/stationRoutes'));
app.use('/api/chargers', require('./routes/chargerRoutes'));
app.use('/api/ports', require('./routes/portRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));
app.use('/api/sessions', require('./routes/sessionRoutes'));
app.use('/api/billing', require('./routes/billingRoutes'));
app.use('/api/tariffs', require('./routes/tariffRoutes'));
app.use('/api/maintenance', require('./routes/maintenanceRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));

// Health check and DBMS status endpoint
app.get('/api/health', async (req, res) => {
  const dbStatus = await testConnection();
  res.json({
    status: 'ONLINE',
    project: 'EV Charging Slot and Billing Management System',
    timestamp: new Date().toISOString(),
    database: dbStatus
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`=======================================================`);
    console.log(`⚡ EV Charging System REST API Server running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
    console.log(`=======================================================`);
    await testConnection();
  });
}

module.exports = app;
