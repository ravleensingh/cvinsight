const bcrypt = require('bcryptjs');

const DEFAULT_SALT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

async function hashPassword(password) {
  return bcrypt.hash(password, DEFAULT_SALT_ROUNDS);
}

async function comparePassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

module.exports = {
  hashPassword,
  comparePassword
};
