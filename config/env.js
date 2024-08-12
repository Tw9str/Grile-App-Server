require("dotenv").config();

const PORT = process.env.PORT || 5000;

module.exports = {
  PORT,
  DB_URI: process.env.DB_URI,
};
