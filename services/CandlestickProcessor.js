const EventEmitter = require('events');

class CandlestickProcessor extends EventEmitter {
  constructor() {
    super();
    this.candlesticks = new Map(); // symbol -> interval -> array of candles
    this.maxCandles = 200; // Keep last 200 candles for each symbol/interval
  }

  processKline(klineData) {
    const { symbol, interval, kline } = klineData;
    const key = `${symbol}_${interval}`;
    
    if (!this.candlesticks.has(key)) {
      this.candlesticks.set(key, []);
    }

    const candles = this.candlesticks.get(key);
    
    // Add or update the candle
    this.updateCandle(candles, kline);
    
    // Keep only the last maxCandles
    if (candles.length > this.maxCandles) {
      candles.splice(0, candles.length - this.maxCandles);
    }

    // Emit processed candle data
    this.emit('candleProcessed', {
      symbol,
      interval,
      candle: kline,
      allCandles: [...candles]
    });

    // Emit when candle is closed
    if (kline.isClosed) {
      this.emit('candleClosed', {
        symbol,
        interval,
        candle: kline,
        allCandles: [...candles]
      });
    }
  }

  updateCandle(candles, kline) {
    const lastCandle = candles[candles.length - 1];
    
    // If this is a new candle (different open time) or first candle
    if (!lastCandle || lastCandle.openTime !== kline.openTime) {
      candles.push({
        ...kline,
        timestamp: Date.now()
      });
    } else {
      // Update the existing candle
      const index = candles.length - 1;
      candles[index] = {
        ...kline,
        timestamp: Date.now()
      };
    }
  }

  getCandles(symbol, interval, limit = 50) {
    const key = `${symbol}_${interval}`;
    const candles = this.candlesticks.get(key) || [];
    return candles.slice(-limit);
  }

  getLastCandle(symbol, interval) {
    const candles = this.getCandles(symbol, interval, 1);
    return candles.length > 0 ? candles[0] : null;
  }

  getOHLCV(symbol, interval, limit = 50) {
    const candles = this.getCandles(symbol, interval, limit);
    
    return {
      open: candles.map(c => c.open),
      high: candles.map(c => c.high),
      low: candles.map(c => c.low),
      close: candles.map(c => c.close),
      volume: candles.map(c => c.volume),
      timestamps: candles.map(c => c.openTime)
    };
  }

  getPriceData(symbol, interval, limit = 50) {
    const candles = this.getCandles(symbol, interval, limit);
    return candles.map(c => c.close);
  }

  getVolumeData(symbol, interval, limit = 50) {
    const candles = this.getCandles(symbol, interval, limit);
    return candles.map(c => c.volume);
  }

  getSymbols() {
    const symbols = new Set();
    for (const key of this.candlesticks.keys()) {
      const [symbol] = key.split('_');
      symbols.add(symbol);
    }
    return Array.from(symbols);
  }

  getIntervals(symbol) {
    const intervals = new Set();
    for (const key of this.candlesticks.keys()) {
      if (key.startsWith(`${symbol}_`)) {
        const [, interval] = key.split('_');
        intervals.add(interval);
      }
    }
    return Array.from(intervals);
  }

  clearData(symbol = null, interval = null) {
    if (symbol && interval) {
      const key = `${symbol}_${interval}`;
      this.candlesticks.delete(key);
    } else if (symbol) {
      for (const key of this.candlesticks.keys()) {
        if (key.startsWith(`${symbol}_`)) {
          this.candlesticks.delete(key);
        }
      }
    } else {
      this.candlesticks.clear();
    }
  }

  getStats() {
    const stats = {};
    for (const [key, candles] of this.candlesticks) {
      const [symbol, interval] = key.split('_');
      if (!stats[symbol]) {
        stats[symbol] = {};
      }
      stats[symbol][interval] = {
        candleCount: candles.length,
        lastUpdate: candles.length > 0 ? new Date(candles[candles.length - 1].timestamp) : null,
        isLive: candles.length > 0 ? !candles[candles.length - 1].isClosed : false
      };
    }
    return stats;
  }
}

module.exports = CandlestickProcessor;
