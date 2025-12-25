// Placeholder for email service
// In production, integrate with SendGrid, Mailgun, etc.

const sendWelcomeEmail = async (user) => {
  console.log(`Welcome email sent to ${user.email}`);
  return true;
};

const sendEnrollmentConfirmation = async (user, course) => {
  console.log(`Enrollment confirmation sent to ${user.email} for course ${course.title}`);
  return true;
};

const sendPaymentReceipt = async (user, payment) => {
  console.log(`Payment receipt sent to ${user.email} for payment ${payment.transactionId}`);
  return true;
};

module.exports = {
  sendWelcomeEmail,
  sendEnrollmentConfirmation,
  sendPaymentReceipt
};