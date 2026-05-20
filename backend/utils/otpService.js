const OTP = require('../models/OTP');

const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 10);

function generateOTP() {
  const { randomInt } = require('crypto');
  return String(randomInt(100000, 1000000));
}

async function createOTP(email, type, metadata = {}) {
  const normalizedEmail = email.toLowerCase().trim();
  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  const existing = await OTP.findOne({ email: normalizedEmail, type }).sort({ createdAt: -1 });
  const preservedMetadata = existing?.metadata || {};

  await OTP.deleteMany({ email: normalizedEmail, type });

  await OTP.create({
    email: normalizedEmail,
    otp,
    type,
    metadata: {
      ...preservedMetadata,
      ...metadata
    },
    expiresAt
  });

  return otp;
}

async function verifyOTP(email, otp, type) {
  const normalizedEmail = email.toLowerCase().trim();
  const record = await OTP.findOne({
    email: normalizedEmail,
    otp,
    type,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });

  if (!record) {
    return null;
  }

  record.isUsed = true;
  await record.save();
  return record;
}

module.exports = {
  createOTP,
  verifyOTP,
  generateOTP
};
