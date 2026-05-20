const jwt = require('jsonwebtoken');

const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '1h';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

function getAccessSecret() {
  return process.env.JWT_SECRET;
}

function getRefreshSecret() {
  return process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
}

function createTokenPayload(user) {
  return {
    userId: user._id?.toString?.() || user.userId || user.id,
    email: user.email,
    name: user.name
  };
}

function generateTokenPair(user) {
  const payload = createTokenPayload(user);

  const accessToken = jwt.sign(payload, getAccessSecret(), {
    expiresIn: ACCESS_EXPIRES_IN
  });

  const refreshToken = jwt.sign(payload, getRefreshSecret(), {
    expiresIn: REFRESH_EXPIRES_IN
  });

  return { accessToken, refreshToken };
}

function verifyAccessToken(token) {
  return jwt.verify(token, getAccessSecret());
}

function verifyRefreshToken(token) {
  return jwt.verify(token, getRefreshSecret());
}

module.exports = {
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken
};
