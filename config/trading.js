// Trading Configuration
const tradingConfig = {
  // Supported trading pairs
  symbols: [
    'TRXUSDT',
    'ADAUSDT',
    'ETCUSDT',
    'BNBUSDT',
    'SOLUSDT',
    'ETHUSDT',
    'BTCUSDT',
    'XRPUSDT'
  ],

  // Supported time intervals
  intervals: [
    '1m',   // 1 minute
    '3m',   // 3 minutes
    '5m',   // 5 minutes
    '15m',  // 15 minutes
    '30m',  // 30 minutes
    '1h',   // 1 hour
    '2h',   // 2 hours
    '4h',   // 4 hours
    '6h',   // 6 hours
    '8h',   // 8 hours
    '12h',  // 12 hours
    '1d',   // 1 day
    '3d',   // 3 days
    '1w',   // 1 week
    '1M'    // 1 month
  ],

  // Scalping strategy configuration
  scalping: {
    // Primary symbols for scalping (high volume, tight spreads)
    primarySymbols: ['TRXUSDT', 'ADAUSDT', 'ETCUSDT', 'BNBUSDT', 'SOLUSDT', 'ETHUSDT', 'BTCUSDT', 'XRPUSDT'],
    
    // Scalping timeframes (fast intervals)
    scalpingIntervals: ['5m'],
    
    // Confirmation timeframes (higher timeframes for confirmation)
    confirmationIntervals: ['1h'],
    
    // EMA periods for scalping
    emaPeriods: {
      fast: 9,
      medium: 21,
      slow: 50
    },
    
    // RSI settings
    rsi: {
      period: 14,
      overbought: 70,
      oversold: 30
    },
    
    // MACD settings
    macd: {
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9
    },
    
    // Risk management
    risk: {
      stopLossPercent: 0.5,    // 0.5% stop loss
      takeProfitPercent: 1.0,   // 1% take profit
      maxRiskPerTrade: 1.0,     // 1% of account
      maxDailyTrades: 50
    },
    
    // Signal requirements
    signal: {
      minStrength: 0.6,         // Minimum signal strength
      minPriceChange: 0.1,       // Minimum price change %
      maxVolatility: 5.0,       // Maximum volatility %
      confirmationCandles: 2,    // Candles to confirm signal
      requireConfirmation: true, // Require higher timeframe confirmation
      confirmationStrength: 0.5  // Minimum confirmation signal strength
    }
  },

  // Swing trading configuration
  swing: {
    // Symbols for swing trading
    primarySymbols: ['TRXUSDT', 'ADAUSDT', 'ETCUSDT', 'BNBUSDT', 'SOLUSDT', 'ETHUSDT', 'BTCUSDT', 'XRPUSDT'],
    
    // Swing timeframes
    swingIntervals: ['1h', '4h', '1d'],
    
    // EMA periods for swing trading
    emaPeriods: {
      fast: 12,
      medium: 26,
      slow: 50
    },
    
    // Risk management
    risk: {
      stopLossPercent: 2.0,      // 2% stop loss
      takeProfitPercent: 4.0,    // 4% take profit
      maxRiskPerTrade: 2.0,      // 2% of account
      maxDailyTrades: 10
    },
    
    // Signal requirements
    signal: {
      minStrength: 0.7,         // Minimum signal strength
      minPriceChange: 0.5,       // Minimum price change %
      maxVolatility: 10.0,      // Maximum volatility %
      confirmationCandles: 3     // Candles to confirm signal
    }
  },

  // Position sizing
  positionSizing: {
    // Fixed position size (in USDT)
    fixed: 100,
    
    // Percentage of account balance
    percentage: 1.0,
    
    // Kelly Criterion (advanced)
    kelly: false,
    
    // Maximum position size
    maxPosition: 1000
  },

  // Market conditions
  marketConditions: {
    // Minimum volume requirements (24h)
    minVolume: {
      'BTCUSDT': 1000000,
      'ETHUSDT': 500000,
      'BNBUSDT': 200000,
      'TRXUSDT': 300000,
      'ADAUSDT': 250000,
      'ETCUSDT': 150000,
      'SOLUSDT': 200000,
      'XRPUSDT': 300000,
      'default': 100000
    },
    
    // Maximum spread requirements
    maxSpread: 0.1, // 0.1%
    
    // Market hours (UTC)
    tradingHours: {
      start: 0,    // 00:00 UTC
      end: 24      // 24:00 UTC
    }
  },

  // Notification settings
  notifications: {
    // Signal notifications
    signalAlerts: true,
    
    // Error notifications
    errorAlerts: true,
    
    // Performance notifications
    performanceAlerts: true,
    
    // Notification channels
    channels: ['console', 'database'] // 'email', 'webhook', 'telegram'
  },

  // Database settings
  database: {
    // Signal retention (days)
    signalRetention: 30,
    
    // Performance data retention (days)
    performanceRetention: 90,
    
    // Cleanup interval (hours)
    cleanupInterval: 24
  },

  // WebSocket settings
  websocket: {
    // Reconnection settings
    maxReconnectAttempts: 5,
    reconnectDelay: 5000,
    
    // Ping interval (ms)
    pingInterval: 30000,
    
    // Connection timeout (ms)
    connectionTimeout: 10000
  },

  // Logging settings
  logging: {
    // Log levels
    level: 'info', // 'debug', 'info', 'warn', 'error'
    
    // Log file settings
    file: {
      enabled: true,
      maxSize: '10MB',
      maxFiles: 5
    },
    
    // Console settings
    console: {
      enabled: true,
      colors: true
    }
  }
};

// Get configuration for specific strategy
function getStrategyConfig(strategy = 'scalping') {
  return tradingConfig[strategy] || tradingConfig.scalping;
}

// Get symbols for specific strategy
function getSymbolsForStrategy(strategy = 'scalping') {
  const config = getStrategyConfig(strategy);
  return config.primarySymbols || tradingConfig.symbols;
}

// Get intervals for specific strategy
function getIntervalsForStrategy(strategy = 'scalping') {
  const config = getStrategyConfig(strategy);
  return config.scalpingIntervals || config.swingIntervals || ['1m', '5m'];
}

// Validate symbol
function isValidSymbol(symbol) {
  return tradingConfig.symbols.includes(symbol.toUpperCase());
}

// Validate interval
function isValidInterval(interval) {
  return tradingConfig.intervals.includes(interval);
}

// Get market condition requirements
function getMarketRequirements(symbol) {
  const requirements = tradingConfig.marketConditions.minVolume;
  return requirements[symbol] || requirements.default;
}

module.exports = {
  tradingConfig,
  getStrategyConfig,
  getSymbolsForStrategy,
  getIntervalsForStrategy,
  isValidSymbol,
  isValidInterval,
  getMarketRequirements
};
