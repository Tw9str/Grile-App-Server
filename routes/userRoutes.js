const express = require("express");
const {
  getUsers,
  getUser,
  updateUserInfo,
  getPremiumUsers,
} = require("../controllers/userController");

const router = express.Router();

router.get("/", getUsers);
router.get("/me", getUser);
router.get("/premium", getPremiumUsers);
router.put("/updateUser", updateUserInfo);

module.exports = router;
