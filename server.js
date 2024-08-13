const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const connectDB = require("./config/db");
const { PORT } = require("./config/env");
const errorHandler = require("./middleware/errorHandler");

const examRoutes = require("./routes/examRoutes");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const planRoutes = require("./routes/planRoutes");
const reviewRoutes = require("./routes/reviewRoutes");
const postRoutes = require("./routes/postRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const stripeRoutes = require("./routes/stripeRoutes");
const verifyToken = require("./middleware/verifyToken");

// Initialize Express app
const app = express();

// Stripe webhook
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

// // Routes
app.use("/api/exams", examRoutes);
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/stripe", stripeRoutes);
app.post("/api/updateToken", verifyToken);

// Error Handler Middleware
app.use(errorHandler);

// Connect to Database and Start Server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
