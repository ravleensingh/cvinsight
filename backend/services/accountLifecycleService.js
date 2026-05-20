const User = require('../models/User');
const Resume = require('../models/Resume');
const OTP = require('../models/OTP');

async function purgeExpiredAccounts() {
  const users = await User.find({
    deletionScheduledAt: { $lte: new Date() }
  }).select('_id email');

  if (users.length === 0) {
    return { deletedUsers: 0 };
  }

  const userIds = users.map(user => user._id);
  const emails = users.map(user => user.email);

  await Promise.all([
    Resume.deleteMany({ userId: { $in: userIds } }),
    OTP.deleteMany({ email: { $in: emails } }),
    User.deleteMany({ _id: { $in: userIds } })
  ]);

  return { deletedUsers: users.length };
}

module.exports = {
  purgeExpiredAccounts
};
