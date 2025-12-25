const express = require('express');
const router = express.Router();
const {
  createCheckoutSession,
  verifyPayment,
  getMyPayments,
  getPaymentDetails,
  handleWebhook,
  enrollFreeCourse
} = require('../controllers/payment.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');

// Webhook route (no authentication needed)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Protected routes
router.use(protect);

// Student routes
router.post('/create-checkout', restrictTo('student'), createCheckoutSession);
router.post('/verify', restrictTo('student'), verifyPayment);
router.get('/my-payments', restrictTo('student'), getMyPayments);
router.get('/:id', getPaymentDetails);
router.post('/free-enroll', restrictTo('student'), enrollFreeCourse);

module.exports = router;