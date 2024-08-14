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
const adminRoutes = require("./routes/adminRoutes");
const teacherRoutes = require("./routes/teacherRoutes");
const verifyRole = require("./middleware/auth");

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

// Routes
app.use("/api/exams", verifyRole(["student", "teacher", "admin"]), examRoutes);
app.use("/api/users", verifyRole(["student", "teacher", "admin"]), userRoutes);
app.use("/api/auth", authRoutes);
app.use(
  "/api/categories",
  verifyRole(["student", "teacher", "admin"]),
  categoryRoutes
);
app.use("/api/plans", planRoutes);
app.use(
  "/api/reviews",
  verifyRole(["student", "teacher", "admin"]),
  reviewRoutes
);
app.use("/api/posts", postRoutes);
app.use(
  "/api/sessions",
  verifyRole(["student", "teacher", "admin"]),
  sessionRoutes
);
app.use("/api/stripe", stripeRoutes);

// Admin / Teacher Routes
app.use("/api/manage", verifyRole(["admin"]), adminRoutes);
app.use("/api/create", verifyRole(["admin", "teacher"]), teacherRoutes);

// Error Handler Middleware
app.use(errorHandler);

// Connect to Database and Start Server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
