const Payment = require('../models/Payment.model');
const Enrollment = require('../models/Enrollment.model');
const Course = require('../models/Course.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const { createPaymentIntent, confirmPayment, getPaymentHistory } = require('../services/payment.service');
const { sendPaymentReceipt, sendEnrollmentConfirmation } = require('../services/email.service');

const createCheckoutSession = async (req, res, next) => {
  try {
    const { courseId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return next(ApiError.notFound('Course not found'));
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId,
      paymentStatus: 'completed'
    });

    if (existingEnrollment) {
      return next(ApiError.conflict('You are already enrolled in this course'));
    }

    // Create payment intent
    const { paymentIntent, payment } = await createPaymentIntent(
      req.user._id,
      courseId,
      course.price
    );

    res.status(200).json(
      ApiResponse.success('Payment intent created', {
        clientSecret: paymentIntent.client_secret,
        paymentId: payment._id,
        amount: course.price,
        course: {
          id: course._id,
          title: course.title,
          thumbnail: course.thumbnail
        }
      }).toJSON()
    );
  } catch (error) {
    next(error);
  }
};

const verifyPayment = async (req, res, next) => {
  try {
    const { paymentIntentId } = req.body;

    const { payment, enrollment } = await confirmPayment(paymentIntentId);

    // Send confirmation emails
    await Promise.all([
      sendPaymentReceipt(req.user, payment),
      sendEnrollmentConfirmation(req.user, await Course.findById(enrollment.courseId))
    ]);

    res.status(200).json(
      ApiResponse.success('Payment verified and enrollment created', {
        payment,
        enrollment
      }).toJSON()
    );
  } catch (error) {
    next(error);
  }
};

const getMyPayments = async (req, res, next) => {
  try {
    const payments = await getPaymentHistory(req.user._id);

    res.status(200).json(
      ApiResponse.success('Payment history retrieved', {
        payments
      }).toJSON()
    );
  } catch (error) {
    next(error);
  }
};

const getPaymentDetails = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('courseId')
      .populate('userId', 'name email');

    if (!payment) {
      return next(ApiError.notFound('Payment not found'));
    }

    // Check authorization (user or admin only)
    if (payment.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return next(ApiError.forbidden('You are not authorized to view this payment'));
    }

    res.status(200).json(
      ApiResponse.success('Payment details retrieved', {
        payment
      }).toJSON()
    );
  } catch (error) {
    next(error);
  }
};

const handleWebhook = async (req, res, next) => {
  try {
    const sig = req.headers['stripe-signature'];
    const stripe = require('../config/payment');

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        await handleSuccessfulPayment(paymentIntent);
        break;
      case 'payment_intent.payment_failed':
        const failedPaymentIntent = event.data.object;
        await handleFailedPayment(failedPaymentIntent);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
};

const handleSuccessfulPayment = async (paymentIntent) => {
  try {
    // await confirmPayment(paymentIntent.id);
    await confirmPayment(paymentIntent)
  } catch (error) {
    console.error('Error handling successful payment:', error);
  }
};

const handleFailedPayment = async (paymentIntent) => {
  try {
    await Payment.findOneAndUpdate(
      { stripePaymentIntentId: paymentIntent.id },
      { status: 'failed' }
    );
  } catch (error) {
    console.error('Error handling failed payment:', error);
  }
};

const enrollFreeCourse = async (req, res, next) => {
  try {
    const { courseId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) {
      return next(ApiError.notFound('Course not found'));
    }

    if (course.price > 0) {
      return next(ApiError.badRequest('This course is not free'));
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId,
      paymentStatus: 'completed'
    });

    if (existingEnrollment) {
      return next(ApiError.conflict('You are already enrolled in this course'));
    }

    // Create free enrollment
    const enrollment = await Enrollment.create({
      userId: req.user._id,
      courseId,
      paymentStatus: 'completed',
      amountPaid: 0
    });

    // Send confirmation email
    sendEnrollmentConfirmation(req.user, course).catch(console.error);

    res.status(200).json(
      ApiResponse.success('Successfully enrolled in free course', {
        enrollment
      }).toJSON()
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCheckoutSession,
  verifyPayment,
  getMyPayments,
  getPaymentDetails,
  handleWebhook,
  enrollFreeCourse
};