const express = require("express");
const {
  login,
  register,
  createSeedUser,
} = require("../controllers/authController");

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.get("/createSeedUser", createSeedUser);

module.exports = router;
