const mongoose = require('mongoose');
require('dotenv').config();

const dropIndex = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const collection = mongoose.connection.db.collection('users');
    
    // Drop the email index
    await collection.dropIndex('email_1');
    console.log('Successfully dropped email_1 index');
    
    process.exit(0);
  } catch (error) {
    console.log('Error:', error.message);
    process.exit(1);
  }
};

dropIndex();
