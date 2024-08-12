const express = require("express");
const {
  getUsers,
  getUser,
  updateUserInfo,
  updateUserPlan,
  updateUserRole,
} = require("../controllers/userController");
const verifyRole = require("../middleware/auth");

const router = express.Router();

router.get("/", getUsers);
router.get("/me", verifyRole(["student", "teacher", "admin"]), getUser);
router.put(
  "/updateUser",
  verifyRole(["student", "teacher", "admin"]),
  updateUserInfo
);
router.patch("/update/:id", updateUserPlan);
router.patch("/promote/:id", verifyRole(["admin"]), updateUserRole);

module.exports = router;
