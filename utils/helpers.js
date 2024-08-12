const crypto = require("crypto");
const User = require("../models/User");

function generateRandomPassword(length = 12) {
  return crypto.randomBytes(length).toString("hex").slice(0, length);
}

async function generateUniqueUsername(length = 8) {
  const characters =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  let username;
  let usernameExists;
  const maxAttempts = 1000;
  let attempt = 0;

  do {
    username = Array.from({ length }, () =>
      characters.charAt(Math.floor(Math.random() * characters.length))
    ).join("");
    usernameExists = await User.findOne({ username });
    attempt++;
  } while (usernameExists && attempt < maxAttempts);

  if (attempt === maxAttempts) {
    throw new Error("Failed to generate a unique username. Please try again.");
  }

  return username;
}

module.exports = {
  generateRandomPassword,
  generateUniqueUsername,
};
