const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
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
  createSeedUser,
};
