const express = require("express");
const {
  updateUserPlan,
  updateUserRole,
  deleteUser,
} = require("../controllers/userController");
const {
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");
const {
  updateReview,
  deleteReview,
} = require("../controllers/reviewController");
const { updatePost, deletePost } = require("../controllers/postController");
const { createPlan, deletePlan } = require("../controllers/planController");
const { deleteExam } = require("../controllers/examController");

const router = express.Router();

// Users
router.patch("/user/update/:id", updateUserPlan);
router.patch("/user/promote/:id", updateUserRole);
router.delete("/user/delete/:id", deleteUser);

// Categories
router.put("/category/update/:id", updateCategory);
router.delete("/category/delete/:id", deleteCategory);

// Exams
router.delete("/exam/delete/:id", deleteExam);

// Reviews
router.patch("/review/approve/:id", updateReview);
router.delete("/review/delete/:id", deleteReview);

// Plans
router.post("/plan/create", createPlan);
router.delete("/plan/delete/:id", deletePlan);

// Posts
router.put("/post/edit/:id", updatePost);
router.delete("/post/delete/:id", deletePost);

module.exports = router;
