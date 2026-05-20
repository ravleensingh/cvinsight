const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { profileUpdateValidation } = require('../middleware/validation');
const { createOTP, verifyOTP } = require('../utils/otpService');
const { sendOTPEmail } = require('../utils/emailService');


const router = express.Router();

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        data: null
      });
    }

    return res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: user
    });
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile',
      data: null
    });
  }
});

router.put('/me', auth, profileUpdateValidation, async (req, res) => {
  try {
    const { name } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { name: name.trim(), updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        data: null
      });
    }

    return res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      data: null
    });
  }
});

router.post('/account-deletion/request-otp', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('email');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        data: null
      });
    }

    const otp = await createOTP(user.email, 'account-deletion');
    const emailSent = await sendOTPEmail(user.email, otp, 'account-deletion');
    if (!emailSent) {
      console.error('[USER ERROR] Account deletion OTP send failed for', user.email);
      return res.status(502).json({
        success: false,
        message: 'Unable to send account deletion OTP. Please try again later.',
        data: null
      });
    }

    return res.json({
      success: true,
      message: 'Account deletion OTP sent successfully',
      data: null
    });
  } catch (error) {
    console.error('Request deletion OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send deletion OTP',
      data: null
    });
  }
});

router.post('/account-deletion/verify-otp', auth, [
  body('otp')
    .matches(/^\d{6}$/)
    .withMessage('OTP must be exactly 6 digits')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      data: null
    });
  }

  try {
    const { otp } = req.body;
    const user = await User.findById(req.user.userId).select('email');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        data: null
      });
    }

    const otpRecord = await verifyOTP(user.email, otp, 'account-deletion');
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
        data: null
      });
    }

    const gracePeriodDays = Number(process.env.ACCOUNT_DELETION_GRACE_DAYS || 7);
    const deletionScheduledAt = new Date(Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000);

    await User.findByIdAndUpdate(req.user.userId, { deletionScheduledAt });
    const emailSent = await sendOTPEmail(user.email, deletionScheduledAt.toISOString(), 'account-deletion-scheduled');
    if (!emailSent) {
      console.error('[USER ERROR] Account deletion scheduled email failed for', user.email);
    }

    return res.json({
      success: true,
      message: 'Account deletion scheduled successfully',
      data: {
        deletionScheduledAt
      }
    });
  } catch (error) {
    console.error('Verify deletion OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to schedule account deletion',
      data: null
    });
  }
});

router.post('/account-deletion/cancel', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { deletionScheduledAt: null },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        data: null
      });
    }

    return res.json({
      success: true,
      message: 'Account deletion cancelled successfully',
      data: user
    });
  } catch (error) {
    console.error('Cancel account deletion error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel account deletion',
      data: null
    });
  }
});

module.exports = router;
