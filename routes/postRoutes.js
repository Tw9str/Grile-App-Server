const express = require("express");
const router = express.Router();
const upload = require("../utils/multerConfig");
const verifyRole = require("../middleware/auth");
const {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
} = require("../controllers/postController");

router.post(
  "/create",
  verifyRole(["admin", "teacher"]),
  upload.single("image"),
  createPost
);
router.get("/", getPosts);
router.get("/:id", getPost);
router.put("/edit/:id", updatePost);
router.delete("/delete/:id", deletePost);

module.exports = router;
