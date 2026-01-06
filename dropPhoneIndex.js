const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const dropOldIndexes = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the users collection
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Get all indexes
    const indexes = await usersCollection.indexes();
    console.log('Current indexes:', indexes);

    // Drop the old phone_1 index if it exists
    try {
      await usersCollection.dropIndex('phone_1');
      console.log('✓ Dropped old phone_1 index');
    } catch (err) {
      if (err.code === 27) {
        console.log('phone_1 index does not exist (already removed)');
      } else {
        console.log('Error dropping phone_1 index:', err.message);
      }
    }

    // Check remaining indexes
    const remainingIndexes = await usersCollection.indexes();
    console.log('Remaining indexes:', remainingIndexes);

    await mongoose.disconnect();
    console.log('✓ Done! Server can now be restarted.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

dropOldIndexes();
