const express = require("express");
const router = express.Router();
const upload = require("../utils/multerConfig");
const verifyRole = require("../middleware/auth");
const {
  createPost,
  getPosts,
  getPost,
} = require("../controllers/postController");

router.get("/", getPosts);
router.get("/:id", getPost);

module.exports = router;
