const CryptoTradingBot = require('./crypto-trading-bot');
const { db, testConnection } = require('./config/db');
require('dotenv').config();

async function createTradingSignalsTable() {
  try {
    const hasTable = await db.schema.hasTable('trading_signals');
    if (!hasTable) {
      await db.schema.createTable('trading_signals', (table) => {
        table.increments('id').primary();
        table.string('signal_id').unique().notNullable();
        table.string('symbol').notNullable();
        table.string('interval').notNullable();
        table.enum('signal_type', ['BUY', 'SELL']).notNullable();
        table.decimal('strength', 5, 4).notNullable();
        table.decimal('price', 20, 8).notNullable();
        table.decimal('entry_price', 20, 8).notNullable();
        table.decimal('stop_loss', 20, 8).notNullable();
        table.decimal('take_profit', 20, 8).notNullable();
        table.decimal('risk_reward', 10, 4).notNullable();
        table.json('analysis_data').notNullable();
        table.json('candle_data').notNullable();
        table.string('status').defaultTo('active');
        table.text('notes').nullable();
        table.timestamps(true, true);
        
        // Indexes
        table.index(['symbol', 'created_at']);
        table.index(['signal_type', 'created_at']);
        table.index(['strength']);
        table.index(['created_at']);
      });
      console.log('✅ Trading signals table created successfully');
    }
  } catch (error) {
    console.error('❌ Error creating trading signals table:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting Crypto Trading Signal Bot...');
    
    // Test database connection
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ Database connection failed. Exiting...');
      process.exit(1);
    }
    
    // Create trading signals table
    await createTradingSignalsTable();
    
    // Initialize trading bot
    const bot = new CryptoTradingBot('scalping');
    
    // Handle bot events
    bot.on('signal', (signal) => {
      console.log(`🎯 New signal: ${signal.symbol} ${signal.type} (${signal.strength.toFixed(2)})`);
    });
    
    // Start the bot
    await bot.start();
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      await bot.stop();
      await db.destroy();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      await bot.stop();
      await db.destroy();
      process.exit(0);
    });
    
    // Keep the process running
    setInterval(() => {
      const status = bot.getStatus();
      console.log(`📊 Bot Status: Running=${status.isRunning}, WS=${status.webSocketStatus.isConnected}, Signals=${status.signalLoggerStatus.bufferSize}`);
    }, 30000);
    
  } catch (error) {
    console.error('❌ Failed to start trading bot:', error);
    process.exit(1);
  }
}

// Start the application
if (require.main === module) {
  main();
}

module.exports = { main };
