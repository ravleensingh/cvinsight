const nodemailer = require('nodemailer');

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;
const emailHost = process.env.EMAIL_HOST;
const emailPort = Number(process.env.EMAIL_PORT || 0);
const emailSecure = process.env.EMAIL_SECURE === 'true';
const emailService = process.env.EMAIL_SERVICE || 'gmail';
const emailFrom = process.env.EMAIL_FROM || process.env.EMAIL_USER;

let transporter = null;

if (emailUser && emailPass) {
  const transportConfig = {
    auth: {
      user: emailUser,
      pass: emailPass
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
  };

  if (emailHost && emailPort) {
    transporter = nodemailer.createTransport({
      host: emailHost,
      port: emailPort,
      secure: emailSecure,
      ...transportConfig
    });
  } else {
    transporter = nodemailer.createTransport({
      service: emailService,
      ...transportConfig
    });
  }

  transporter.verify()
    .then(() => console.log('[EMAIL] Mail transporter verified successfully.'))
    .catch((error) => console.error('[EMAIL ERROR] Mail transporter verification failed:', error));
} else {
  console.warn('[EMAIL WARN] Email transport is not configured. Set EMAIL_USER and EMAIL_PASS in .env.');
}

function buildTemplate(type, value) {
  const formattedDate = (() => {
    if (type !== 'account-deletion-scheduled') {
      return value;
    }

    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return value;
    }

    return parsedDate.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  })();

  const templates = {
    signup: {
      subject: 'CVInsight — Verify your email address',
      title: 'Verify your email',
      body: 'Use the code below to complete your CVInsight account registration. This code expires in 10 minutes.'
    },
    'password-reset': {
      subject: 'CVInsight — Password reset request',
      title: 'Reset your password',
      body: 'You requested a password reset for your CVInsight account. Use the code below to set a new password. If you did not request this, ignore this email.'
    },
    'account-deletion': {
      subject: 'CVInsight — Confirm account deletion',
      title: 'Confirm account deletion',
      body: 'You requested to delete your CVInsight account. Enter the code below to confirm. This action will schedule your account for permanent deletion.'
    },
    'account-deletion-scheduled': {
      subject: 'CVInsight — Account deletion scheduled',
      title: 'Deletion scheduled',
      body: `Your CVInsight account has been scheduled for deletion on: ${formattedDate}. To cancel, log back in before this date.`
    }
  };

  return templates[type] || {
    subject: 'CVInsight — Verification code',
    title: 'Verification required',
    body: `Use the code below to continue on CVInsight.`
  };
}

function buildEmailHtml(template, value, isOtpType) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr>
            <td style="background:linear-gradient(135deg,#111111,#b91c1c);padding:28px 32px;">
              <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                CV<span style="color:#fca5a5;">Insight</span>
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 12px;color:#0f172a;font-size:20px;">${template.title}</h2>
              <p style="margin:0 0 24px;color:#475569;line-height:1.7;font-size:15px;">${template.body}</p>
              ${isOtpType ? `
              <div style="background:#111111;border:1px solid #7f1d1d;border-radius:12px;padding:20px;text-align:center;margin:0 0 24px;">
                <span style="font-size:32px;font-weight:700;letter-spacing:10px;color:#f87171;">${value}</span>
              </div>
              ` : ''}
              <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;">
                If you did not request this, you can safely ignore this email.<br/>
                This is an automated message — please do not reply.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
                &copy; ${new Date().getFullYear()} CVInsight. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

async function sendOTPEmail(email, value, type) {
  if (!transporter) {
    console.error('[EMAIL ERROR] Mail transporter is not configured. Please set EMAIL_USER and EMAIL_PASS.');
    return false;
  }

  const template = buildTemplate(type, value);
  const isOtpType = type !== 'account-deletion-scheduled';

  try {
    await transporter.sendMail({
      from: emailFrom,
      to: email,
      subject: template.subject,
      html: buildEmailHtml(template, value, isOtpType)
    });
    return true;
  } catch (error) {
    console.error('[EMAIL ERROR] sendOTPEmail failed:', error);
    return false;
  }
}

module.exports = {
  sendOTPEmail
};
