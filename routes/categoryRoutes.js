const express = require("express");
const {
  getCategories,
  addCategory,
  deleteCategory,
  updateCategory,
  getCategory,
} = require("../controllers/categoryController");
const verifyRole = require("../middleware/auth");

const router = express.Router();

router.get("/", getCategories);
router.post("/add", verifyRole(["teacher", "admin"]), addCategory);
router.put("/update/:id", updateCategory);
router.delete("/delete/:id", verifyRole(["admin"]), deleteCategory);
router.get("/:slug", getCategory);

module.exports = router;
