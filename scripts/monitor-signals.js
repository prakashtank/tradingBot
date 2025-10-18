const CryptoTradingBot = require('../crypto-trading-bot');
const { db, testConnection } = require('../config/db');

class SignalMonitor {
  constructor() {
    this.bot = null;
    this.isMonitoring = false;
    this.signalCount = 0;
    this.lastSignalTime = null;
  }

  async startMonitoring() {
    try {
      console.log('🔍 Starting Signal Monitor...\n');
      
      // Test database connection
      const isConnected = await testConnection();
      if (!isConnected) {
        console.error('❌ Database connection failed');
        return;
      }
      
      // Initialize trading bot
      this.bot = new CryptoTradingBot('scalping');
      
      // Set up event handlers
      this.bot.on('signal', (signal) => {
        this.handleNewSignal(signal);
      });
      
      // Start the bot
      await this.bot.start();
      
      this.isMonitoring = true;
      console.log('✅ Signal monitor started successfully\n');
      
      // Start monitoring loop
      this.startMonitoringLoop();
      
    } catch (error) {
      console.error('❌ Failed to start signal monitor:', error);
    }
  }

  handleNewSignal(signal) {
    this.signalCount++;
    this.lastSignalTime = new Date();
    
    console.log(`\n🎯 NEW SIGNAL #${this.signalCount}`);
    console.log('='.repeat(60));
    console.log(`Symbol: ${signal.symbol}`);
    console.log(`Type: ${signal.type}`);
    console.log(`Strength: ${(signal.strength * 100).toFixed(1)}%`);
    console.log(`Price: $${signal.price.toFixed(4)}`);
    console.log(`Entry: $${signal.entry.toFixed(4)}`);
    console.log(`Stop Loss: $${signal.stopLoss.toFixed(4)}`);
    console.log(`Take Profit: $${signal.takeProfit.toFixed(4)}`);
    console.log(`Risk/Reward: 1:${signal.riskReward.toFixed(2)}`);
    console.log(`Time: ${signal.timestamp.toLocaleString()}`);
    console.log('='.repeat(60));
    
    // Show technical analysis
    console.log('\n📊 Technical Analysis:');
    console.log(`EMA9: $${signal.analysis.ema9.toFixed(4)}`);
    console.log(`EMA21: $${signal.analysis.ema21.toFixed(4)}`);
    console.log(`EMA50: $${signal.analysis.ema50.toFixed(4)}`);
    console.log(`RSI: ${signal.analysis.rsi.toFixed(1)}`);
    console.log(`MACD: ${signal.analysis.macd.toFixed(6)}`);
    console.log(`Volatility: ${signal.analysis.volatility?.toFixed(2)}%`);
    console.log(`Momentum: ${signal.analysis.momentum?.toFixed(2)}%`);
    console.log('\n' + '='.repeat(60) + '\n');
  }

  startMonitoringLoop() {
    // Status update every 30 seconds
    setInterval(() => {
      if (this.isMonitoring) {
        this.showStatus();
      }
    }, 30000);
    
    // Performance check every 5 minutes
    setInterval(async () => {
      if (this.isMonitoring) {
        await this.checkPerformance();
      }
    }, 300000);
  }

  showStatus() {
    const now = new Date();
    const timeSinceLastSignal = this.lastSignalTime 
      ? Math.floor((now - this.lastSignalTime) / 1000)
      : 'N/A';
    
    console.log(`\n📊 Monitor Status - ${now.toLocaleTimeString()}`);
    console.log(`Signals Generated: ${this.signalCount}`);
    console.log(`Last Signal: ${timeSinceLastSignal}s ago`);
    console.log(`Bot Status: ${this.bot ? 'Running' : 'Stopped'}`);
    
    if (this.bot) {
      const status = this.bot.getStatus();
      console.log(`WebSocket: ${status.webSocketStatus.isConnected ? 'Connected' : 'Disconnected'}`);
      console.log(`Symbols: ${status.symbols.join(', ')}`);
      console.log(`Intervals: ${status.intervals.join(', ')}`);
    }
    console.log('-'.repeat(50));
  }

  async checkPerformance() {
    try {
      const stats = await this.bot.getSignalStats();
      console.log(`\n📈 Performance Update:`);
      console.log(`Total Signals: ${stats.total}`);
      console.log(`Buy Signals: ${stats.buySignals}`);
      console.log(`Sell Signals: ${stats.sellSignals}`);
      console.log(`Average Strength: ${(stats.avgStrength * 100).toFixed(1)}%`);
      console.log(`Recent 24h: ${stats.recent24h}`);
    } catch (error) {
      console.error('❌ Error checking performance:', error);
    }
  }

  async stopMonitoring() {
    try {
      console.log('\n🛑 Stopping Signal Monitor...');
      
      this.isMonitoring = false;
      
      if (this.bot) {
        await this.bot.stop();
      }
      
      console.log('✅ Signal monitor stopped');
      
    } catch (error) {
      console.error('❌ Error stopping signal monitor:', error);
    }
  }

  // Real-time signal streaming
  startSignalStream() {
    console.log('📡 Starting real-time signal stream...\n');
    
    if (this.bot) {
      this.bot.on('signal', (signal) => {
        // Stream signal data as JSON
        console.log(JSON.stringify({
          timestamp: signal.timestamp,
          symbol: signal.symbol,
          type: signal.type,
          strength: signal.strength,
          price: signal.price,
          entry: signal.entry,
          stopLoss: signal.stopLoss,
          takeProfit: signal.takeProfit,
          riskReward: signal.riskReward
        }, null, 2));
      });
    }
  }
}

// Main function
async function main() {
  const monitor = new SignalMonitor();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down...');
    await monitor.stopMonitoring();
    await db.destroy();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down...');
    await monitor.stopMonitoring();
    await db.destroy();
    process.exit(0);
  });
  
  // Start monitoring
  await monitor.startMonitoring();
  
  // Keep the process running
  process.stdin.resume();
}

if (require.main === module) {
  main();
}

module.exports = SignalMonitor;
