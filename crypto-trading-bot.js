const EventEmitter = require('events');
const BinanceWebSocket = require('./services/BinanceWebSocket');
const CandlestickProcessor = require('./services/CandlestickProcessor');
const ScalpingStrategy = require('./services/ScalpingStrategy');
const SignalLogger = require('./services/SignalLogger');
const { getStrategyConfig, getSymbolsForStrategy, getIntervalsForStrategy } = require('./config/trading');
require('dotenv').config();

class CryptoTradingBot extends EventEmitter {
  constructor(strategy = 'scalping') {
    super();
    this.strategy = strategy;
    this.isRunning = false;
    this.symbols = getSymbolsForStrategy(strategy);
    this.intervals = getIntervalsForStrategy(strategy);
    this.config = getStrategyConfig(strategy);
    
    // Add confirmation intervals
    this.confirmationIntervals = this.config.confirmationIntervals || ['1h'];
    this.allIntervals = [...this.intervals, ...this.confirmationIntervals];
    
    // Initialize services
    this.webSocket = new BinanceWebSocket(this.symbols, this.allIntervals);
    this.candlestickProcessor = new CandlestickProcessor();
    this.scalpingStrategy = new ScalpingStrategy(this.config);
    this.signalLogger = new SignalLogger();
    
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    // WebSocket events
    this.webSocket.on('connected', () => {
      console.log('🚀 Trading bot connected to Binance WebSocket');
    });

    this.webSocket.on('disconnected', () => {
      console.log('🔌 Trading bot disconnected from Binance WebSocket');
    });

    this.webSocket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    // Kline data events
    this.webSocket.on('kline', (klineData) => {
      this.candlestickProcessor.processKline(klineData);
    });

    // Candlestick processor events
    this.candlestickProcessor.on('candleProcessed', (data) => {
      this.processCandleData(data);
    });

    this.candlestickProcessor.on('candleClosed', (data) => {
      this.processClosedCandle(data);
    });

    // Strategy events
    this.scalpingStrategy.on('signal', (signal) => {
      this.handleTradingSignal(signal);
    });

    // Signal logger events
    this.signalLogger.on('signalLogged', (signal) => {
      console.log(`📊 Signal logged: ${signal.symbol} ${signal.type}`);
    });

    this.signalLogger.on('signalsFlushed', (signals) => {
      console.log(`💾 Flushed ${signals.length} signals to database`);
    });

    this.signalLogger.on('error', (error) => {
      console.error('❌ Signal logger error:', error);
    });
  }

  async processCandleData(data) {
    try {
      const { symbol, interval, candle, allCandles } = data;
      
      // Only process main trading intervals (5m)
      if (this.intervals.includes(interval) && allCandles.length >= this.config.emaPeriods.slow) {
        // Get confirmation data if required
        let confirmationData = null;
        if (this.config.signal.requireConfirmation) {
          confirmationData = this.candlestickProcessor.getCandles(symbol, '1h', 50);
        }
        
        const signal = this.scalpingStrategy.analyzeSignal(symbol, interval, allCandles, confirmationData);
        
        if (signal) {
          console.log(`🎯 Signal generated: ${signal.symbol} ${signal.type} (${signal.strength.toFixed(2)})`);
          if (signal.confirmation) {
            console.log(`✅ Confirmed by 1h timeframe (${signal.confirmation.strength.toFixed(2)})`);
          }
        }
      }
    } catch (error) {
      console.error('Error processing candle data:', error);
    }
  }

  async processClosedCandle(data) {
    try {
      const { symbol, interval, candle, allCandles } = data;
      
      // Process closed candle for more accurate signals (main intervals only)
      if (this.intervals.includes(interval) && allCandles.length >= this.config.emaPeriods.slow) {
        // Get confirmation data if required
        let confirmationData = null;
        if (this.config.signal.requireConfirmation) {
          confirmationData = this.candlestickProcessor.getCandles(symbol, '1h', 50);
        }
        
        const signal = this.scalpingStrategy.analyzeSignal(symbol, interval, allCandles, confirmationData);
        
        if (signal) {
          console.log(`🎯 Closed candle signal: ${signal.symbol} ${signal.type} (${signal.strength.toFixed(2)})`);
          if (signal.confirmation) {
            console.log(`✅ Confirmed by 1h timeframe (${signal.confirmation.strength.toFixed(2)})`);
          }
        }
      }
    } catch (error) {
      console.error('Error processing closed candle:', error);
    }
  }

  async handleTradingSignal(signal) {
    try {
      // Log the signal
      this.signalLogger.logSignal(signal);
      
      // Emit signal event for external handling
      this.emit('signal', signal);
      
      // Print signal details
      this.printSignalDetails(signal);
      
    } catch (error) {
      console.error('Error handling trading signal:', error);
    }
  }

  printSignalDetails(signal) {
    console.log('\n' + '='.repeat(60));
    console.log(`🎯 TRADING SIGNAL - ${signal.symbol}`);
    console.log('='.repeat(60));
    console.log(`Type: ${signal.type}`);
    console.log(`Strength: ${(signal.strength * 100).toFixed(1)}%`);
    console.log(`Price: $${signal.price.toFixed(4)}`);
    console.log(`Entry: $${signal.entry.toFixed(4)}`);
    console.log(`Stop Loss: $${signal.stopLoss.toFixed(4)}`);
    console.log(`Take Profit: $${signal.takeProfit.toFixed(4)}`);
    console.log(`Risk/Reward: 1:${signal.riskReward.toFixed(2)}`);
    console.log(`Time: ${signal.timestamp.toISOString()}`);
    
    // Show confirmation info if available
    if (signal.confirmation) {
      console.log('\n✅ Confirmation (1h timeframe):');
      console.log(`   Signal: ${signal.confirmation.signal}`);
      console.log(`   Strength: ${(signal.confirmation.strength * 100).toFixed(1)}%`);
      console.log(`   EMA9: $${signal.confirmation.analysis.ema9.toFixed(4)}`);
      console.log(`   EMA21: $${signal.confirmation.analysis.ema21.toFixed(4)}`);
      console.log(`   RSI: ${signal.confirmation.analysis.rsi.toFixed(1)}`);
    }
    
    console.log('\n📊 Technical Analysis (5m):');
    console.log(`EMA9: $${signal.analysis.ema9.toFixed(4)}`);
    console.log(`EMA21: $${signal.analysis.ema21.toFixed(4)}`);
    console.log(`EMA50: $${signal.analysis.ema50.toFixed(4)}`);
    console.log(`RSI: ${signal.analysis.rsi.toFixed(1)}`);
    console.log(`MACD: ${signal.analysis.macd.toFixed(6)}`);
    console.log(`MACD Signal: ${signal.analysis.macdSignal.toFixed(6)}`);
    console.log(`MACD Histogram: ${signal.analysis.macdHistogram.toFixed(6)}`);
    console.log(`Volatility: ${signal.analysis.volatility?.toFixed(2)}%`);
    console.log(`Momentum: ${signal.analysis.momentum?.toFixed(2)}%`);
    console.log('='.repeat(60) + '\n');
  }

  async start() {
    try {
      console.log('🚀 Starting Crypto Trading Bot...');
      console.log(`Strategy: ${this.strategy.toUpperCase()}`);
      console.log(`Symbols: ${this.symbols.join(', ')}`);
      console.log(`Intervals: ${this.intervals.join(', ')}`);
      
      // Connect to WebSocket
      this.webSocket.connect();
      
      this.isRunning = true;
      console.log('✅ Trading bot started successfully');
      
      // Start signal monitoring
      this.startSignalMonitoring();
      
    } catch (error) {
      console.error('❌ Failed to start trading bot:', error);
      throw error;
    }
  }

  async stop() {
    try {
      console.log('🛑 Stopping Crypto Trading Bot...');
      
      this.isRunning = false;
      
      // Flush any remaining signals
      await this.signalLogger.forceFlush();
      
      // Disconnect WebSocket
      this.webSocket.disconnect();
      
      console.log('✅ Trading bot stopped successfully');
      
    } catch (error) {
      console.error('❌ Error stopping trading bot:', error);
    }
  }

  startSignalMonitoring() {
    // Monitor signals every 5 seconds
    const monitoringInterval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(monitoringInterval);
        return;
      }
      
      try {
        const stats = await this.signalLogger.getSignalStats();
        console.log(`📊 Signal Stats: Total: ${stats.total}, Buy: ${stats.buySignals}, Sell: ${stats.sellSignals}, Avg Strength: ${stats.avgStrength.toFixed(2)}`);
      } catch (error) {
        console.error('Error monitoring signals:', error);
      }
    }, 5000);
  }

  async getRecentSignals(symbol = null, limit = 20) {
    try {
      return await this.signalLogger.getRecentSignals(symbol, limit);
    } catch (error) {
      console.error('Error getting recent signals:', error);
      throw error;
    }
  }

  async getSignalStats() {
    try {
      return await this.signalLogger.getSignalStats();
    } catch (error) {
      console.error('Error getting signal stats:', error);
      throw error;
    }
  }

  async analyzePerformance(symbol = null, days = 7) {
    try {
      return await this.signalLogger.analyzeSignalPerformance(symbol, days);
    } catch (error) {
      console.error('Error analyzing performance:', error);
      throw error;
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      strategy: this.strategy,
      symbols: this.symbols,
      intervals: this.intervals,
      webSocketStatus: this.webSocket.getStatus(),
      signalLoggerStatus: this.signalLogger.getBufferStatus()
    };
  }

  // Add symbol to monitoring
  addSymbol(symbol) {
    this.webSocket.addSymbol(symbol);
    if (!this.symbols.includes(symbol)) {
      this.symbols.push(symbol);
    }
  }

  // Remove symbol from monitoring
  removeSymbol(symbol) {
    this.webSocket.removeSymbol(symbol);
    const index = this.symbols.indexOf(symbol);
    if (index > -1) {
      this.symbols.splice(index, 1);
    }
  }
}

module.exports = CryptoTradingBot;
