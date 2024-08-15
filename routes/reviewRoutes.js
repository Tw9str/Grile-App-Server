const express = require("express");
const { createReview, getReviews } = require("../controllers/reviewController");
const verifyRole = require("../middleware/auth");

const router = express.Router();

router.post(
  "/create",
  verifyRole(["student", "teacher", "admin"]),
  createReview
);
router.get("/", getReviews);

module.exports = router;
