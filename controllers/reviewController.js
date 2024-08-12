const Review = require("../models/Review");

const createReview = async (req, res) => {
  const { message } = req.body;
  const userId = req.user.id;

  try {
    const review = new Review({
      user: userId,
      message,
    });

    await review.save();
    res.status(201).json({ message: "Review created successfully", review });
  } catch (error) {
    res.status(500).json({ error: "Failed to create review" });
  }
};

const getReviews = async (req, res) => {
  try {
    const reviews = await Review.find().populate("user", "username");
    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
};

const updateReview = async (req, res) => {
  const { id } = req.params;

  try {
    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    review.isApproved = true; // Assuming you have an `isApproved` field
    await review.save();

    res.status(200).json({ message: "Review approved successfully", review });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

const deleteReview = async (req, res) => {
  const { id } = req.params;

  try {
    const review = await Review.findByIdAndDelete(id);
    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }
    res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete review" });
  }
};

module.exports = { createReview, updateReview, getReviews, deleteReview };
