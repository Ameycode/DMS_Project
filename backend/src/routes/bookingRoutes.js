const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { verifyToken, requireRole } = require('../middleware/auth');

router.post('/', verifyToken, bookingController.createBooking);
router.get('/my', verifyToken, bookingController.getUserBookings);
router.get('/all', verifyToken, requireRole('ADMIN', 'OPERATOR'), bookingController.getAllBookings);
router.get('/availability', bookingController.checkPortAvailability);
router.post('/:id/cancel', verifyToken, bookingController.cancelBooking);

module.exports = router;
