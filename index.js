const { db } = require('./config/db');
require('dotenv').config();

async function testConnection() {
  try {
    // Test database connection
    const isConnected = await db.raw('SELECT 1');
    console.log('✅ Database connection successful!');
    
    // Example: Create a simple table if it doesn't exist
    const hasTable = await db.schema.hasTable('users');
    if (!hasTable) {
      await db.schema.createTable('users', (table) => {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.string('email').unique().notNullable();
        table.timestamps(true, true);
      });
      console.log('✅ Users table created successfully!');
    }
    
    // Example: Insert a test user
    const [userId] = await db('users').insert({
      name: 'Test User',
      email: 'test@example.com'
    });
    console.log('✅ Test user inserted with ID:', userId);
    
    // Example: Query users
    const users = await db('users').select('*');
    console.log('📋 Current users:', users);
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    // Close the database connection
    await db.destroy();
    console.log('🔌 Database connection closed');
  }
}

// Run the test
testConnection();
