const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Amount cannot be negative']
    },
    currency: {
      type: String,
      default: 'usd'
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    paymentMethod: {
      type: String,
      enum: ['stripe', 'paypal', 'razorpay', 'other'],
      default: 'stripe'
    },
    transactionId: {
      type: String,
      required: true,
      unique: true
    },
    stripePaymentIntentId: {
      type: String
    },
    stripeCustomerId: {
      type: String
    },
    receiptUrl: {
      type: String
    },
    metadata: {
      type: Map,
      of: String
    }
  },
  {
    timestamps: true
  }
);

// Index for faster queries
paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ stripePaymentIntentId: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;