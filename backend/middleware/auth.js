const User = require('../models/User');
const { verifyAccessToken, verifyRefreshToken, generateTokenPair } = require('../utils/jwt');

async function attachAuthenticatedUser(decoded, req, res, next) {
  const user = await User.findById(decoded.userId).select('_id email name deletionScheduledAt');

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'User not found',
      data: null
    });
  }

  req.user = {
    id: user._id.toString(),
    userId: user._id.toString(),
    email: user.email,
    name: user.name,
    deletionScheduledAt: user.deletionScheduledAt
  };

  return next();
}

async function auth(req, res, next) {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Invalid authorization format.',
        data: null
      });
    }

    const accessToken = authHeader.replace('Bearer ', '').trim();

    try {
      const decoded = verifyAccessToken(accessToken);
      return attachAuthenticatedUser(decoded, req, res, next);
    } catch (error) {
      if (error.name !== 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Access denied. Invalid token.',
          data: null
        });
      }
    }

    const refreshToken = req.header('x-refresh-token');
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Access token expired. Refresh token is required.',
        data: null
      });
    }

    const decodedRefresh = verifyRefreshToken(refreshToken);
    const tokens = generateTokenPair(decodedRefresh);
    res.set('x-access-token', tokens.accessToken);
    res.set('x-refresh-token', tokens.refreshToken);

    return attachAuthenticatedUser(decodedRefresh, req, res, next);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Token verification failed.',
      data: null
    });
  }
}

module.exports = auth;
