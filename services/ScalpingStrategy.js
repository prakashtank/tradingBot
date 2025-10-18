const EventEmitter = require('events');
const TechnicalAnalysis = require('./TechnicalAnalysis');

class ScalpingStrategy extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      // EMA periods for scalping
      fastEMA: 9,
      mediumEMA: 21,
      slowEMA: 50,
      
      // RSI settings
      rsiPeriod: 14,
      rsiOverbought: 70,
      rsiOversold: 30,
      
      // MACD settings
      macdFast: 12,
      macdSlow: 26,
      macdSignal: 9,
      
      // Signal thresholds
      minPriceChange: 0.1, // Minimum price change percentage
      maxVolatility: 5.0,   // Maximum volatility percentage
      
      // Risk management
      stopLossPercent: 0.5,  // 0.5% stop loss
      takeProfitPercent: 1.0, // 1% take profit
      
      // Signal strength requirements
      minSignalStrength: 0.6,
      
      ...config
    };
    
    this.technicalAnalysis = new TechnicalAnalysis();
    this.signalHistory = [];
    this.maxHistorySize = 1000;
  }

  analyzeSignal(symbol, interval, candleData, confirmationData = null) {
    try {
      const prices = candleData.map(c => c.close);
      const volumes = candleData.map(c => c.volume);
      
      if (prices.length < this.config.slowEMA) {
        return null; // Not enough data
      }
      
      // Calculate technical indicators for main timeframe
      const analysis = this.technicalAnalysis.getComprehensiveAnalysis(prices, {
        emaPeriods: [this.config.fastEMA, this.config.mediumEMA, this.config.slowEMA],
        rsiPeriod: this.config.rsiPeriod,
        macdConfig: {
          fastPeriod: this.config.macdFast,
          slowPeriod: this.config.macdSlow,
          signalPeriod: this.config.macdSignal
        }
      });
      
      // Generate signal
      const signal = this.generateSignal(symbol, interval, analysis, candleData);
      
      // Check for confirmation if required
      if (signal && this.config.signal.requireConfirmation && confirmationData) {
        const confirmationSignal = this.checkConfirmation(symbol, confirmationData);
        if (!confirmationSignal) {
          console.log(`❌ Signal for ${symbol} rejected - no confirmation from higher timeframe`);
          return null;
        }
        signal.confirmation = confirmationSignal;
      }
      
      if (signal) {
        this.addToHistory(signal);
        this.emit('signal', signal);
      }
      
      return signal;
      
    } catch (error) {
      console.error(`Error analyzing signal for ${symbol}:`, error);
      return null;
    }
  }

  generateSignal(symbol, interval, analysis, candleData) {
    const currentPrice = analysis.prices.current;
    const previousPrice = analysis.prices.previous;
    const priceChange = analysis.prices.change;
    
    // Check if we have enough data
    if (!analysis.ema.EMA9 || !analysis.ema.EMA21 || !analysis.ema.EMA50) {
      return null;
    }
    
    const ema9 = this.technicalAnalysis.getLatestValue(analysis.ema.EMA9);
    const ema21 = this.technicalAnalysis.getLatestValue(analysis.ema.EMA21);
    const ema50 = this.technicalAnalysis.getLatestValue(analysis.ema.EMA50);
    const rsi = this.technicalAnalysis.getLatestValue(analysis.rsi);
    const macd = this.technicalAnalysis.getLatestValue(analysis.macd);
    
    if (!ema9 || !ema21 || !ema50 || !rsi || !macd) {
      return null;
    }
    
    // Calculate signal strength
    const signalStrength = this.calculateSignalStrength(
      currentPrice, ema9, ema21, ema50, rsi, macd, analysis
    );
    
    // Check minimum signal strength
    if (signalStrength < this.config.minSignalStrength) {
      return null;
    }
    
    // Determine signal type
    const signalType = this.determineSignalType(
      currentPrice, ema9, ema21, ema50, rsi, macd, analysis
    );
    
    if (signalType === 'none') {
      return null;
    }
    
    // Calculate entry, stop loss, and take profit levels
    const levels = this.calculateLevels(currentPrice, signalType);
    
    // Create signal object
    const signal = {
      id: this.generateSignalId(),
      symbol,
      interval,
      timestamp: new Date(),
      type: signalType,
      strength: signalStrength,
      price: currentPrice,
      entry: levels.entry,
      stopLoss: levels.stopLoss,
      takeProfit: levels.takeProfit,
      riskReward: levels.riskReward,
      analysis: {
        ema9,
        ema21,
        ema50,
        rsi,
        macd: macd.MACD,
        macdSignal: macd.signal,
        macdHistogram: macd.histogram,
        volatility: analysis.volatility,
        momentum: analysis.momentum,
        trend: analysis.trend
      },
      candle: candleData[candleData.length - 1]
    };
    
    return signal;
  }

  calculateSignalStrength(price, ema9, ema21, ema50, rsi, macd, analysis) {
    let strength = 0;
    let factors = 0;
    
    // EMA alignment factor (0-1)
    const emaAlignment = this.calculateEMAAlignment(price, ema9, ema21, ema50);
    strength += emaAlignment;
    factors++;
    
    // RSI factor (0-1)
    const rsiFactor = this.calculateRSIFactor(rsi);
    strength += rsiFactor;
    factors++;
    
    // MACD factor (0-1)
    const macdFactor = this.calculateMACDFactor(macd);
    strength += macdFactor;
    factors++;
    
    // Momentum factor (0-1)
    const momentumFactor = this.calculateMomentumFactor(analysis.momentum);
    strength += momentumFactor;
    factors++;
    
    // Volatility factor (0-1)
    const volatilityFactor = this.calculateVolatilityFactor(analysis.volatility);
    strength += volatilityFactor;
    factors++;
    
    return factors > 0 ? strength / factors : 0;
  }

  calculateEMAAlignment(price, ema9, ema21, ema50) {
    let alignment = 0;
    
    // Bullish alignment: price > ema9 > ema21 > ema50
    if (price > ema9 && ema9 > ema21 && ema21 > ema50) {
      alignment = 1.0;
    }
    // Bearish alignment: price < ema9 < ema21 < ema50
    else if (price < ema9 && ema9 < ema21 && ema21 < ema50) {
      alignment = 1.0;
    }
    // Partial alignment
    else {
      const bullishFactors = [
        price > ema9 ? 1 : 0,
        ema9 > ema21 ? 1 : 0,
        ema21 > ema50 ? 1 : 0
      ];
      
      const bearishFactors = [
        price < ema9 ? 1 : 0,
        ema9 < ema21 ? 1 : 0,
        ema21 < ema50 ? 1 : 0
      ];
      
      const bullishScore = bullishFactors.reduce((sum, factor) => sum + factor, 0) / 3;
      const bearishScore = bearishFactors.reduce((sum, factor) => sum + factor, 0) / 3;
      
      alignment = Math.max(bullishScore, bearishScore);
    }
    
    return alignment;
  }

  calculateRSIFactor(rsi) {
    // RSI in oversold/overbought zones
    if (rsi < this.config.rsiOversold || rsi > this.config.rsiOverbought) {
      return 1.0;
    }
    // RSI in neutral zone
    else if (rsi >= 40 && rsi <= 60) {
      return 0.5;
    }
    // RSI trending
    else {
      return 0.7;
    }
  }

  calculateMACDFactor(macd) {
    const { MACD, signal, histogram } = macd;
    
    // Strong MACD signal
    if (Math.abs(histogram) > 0.001) {
      return 1.0;
    }
    // MACD above/below signal line
    else if (Math.abs(MACD - signal) > 0.0005) {
      return 0.7;
    }
    // Weak signal
    else {
      return 0.3;
    }
  }

  calculateMomentumFactor(momentum) {
    if (!momentum) return 0.5;
    
    // Strong momentum
    if (Math.abs(momentum) > 1.0) {
      return 1.0;
    }
    // Moderate momentum
    else if (Math.abs(momentum) > 0.5) {
      return 0.7;
    }
    // Weak momentum
    else {
      return 0.3;
    }
  }

  calculateVolatilityFactor(volatility) {
    if (!volatility) return 0.5;
    
    // Optimal volatility for scalping (1-3%)
    if (volatility >= 1.0 && volatility <= 3.0) {
      return 1.0;
    }
    // Acceptable volatility
    else if (volatility >= 0.5 && volatility <= 5.0) {
      return 0.7;
    }
    // Too low or too high volatility
    else {
      return 0.2;
    }
  }

  determineSignalType(price, ema9, ema21, ema50, rsi, macd, analysis) {
    const { MACD, signal, histogram } = macd;
    
    // Bullish conditions
    const bullishConditions = [
      price > ema9,
      ema9 > ema21,
      rsi < this.config.rsiOverbought,
      MACD > signal,
      histogram > 0,
      analysis.momentum > 0
    ];
    
    // Bearish conditions
    const bearishConditions = [
      price < ema9,
      ema9 < ema21,
      rsi > this.config.rsiOversold,
      MACD < signal,
      histogram < 0,
      analysis.momentum < 0
    ];
    
    const bullishScore = bullishConditions.reduce((sum, condition) => sum + (condition ? 1 : 0), 0);
    const bearishScore = bearishConditions.reduce((sum, condition) => sum + (condition ? 1 : 0), 0);
    
    // Require at least 4 out of 6 conditions to be met
    if (bullishScore >= 4) {
      return 'BUY';
    } else if (bearishScore >= 4) {
      return 'SELL';
    }
    
    return 'none';
  }

  calculateLevels(currentPrice, signalType) {
    const entry = currentPrice;
    let stopLoss, takeProfit;
    
    if (signalType === 'BUY') {
      stopLoss = entry * (1 - this.config.stopLossPercent / 100);
      takeProfit = entry * (1 + this.config.takeProfitPercent / 100);
    } else if (signalType === 'SELL') {
      stopLoss = entry * (1 + this.config.stopLossPercent / 100);
      takeProfit = entry * (1 - this.config.takeProfitPercent / 100);
    }
    
    const risk = Math.abs(entry - stopLoss);
    const reward = Math.abs(takeProfit - entry);
    const riskReward = risk > 0 ? reward / risk : 0;
    
    return {
      entry,
      stopLoss,
      takeProfit,
      riskReward
    };
  }

  generateSignalId() {
    return `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  addToHistory(signal) {
    this.signalHistory.push(signal);
    
    if (this.signalHistory.length > this.maxHistorySize) {
      this.signalHistory.splice(0, this.signalHistory.length - this.maxHistorySize);
    }
  }

  getSignalHistory(limit = 50) {
    return this.signalHistory.slice(-limit);
  }

  getSignalStats() {
    const total = this.signalHistory.length;
    const buySignals = this.signalHistory.filter(s => s.type === 'BUY').length;
    const sellSignals = this.signalHistory.filter(s => s.type === 'SELL').length;
    const avgStrength = this.signalHistory.reduce((sum, s) => sum + s.strength, 0) / total;
    
    return {
      total,
      buySignals,
      sellSignals,
      avgStrength: avgStrength || 0,
      lastSignal: this.signalHistory[this.signalHistory.length - 1] || null
    };
  }

  checkConfirmation(symbol, confirmationData) {
    try {
      const prices = confirmationData.map(c => c.close);
      
      if (prices.length < this.config.slowEMA) {
        return null; // Not enough confirmation data
      }
      
      // Calculate technical indicators for confirmation timeframe
      const confirmationAnalysis = this.technicalAnalysis.getComprehensiveAnalysis(prices, {
        emaPeriods: [this.config.fastEMA, this.config.mediumEMA, this.config.slowEMA],
        rsiPeriod: this.config.rsiPeriod,
        macdConfig: {
          fastPeriod: this.config.macdFast,
          slowPeriod: this.config.macdSlow,
          signalPeriod: this.config.macdSignal
        }
      });
      
      // Check if confirmation timeframe supports the signal
      const confirmationSignal = this.determineSignalType(
        confirmationAnalysis.prices.current,
        this.technicalAnalysis.getLatestValue(confirmationAnalysis.ema.EMA9),
        this.technicalAnalysis.getLatestValue(confirmationAnalysis.ema.EMA21),
        this.technicalAnalysis.getLatestValue(confirmationAnalysis.ema.EMA50),
        this.technicalAnalysis.getLatestValue(confirmationAnalysis.rsi),
        this.technicalAnalysis.getLatestValue(confirmationAnalysis.macd),
        confirmationAnalysis
      );
      
      // Calculate confirmation strength
      const confirmationStrength = this.calculateSignalStrength(
        confirmationAnalysis.prices.current,
        this.technicalAnalysis.getLatestValue(confirmationAnalysis.ema.EMA9),
        this.technicalAnalysis.getLatestValue(confirmationAnalysis.ema.EMA21),
        this.technicalAnalysis.getLatestValue(confirmationAnalysis.ema.EMA50),
        this.technicalAnalysis.getLatestValue(confirmationAnalysis.rsi),
        this.technicalAnalysis.getLatestValue(confirmationAnalysis.macd),
        confirmationAnalysis
      );
      
      return {
        signal: confirmationSignal,
        strength: confirmationStrength,
        analysis: confirmationAnalysis,
        timeframe: '1h'
      };
      
    } catch (error) {
      console.error(`Error checking confirmation for ${symbol}:`, error);
      return null;
    }
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('📊 Strategy configuration updated:', this.config);
  }
}

module.exports = ScalpingStrategy;
