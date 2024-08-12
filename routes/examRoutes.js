const express = require("express");
const {
  addExam,
  getExam,
  getExams,
  deleteExam,
  updateExam,
  getExamCategory,
} = require("../controllers/examController");
const verifyRole = require("../middleware/auth");
const upload = require("../utils/multerConfig");

const router = express.Router();

router.post(
  "/create-exam",
  verifyRole(["admin", "teacher"]),
  upload.any(),
  addExam
);
router.get("/exam/:slug", getExam);
router.put("/exam/edit/:id", upload.any(), updateExam);
router.get("/", getExams);
router.get("/category/:title", getExamCategory);
router.delete("/delete/:id", verifyRole(["admin"]), deleteExam);

module.exports = router;
