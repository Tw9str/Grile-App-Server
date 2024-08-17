const stripe = require("../config/stripe");
const User = require("../models/User");
const Plan = require("../models/Plan");
const bcrypt = require("bcrypt");
const { sendEmail } = require("../utils/email");
const {
  generateRandomPassword,
  generateUniqueUsername,
} = require("../utils/helpers");

const STRIPE_REDIRECT_BASE_URL = process.env.STRIPE_REDIRECT_BASE_URL;

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
      metadata: {
        planId: plan._id.toString(),
      },
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
    const planId = checkoutSession.metadata.planId;

    const plan = await Plan.findById(planId);

    if (!plan) {
      console.error("Plan not found");
      return;
    }

    const planName = plan.name.toLowerCase();

    let user = await User.findOne({
      stripeCustomerId: checkoutSession.customer,
    });
    const customerEmail = checkoutSession.customer_details.email;

    if (!user && customerEmail) {
      user = await User.findOne({ email: customerEmail });

      if (user) {
        console.log(`User found by email! Updating plan to ${planName}...`);
        user.plan = planName;
        user.stripeCustomerId = checkoutSession.customer;
        await user.save();

        await sendPlanUpdateEmail(user.username, user.email, planName);
      } else {
        console.log("User not found by email! Creating a new user...");
        const randomPassword = generateRandomPassword();
        const hashedPassword = await bcrypt.hash(randomPassword, 10);
        let username = await generateUniqueUsername();

        const newUser = new User({
          username,
          email: customerEmail,
          password: hashedPassword,
          plan: planName,
          stripeCustomerId: checkoutSession.customer,
        });

        await newUser.save();
        console.log("New user created based on Stripe checkout session.");
        await sendNewAccountEmail(
          newUser.username,
          newUser.email,
          randomPassword
        );
      }
    } else if (user) {
      console.log(
        `User found by Stripe customer ID! Updating plan to ${planName}...`
      );
      user.plan = planName;
      console.log(planName);
      await user.save();

      await sendPlanUpdateEmail(user.username, user.email, planName);
    }
  } catch (err) {
    console.error("Error handling checkout session completed event:", err);
  }
};

// Refactored email functions with original styles and messages
const sendPlanUpdateEmail = async (username, email, plan) => {
  const subject = "Planul dvs. a fost actualizat";
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="ro">

    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Planul dvs. a fost actualizat</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }

            .container {
                max-width: 600px;
                margin: 20px auto;
                background-color: #ffffff;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            }

            h1 {
                color: #333333;
                font-size: 24px;
                text-align: center;
                margin-bottom: 20px;
            }

            p {
                color: #666666;
                line-height: 1.6;
                margin: 0 0 10px;
            }

            .plan-details {
                background-color: #dcfce7;
                padding: 10px;
                border-left: 4px solid #16a34a;
                margin: 20px 0;
            }

            .footer {
                text-align: center;
                color: #999999;
                font-size: 14px;
                margin-top: 20px;
            }

            .footer a {
                color: #007bff;
                text-decoration: none;
            }
        </style>
    </head>

    <body>
        <div class="container">
            <h1>Planul a fost actualizat cu succes</h1>
            <p>Bună <strong>${username}</strong>,</p>
            <p>Suntem încântați să vă informăm că planul dvs. a fost actualizat cu succes la <strong>${plan}</strong>.</p>
            <div class="plan-details">
                <p>Noul dvs. plan vine cu funcții și beneficii îmbunătățite, concepute pentru a vă oferi cea mai bună experiență posibilă.</p>
            </div>
            <p>Dacă aveți întrebări sau aveți nevoie de asistență suplimentară, nu ezitați să <a href="mailto:contact@grileinfo.ro">ne contactați</a>.</p>
            <p>Cu stimă,<br>Echipa grileinfo.ro</p>
            <div class="footer">
                <p>&copy; 2024 grileinfo.ro. Toate drepturile rezervate.</p>
            </div>
        </div>
    </body>

    </html>
    `;

  await sendEmail(email, subject, htmlContent)
    .then((info) => {
      console.log("Email sent successfully:", info.response);
    })
    .catch((error) => {
      console.error("Failed to send email after retries:", error);
    });
};

const sendNewAccountEmail = async (username, email, password) => {
  const subject = "Contul dvs. nou";
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="ro">

    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contul dvs. nou</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }

            .container {
                max-width: 600px;
                margin: 20px auto;
                background-color: #ffffff;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            }

            h1 {
                color: #333333;
                font-size: 24px;
                text-align: center;
                margin-bottom: 20px;
            }

            p {
                color: #666666;
                line-height: 1.6;
                margin: 0 0 10px;
            }

            .account-details {
                background-color: #dcfce7;
                padding: 10px;
                border-left: 4px solid #16a34a;
                margin: 20px 0;
            }

            .account-details p {
                margin: 5px 0;
                font-weight: bold;
            }

            .footer {
                text-align: center;
                color: #999999;
                font-size: 14px;
                margin-top: 20px;
            }

            .footer a {
                color: #007bff;
                text-decoration: none;
            }
        </style>
    </head>

    <body>
        <div class="container">
            <h1>Bun venit la grileinfo.ro!</h1>
            <p>Bună,</p>
            <p>Contul dvs. nou a fost creat cu succes. Mai jos sunt detaliile contului:</p>
            <div class="account-details">
                <p>Utilizator: <strong>${username}</strong></p>
                <p>Parolă: <strong>${password}</strong></p>
            </div>
            <p>Vă rugăm să vă asigurați că schimbați parola după prima autentificare pentru a vă menține contul în siguranță.</p>
            <p>Dacă aveți întrebări sau aveți nevoie de asistență, nu ezitați să <a href="mailto:contact@grileinfo.ro">ne contactați</a>.</p>
            <p>Cu stimă,<br>Echipa grileinfo.ro</p>
            <div class="footer">
                <p>&copy; 2024 grileinfo.ro. Toate drepturile rezervate.</p>
            </div>
        </div>
    </body>

    </html>
    `;

  await sendEmail(email, subject, htmlContent)
    .then((info) => {
      console.log("Email sent successfully:", info.response);
    })
    .catch((error) => {
      console.error("Failed to send email after retries:", error);
    });
};

const handleSubscriptionDeleted = async (subscription) => {
  const stripeCustomerId = subscription.customer;
  const user = await User.findOne({ stripeCustomerId });

  if (user) {
    user.plan = "free";
    await user.save();
    console.log(`Subscription deleted for user: ${user.email}`);
  }
};

const generateCustomerPortal = async (req, res) => {
  const { stripeCustomerId } = req.user;
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: STRIPE_REDIRECT_BASE_URL,
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
