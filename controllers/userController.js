const bcrypt = require("bcrypt");
const User = require("../models/User");

const getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateUserInfo = async (req, res) => {
  const { firstname, lastname, currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (firstname) user.firstname = firstname;
    if (lastname) user.lastname = lastname;

    if (currentPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect" });
      }

      if (newPassword) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
      }
    }

    await user.save();
    res.json({ success: true, message: "User updated successfully", user });
  } catch (error) {
    console.error(error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ message: messages });
    }
    res.status(500).json({ message: "Server error" });
  }
};

const updateUserRole = async (req, res) => {
  try {
    // Find the user by ID first to check the username
    const user = await User.findById(req.params.id);

    // Check if the user exists
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check if the user's username is 'admin'
    if (user.username === "admin") {
      return res
        .status(403)
        .json({ message: "Cannot change the role of the admin user" });
    }

    // Proceed with updating the user's role
    user.role = req.body.role;
    await user.save();

    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateUserPlan = async (req, res) => {
  const { id } = req.params;
  const { plan } = req.body;

  if (!plan || !["free", "basic", "premium"].includes(plan)) {
    return res.status(400).json({ message: "Invalid plan specified" });
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { plan },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

module.exports = {
  getUsers,
  getUser,
  updateUserInfo,
  updateUserRole,
  updateUserPlan,
};
