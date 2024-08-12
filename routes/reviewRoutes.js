const express = require("express");
const {
  updateReview,
  createReview,
  deleteReview,
  getReviews,
} = require("../controllers/reviewController");
const verifyRole = require("../middleware/auth");

const router = express.Router();

router.post(
  "/create",
  verifyRole(["admin", "teacher", "studnet"]),
  createReview
);
router.get("/", getReviews);
router.patch("/approve/:id", updateReview);
router.delete("/:id", deleteReview);

module.exports = router;
