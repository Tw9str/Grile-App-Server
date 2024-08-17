const express = require("express");
const {
  login,
  register,
  createSeedUser,
  requestResetPassword,
  resetPassword,
} = require("../controllers/authController");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/request-reset-password", requestResetPassword);
router.post("/reset-password/:token", resetPassword);
router.get("/createSeedUser", createSeedUser);

module.exports = router;
