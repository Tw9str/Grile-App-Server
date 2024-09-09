const Question = require("../models/Question");
const Exam = require("../models/Exam");
const Category = require("../models/Category");
const { promisify } = require("util");
const { join } = require("path");
const fs = require("fs");

const getExams = async (req, res) => {
  try {
    const exams = await Exam.find()
      .populate("user")
      .populate("category")
      .lean();

    if (!exams || exams.length === 0) {
      return res.status(404).json({ message: "No exams found" });
    }

    return res.status(200).json(exams);
  } catch (error) {
    console.error("Error fetching Exams:", error);
    res.status(500).json({ error: "Failed to fetch exams" });
  }
};

const addExam = async (req, res) => {
  const { title, user, category, duration } = req.body;

  const uploadedFileNames = [];

  let questionData;
  try {
    questionData = JSON.parse(req.body.questionsData);
  } catch (error) {
    return res.status(400).json({ error: "Invalid questionsData format" });
  }

  if (!title || !Array.isArray(questionData) || !duration) {
    return res
      .status(400)
      .json({ error: "Title, questionsData, and duration are required" });
  }

  try {
    const questions = await Promise.all(
      questionData.map(async (question, index) => {
        try {
          const newQuestion = new Question({
            image: req.files[index]?.filename || "",
            answers: question.answers,
            correctAnswers: question.correctAnswers,
            points: parseFloat(question.points),
            explanation: question.explanation,
          });
          uploadedFileNames.push(req.files[index]?.filename);
          return await newQuestion.save();
        } catch (error) {
          await cleanupUploadedFiles(uploadedFileNames);
          console.error(
            `Error saving question at index ${index}: ${error.message}`
          );
          throw new Error(`Error saving question at index ${index}`);
        }
      })
    );

    const newExam = new Exam({
      title,
      questions: questions.map((q) => q._id),
      category,
      user,
      duration,
    });
    await newExam.save();
    res
      .status(201)
      .json({ newExam, message: "Exam will be availble in exams tab!" });
  } catch (error) {
    await cleanupUploadedFiles(uploadedFileNames);
    res.status(400).json({ error: error.message });
  }
};

const getExam = async (req, res) => {
  const { slug } = req.params;
  try {
    const exam = await Exam.findOne({ slug }).populate("questions");
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    res.status(200).json(exam);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getExamCategory = async (req, res) => {
  const { title } = req.params;
  try {
    const category = await Category.findOne({ title });
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const exams = await Exam.find({ category: category._id })
      .populate("user")
      .populate("category")
      .lean();

    if (!exams || exams.length === 0) {
      return res
        .status(404)
        .json({ message: "No exams found for this category" });
    }
    exams.forEach((exams) => {
      delete exams.user.password;
    });
    res.json(exams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteFile = promisify(fs.unlink);

const updateExam = async (req, res) => {
  const {
    title,
    category,
    questionsData,
    deletedQuestionIds,
    plan,
    isVisible,
  } = req.body;

  // Initialize the update data object
  const updateData = {};
  const uploadedFileNames = []; // To track uploaded files

  if (title) updateData.title = title;
  if (category) updateData.category = category;
  if (plan) updateData.plan = plan;
  if (typeof isVisible !== "undefined") updateData.isVisible = isVisible;

  if (questionsData) {
    let questionData;
    try {
      questionData = JSON.parse(questionsData);
    } catch (error) {
      return res.status(400).json({ error: "Invalid questionsData format" });
    }

    if (!Array.isArray(questionData) || questionData.length === 0) {
      return res
        .status(400)
        .json({ error: "questionsData must be a non-empty array" });
    }

    try {
      const questions = await Promise.all(
        questionData.map(async (question, index) => {
          try {
            let imageFileName = null;

            // Check if the question image is null and there's a corresponding uploaded image
            if (question.image === null) {
              const uploadedFile = req.files.find(
                (file) => file.fieldname === `questionImage${index}`
              );
              if (uploadedFile) {
                imageFileName = uploadedFile.filename; // Assign the uploaded image filename
                uploadedFileNames.push(imageFileName); // Track uploaded file
                console.log(
                  `New image uploaded for question at index ${index}: ${imageFileName}`
                );
              }
            } else if (question.image) {
              // Use the existing image provided in the question
              imageFileName = question.image;
            }

            // Check if the question already exists
            if (question.id) {
              const existingQuestion = await Question.findById(question.id);

              // If the image has changed, delete the old one
              if (
                existingQuestion.image &&
                existingQuestion.image !== imageFileName
              ) {
                const oldImagePath = join(
                  __dirname,
                  "../public",
                  existingQuestion.image
                );
                try {
                  await deleteFile(oldImagePath);
                  console.log(`Deleted old image: ${oldImagePath}`);
                } catch (err) {
                  console.error(`Failed to delete image ${oldImagePath}:`, err);
                }
              }

              // Update the existing question
              return await Question.findByIdAndUpdate(
                question.id,
                {
                  image: imageFileName, // Assign the resolved image
                  answers: question.answers,
                  correctAnswers: question.correctAnswers,
                  points: parseFloat(question.points),
                  explanation: question.explanation,
                },
                { new: true, runValidators: true }
              );
            } else {
              // Create new question
              const newQuestion = new Question({
                image: imageFileName, // Use the resolved image
                answers: question.answers,
                correctAnswers: question.correctAnswers,
                points: parseFloat(question.points),
                explanation: question.explanation,
              });

              // Validate before saving
              await newQuestion.validate(); // Validate before saving
              return await newQuestion.save();
            }
          } catch (error) {
            console.error(
              `Error processing question at index ${index}: ${error.message}`
            );
            throw new Error(`Error processing question at index ${index}`);
          }
        })
      );

      updateData.questions = questions.map((q) => q._id);
    } catch (error) {
      console.error(error);
      // Cleanup uploaded files if any error occurs
      await cleanupUploadedFiles(uploadedFileNames);
      return res
        .status(500)
        .json({ message: "Server Error", error: error.message });
    }
  }

  if (deletedQuestionIds) {
    try {
      const idsToDelete = JSON.parse(deletedQuestionIds);
      await Promise.all(
        idsToDelete.map(async (id) => {
          const questionToDelete = await Question.findById(id);
          if (questionToDelete) {
            // Delete associated image if it exists
            if (questionToDelete.image) {
              const oldImagePath = join(
                __dirname,
                "../public",
                questionToDelete.image
              );
              try {
                await deleteFile(oldImagePath);
                console.log(`Deleted associated image: ${oldImagePath}`);
              } catch (err) {
                console.error(`Failed to delete image ${oldImagePath}:`, err);
              }
            }
            // Delete the question from the database
            await Question.findByIdAndDelete(id);
            console.log(`Deleted question with ID: ${id}`);
          }
        })
      );
    } catch (error) {
      console.error(`Error deleting questions: ${error.message}`);
      return res
        .status(500)
        .json({ message: "Server Error", error: error.message });
    }
  }

  try {
    const updatedExam = await Exam.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedExam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    res.json({ message: "Exam updated successfully", exam: updatedExam });
  } catch (error) {
    console.error(error);
    await cleanupUploadedFiles(uploadedFileNames); // Cleanup on error
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Function to delete uploaded files
const cleanupUploadedFiles = async (fileNames) => {
  for (const fileName of fileNames) {
    const filePath = join(__dirname, "../public", fileName);
    try {
      await deleteFile(filePath);
      console.log(`Deleted uploaded file: ${filePath}`);
    } catch (err) {
      console.error(`Failed to delete uploaded file ${filePath}:`, err);
    }
  }
};

const deleteExam = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findById(id).populate("questions");

    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    // Find and delete images associated with questions
    for (const question of exam.questions) {
      if (question.image) {
        const imagePath = join(__dirname, "../public", question.image);
        try {
          await deleteFile(imagePath);
        } catch (err) {
          console.error(`Failed to delete image ${imagePath}:`, err);
        }
      }
    }

    // Delete the questions related to the exam
    await Question.deleteMany({
      _id: { $in: exam.questions.map((q) => q._id) },
    });

    // Delete the exam
    await exam.deleteOne();

    res.json({ message: "Exam deleted successfully" });
  } catch (err) {
    console.error(err); // Added logging to aid in debugging
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getExams,
  addExam,
  getExam,
  getExamCategory,
  deleteExam,
  updateExam,
};
