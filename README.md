# Live Stream Crypto Trading Bot

A comprehensive Node.js crypto trading signal bot with Binance WebSocket integration, real-time candlestick data processing, and EMA-based scalping strategies.

## 🚀 Features

- **Real-time Data**: Binance WebSocket integration for live candlestick data
- **Technical Analysis**: EMA, RSI, MACD indicators with custom calculations
- **Scalping Strategy**: Advanced scalping signal generation with risk management
- **Database Storage**: MySQL integration with Knex query builder
- **Signal Logging**: Comprehensive signal tracking and analysis
- **Express API**: RESTful API for signal monitoring and management
- **Configuration**: Flexible trading pair and strategy configuration

## 📦 Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp env.example .env
   # Update database credentials in .env
   ```

3. **Start the application:**
   ```bash
   # Start Express API server
   npm start
   
   # Start trading bot
   npm run trading
   
   # Development mode with auto-restart
   npm run dev
   npm run trading:dev
   ```

## 🔧 Configuration

### Environment Variables (.env)
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=live_stream_db

# Server Configuration
NODE_ENV=development
PORT=3000
HOST=localhost

# Application Configuration
APP_NAME=Live Stream API
```

### Trading Configuration
The bot supports multiple trading strategies:

- **Scalping**: Fast EMA-based signals (1m, 3m, 5m intervals)
- **Swing Trading**: Longer-term signals (1h, 4h, 1d intervals)

## 📊 API Endpoints

### Server Endpoints
- `GET /` - Server status
- `GET /health` - Health check with database status
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user

### Trading Signal Endpoints
- `GET /api/signals` - Get recent trading signals
- `GET /api/signals/:symbol` - Get signals for specific symbol
- `GET /api/signals/stats` - Get signal statistics
- `GET /api/signals/performance` - Get performance analysis

## 🎯 Trading Strategy

### Scalping Strategy
The bot uses a sophisticated scalping strategy based on:

- **EMA Crossovers**: 9, 21, 50 period EMAs
- **RSI Analysis**: Overbought/oversold conditions
- **MACD Signals**: Momentum confirmation
- **Risk Management**: Stop loss and take profit levels
- **Signal Strength**: Multi-factor signal scoring

### Signal Generation
Signals are generated when:
1. EMA alignment is favorable
2. RSI is in optimal range
3. MACD confirms momentum
4. Volatility is within acceptable limits
5. Signal strength exceeds threshold

## 🏗️ Architecture

### Core Services
- **BinanceWebSocket**: Real-time data connection
- **CandlestickProcessor**: Data processing and storage
- **TechnicalAnalysis**: Indicator calculations
- **ScalpingStrategy**: Signal generation logic
- **SignalLogger**: Database logging and analysis

### Database Schema
```sql
trading_signals:
- id (primary key)
- signal_id (unique)
- symbol, interval, signal_type
- strength, price, entry_price
- stop_loss, take_profit, risk_reward
- analysis_data (JSON)
- candle_data (JSON)
- timestamps
```

## 🚀 Usage

### Start Trading Bot
```bash
# Production mode
npm run trading

# Development mode with auto-restart
npm run trading:dev
```

### Monitor Signals
The bot will automatically:
- Connect to Binance WebSocket
- Process real-time candlestick data
- Generate trading signals
- Log signals to database
- Display signal details in console

### Signal Output Example
```
🎯 TRADING SIGNAL - BTCUSDT
============================================================
Type: BUY
Strength: 85.2%
Price: $43,250.50
Entry: $43,250.50
Stop Loss: $43,035.25
Take Profit: $43,682.00
Risk/Reward: 1:2.00
Time: 2024-01-15T10:30:00.000Z

📊 Technical Analysis:
EMA9: $43,245.30
EMA21: $43,200.15
EMA50: $43,100.80
RSI: 45.2
MACD: 0.001250
MACD Signal: 0.000980
MACD Histogram: 0.000270
Volatility: 2.1%
Momentum: 1.2%
============================================================
```

## 📈 Performance Monitoring

### Signal Statistics
- Total signals generated
- Buy vs Sell signal ratio
- Average signal strength
- Performance by symbol
- Time-based analysis

### Risk Management
- Stop loss: 0.5% (scalping) / 2.0% (swing)
- Take profit: 1.0% (scalping) / 4.0% (swing)
- Maximum daily trades
- Position sizing rules

## 🔧 Customization

### Add New Trading Pairs
```javascript
// In config/trading.js
symbols: [
  'BTCUSDT',
  'ETHUSDT',
  'YOUR_SYMBOL'
]
```

### Modify Strategy Parameters
```javascript
// In config/trading.js
scalping: {
  emaPeriods: { fast: 9, medium: 21, slow: 50 },
  rsi: { period: 14, overbought: 70, oversold: 30 },
  risk: { stopLossPercent: 0.5, takeProfitPercent: 1.0 }
}
```

### Add Custom Indicators
```javascript
// In services/TechnicalAnalysis.js
calculateCustomIndicator(prices, period) {
  // Your custom indicator logic
}
```

## 🛡️ Risk Disclaimer

This is a trading signal bot for educational purposes. Always:
- Test strategies on paper trading first
- Never risk more than you can afford to lose
- Understand the risks of automated trading
- Monitor the bot's performance regularly
- Use proper risk management

## 📝 License

ISC License - see package.json for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

For issues and questions:
1. Check the documentation
2. Review the code comments
3. Test with paper trading first
4. Monitor logs for errors

---

**Happy Trading! 🚀📈**