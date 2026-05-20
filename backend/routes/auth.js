const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const User = require('../models/User');
const OTP = require('../models/OTP');
const auth = require('../middleware/auth');
const {
  signupValidation,
  loginValidation,
  resendOtpValidation,
  otpValidation,
  forgotPasswordValidation,
  passwordResetValidation
} = require('../middleware/validation');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateTokenPair, verifyAccessToken, verifyRefreshToken } = require('../utils/jwt');
const { createOTP, verifyOTP } = require('../utils/otpService');
const { sendOTPEmail } = require('../utils/emailService');

const router = express.Router();

const oauthStateStore = new Map();
const OAUTH_STATE_TTL_MS = 2 * 60 * 1000;

function createOAuthState(payload) {
  const state = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  const expiresAt = Date.now() + OAUTH_STATE_TTL_MS;
  oauthStateStore.set(state, { ...payload, expiresAt });

  setTimeout(() => {
    oauthStateStore.delete(state);
  }, OAUTH_STATE_TTL_MS + 1000);

  return state;
}

function consumeOAuthState(state) {
  if (!state || !oauthStateStore.has(state)) return null;

  const entry = oauthStateStore.get(state);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    oauthStateStore.delete(state);
    return null;
  }

  oauthStateStore.delete(state);
  return entry;
}

function getOAuthCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production' || process.env.FORCE_SECURE_COOKIES === 'true';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/'
  };
}

router.get('/google', (req, res) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return res.status(500).json({
        success: false,
        message: 'Google sign-in is not configured on this server',
        data: null
      });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      include_granted_scopes: 'true',
      prompt: 'select_account consent'
    });

    return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  } catch (error) {
    console.error('[AUTH ERROR] Google auth init error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate Google sign-in',
      data: null
    });
  }
});

router.get('/google/callback', async (req, res) => {
  const frontendUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:3000';

  try {
    const { code, error } = req.query;

    if (error || !code) {
      const redirectError = error === 'access_denied' ? 'oauth_denied' : (error ? 'oauth_callback_error' : 'oauth_denied');
      return res.redirect(`${frontendUrl}/login?error=${redirectError}`);
    }

    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
      return res.redirect(`${frontendUrl}/login?error=oauth_not_configured`);
    }

    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code'
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 10000
      }
    );

    const accessTokenFromGoogle = tokenResponse.data?.access_token;
    if (!accessTokenFromGoogle) {
      return res.redirect(`${frontendUrl}/login?error=oauth_token_exchange_failed`);
    }

    const profileResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessTokenFromGoogle}` },
      timeout: 10000
    });

    const { email, name, picture } = profileResponse.data || {};
    if (!email) {
      return res.redirect(`${frontendUrl}/login?error=oauth_email_missing`);
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      user = await User.create({
        email: normalizedEmail,
        name: name || normalizedEmail.split('@')[0],
        password: null,
        avatar: picture || null,
        isOAuthUser: true,
        isVerified: true,
        lastLogin: new Date()
      });
    } else {
      user.lastLogin = new Date();
      if (picture) user.avatar = picture;
      if (name && !user.name) user.name = name;
      if (!user.isVerified) user.isVerified = true;
      if (!user.password) user.isOAuthUser = true;
      await user.save();
    }

    const tokens = generateTokenPair(user);

    res.cookie('oauth_access_token', tokens.accessToken, {
      ...getOAuthCookieOptions(),
      maxAge: 60 * 1000
    });
    res.cookie('oauth_refresh_token', tokens.refreshToken, {
      ...getOAuthCookieOptions(),
      maxAge: 60 * 1000
    });

    const oauthState = createOAuthState({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      userId: user._id.toString()
    });

    return res.redirect(`${frontendUrl}/auth/google/callback?oauth_state=${encodeURIComponent(oauthState)}`);
  } catch (error) {
    console.error('[AUTH ERROR] Google callback error:', error.response?.data || error.message);
    return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
  }
});

router.get('/google/session', async (req, res) => {
  try {
    const { oauth_state: oauthState } = req.query;
    let accessToken = req.cookies?.oauth_access_token;
    let refreshToken = req.cookies?.oauth_refresh_token;
    let userId;

    if (oauthState) {
      const stored = consumeOAuthState(oauthState.toString());

      if (!stored) {
        return res.status(401).json({
          success: false,
          message: 'OAuth session not found or expired',
          data: null
        });
      }

      accessToken = stored.accessToken;
      refreshToken = stored.refreshToken;
      userId = stored.userId;
    }

    if (!accessToken || !refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'OAuth session not found or expired',
        data: null
      });
    }

    const decoded = verifyAccessToken(accessToken);
    const resolvedUserId = userId || decoded.userId;
    const user = await User.findById(resolvedUserId).select('_id email name avatar deletionScheduledAt');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found for OAuth session',
        data: null
      });
    }

    if (user.deletionScheduledAt) {
      user.deletionScheduledAt = null;
      await user.save();
    }

    const clearOptions = { ...getOAuthCookieOptions(), maxAge: 0 };
    res.clearCookie('oauth_access_token', clearOptions);
    res.clearCookie('oauth_refresh_token', clearOptions);

    return res.json({
      success: true,
      message: 'Google sign-in completed',
      data: {
        accessToken,
        refreshToken,
        token: accessToken,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar || null,
          deletionScheduledAt: user.deletionScheduledAt
        }
      }
    });
  } catch (error) {
    console.error('[AUTH ERROR] Google session error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired OAuth session',
      data: null
    });
  }
});

router.post('/signup', signupValidation, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser && existingUser.isVerified) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered',
        data: null
      });
    }

    const hashedPassword = await hashPassword(password);
    const otp = await createOTP(normalizedEmail, 'signup', {
      name: name.trim(),
      password: hashedPassword
    });
    const emailResult = await sendOTPEmail(normalizedEmail, otp, 'signup');

    if (!emailResult.success) {
      await OTP.deleteMany({ email: normalizedEmail, type: 'signup' });
      console.error('[AUTH ERROR] Failed to send signup OTP email for', normalizedEmail, '-', emailResult.error);
      return res.status(502).json({
        success: false,
        message: 'Unable to send verification email. Please try again later.',
        data: null
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Verification OTP sent to your email',
      data: {
        email: normalizedEmail
      }
    });
  } catch (error) {
    console.error('[AUTH ERROR] Signup error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to start signup process',
      data: null
    });
  }
});

router.post('/verify-email', otpValidation, async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail, isVerified: true });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already verified',
        data: null
      });
    }

    const otpRecord = await verifyOTP(normalizedEmail, otp, 'signup');
    if (!otpRecord?.metadata?.password || !otpRecord?.metadata?.name) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
        data: null
      });
    }

    const user = await User.create({
      name: otpRecord.metadata.name,
      email: normalizedEmail,
      password: otpRecord.metadata.password,
      isVerified: true,
      lastLogin: new Date()
    });

    const tokens = generateTokenPair(user);

    return res.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        token: tokens.accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('[AUTH ERROR] Verify email error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify email',
      data: null
    });
  }
});

router.post('/resend-otp', resendOtpValidation, async (req, res) => {
  try {
    const { email, type = 'signup' } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    if (type === 'signup') {
      const existingUser = await User.findOne({ email: normalizedEmail, isVerified: true }).select('_id');
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email already registered',
          data: null
        });
      }
    }

    if (type === 'password-reset') {
      const user = await User.findOne({ email: normalizedEmail, isVerified: true }).select('_id isOAuthUser');
      if (!user) {
        // Return success to avoid email enumeration
        return res.json({
          success: true,
          message: 'If an account exists for this email, a reset code has been sent',
          data: { email: normalizedEmail, type }
        });
      }
      if (user.isOAuthUser) {
        return res.status(400).json({
          success: false,
          message: 'Password reset is not available for this account.',
          data: null
        });
      }
    }

    const otp = await createOTP(normalizedEmail, type);
    const emailResult = await sendOTPEmail(normalizedEmail, otp, type);
    if (!emailResult.success) {
      console.error('[AUTH ERROR] Resend OTP failed for', normalizedEmail, type, '-', emailResult.error);
      return res.status(502).json({
        success: false,
        message: 'Unable to send OTP. Please try again later.',
        data: null
      });
    }

    return res.json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        email: normalizedEmail,
        type
      }
    });
  } catch (error) {
    console.error('[AUTH ERROR] Resend OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to resend OTP',
      data: null
    });
  }
});

router.post('/login', loginValidation, async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user || (!user.password && !user.isOAuthUser)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        data: null
      });
    }

    if (user.isOAuthUser && !user.password) {
      return res.status(403).json({
        success: false,
        message: 'This account is not configured for password login.',
        data: null
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in',
        data: null
      });
    }

    const passwordMatches = await comparePassword(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
        data: null
      });
    }

    if (user.deletionScheduledAt) {
      await User.findByIdAndUpdate(user._id, { deletionScheduledAt: null });
    }

    user.lastLogin = new Date();
    await user.save();

    const tokens = generateTokenPair(user);

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        token: tokens.accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
          deletionScheduledAt: user.deletionScheduledAt
        }
      }
    });
  } catch (error) {
    console.error('[AUTH ERROR] Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Login failed',
      data: null
    });
  }
});

router.post('/forgot-password', forgotPasswordValidation, async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail, isVerified: true });

    if (user) {
      if (user.isOAuthUser && !user.password) {
        // Still return generic message to avoid enumeration, but don't send OTP
        return res.json({
          success: true,
          message: 'If an account exists for this email, a password reset OTP has been sent',
          data: { email: normalizedEmail }
        });
      }
      const otp = await createOTP(normalizedEmail, 'password-reset');
      const emailResult = await sendOTPEmail(normalizedEmail, otp, 'password-reset');
      if (!emailResult.success) {
        console.error('[AUTH ERROR] Forgot password OTP send failed for', normalizedEmail, '-', emailResult.error);
      }
    }

    return res.json({
      success: true,
      message: 'If an account exists for this email, a password reset OTP has been sent',
      data: {
        email: normalizedEmail
      }
    });
  } catch (error) {
    console.error('[AUTH ERROR] Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to start password reset',
      data: null
    });
  }
});

router.post('/reset-password', passwordResetValidation, async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    const otpRecord = await verifyOTP(normalizedEmail, otp, 'password-reset');
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
        data: null
      });
    }

    const hashedPassword = await hashPassword(newPassword);
    await User.findOneAndUpdate(
      { email: normalizedEmail },
      {
        password: hashedPassword,
        isVerified: true,
        deletionScheduledAt: null
      }
    );

    return res.json({
      success: true,
      message: 'Password reset successfully',
      data: null
    });
  } catch (error) {
    console.error('[AUTH ERROR] Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      data: null
    });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken || req.header('x-refresh-token');

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required',
        data: null
      });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId).select('_id name email deletionScheduledAt');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
        data: null
      });
    }

    if (user.deletionScheduledAt) {
      await User.findByIdAndUpdate(user._id, { deletionScheduledAt: null });
    }

    const tokens = generateTokenPair(user);

    return res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: {
        ...tokens,
        token: tokens.accessToken
      }
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token',
      data: null
    });
  }
});

module.exports = router;
