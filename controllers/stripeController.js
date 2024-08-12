const stripe = require("../config/stripe");
const User = require("../models/User");
const Plan = require("../models/Plan");
const bcrypt = require("bcrypt");
const { sendEmail } = require("../utils/email");
const {
  generateRandomPassword,
  generateUniqueUsername,
} = require("../utils/helpers");

const STRIPE_REDIRECT_BASE_URL = process.env.BASE_URL;

const checkout = async (req, res) => {
  const { planId, stripeCustomerId } = req.body;

  try {
    const plan = await Plan.findById(planId);

    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }

    const lineItems = [
      {
        price_data: {
          currency: plan.currency,
          product_data: {
            name: plan.name,
            description: plan.description,
          },
          unit_amount: plan.price * 100,
          recurring: {
            interval: "month",
          },
        },
        quantity: 1,
      },
    ];

    const sessionData = {
      billing_address_collection: "auto",
      line_items: lineItems,
      mode: "subscription",
      success_url: `${STRIPE_REDIRECT_BASE_URL}`,
      cancel_url: `${STRIPE_REDIRECT_BASE_URL}`,
    };

    if (stripeCustomerId) {
      sessionData.customer = stripeCustomerId;
    }

    const session = await stripe.checkout.sessions.create(sessionData);
    res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred during checkout." });
  }
};

const webhook = async (request, response) => {
  let event = request.body;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (webhookSecret) {
    const signature = request.headers["stripe-signature"];
    try {
      event = stripe.webhooks.constructEvent(
        request.body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`, err.message);
      return response.sendStatus(400);
    }
  }

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(event.data.object);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object);
      break;
    default:
      console.log(`Unhandled event type ${event.type}.`);
  }

  response.send();
};

const handleCheckoutSessionCompleted = async (checkoutSession) => {
  try {
    let user = await User.findOne({
      stripeCustomerId: checkoutSession.customer,
    });
    const customerEmail = checkoutSession.customer_details.email;

    if (!user && customerEmail) {
      user = await User.findOne({ email: customerEmail });

      if (user) {
        console.log("User found by email! Updating plan to premium...");
        user.plan = "premium";
        user.stripeCustomerId = checkoutSession.customer;
        await user.save();

        await sendEmail(
          user.email,
          "Your Plan Has Been Updated",
          `<p>Hello <strong>${user.username}</strong>,</p>
                  <p>Your plan has been successfully updated to <strong>premium</strong>.</p>
                  <p>Best regards,<br>grileinfo.ro</p>`
        );
      } else {
        console.log("User not found by email! Creating a new user...");
        const randomPassword = generateRandomPassword();
        const hashedPassword = await bcrypt.hash(randomPassword, 10);
        let username = await generateUniqueUsername();

        const newUser = new User({
          username,
          email: customerEmail,
          password: hashedPassword,
          plan: "premium",
          stripeCustomerId: checkoutSession.customer,
        });

        await newUser.save();
        console.log("New user created based on Stripe checkout session.");

        await sendEmail(
          newUser.email,
          "Your New Account",
          `<p>Hello,</p>
                     <p>Your account has been created with the username: <strong>${newUser.username}</strong>.</p>
                     <p>Your password is: <strong>${randomPassword}</strong></p>
                     <p>Please change your password after logging in for the first time.</p>
                     <p>Best regards,<br>grileinfo.ro</p>`
        );
      }
    } else if (user) {
      console.log(
        "User found by Stripe customer ID! Updating plan to premium..."
      );
      user.plan = "premium";
      await user.save();

      await sendEmail(
        user.email,
        "Your Plan Has Been Updated",
        `<p>Hello <strong>${user.username}</strong>,</p>
                <p>Your plan has been successfully updated to <strong>premium</strong>.</p>
                <p>Best regards,<br>Your Company Name</p>`
      );
    }
  } catch (err) {
    console.log("Error handling checkout session completed event:", err);
  }
};

const handleSubscriptionDeleted = async (subscription) => {
  const stripeCustomerId = subscription.customer;
  const user = await User.findOne({ stripeCustomerId });

  if (user) {
    console.log(`Subscription deleted for user: ${user.email}`);
    // Handle user plan update or deletion logic
  }
};

const generateCustomerPortal = async (req, res) => {
  const { stripeCustomerId } = req.user;
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.BASE_URL}/dashboard`,
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.log("Error generating customer portal session: ", err);
    res.status(500).json({
      error: "An error occurred while generating the customer portal.",
    });
  }
};

module.exports = { checkout, webhook, generateCustomerPortal };
