// Dashboard Application
class TradingDashboard {
    constructor() {
        this.socket = null;
        this.charts = {};
        this.currentSymbol = 'BTCUSDT';
        this.priceData = {};
        this.signals = [];
        this.stats = {
            total: 0,
            buy: 0,
            sell: 0,
            avgStrength: 0
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeCharts();
        this.connectWebSocket();
        this.loadInitialData();
        this.startDataRefresh();
    }

    setupEventListeners() {
        // Chart tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentSymbol = e.target.dataset.symbol;
                this.updateChart();
            });
        });

        // Refresh signals
        document.getElementById('refresh-signals').addEventListener('click', () => {
            this.loadSignals();
        });

        // Signal filter
        document.getElementById('signal-filter').addEventListener('change', (e) => {
            this.filterSignals(e.target.value);
        });

        // Bot controls
        document.getElementById('start-bot').addEventListener('click', () => {
            this.startBot();
        });

        document.getElementById('stop-bot').addEventListener('click', () => {
            this.stopBot();
        });
    }

    connectWebSocket() {
        try {
            // Check if Socket.IO is available
            if (typeof io !== 'undefined') {
                console.log('🔌 Initializing WebSocket connection...');
                this.socket = io();
                
                this.socket.on('connect', () => {
                    console.log('✅ WebSocket connected successfully');
                    this.updateConnectionStatus('websocket', 'connected');
                    this.showNotification('WebSocket connected', 'success');
                });
                
                this.socket.on('disconnect', () => {
                    console.log('❌ WebSocket disconnected');
                    this.updateConnectionStatus('websocket', 'disconnected');
                    this.showNotification('WebSocket disconnected', 'error');
                });
                
                this.socket.on('price-update', (prices) => {
                    console.log('📊 Received price update:', prices);
                    this.priceData = prices;
                    this.updatePriceDisplay();
                });
                
                this.socket.on('stats-update', (stats) => {
                    console.log('📈 Received stats update:', stats);
                    this.stats = stats;
                    this.updateStatsDisplay();
                });
                
                this.socket.on('signals-update', (signals) => {
                    console.log('🔔 Received signals update:', signals.length, 'signals');
                    this.signals = signals;
                    this.updateSignalsTable();
                });
                
                this.socket.on('connected', (data) => {
                    console.log('🎯 Server connection confirmed:', data);
                });
                
                this.socket.on('error', (error) => {
                    console.error('❌ WebSocket error:', error);
                    this.showNotification('WebSocket error: ' + error.message, 'error');
                });
            } else {
                console.log('Socket.IO not available, using polling');
                this.updateConnectionStatus('websocket', 'connected');
            }
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.updateConnectionStatus('websocket', 'disconnected');
        }
    }

    async loadInitialData() {
        try {
            await this.loadStats();
            await this.loadSignals();
            await this.loadPrices();
            await this.loadSystemStatus();
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.updateConnectionStatus('database', 'disconnected');
        }
    }

    async loadSystemStatus() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            
            if (data.success) {
                this.updateConnectionStatus('bot', data.data.bot);
                this.updateConnectionStatus('websocket', data.data.websocket);
                this.updateConnectionStatus('database', data.data.database);
            }
        } catch (error) {
            console.error('Error loading system status:', error);
            this.updateConnectionStatus('bot', 'disconnected');
            this.updateConnectionStatus('websocket', 'disconnected');
            this.updateConnectionStatus('database', 'disconnected');
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/signals/stats');
            const data = await response.json();
            
            if (data.success) {
                this.stats = data.data;
                this.updateStatsDisplay();
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadSignals() {
        try {
            const response = await fetch('/api/signals?limit=50');
            const data = await response.json();
            
            if (data.success) {
                this.signals = data.data;
                this.updateSignalsTable();
            }
        } catch (error) {
            console.error('Error loading signals:', error);
        }
    }

    async loadPrices() {
        // Simulate price data - in production, this would come from WebSocket
        const symbols = ['TRXUSDT', 'ADAUSDT', 'ETCUSDT', 'BNBUSDT', 'SOLUSDT', 'ETHUSDT', 'BTCUSDT', 'XRPUSDT'];
        const prices = {
            'BTCUSDT': { price: 106603.5, change: 0.25 },
            'ETHUSDT': { price: 3245.8, change: -0.15 },
            'BNBUSDT': { price: 645.2, change: 0.35 },
            'TRXUSDT': { price: 0.125, change: 0.45 },
            'ADAUSDT': { price: 0.485, change: -0.20 },
            'ETCUSDT': { price: 25.8, change: 0.30 },
            'SOLUSDT': { price: 185.5, change: 0.15 },
            'XRPUSDT': { price: 0.625, change: -0.10 }
        };

        this.priceData = prices;
        this.updatePriceDisplay();
    }

    initializeCharts() {
        // Check if Chart.js is loaded
        if (typeof Chart === 'undefined') {
            console.error('Chart.js not loaded. Retrying in 1 second...');
            setTimeout(() => this.initializeCharts(), 1000);
            return;
        }
        
        const ctx = document.getElementById('price-chart').getContext('2d');
        
        this.charts.price = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Price',
                    data: [],
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Price (USDT)'
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    updateChart() {
        // Simulate chart data update
        const now = new Date();
        const labels = [];
        const data = [];
        
        // Generate sample data for the last 20 minutes
        for (let i = 19; i >= 0; i--) {
            const time = new Date(now.getTime() - i * 60000);
            labels.push(time.toLocaleTimeString());
            
            // Simulate price movement
            const basePrice = this.priceData[this.currentSymbol]?.price || 50000;
            const variation = (Math.random() - 0.5) * 100;
            data.push(basePrice + variation);
        }
        
        this.charts.price.data.labels = labels;
        this.charts.price.data.datasets[0].data = data;
        this.charts.price.data.datasets[0].label = `${this.currentSymbol} Price`;
        this.charts.price.update();
    }

    updateStatsDisplay() {
        document.getElementById('total-signals').textContent = this.stats.total || 0;
        document.getElementById('buy-signals').textContent = this.stats.byType?.BUY || 0;
        document.getElementById('sell-signals').textContent = this.stats.byType?.SELL || 0;
        document.getElementById('avg-strength').textContent = 
            `${((this.stats.avgStrength || 0) * 100).toFixed(1)}%`;
    }

    updatePriceDisplay() {
        const container = document.getElementById('live-prices');
        container.innerHTML = '';
        
        Object.entries(this.priceData).forEach(([symbol, data]) => {
            const priceItem = document.createElement('div');
            priceItem.className = 'price-item';
            
            const changeClass = data.change >= 0 ? 'positive' : 'negative';
            const changeSymbol = data.change >= 0 ? '+' : '';
            
            priceItem.innerHTML = `
                <div class="price-symbol">${symbol}</div>
                <div class="price-value">$${data.price.toFixed(2)}</div>
                <div class="price-change ${changeClass}">${changeSymbol}${data.change.toFixed(2)}%</div>
            `;
            
            container.appendChild(priceItem);
        });
    }

    updateSignalsTable() {
        const tbody = document.getElementById('signals-tbody');
        tbody.innerHTML = '';
        
        this.signals.forEach(signal => {
            const row = document.createElement('tr');
            
            const time = new Date(signal.created_at).toLocaleString();
            const strengthClass = this.getStrengthClass(signal.strength);
            
            row.innerHTML = `
                <td>${time}</td>
                <td>${signal.symbol}</td>
                <td class="signal-${signal.signal_type.toLowerCase()}">${signal.signal_type}</td>
                <td>$${parseFloat(signal.price).toFixed(2)}</td>
                <td><span class="signal-strength ${strengthClass}">${(signal.strength * 100).toFixed(1)}%</span></td>
                <td>$${parseFloat(signal.entry_price).toFixed(2)}</td>
                <td>$${parseFloat(signal.stop_loss).toFixed(2)}</td>
                <td>$${parseFloat(signal.take_profit).toFixed(2)}</td>
                <td>1:${parseFloat(signal.risk_reward).toFixed(2)}</td>
            `;
            
            tbody.appendChild(row);
        });
    }

    getStrengthClass(strength) {
        if (strength >= 0.8) return 'strength-high';
        if (strength >= 0.6) return 'strength-medium';
        return 'strength-low';
    }

    filterSignals(type) {
        const tbody = document.getElementById('signals-tbody');
        const rows = tbody.querySelectorAll('tr');
        
        rows.forEach(row => {
            const signalType = row.querySelector('.signal-buy, .signal-sell')?.textContent;
            if (type === 'all' || signalType === type) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    updateConnectionStatus(type, status) {
        const element = document.getElementById(`${type}-status`);
        const textElement = document.getElementById(`${type}-status-text`);
        
        element.className = `status-item ${status}`;
        textElement.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    }

    async startBot() {
        try {
            const response = await fetch('/api/bot/start', { method: 'POST' });
            const data = await response.json();
            
            if (data.success) {
                this.updateConnectionStatus('bot', 'connected');
                this.showNotification('Bot started successfully', 'success');
            }
        } catch (error) {
            console.error('Error starting bot:', error);
            this.showNotification('Error starting bot', 'error');
        }
    }

    async stopBot() {
        try {
            const response = await fetch('/api/bot/stop', { method: 'POST' });
            const data = await response.json();
            
            if (data.success) {
                this.updateConnectionStatus('bot', 'disconnected');
                this.showNotification('Bot stopped successfully', 'success');
            }
        } catch (error) {
            console.error('Error stopping bot:', error);
            this.showNotification('Error stopping bot', 'error');
        }
    }

    startDataRefresh() {
        // Refresh data every 5 seconds
        setInterval(() => {
            this.loadStats();
            this.loadPrices();
            this.loadSystemStatus();
        }, 5000);
        
        // Refresh signals every 10 seconds
        setInterval(() => {
            this.loadSignals();
        }, 10000);
        
        // Update chart every 30 seconds
        setInterval(() => {
            this.updateChart();
        }, 30000);
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TradingDashboard();
});

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);
