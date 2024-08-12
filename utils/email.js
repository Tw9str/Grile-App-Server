const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail", // You can use 'SendGrid' or other email services
  auth: {
    user: process.env.EMAIL_USER, // Your email address
    pass: process.env.EMAIL_PASS, // Your email password or app password
  },
});

const sendEmail = (to, subject, html) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
  };

  return new Promise((resolve, reject) => {
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
        return reject(error);
      }
      console.log("Email sent: " + info.response);
      resolve(info);
    });
  });
};

module.exports = { sendEmail };
