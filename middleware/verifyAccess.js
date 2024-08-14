const mongoose = require("mongoose");
const User = require("../models/User");
const Category = require("../models/Category");
const PLAN_ORDER = ["free", "basic", "premium"];

const verifyAccess = (model, isCategoryCheck = false) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userPlan = user.plan;
      const userPlanIndex = PLAN_ORDER.indexOf(userPlan);

      let content;

      if (isCategoryCheck) {
        const { title } = req.params;
        content = await Category.findOne({ title });

        if (!content) {
          return res.status(404).json({ message: "Category not found" });
        }
      } else {
        const contentIdentifier = req.params.id || req.params.slug;

        if (mongoose.Types.ObjectId.isValid(contentIdentifier)) {
          content = await model
            .findOne({
              $or: [{ _id: contentIdentifier }, { slug: contentIdentifier }],
            })
            .exec();
        } else {
          content = await model.findOne({ slug: contentIdentifier }).exec();
        }

        if (!content) {
          return res.status(404).json({ message: "Content not found" });
        }
      }

      const contentPlanIndex = PLAN_ORDER.indexOf(content.plan);

      if (userPlanIndex >= contentPlanIndex) {
        next();
      } else {
        return res.status(403).json({
          message: `This content requires a ${content.plan} plan. Please upgrade to access.`,
          plan: content.plan,
        });
      }
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };
};

module.exports = verifyAccess;
