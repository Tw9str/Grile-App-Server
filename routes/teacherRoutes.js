const express = require("express");
const { createPost } = require("../controllers/postController");
const { addExam, updateExam } = require("../controllers/examController");
const upload = require("../utils/multerConfig");
const { addCategory } = require("../controllers/categoryController");

const router = express.Router();

// Exams
router.post("/exam", upload.any(), addExam);
router.patch("/exam/edit/:id", upload.any(), updateExam);

router.post("/category", addCategory);

// Posts
router.post("/post", upload.single("image"), createPost);

module.exports = router;
