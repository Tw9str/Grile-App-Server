const express = require("express");
const {
  handleContactFormSubmission,
} = require("../controllers/contactController");

const router = express.Router();

router.post("/contact", handleContactFormSubmission);

module.exports = router;
