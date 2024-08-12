const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const categorySchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      unique: true,
    },
    plan: {
      type: String,
      enum: ["free", "basic", "premium"],
      default: "free",
    },
    isVisible: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Pre-save middleware to validate and format title
categorySchema.pre("save", function (next) {
  if (/[^a-zA-Z0-9\s]/.test(this.title)) {
    const err = new Error(
      "Title contains special characters. Please provide a valid title."
    );
    return next(err);
  }

  this.title = this.title.toLowerCase().trim().replace(/\s+/g, "-");
  next();
});

// Pre-findOneAndUpdate middleware to validate and format title
categorySchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();

  if (update.title && /[^a-zA-Z0-9\s]/.test(update.title)) {
    const err = new Error(
      "Title contains special characters. Please provide a valid title."
    );
    return next(err);
  }

  if (update.title) {
    update.title = update.title.toLowerCase().trim().replace(/\s+/g, "-");
  }

  next();
});

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
