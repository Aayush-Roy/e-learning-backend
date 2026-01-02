const stripe = require('../config/payment');
const ApiError = require('../utils/ApiError');
const Payment = require('../models/Payment.model');
const Enrollment = require('../models/Enrollment.model');
const Course = require('../models/Course.model');
const User = require('../models/User.model');

const createPaymentIntent = async (userId, courseId, amount, currency = 'usd') => {
  try {
    const course = await Course.findById(courseId);
    if (!course) {
      throw ApiError.notFound('Course not found');
    }

    // Check if already enrolled
    const existingEnrollment = await Enrollment.findOne({
      userId,
      courseId,
      paymentStatus: 'completed'
    });

    if (existingEnrollment) {
      throw ApiError.conflict('You are already enrolled in this course');
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata: {
        userId: userId.toString(),
        courseId: courseId.toString(),
        courseTitle: course.title
      }
    });

    // Save payment record
    const payment = await Payment.create({
      userId,
      courseId,
      amount,
      currency,
      status: 'pending',
      transactionId: `PI_${Date.now()}`,
      stripePaymentIntentId: paymentIntent.id,
      metadata: {
        courseTitle: course.title,
        courseCategory: course.category
      }
    });

    return {
      paymentIntent,
      payment
    };
  } catch (error) {
    console.error('Payment intent creation error:', error);
    throw ApiError.internal('Error creating payment intent');
  }
};

// const confirmPayment = async (paymentIntentId) => {
//   try {
//     // Verify with Stripe
//     const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

//     if (paymentIntent.status !== 'succeeded') {
//       throw ApiError.badRequest('Payment not successful');
//     }

//     // Update payment record
//     const payment = await Payment.findOneAndUpdate(
//       { stripePaymentIntentId: paymentIntentId },
//       {
//         status: 'completed',
//         receiptUrl: paymentIntent.charges.data[0].receipt_url,
//         stripeCustomerId: paymentIntent.customer
//       },
//       { new: true }
//     );

//     if (!payment) {
//       throw ApiError.notFound('Payment record not found');
//     }

//     // Create enrollment
//     const enrollment = await Enrollment.create({
//       userId: payment.userId,
//       courseId: payment.courseId,
//       paymentStatus: 'completed',
//       paymentId: payment._id,
//       amountPaid: payment.amount
//     });

//     return { payment, enrollment };
//   } catch (error) {
//     console.error('Payment confirmation error:', error);
//     throw ApiError.internal('Error confirming payment');
//   }
// };

const confirmPayment = async (paymentIntent) => {
  // 🔥 paymentIntent is already verified by Stripe webhook
  const payment = await Payment.findOne({
    stripePaymentIntentId: paymentIntent.id,
  });

  if (!payment) {
    throw ApiError.notFound("Payment record not found");
  }

  // 🔒 Idempotency
  if (payment.status === "completed") {
    return { payment };
  }

  // ✅ Mark payment complete
  payment.status = "completed";
  payment.amount = paymentIntent.amount_received / 100;
  await payment.save();

  // ✅ Create enrollment
  const enrollment = await Enrollment.create({
    userId: payment.userId,
    courseId: payment.courseId,
    paymentStatus: "completed",
    amountPaid: payment.amount,
  });

  // ✅ Update user
  await User.findByIdAndUpdate(payment.userId, {
    $addToSet: { enrolledCourses: payment.courseId },
  });

  return { payment, enrollment };
};

const getPaymentHistory = async (userId) => {
  try {
    const payments = await Payment.find({ userId })
      .sort({ createdAt: -1 })
      .populate('courseId', 'title thumbnail');

    return payments;
  } catch (error) {
    console.error('Get payment history error:', error);
    throw ApiError.internal('Error fetching payment history');
  }
};

module.exports = {
  createPaymentIntent,
  confirmPayment,
  getPaymentHistory
};