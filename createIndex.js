const mongoose = require('mongoose');
const Driver = require('./models/Driver');
require('dotenv').config();

// MongoDB connection using environment variable
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('✅ MongoDB Connected');
  
  try {
    // Create geospatial index
    await Driver.collection.createIndex({ 'currentLocation': '2dsphere' });
    console.log('✅ Geospatial index created on currentLocation field');
    
    // List all indexes
    const indexes = await Driver.collection.indexes();
    console.log('\n📋 Current indexes on drivers collection:');
    indexes.forEach(index => {
      console.log(`  - ${JSON.stringify(index.key)}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating index:', error);
    process.exit(1);
  }
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});
