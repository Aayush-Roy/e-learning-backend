const mongoose = require('mongoose');
const { MONGODB_URI } = require('./env');
// const { MONGODB_URI } = require('./env');

// const MONGODB_URI = "mongodb://localhost:27017/udemy-clone"
console.log("from db.js",MONGODB_URI)
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.NODE_ENV === 'production' ? MONGODB_URI_PROD : MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

module.exports = { connectDB };