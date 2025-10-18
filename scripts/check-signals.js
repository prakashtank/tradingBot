const { db } = require('../config/db');
const TradingSignal = require('../models/TradingSignal');

async function checkRecentSignals(limit = 10) {
  try {
    console.log('🔍 Checking Recent Trading Signals...\n');
    
    const signals = await TradingSignal.findAll(limit);
    
    if (signals.length === 0) {
      console.log('❌ No signals found in database');
      return;
    }
    
    console.log(`📊 Found ${signals.length} recent signals:\n`);
    
    signals.forEach((signal, index) => {
      console.log(`${index + 1}. ${signal.symbol} ${signal.signal_type}`);
      console.log(`   Strength: ${(signal.strength * 100).toFixed(1)}%`);
      console.log(`   Price: $${signal.price}`);
      console.log(`   Entry: $${signal.entry_price}`);
      console.log(`   Stop Loss: $${signal.stop_loss}`);
      console.log(`   Take Profit: $${signal.take_profit}`);
      console.log(`   Risk/Reward: 1:${signal.risk_reward}`);
      console.log(`   Time: ${new Date(signal.created_at).toLocaleString()}`);
      console.log('   ' + '-'.repeat(50));
    });
    
  } catch (error) {
    console.error('❌ Error checking signals:', error);
  }
}

async function checkSignalStats() {
  try {
    console.log('📈 Trading Signal Statistics:\n');
    
    const stats = await TradingSignal.getStats();
    
    console.log(`Total Signals: ${stats.total}`);
    console.log(`Buy Signals: ${stats.byType.BUY || 0}`);
    console.log(`Sell Signals: ${stats.byType.SELL || 0}`);
    console.log(`Average Strength: ${(stats.avgStrength * 100).toFixed(1)}%`);
    console.log(`Recent 24h: ${stats.recent24h}`);
    
    console.log('\n📊 Signals by Symbol:');
    stats.bySymbol.forEach(symbol => {
      console.log(`  ${symbol.symbol}: ${symbol.count} signals`);
    });
    
  } catch (error) {
    console.error('❌ Error checking signal stats:', error);
  }
}

async function checkSignalsBySymbol(symbol) {
  try {
    console.log(`🔍 Checking signals for ${symbol}...\n`);
    
    const signals = await TradingSignal.findBySymbol(symbol, 20);
    
    if (signals.length === 0) {
      console.log(`❌ No signals found for ${symbol}`);
      return;
    }
    
    console.log(`📊 Found ${signals.length} signals for ${symbol}:\n`);
    
    signals.forEach((signal, index) => {
      console.log(`${index + 1}. ${signal.signal_type} - ${(signal.strength * 100).toFixed(1)}% strength`);
      console.log(`   Price: $${signal.price} | Entry: $${signal.entry_price}`);
      console.log(`   Time: ${new Date(signal.created_at).toLocaleString()}`);
      console.log('   ' + '-'.repeat(40));
    });
    
  } catch (error) {
    console.error('❌ Error checking signals by symbol:', error);
  }
}

async function checkSignalsByType(signalType) {
  try {
    console.log(`🔍 Checking ${signalType} signals...\n`);
    
    const signals = await TradingSignal.findByType(signalType, 20);
    
    if (signals.length === 0) {
      console.log(`❌ No ${signalType} signals found`);
      return;
    }
    
    console.log(`📊 Found ${signals.length} ${signalType} signals:\n`);
    
    signals.forEach((signal, index) => {
      console.log(`${index + 1}. ${signal.symbol} - ${(signal.strength * 100).toFixed(1)}% strength`);
      console.log(`   Price: $${signal.price} | Entry: $${signal.entry_price}`);
      console.log(`   Time: ${new Date(signal.created_at).toLocaleString()}`);
      console.log('   ' + '-'.repeat(40));
    });
    
  } catch (error) {
    console.error('❌ Error checking signals by type:', error);
  }
}

async function checkStrongSignals(minStrength = 0.8) {
  try {
    console.log(`🔍 Checking strong signals (${(minStrength * 100).toFixed(0)}%+ strength)...\n`);
    
    const signals = await db('trading_signals')
      .where('strength', '>=', minStrength)
      .orderBy('created_at', 'desc')
      .limit(20);
    
    if (signals.length === 0) {
      console.log(`❌ No strong signals found (${(minStrength * 100).toFixed(0)}%+ strength)`);
      return;
    }
    
    console.log(`📊 Found ${signals.length} strong signals:\n`);
    
    signals.forEach((signal, index) => {
      console.log(`${index + 1}. ${signal.symbol} ${signal.signal_type} - ${(signal.strength * 100).toFixed(1)}% strength`);
      console.log(`   Price: $${signal.price} | Entry: $${signal.entry_price}`);
      console.log(`   Stop Loss: $${signal.stop_loss} | Take Profit: $${signal.take_profit}`);
      console.log(`   Time: ${new Date(signal.created_at).toLocaleString()}`);
      console.log('   ' + '-'.repeat(50));
    });
    
  } catch (error) {
    console.error('❌ Error checking strong signals:', error);
  }
}

async function checkRecentPerformance(days = 7) {
  try {
    console.log(`📈 Performance Analysis (Last ${days} days):\n`);
    
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
    
    const signals = await TradingSignal.getSignalsByTimeRange(startDate, endDate);
    
    if (signals.length === 0) {
      console.log(`❌ No signals found in the last ${days} days`);
      return;
    }
    
    const buySignals = signals.filter(s => s.signal_type === 'BUY');
    const sellSignals = signals.filter(s => s.signal_type === 'SELL');
    const avgStrength = signals.reduce((sum, s) => sum + s.strength, 0) / signals.length;
    const strongSignals = signals.filter(s => s.strength > 0.8).length;
    
    console.log(`Total Signals: ${signals.length}`);
    console.log(`Buy Signals: ${buySignals.length}`);
    console.log(`Sell Signals: ${sellSignals.length}`);
    console.log(`Average Strength: ${(avgStrength * 100).toFixed(1)}%`);
    console.log(`Strong Signals (>80%): ${strongSignals}`);
    
    // Group by symbol
    const bySymbol = signals.reduce((acc, signal) => {
      acc[signal.symbol] = (acc[signal.symbol] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\n📊 Signals by Symbol:');
    Object.entries(bySymbol)
      .sort(([,a], [,b]) => b - a)
      .forEach(([symbol, count]) => {
        console.log(`  ${symbol}: ${count} signals`);
      });
    
  } catch (error) {
    console.error('❌ Error checking recent performance:', error);
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    // Test database connection
    await db.raw('SELECT 1');
    console.log('✅ Database connected successfully\n');
    
    switch (command) {
      case 'recent':
        await checkRecentSignals(parseInt(args[1]) || 10);
        break;
      case 'stats':
        await checkSignalStats();
        break;
      case 'symbol':
        if (!args[1]) {
          console.log('❌ Please provide a symbol (e.g., BTCUSDT)');
          return;
        }
        await checkSignalsBySymbol(args[1].toUpperCase());
        break;
      case 'type':
        if (!args[1]) {
          console.log('❌ Please provide a signal type (BUY or SELL)');
          return;
        }
        await checkSignalsByType(args[1].toUpperCase());
        break;
      case 'strong':
        await checkStrongSignals(parseFloat(args[1]) || 0.8);
        break;
      case 'performance':
        await checkRecentPerformance(parseInt(args[1]) || 7);
        break;
      default:
        console.log('🔍 Trading Signal Checker\n');
        console.log('Usage: node scripts/check-signals.js <command> [options]\n');
        console.log('Commands:');
        console.log('  recent [limit]           - Show recent signals (default: 10)');
        console.log('  stats                    - Show signal statistics');
        console.log('  symbol <SYMBOL>          - Show signals for specific symbol');
        console.log('  type <BUY|SELL>          - Show signals by type');
        console.log('  strong [minStrength]     - Show strong signals (default: 0.8)');
        console.log('  performance [days]        - Show performance analysis (default: 7)\n');
        console.log('Examples:');
        console.log('  node scripts/check-signals.js recent 20');
        console.log('  node scripts/check-signals.js symbol BTCUSDT');
        console.log('  node scripts/check-signals.js type BUY');
        console.log('  node scripts/check-signals.js strong 0.9');
        console.log('  node scripts/check-signals.js performance 14');
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    await db.destroy();
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  checkRecentSignals,
  checkSignalStats,
  checkSignalsBySymbol,
  checkSignalsByType,
  checkStrongSignals,
  checkRecentPerformance
};
