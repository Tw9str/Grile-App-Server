const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.mail.ro",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const sendEmail = (
  to,
  subject,
  html,
  replyTo,
  retryCount = 5,
  delay = 5000
) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
    replyTo: replyTo || process.env.EMAIL_USER,
  };

  return new Promise((resolve, reject) => {
    const attemptToSendEmail = (attempt) => {
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error(`Attempt ${attempt + 1} failed:`, error);

          if (attempt < retryCount - 1) {
            console.log(
              `Retrying to send email... (${attempt + 1}/${retryCount})`
            );
            setTimeout(() => attemptToSendEmail(attempt + 1), delay);
          } else {
            console.error("All retry attempts failed.");
            return reject(error);
          }
        } else {
          resolve(info);
        }
      });
    };

    attemptToSendEmail(0);
  });
};

module.exports = { sendEmail };
