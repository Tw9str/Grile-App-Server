const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const nameValidation = [
  {
    validator: function (v) {
      return /^[a-zA-Z\s]+$/.test(v); // Only letters and spaces
    },
    message: (props) =>
      `${props.value} is not a valid name! Only letters and spaces are allowed.`,
  },
  {
    validator: function (v) {
      return v.length >= 2 && v.length <= 50; // Length between 2 and 50 characters
    },
    message: "Name should be between 2 and 50 characters.",
  },
];

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: /^[a-zA-Z0-9._]+$/,
      maxlength: [30, "Username cannot exceed 30 characters"],
    },
    firstname: {
      type: String,
      trim: true,
      validate: nameValidation,
    },
    lastname: {
      type: String,
      trim: true,
      validate: nameValidation,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      match: [/.+\@.+\..+/, "Please enter a valid email address"],
      maxlength: [254, "Email cannot exceed 254 characters"],
    },
    password: {
      type: String,
      required: true,
      minlength: [8, "Password must be at least 8 characters long"],
      maxlength: [128, "Password cannot exceed 128 characters"],
    },
    plan: {
      type: String,
      enum: ["free", "basic", "premium"],
      default: "free",
    },
    role: {
      type: String,
      enum: ["admin", "teacher", "student"],
      default: "student",
    },
    stripeCustomerId: {
      type: String,
      validate: (v) => v.includes("cus_"),
      message: (props) =>
        `${props.value} is not a valid Stripe customer ID! It should include "cus_".`,
    },
  },
  { timestamps: true }
);

userSchema.set("toJSON", {
  transform: (doc, ret, options) => {
    delete ret.password;
    return ret;
  },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
