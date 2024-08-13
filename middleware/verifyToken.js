const jwt = require("jsonwebtoken");
const User = require("../models/User");

const verifyToken = async (req, res) => {
  const userId = req.body.user._id;

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  res.json({ user });
};

module.exports = verifyToken;
