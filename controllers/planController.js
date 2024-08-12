const Plan = require("../models/Plan");

const getPlans = async (req, res) => {
  try {
    const plans = await Plan.find();
    res.status(200).json(plans);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch plans" });
  }
};

const createPlan = async (req, res) => {
  const { name, description, price, currency, interval, features, popular } =
    req.body;

  try {
    const newPlan = new Plan({
      name,
      description,
      price,
      currency,
      interval,
      features,
      popular,
    });

    await newPlan.save();
    res
      .status(201)
      .json({ message: "Plan created successfully", plan: newPlan });
  } catch (error) {
    res.status(500).json({ error: "Failed to create plan" });
  }
};

const deletePlan = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedPlan = await Plan.findByIdAndDelete(id);

    if (!deletedPlan) {
      return res.status(404).json({ error: "Plan not found" });
    }

    res.status(200).json({ message: "Plan deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete plan" });
  }
};

module.exports = { getPlans, createPlan, deletePlan };
