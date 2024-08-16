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

const getPremiumUsers = async (req, res) => {
  try {
    const premiumUserCount = await User.countDocuments({ plan: "premium" });

    if (premiumUserCount === 0) {
      return res.status(404).json({ message: "No premium users found" });
    }

    res.json({ count: premiumUserCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const updateUserInfo = async (req, res) => {
  const { firstname, lastname, username, currentPassword, newPassword } =
    req.body;
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (firstname) {
      if (!/^[a-zA-Z\s]+$/.test(firstname)) {
        return res.status(400).json({
          success: false,
          message: "First name can only contain letters and spaces.",
        });
      }
      if (firstname.length < 2 || firstname.length > 50) {
        return res.status(400).json({
          success: false,
          message: "First name should be between 2 and 50 characters.",
        });
      }
      user.firstname = firstname.trim();
    }

    if (lastname) {
      if (!/^[a-zA-Z\s]+$/.test(lastname)) {
        return res.status(400).json({
          success: false,
          message: "Last name can only contain letters and spaces.",
        });
      }
      if (lastname.length < 2 || lastname.length > 50) {
        return res.status(400).json({
          success: false,
          message: "Last name should be between 2 and 50 characters.",
        });
      }
      user.lastname = lastname.trim();
    }

    if (username) {
      if (!/^[a-zA-Z0-9._]+$/.test(username)) {
        return res.status(400).json({
          success: false,
          message:
            "Username can only contain letters, numbers, dots, and underscores.",
        });
      }
      if (username.length > 30) {
        return res.status(400).json({
          success: false,
          message: "Username cannot exceed 30 characters.",
        });
      }

      const existingUser = await User.findOne({
        username: username.toLowerCase(),
      });
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({
          success: false,
          message: "Username is already taken.",
        });
      }

      user.username = username.toLowerCase().trim();
    }

    if (currentPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message: "Current password is incorrect.",
        });
      }

      if (newPassword) {
        if (newPassword.length < 8 || newPassword.length > 128) {
          return res.status(400).json({
            success: false,
            message: "New password must be between 8 and 128 characters long.",
          });
        }
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
      }
    }

    await user.save();

    const updatedUser = user.toObject();
    delete updatedUser.password;

    res.json({
      success: true,
      message: "User updated successfully.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ success: false, message: messages });
    }

    res.status(500).json({
      success: false,
      message: "An unexpected error occurred. Please try again later.",
    });
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

const deleteUser = async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    await User.findByIdAndDelete(userId);

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

module.exports = {
  getUsers,
  getUser,
  getPremiumUsers,
  updateUserInfo,
  updateUserRole,
  updateUserPlan,
  deleteUser,
};
