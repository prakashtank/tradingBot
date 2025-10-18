const EventEmitter = require('events');
const TradingSignal = require('../models/TradingSignal');

class SignalLogger extends EventEmitter {
  constructor() {
    super();
    this.logBuffer = [];
    this.bufferSize = 10;
    this.flushInterval = 30000; // 30 seconds
    this.isFlushing = false;
    
    // Start periodic flush
    this.startPeriodicFlush();
  }

  logSignal(signal) {
    try {
      // Add timestamp if not present
      if (!signal.timestamp) {
        signal.timestamp = new Date();
      }
      
      // Add to buffer
      this.logBuffer.push(signal);
      
      // Emit signal logged event
      this.emit('signalLogged', signal);
      
      // Flush if buffer is full
      if (this.logBuffer.length >= this.bufferSize) {
        this.flush();
      }
      
      console.log(`📊 Signal logged: ${signal.symbol} ${signal.type} (${signal.strength.toFixed(2)})`);
      
    } catch (error) {
      console.error('Error logging signal:', error);
      this.emit('error', error);
    }
  }

  async flush() {
    if (this.isFlushing || this.logBuffer.length === 0) {
      return;
    }
    
    this.isFlushing = true;
    
    try {
      const signalsToFlush = [...this.logBuffer];
      this.logBuffer = [];
      
      // Save to database
      const savedSignals = [];
      for (const signal of signalsToFlush) {
        try {
          const savedSignal = await TradingSignal.create(signal);
          savedSignals.push(savedSignal);
        } catch (error) {
          console.error('Error saving signal to database:', error);
          // Re-add to buffer for retry
          this.logBuffer.push(signal);
        }
      }
      
      console.log(`💾 Flushed ${savedSignals.length} signals to database`);
      this.emit('signalsFlushed', savedSignals);
      
    } catch (error) {
      console.error('Error flushing signals:', error);
      this.emit('error', error);
    } finally {
      this.isFlushing = false;
    }
  }

  startPeriodicFlush() {
    setInterval(() => {
      if (this.logBuffer.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  async getRecentSignals(symbol = null, limit = 50) {
    try {
      if (symbol) {
        return await TradingSignal.findBySymbol(symbol, limit);
      } else {
        return await TradingSignal.findAll(limit);
      }
    } catch (error) {
      console.error('Error getting recent signals:', error);
      throw error;
    }
  }

  async getSignalStats() {
    try {
      return await TradingSignal.getStats();
    } catch (error) {
      console.error('Error getting signal stats:', error);
      throw error;
    }
  }

  async getSignalsByTimeRange(startDate, endDate, symbol = null) {
    try {
      return await TradingSignal.getSignalsByTimeRange(startDate, endDate, symbol);
    } catch (error) {
      console.error('Error getting signals by time range:', error);
      throw error;
    }
  }

  async cleanupOldSignals(daysOld = 30) {
    try {
      const deletedCount = await TradingSignal.deleteOldSignals(daysOld);
      console.log(`🧹 Cleaned up ${deletedCount} old signals`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old signals:', error);
      throw error;
    }
  }

  getBufferStatus() {
    return {
      bufferSize: this.logBuffer.length,
      isFlushing: this.isFlushing,
      flushInterval: this.flushInterval
    };
  }

  forceFlush() {
    return this.flush();
  }

  // Real-time signal monitoring
  startSignalMonitoring(symbol = null, interval = 5000) {
    const monitoringInterval = setInterval(async () => {
      try {
        const recentSignals = await this.getRecentSignals(symbol, 10);
        this.emit('signalUpdate', recentSignals);
      } catch (error) {
        console.error('Error in signal monitoring:', error);
      }
    }, interval);
    
    return () => clearInterval(monitoringInterval);
  }

  // Signal analysis
  async analyzeSignalPerformance(symbol = null, days = 7) {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
      
      const signals = await this.getSignalsByTimeRange(startDate, endDate, symbol);
      
      const analysis = {
        totalSignals: signals.length,
        buySignals: signals.filter(s => s.signal_type === 'BUY').length,
        sellSignals: signals.filter(s => s.signal_type === 'SELL').length,
        avgStrength: signals.reduce((sum, s) => sum + s.strength, 0) / signals.length || 0,
        strongSignals: signals.filter(s => s.strength > 0.8).length,
        weakSignals: signals.filter(s => s.strength < 0.4).length,
        bySymbol: signals.reduce((acc, signal) => {
          acc[signal.symbol] = (acc[signal.symbol] || 0) + 1;
          return acc;
        }, {}),
        byHour: signals.reduce((acc, signal) => {
          const hour = new Date(signal.created_at).getHours();
          acc[hour] = (acc[hour] || 0) + 1;
          return acc;
        }, {})
      };
      
      return analysis;
    } catch (error) {
      console.error('Error analyzing signal performance:', error);
      throw error;
    }
  }
}

module.exports = SignalLogger;
