const BinanceWebSocket = require('../services/BinanceWebSocket');
const CandlestickProcessor = require('../services/CandlestickProcessor');

class WebSocketTester {
  constructor() {
    this.webSocket = new BinanceWebSocket(['BTCUSDT'], ['1m']);
    this.candlestickProcessor = new CandlestickProcessor();
    this.dataReceived = 0;
    this.lastDataTime = null;
    this.startTime = Date.now();
  }

  async testConnection() {
    console.log('🔍 Testing Binance WebSocket Connection...\n');
    
    // Set up event handlers
    this.webSocket.on('connected', () => {
      console.log('✅ WebSocket connected successfully');
      console.log('📡 Listening for real-time data...\n');
    });

    this.webSocket.on('disconnected', () => {
      console.log('❌ WebSocket disconnected');
    });

    this.webSocket.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    this.webSocket.on('kline', (klineData) => {
      this.handleKlineData(klineData);
    });

    // Connect to WebSocket
    this.webSocket.connect();

    // Set up monitoring
    this.startMonitoring();
  }

  handleKlineData(klineData) {
    this.dataReceived++;
    this.lastDataTime = new Date();
    
    const { symbol, interval, kline } = klineData;
    
    console.log(`📊 Data #${this.dataReceived} - ${symbol} ${interval}`);
    console.log(`   Time: ${kline.openTimeFormatted.toLocaleString()}`);
    console.log(`   OHLC: O:$${kline.open} H:$${kline.high} L:$${kline.low} C:$${kline.close}`);
    console.log(`   Volume: ${kline.volume}`);
    console.log(`   Closed: ${kline.isClosed ? 'Yes' : 'No'}`);
    console.log('   ' + '-'.repeat(50));
    
    // Process the data
    this.candlestickProcessor.processKline(klineData);
  }

  startMonitoring() {
    // Show status every 10 seconds
    const statusInterval = setInterval(() => {
      const now = Date.now();
      const uptime = Math.floor((now - this.startTime) / 1000);
      const timeSinceLastData = this.lastDataTime 
        ? Math.floor((now - this.lastDataTime.getTime()) / 1000)
        : 'N/A';
      
      console.log(`\n📊 WebSocket Status - Uptime: ${uptime}s`);
      console.log(`Data Received: ${this.dataReceived} messages`);
      console.log(`Last Data: ${timeSinceLastData}s ago`);
      console.log(`Connection: ${this.webSocket.getStatus().isConnected ? 'Connected' : 'Disconnected'}`);
      console.log('-'.repeat(50));
      
      // If no data received for 30 seconds, show warning
      if (this.lastDataTime && timeSinceLastData > 30) {
        console.log('⚠️  Warning: No data received for 30+ seconds');
      }
    }, 10000);

    // Show candlestick processor stats every 30 seconds
    const statsInterval = setInterval(() => {
      const stats = this.candlestickProcessor.getStats();
      console.log('\n📈 Candlestick Processor Stats:');
      Object.entries(stats).forEach(([symbol, data]) => {
        Object.entries(data).forEach(([interval, info]) => {
          console.log(`  ${symbol} ${interval}: ${info.candleCount} candles, Live: ${info.isLive}`);
        });
      });
    }, 30000);

    // Cleanup on exit
    process.on('SIGINT', () => {
      clearInterval(statusInterval);
      clearInterval(statsInterval);
      this.webSocket.disconnect();
      process.exit(0);
    });
  }

  // Test specific symbols and intervals
  async testMultipleStreams() {
    console.log('🔍 Testing Multiple Streams...\n');
    
    // Disconnect current connection
    this.webSocket.disconnect();
    
    // Create new connection with multiple symbols and intervals
    this.webSocket = new BinanceWebSocket(
      ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'], 
      ['1m', '5m']
    );
    
    // Set up handlers
    this.webSocket.on('connected', () => {
      console.log('✅ Multi-stream WebSocket connected');
    });
    
    this.webSocket.on('kline', (klineData) => {
      const { symbol, interval } = klineData;
      console.log(`📊 ${symbol} ${interval} - Price: $${klineData.kline.close}`);
    });
    
    this.webSocket.connect();
  }

  // Test connection stability
  async testStability(duration = 60000) {
    console.log(`🔍 Testing Connection Stability for ${duration/1000}s...\n`);
    
    const startTime = Date.now();
    const initialDataCount = this.dataReceived;
    
    const testInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const dataRate = this.dataReceived - initialDataCount;
      
      console.log(`⏱️  Test Progress: ${Math.floor(elapsed/1000)}s elapsed`);
      console.log(`📊 Data Rate: ${dataRate} messages received`);
      console.log(`🔄 Connection: ${this.webSocket.getStatus().isConnected ? 'Stable' : 'Disconnected'}`);
      console.log('-'.repeat(30));
      
      if (elapsed >= duration) {
        clearInterval(testInterval);
        console.log('\n✅ Stability test completed');
        console.log(`📊 Total messages received: ${this.dataReceived - initialDataCount}`);
        console.log(`📈 Average rate: ${((this.dataReceived - initialDataCount) / (duration/1000)).toFixed(2)} msg/sec`);
      }
    }, 5000);
  }
}

// Main function
async function main() {
  const tester = new WebSocketTester();
  
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case 'multi':
        await tester.testMultipleStreams();
        break;
      case 'stability':
        await tester.testStability(parseInt(args[1]) || 60000);
        break;
      default:
        await tester.testConnection();
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

if (require.main === module) {
  main();
}

module.exports = WebSocketTester;
