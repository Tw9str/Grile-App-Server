const express = require("express");
const {
  getExam,
  getExams,
  getExamCategory,
} = require("../controllers/examController");
const verifyAccess = require("../middleware/verifyAccess");
const Exam = require("../models/Exam");
const Category = require("../models/Category");

const router = express.Router();

router.get("/exam/:slug", verifyAccess(Exam), getExam);
router.get("/", getExams);
router.get("/category/:title", verifyAccess(Category, true), getExamCategory);

module.exports = router;
