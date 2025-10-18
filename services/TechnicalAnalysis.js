const { EMA, RSI, MACD, SMA } = require('technicalindicators');

class TechnicalAnalysis {
  constructor() {
    this.indicators = {
      EMA,
      RSI,
      MACD,
      SMA
    };
  }

  // EMA (Exponential Moving Average) calculations
  calculateEMA(prices, period) {
    if (prices.length < period) {
      return [];
    }
    
    try {
      return EMA.calculate({
        values: prices,
        period: period
      });
    } catch (error) {
      console.error('Error calculating EMA:', error);
      return [];
    }
  }

  // Multiple EMA calculation for scalping strategy
  calculateMultipleEMA(prices, periods = [9, 21, 50]) {
    const results = {};
    
    periods.forEach(period => {
      results[`EMA${period}`] = this.calculateEMA(prices, period);
    });
    
    return results;
  }

  // RSI (Relative Strength Index) calculation
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) {
      return [];
    }
    
    try {
      return RSI.calculate({
        values: prices,
        period: period
      });
    } catch (error) {
      console.error('Error calculating RSI:', error);
      return [];
    }
  }

  // MACD calculation
  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    if (prices.length < slowPeriod) {
      return [];
    }
    
    try {
      return MACD.calculate({
        values: prices,
        fastPeriod: fastPeriod,
        slowPeriod: slowPeriod,
        signalPeriod: signalPeriod
      });
    } catch (error) {
      console.error('Error calculating MACD:', error);
      return [];
    }
  }

  // SMA (Simple Moving Average) calculation
  calculateSMA(prices, period) {
    if (prices.length < period) {
      return [];
    }
    
    try {
      return SMA.calculate({
        values: prices,
        period: period
      });
    } catch (error) {
      console.error('Error calculating SMA:', error);
      return [];
    }
  }

  // Get latest indicator values
  getLatestValue(indicatorArray) {
    return indicatorArray.length > 0 ? indicatorArray[indicatorArray.length - 1] : null;
  }

  // Get previous indicator values
  getPreviousValue(indicatorArray, periodsBack = 1) {
    const index = indicatorArray.length - 1 - periodsBack;
    return index >= 0 ? indicatorArray[index] : null;
  }

  // Calculate trend direction based on EMA
  getEMATrend(emaValues) {
    if (emaValues.length < 2) {
      return 'neutral';
    }
    
    const current = this.getLatestValue(emaValues);
    const previous = this.getPreviousValue(emaValues);
    
    if (current > previous) {
      return 'bullish';
    } else if (current < previous) {
      return 'bearish';
    } else {
      return 'neutral';
    }
  }

  // Calculate EMA crossover signals
  getEMACrossover(ema1, ema2) {
    if (ema1.length < 2 || ema2.length < 2) {
      return 'none';
    }
    
    const current1 = this.getLatestValue(ema1);
    const current2 = this.getLatestValue(ema2);
    const prev1 = this.getPreviousValue(ema1);
    const prev2 = this.getPreviousValue(ema2);
    
    // Bullish crossover: EMA1 crosses above EMA2
    if (prev1 <= prev2 && current1 > current2) {
      return 'bullish_crossover';
    }
    // Bearish crossover: EMA1 crosses below EMA2
    else if (prev1 >= prev2 && current1 < current2) {
      return 'bearish_crossover';
    }
    
    return 'none';
  }

  // Calculate EMA divergence
  getEMADivergence(ema1, ema2) {
    if (ema1.length < 2 || ema2.length < 2) {
      return 'none';
    }
    
    const current1 = this.getLatestValue(ema1);
    const current2 = this.getLatestValue(ema2);
    const prev1 = this.getPreviousValue(ema1);
    const prev2 = this.getPreviousValue(ema2);
    
    const currentDiff = current1 - current2;
    const prevDiff = prev1 - prev2;
    
    // Increasing divergence (bullish)
    if (currentDiff > prevDiff && currentDiff > 0) {
      return 'increasing_bullish';
    }
    // Decreasing divergence (bearish)
    else if (currentDiff < prevDiff && currentDiff < 0) {
      return 'decreasing_bearish';
    }
    
    return 'none';
  }

  // Calculate support and resistance levels
  calculateSupportResistance(prices, period = 20) {
    if (prices.length < period) {
      return { support: null, resistance: null };
    }
    
    const recentPrices = prices.slice(-period);
    const support = Math.min(...recentPrices);
    const resistance = Math.max(...recentPrices);
    
    return { support, resistance };
  }

  // Calculate price momentum
  calculateMomentum(prices, period = 10) {
    if (prices.length < period + 1) {
      return null;
    }
    
    const current = this.getLatestValue(prices);
    const previous = prices[prices.length - 1 - period];
    
    return ((current - previous) / previous) * 100;
  }

  // Calculate volatility (standard deviation)
  calculateVolatility(prices, period = 20) {
    if (prices.length < period) {
      return null;
    }
    
    const recentPrices = prices.slice(-period);
    const mean = recentPrices.reduce((sum, price) => sum + price, 0) / recentPrices.length;
    const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / recentPrices.length;
    
    return Math.sqrt(variance);
  }

  // Get comprehensive technical analysis
  getComprehensiveAnalysis(prices, config = {}) {
    const {
      emaPeriods = [9, 21, 50],
      rsiPeriod = 14,
      macdConfig = { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
      smaPeriod = 20
    } = config;
    
    const analysis = {
      prices: {
        current: this.getLatestValue(prices),
        previous: this.getPreviousValue(prices),
        change: this.calculateMomentum(prices, 1)
      },
      ema: this.calculateMultipleEMA(prices, emaPeriods),
      rsi: this.calculateRSI(prices, rsiPeriod),
      macd: this.calculateMACD(prices, macdConfig.fastPeriod, macdConfig.slowPeriod, macdConfig.signalPeriod),
      sma: this.calculateSMA(prices, smaPeriod),
      supportResistance: this.calculateSupportResistance(prices),
      momentum: this.calculateMomentum(prices),
      volatility: this.calculateVolatility(prices)
    };
    
    // Add trend analysis
    if (analysis.ema.EMA9 && analysis.ema.EMA21) {
      analysis.trend = {
        ema9: this.getEMATrend(analysis.ema.EMA9),
        ema21: this.getEMATrend(analysis.ema.EMA21),
        crossover: this.getEMACrossover(analysis.ema.EMA9, analysis.ema.EMA21),
        divergence: this.getEMADivergence(analysis.ema.EMA9, analysis.ema.EMA21)
      };
    }
    
    return analysis;
  }
}

module.exports = TechnicalAnalysis;
