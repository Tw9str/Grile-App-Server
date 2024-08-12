const express = require("express");
const {
  storeSession,
  getSession,
  submitExam,
} = require("../controllers/sessionController");

const router = express.Router();

router.post("/store-session", storeSession);
router.get("/session", getSession);
router.post("/submit-exam", submitExam);

module.exports = router;
