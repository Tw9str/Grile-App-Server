const express = require("express");
const {
  getUsers,
  getUser,
  updateUserInfo,
} = require("../controllers/userController");

const router = express.Router();

router.get("/", getUsers);
router.get("/me", getUser);
router.put("/updateUser", updateUserInfo);

module.exports = router;
