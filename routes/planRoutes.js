const express = require("express");
const router = express.Router();
const {
  getPlans,
  createPlan,
  deletePlan,
} = require("../controllers/planController");

router.get("/", getPlans);

router.post("/create", createPlan);

router.delete("/delete/:id", deletePlan);

module.exports = router;
