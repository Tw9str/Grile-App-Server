const Category = require("../models/Category");
const Exam = require("../models/Exam");
const Question = require("../models/Question");
const { promisify } = require("util");
const { join } = require("path");
const fs = require("fs");

const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().populate("user").lean();

    const categoriesWithExamCounts = await Promise.all(
      categories.map(async (category) => {
        const examCount = await Exam.countDocuments({ category: category._id });
        return {
          ...category,
          examCount: examCount,
        };
      })
    );

    res.json(categoriesWithExamCounts);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
};

const getCategory = async (req, res) => {
  const { slug } = req.params;
  try {
    const category = await Category.findOne({ slug });
    if (!category) {
      return res.status(404).send({ message: "Category not found" });
    }
    res.json(category);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

const addCategory = async (req, res) => {
  const { title } = req.body;
  const user = req.user.id;

  const category = new Category({
    title,
    user,
  });

  try {
    await category.save();
    res.status(201).json({ success: true, message: "Category saved" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateCategory = async (req, res) => {
  const { id } = req.params;
  const { plan, isVisible, title } = req.body;

  try {
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { plan, isVisible, title },
      { new: true, runValidators: true } // Ensure validation is run
    );

    if (!updatedCategory) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    res.status(200).json({
      success: true,
      message: "Category updated",
      category: updatedCategory,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating category",
      error: error.message,
    });
  }
};

const deleteFile = promisify(fs.unlink);

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Find the category by ID
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Delete the category
    await category.deleteOne();

    // Find and delete all exams related to the category
    const exams = await Exam.find({ category: id });
    for (const exam of exams) {
      // Find all questions related to the exam
      const questions = await Question.find({ _id: { $in: exam.questions } });

      for (const question of questions) {
        // If question has an image, delete it from the filesystem
        if (question.image) {
          const imagePath = join(__dirname, "../public", question.image);
          deleteFile(imagePath, (err) => {
            if (err) console.error(`Failed to delete image ${imagePath}:`, err);
          });
        }
      }

      // Delete the questions related to the exam
      await Question.deleteMany({ _id: { $in: exam.questions } });

      // Delete the exam
      await exam.deleteOne();
    }

    res.json({
      message:
        "Category, corresponding exams, and related questions and images deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getCategories,
  getCategory,
  addCategory,
  updateCategory,
  deleteCategory,
};
