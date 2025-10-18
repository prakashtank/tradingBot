const WebSocket = require('ws');
const EventEmitter = require('events');

class BinanceWebSocket extends EventEmitter {
  constructor(symbols = ['BTCUSDT'], intervals = ['1m']) {
    super();
    this.symbols = symbols;
    this.intervals = intervals;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;
    this.isConnected = false;
    this.pingInterval = null;
  }

  connect() {
    try {
      // Create stream names for kline data
      const streams = this.symbols.flatMap(symbol => 
        this.intervals.map(interval => `${symbol.toLowerCase()}@kline_${interval}`)
      );

      const streamNames = streams.join('/');
      const wsUrl = `wss://fstream.binance.com/stream?streams=${streamNames}`;
      
      console.log(`🔌 Connecting to Binance WebSocket: ${wsUrl}`);
      
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        console.log('✅ Binance WebSocket connected successfully');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
        this.startPing();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handleMessage(message);
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      });

      this.ws.on('close', (code, reason) => {
        console.log(`🔌 WebSocket closed: ${code} - ${reason}`);
        this.isConnected = false;
        this.stopPing();
        this.emit('disconnected');
        this.handleReconnect();
      });

      this.ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        this.emit('error', error);
      });

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      this.emit('error', error);
    }
  }

  handleMessage(message) {
    if (message.stream && message.data) {
      const { stream, data } = message;
      
      // Parse kline data
      if (stream.includes('@kline_')) {
        const klineData = this.parseKlineData(data);
        this.emit('kline', {
          symbol: klineData.symbol,
          interval: klineData.interval,
          kline: klineData
        });
      }
    }
  }

  parseKlineData(data) {
    const kline = data.k;
    return {
      symbol: kline.s,
      interval: kline.i,
      openTime: kline.t,
      closeTime: kline.T,
      open: parseFloat(kline.o),
      high: parseFloat(kline.h),
      low: parseFloat(kline.l),
      close: parseFloat(kline.c),
      volume: parseFloat(kline.v),
      quoteVolume: parseFloat(kline.q),
      trades: kline.n,
      isClosed: kline.x, // true if kline is closed
      openTimeFormatted: new Date(kline.t),
      closeTimeFormatted: new Date(kline.T)
    };
  }

  startPing() {
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000); // Ping every 30 seconds
  }

  stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectDelay}ms`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay);
    } else {
      console.error('❌ Max reconnection attempts reached');
      this.emit('maxReconnectAttemptsReached');
    }
  }

  disconnect() {
    console.log('🔌 Disconnecting from Binance WebSocket');
    this.stopPing();
    if (this.ws) {
      this.ws.close();
    }
    this.isConnected = false;
  }

  addSymbol(symbol) {
    if (!this.symbols.includes(symbol)) {
      this.symbols.push(symbol);
      console.log(`➕ Added symbol: ${symbol}`);
    }
  }

  removeSymbol(symbol) {
    const index = this.symbols.indexOf(symbol);
    if (index > -1) {
      this.symbols.splice(index, 1);
      console.log(`➖ Removed symbol: ${symbol}`);
    }
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      symbols: this.symbols,
      intervals: this.intervals,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

module.exports = BinanceWebSocket;
