const { db } = require('../config/db');

class TradingSignal {
  static async create(signalData) {
    try {
      const [id] = await db('trading_signals').insert({
        signal_id: signalData.id,
        symbol: signalData.symbol,
        interval: signalData.interval,
        signal_type: signalData.type,
        strength: signalData.strength,
        price: signalData.price,
        entry_price: signalData.entry,
        stop_loss: signalData.stopLoss,
        take_profit: signalData.takeProfit,
        risk_reward: signalData.riskReward,
        analysis_data: JSON.stringify(signalData.analysis),
        candle_data: JSON.stringify(signalData.candle),
        created_at: new Date()
      });
      
      return this.findById(id);
    } catch (error) {
      console.error('Error creating trading signal:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const signal = await db('trading_signals').where('id', id).first();
      if (signal) {
        signal.analysis_data = JSON.parse(signal.analysis_data);
        signal.candle_data = JSON.parse(signal.candle_data);
      }
      return signal;
    } catch (error) {
      console.error('Error finding trading signal:', error);
      throw error;
    }
  }

  static async findBySignalId(signalId) {
    try {
      const signal = await db('trading_signals').where('signal_id', signalId).first();
      if (signal) {
        signal.analysis_data = JSON.parse(signal.analysis_data);
        signal.candle_data = JSON.parse(signal.candle_data);
      }
      return signal;
    } catch (error) {
      console.error('Error finding trading signal by signal_id:', error);
      throw error;
    }
  }

  static async findBySymbol(symbol, limit = 50) {
    try {
      const signals = await db('trading_signals')
        .where('symbol', symbol)
        .orderBy('created_at', 'desc')
        .limit(limit);
      
      return signals.map(signal => ({
        ...signal,
        analysis_data: JSON.parse(signal.analysis_data),
        candle_data: JSON.parse(signal.candle_data)
      }));
    } catch (error) {
      console.error('Error finding trading signals by symbol:', error);
      throw error;
    }
  }

  static async findByType(signalType, limit = 50) {
    try {
      const signals = await db('trading_signals')
        .where('signal_type', signalType)
        .orderBy('created_at', 'desc')
        .limit(limit);
      
      return signals.map(signal => ({
        ...signal,
        analysis_data: JSON.parse(signal.analysis_data),
        candle_data: JSON.parse(signal.candle_data)
      }));
    } catch (error) {
      console.error('Error finding trading signals by type:', error);
      throw error;
    }
  }

  static async findAll(limit = 100, offset = 0) {
    try {
      const signals = await db('trading_signals')
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);
      
      return signals.map(signal => ({
        ...signal,
        analysis_data: JSON.parse(signal.analysis_data),
        candle_data: JSON.parse(signal.candle_data)
      }));
    } catch (error) {
      console.error('Error finding all trading signals:', error);
      throw error;
    }
  }

  static async getStats() {
    try {
      const total = await db('trading_signals').count('* as count').first();
      const byType = await db('trading_signals')
        .select('signal_type')
        .count('* as count')
        .groupBy('signal_type');
      
      const bySymbol = await db('trading_signals')
        .select('symbol')
        .count('* as count')
        .groupBy('symbol')
        .orderBy('count', 'desc')
        .limit(10);
      
      const avgStrength = await db('trading_signals')
        .avg('strength as avg_strength')
        .first();
      
      const recentSignals = await db('trading_signals')
        .where('created_at', '>=', db.raw('DATE_SUB(NOW(), INTERVAL 24 HOUR)'))
        .count('* as count')
        .first();
      
      return {
        total: total.count,
        byType: byType.reduce((acc, item) => {
          acc[item.signal_type] = item.count;
          return acc;
        }, {}),
        bySymbol: bySymbol,
        avgStrength: avgStrength.avg_strength || 0,
        recent24h: recentSignals.count
      };
    } catch (error) {
      console.error('Error getting trading signal stats:', error);
      throw error;
    }
  }

  static async getSignalsByTimeRange(startDate, endDate, symbol = null) {
    try {
      let query = db('trading_signals')
        .whereBetween('created_at', [startDate, endDate])
        .orderBy('created_at', 'desc');
      
      if (symbol) {
        query = query.where('symbol', symbol);
      }
      
      const signals = await query;
      
      return signals.map(signal => ({
        ...signal,
        analysis_data: JSON.parse(signal.analysis_data),
        candle_data: JSON.parse(signal.candle_data)
      }));
    } catch (error) {
      console.error('Error getting trading signals by time range:', error);
      throw error;
    }
  }

  static async deleteOldSignals(daysOld = 30) {
    try {
      const result = await db('trading_signals')
        .where('created_at', '<', db.raw('DATE_SUB(NOW(), INTERVAL ? DAY)', [daysOld]))
        .del();
      
      console.log(`🗑️ Deleted ${result} old trading signals`);
      return result;
    } catch (error) {
      console.error('Error deleting old trading signals:', error);
      throw error;
    }
  }

  static async updateSignalStatus(signalId, status, notes = null) {
    try {
      const result = await db('trading_signals')
        .where('signal_id', signalId)
        .update({
          status,
          notes,
          updated_at: new Date()
        });
      
      return result;
    } catch (error) {
      console.error('Error updating signal status:', error);
      throw error;
    }
  }
}

module.exports = TradingSignal;
