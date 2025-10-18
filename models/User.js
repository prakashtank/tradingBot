const { db } = require('../config/db');

class User {
  static async create(userData) {
    const [id] = await db('users').insert(userData);
    return this.findById(id);
  }

  static async findById(id) {
    return await db('users').where('id', id).first();
  }

  static async findByEmail(email) {
    return await db('users').where('email', email).first();
  }

  static async findAll() {
    return await db('users').select('*');
  }

  static async update(id, userData) {
    await db('users').where('id', id).update(userData);
    return this.findById(id);
  }

  static async delete(id) {
    return await db('users').where('id', id).del();
  }

  static async searchByName(name) {
    return await db('users')
      .where('name', 'like', `%${name}%`)
      .select('*');
  }
}

module.exports = User;
