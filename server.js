const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

const { db, testConnection } = require('./config/db');
const User = require('./models/User');
const TradingSignal = require('./models/TradingSignal');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
})); // Security headers with CSP
app.use(cors()); // Enable CORS
app.use(morgan('combined')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const isConnected = await testConnection();
    res.status(isConnected ? 200 : 503).json({
      status: isConnected ? 'healthy' : 'unhealthy',
      database: isConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// System status endpoint
app.get('/api/status', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    
    res.json({
      success: true,
      data: {
        bot: 'running', // Bot status
        websocket: 'connected', // WebSocket status
        database: dbConnected ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// User routes
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.findAll();
    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, email } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name and email are required'
      });
    }

    const user = await User.create({ name, email });
    res.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Trading Signal API endpoints
app.get('/api/signals', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const signals = await TradingSignal.findAll(limit, offset);
    
    res.json({
      success: true,
      data: signals,
      count: signals.length,
      limit,
      offset
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/signals/stats', async (req, res) => {
  try {
    const stats = await TradingSignal.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/signals/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const limit = parseInt(req.query.limit) || 50;
    const signals = await TradingSignal.findBySymbol(symbol, limit);
    
    res.json({
      success: true,
      data: signals,
      count: signals.length,
      symbol
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/signals/type/:type', async (req, res) => {
  try {
    const type = req.params.type.toUpperCase();
    const limit = parseInt(req.query.limit) || 50;
    const signals = await TradingSignal.findByType(type, limit);
    
    res.json({
      success: true,
      data: signals,
      count: signals.length,
      type
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/signals/performance/:days', async (req, res) => {
  try {
    const days = parseInt(req.params.days) || 7;
    const symbol = req.query.symbol;
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));
    
    const signals = await TradingSignal.getSignalsByTimeRange(startDate, endDate, symbol);
    
    const analysis = {
      totalSignals: signals.length,
      buySignals: signals.filter(s => s.signal_type === 'BUY').length,
      sellSignals: signals.filter(s => s.signal_type === 'SELL').length,
      avgStrength: signals.reduce((sum, s) => sum + s.strength, 0) / signals.length || 0,
      strongSignals: signals.filter(s => s.strength > 0.8).length,
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
    
    res.json({
      success: true,
      data: analysis,
      period: `${days} days`,
      symbol: symbol || 'all'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Bot control endpoints
app.post('/api/bot/start', async (req, res) => {
  try {
    // In a real implementation, you would start the trading bot here
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Bot start command sent'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/bot/stop', async (req, res) => {
  try {
    // In a real implementation, you would stop the trading bot here
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Bot stop command sent'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('📱 Client connected:', socket.id);
  
  // Send initial data
  socket.emit('connected', {
    message: 'Connected to trading bot dashboard',
    timestamp: new Date().toISOString()
  });
  
  // Handle client requests
  socket.on('get-stats', async () => {
    try {
      const stats = await TradingSignal.getStats();
      socket.emit('stats-update', stats);
    } catch (error) {
      socket.emit('error', { message: 'Failed to get stats' });
    }
  });
  
  socket.on('get-signals', async () => {
    try {
      const signals = await TradingSignal.findAll(20);
      socket.emit('signals-update', signals);
    } catch (error) {
      socket.emit('error', { message: 'Failed to get signals' });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('📱 Client disconnected:', socket.id);
  });
});

// Simulate real-time data updates
setInterval(() => {
  // Simulate price updates
  const prices = {
    BTCUSDT: { price: 106603.5 + (Math.random() - 0.5) * 100, change: (Math.random() - 0.5) * 2 },
    ETHUSDT: { price: 3245.8 + (Math.random() - 0.5) * 50, change: (Math.random() - 0.5) * 2 },
    BNBUSDT: { price: 645.2 + (Math.random() - 0.5) * 10, change: (Math.random() - 0.5) * 2 },
    TRXUSDT: { price: 0.125 + (Math.random() - 0.5) * 0.01, change: (Math.random() - 0.5) * 2 },
    ADAUSDT: { price: 0.485 + (Math.random() - 0.5) * 0.02, change: (Math.random() - 0.5) * 2 },
    ETCUSDT: { price: 25.8 + (Math.random() - 0.5) * 2, change: (Math.random() - 0.5) * 2 },
    SOLUSDT: { price: 185.5 + (Math.random() - 0.5) * 5, change: (Math.random() - 0.5) * 2 },
    XRPUSDT: { price: 0.625 + (Math.random() - 0.5) * 0.02, change: (Math.random() - 0.5) * 2 }
  };
  
  io.emit('price-update', prices);
}, 5000);

// Simulate signal updates
setInterval(async () => {
  try {
    const stats = await TradingSignal.getStats();
    io.emit('stats-update', stats);
  } catch (error) {
    console.error('Error sending stats update:', error);
  }
}, 10000);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Something went wrong!' : err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const isConnected = await testConnection();
    
    if (!isConnected) {
      console.error('❌ Failed to connect to database. Server not started.');
      process.exit(1);
    }

    // Start the server
    server.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on http://${HOST}:${PORT}`);
      console.log(`🌐 Dashboard: http://${HOST}:${PORT}`);
      console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
      console.log(`👥 Users API: http://${HOST}:${PORT}/api/users`);
      console.log(`📈 Signals API: http://${HOST}:${PORT}/api/signals`);
      console.log(`📊 Signal Stats: http://${HOST}:${PORT}/api/signals/stats`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  await db.destroy();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  await db.destroy();
  process.exit(0);
});

// Start the server
startServer();
