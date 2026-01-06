const mongoose = require('mongoose');
require('dotenv').config();

const dropIndex = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const collection = mongoose.connection.db.collection('driversignups');
    
    // Drop the username index
    await collection.dropIndex('username_1');
    console.log('Successfully dropped username_1 index from driversignups collection');
    
    process.exit(0);
  } catch (error) {
    console.log('Error:', error.message);
    process.exit(1);
  }
};

dropIndex();
