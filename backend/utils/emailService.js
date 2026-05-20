const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendOTPEmail = async (email, otp, type) => {
  try {
    let subject, message;

    switch (type) {
      case 'signup':
        subject = 'Verify Your Email - CVInsight';
        message = `Your verification code is: ${otp}. This code will expire in 10 minutes.`;
        break;
      case 'password-reset':
        subject = 'Reset Your Password - CVInsight';
        message = `Your password reset code is: ${otp}. This code will expire in 10 minutes.`;
        break;
      case 'profile-update':
        subject = 'Verify Profile Update - CVInsight';
        message = `Your profile update verification code is: ${otp}. This code will expire in 10 minutes.`;
        break;
      case 'password-change':
        subject = 'Verify Password Change - CVInsight';
        message = `Your password change verification code is: ${otp}. This code will expire in 10 minutes.`;
        break;
      case 'note-unlock':
        subject = 'Unlock Note - CVInsight';
        message = `Your note unlock verification code is: ${otp}. This code will expire in 10 minutes.`;
        break;
      case 'section-pin-reset':
        subject = 'Reset Section PIN - CVInsight';
        message = `Your section PIN reset verification code is: ${otp}. This code will expire in 10 minutes.`;
        break;
      case 'profile-deletion':
        subject = 'Profile Deletion Verification - CVInsight';
        message = `Your profile deletion verification code is: ${otp}. This code will expire in 10 minutes. WARNING: This will schedule your account for permanent deletion in 7 days.`;
        break;
      case 'profile-deletion-scheduled':
        subject = 'Profile Deletion Scheduled - CVInsight';
        message = `Your profile has been scheduled for deletion on ${otp}. If you log in before this date, the deletion will be cancelled automatically.`;
        break;
      case 'memory-delete':
        subject = 'Delete Memory - CVInsight';
        message = `Your memory deletion verification code is: ${otp}. This code will expire in 10 minutes.`;
        break;
      case 'journal-delete':
        subject = 'Delete Journal Entry - CVInsight';
        message = `Your journal entry deletion verification code is: ${otp}. This code will expire in 10 minutes.`;
        break;
      default:
        subject = 'Verification Code - CVInsight';
        message = `Your verification code is: ${otp}. This code will expire in 10 minutes.`;
    }

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'CVInsight <onboarding@resend.dev>',
      to: email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">CVInsight</h2>
          <p>Hello,</p>
          <p>${message}</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #2563eb; margin: 0; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
          </div>
          <p>If you didn't request this, please ignore this email.</p>
          <p>Best regards,<br>CVInsight Team</p>
        </div>
      `
    });

    if (error) {
      console.error('Email sending failed with Resend API error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
};

module.exports = {
  sendOTPEmail
};
