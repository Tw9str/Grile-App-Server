const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const crypto = require("crypto");
const { sendEmail } = require("../utils/email");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const register = async (req, res) => {
  const { username, email, password } = req.body;

  const validationRules = [
    {
      field: "username",
      checks: [
        { condition: !username, message: "Username is required." },
        {
          condition: username && !/^[\w.]+$/.test(username),
          message:
            "Username can only contain alphanumeric characters, dots, and underscores.",
        },
        {
          condition: username && username.length > 30,
          message: "Username cannot exceed 30 characters.",
        },
      ],
    },
    {
      field: "email",
      checks: [
        { condition: !email, message: "Email is required." },
        {
          condition: email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
          message: "Invalid email format.",
        },
        {
          condition: email && email.length > 254,
          message: "Email cannot exceed 254 characters.",
        },
      ],
    },
    {
      field: "password",
      checks: [
        {
          condition: !password || password.length < 8,
          message: "Password must be at least 8 characters long.",
        },
        {
          condition: password && password.length > 128,
          message: "Password cannot exceed 128 characters.",
        },
        {
          condition: password && !/[A-Z]/.test(password),
          message: "Password must contain at least one uppercase letter.",
        },
        {
          condition: password && !/[a-z]/.test(password),
          message: "Password must contain at least one lowercase letter.",
        },
        {
          condition: password && !/[0-9]/.test(password),
          message: "Password must contain at least one digit.",
        },
        {
          condition: password && !/[!@#$%^&*]/.test(password),
          message: "Password must contain at least one special character.",
        },
      ],
    },
  ];

  const errors = validationRules.flatMap(({ checks }) =>
    checks.filter(({ condition }) => condition).map(({ message }) => message)
  );

  if (errors.length) return res.status(400).json({ message: errors });

  try {
    const existingUser = await User.findOne({
      $or: [{ username: username }, { email: email }],
    });

    if (existingUser) {
      const existingFields = [];
      if (existingUser.username === username) {
        existingFields.push("Username already exists.");
      }
      if (existingUser.email === email) {
        existingFields.push("Email already registered.");
      }
      return res.status(400).json({ message: existingFields });
    }

    const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt());

    const user = new User({
      username,
      email,
      password: hashedPassword,
    });
    const savedUser = await user.save();

    const customer = await stripe.customers.create({
      email,
      metadata: {
        userId: savedUser._id.toString(),
        username: username,
      },
    });

    savedUser.stripeCustomerId = customer.id;
    await savedUser.save();

    res.status(201).json({ success: true, message: "Registration successful" });
  } catch (err) {
    console.error("Registration Error:", err);
    const errorMessages = [];

    if (err.code === 11000) {
      if (err.keyValue?.username) {
        errorMessages.push("Username already exists!");
      }
      if (err.keyValue?.email) {
        errorMessages.push("Email already registered!");
      }
    } else if (err.errors) {
      errorMessages.push("Validation failed. Please check the inputs.");
    } else if (err.name === "MongoError") {
      errorMessages.push("Database error. Please try again later.");
    } else {
      errorMessages.push(
        "An unexpected error occurred. Please try again later."
      );
    }

    res.status(500).json({ message: errorMessages });
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({
      $or: [{ username }, { email: username }],
    });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid email or password" });
    }
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        stripeCustomerId: user.stripeCustomerId,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "3d",
      }
    );
    res
      .status(200)
      .json({ token, user, success: true, message: "Login successful" });
  } catch (err) {
    res.status(500).json({ err: err.message });
  }
};

const requestResetPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "Utilizatorul nu a fost găsit!" });

    const token = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000;

    const subject = "Resetare parolă solicitată - grileinfo.ro";
    const htmlContent = `
                        <!DOCTYPE html>
                        <html lang="ro">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Resetare Parolă</title>
                            <style>
                                body {
                                    font-family: Arial, sans-serif;
                                    background-color: #f4f4f4;
                                    margin: 0;
                                    padding: 0;
                                }
                                .container {
                                    max-width: 600px;
                                    margin: 20px auto;
                                    background-color: #ffffff;
                                    padding: 20px;
                                    border-radius: 8px;
                                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                                }
                                h1 {
                                    color: #333333;
                                    font-size: 24px;
                                    text-align: center;
                                    margin-bottom: 20px;
                                }
                                p {
                                    color: #666666;
                                    line-height: 1.6;
                                    margin: 0 0 10px;
                                }
                                .reset-link {
                                    display: block;
                                    background-color: #16a34a;
                                    color: #ffffff;
                                    text-align: center;
                                    padding: 10px 20px;
                                    border-radius: 5px;
                                    text-decoration: none;
                                    margin: 20px 0;
                                }
                                .footer {
                                    text-align: center;
                                    color: #999999;
                                    font-size: 14px;
                                    margin-top: 20px;
                                }
                                .footer a {
                                    color: #007bff;
                                    text-decoration: none;
                                }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <h1>Resetare Parolă</h1>
                                <p>Te rugăm să faci clic pe link-ul de mai jos sau să-l introduci în browser pentru a finaliza procesul de resetare a parolei:</p>
                                <a href="${req.headers.referer}/reset-password?key=${token}" class="reset-link">Resetează Parola</a>
                                <p>Dacă nu ai solicitat resetarea parolei, te rugăm să ignori acest email și parola ta va rămâne neschimbată.</p>
                                <div class="footer">
                                    <p>&copy; 2024 grileinfo.ro. Toate drepturile rezervate.</p>
                                </div>
                            </div>
                        </body>
                        </html>
                        `;

    sendEmail(email, subject, htmlContent)
      .then((info) => {
        console.log("Email sent successfully:", info.response);
      })
      .catch((error) => {
        console.error("Failed to send email after retries:", error);
      });

    await user.save();

    res.status(200).json({
      success: true,
      message: "Un email pentru resetarea parolei a fost trimis.",
    });
  } catch (err) {
    res.status(500).json({ err: err.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Token-ul de resetare a parolei este invalid sau a expirat.",
      });
    }

    const { newPassword } = req.body;
    const hashedPassword = await bcrypt.hash(
      newPassword,
      await bcrypt.genSalt()
    );
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Parola a fost resetată cu succes." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Eroare de server." });
  }
};

/* Seed User */
const createSeedUser = async (req, res) => {
  try {
    const seedUser = await User.findOne({
      email: process.env.SEED_EMAIL,
    }).lean();
    if (seedUser) {
      delete seedUser.password;
      return res.status(400).json({ message: "Seed user already existed." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(process.env.SEED_PASSWORD, salt);

    const newUser = new User({
      username: "admin",
      email: process.env.SEED_EMAIL,
      password: hashedPassword,
      role: "admin",
      plan: "premium",
    });

    await newUser.save();
    const { password, ...modifiedNewUser } = newUser._doc;

    return res
      .status(200)
      .json({ message: "Seed user created successfully.", modifiedNewUser });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Internal server error.", error: err.message });
  }
};

module.exports = {
  register,
  login,
  requestResetPassword,
  resetPassword,
  createSeedUser,
};
