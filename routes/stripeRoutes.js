const express = require("express");
const {
  checkout,
  webhook,
  generateCustomerPortal,
} = require("../controllers/stripeController");
const verifyRole = require("../middleware/auth");

const router = express.Router();

router.post("/checkout", checkout);
router.post("/webhook", webhook);
router.post(
  "/customer-portal",
  verifyRole(["student", "teacher", "admin"]),
  generateCustomerPortal
);

module.exports = router;
