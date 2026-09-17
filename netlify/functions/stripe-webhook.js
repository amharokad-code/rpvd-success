const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    const sig = event.headers["stripe-signature"];
    const rawBody = event.body;
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    const evt = stripe.webhooks.constructEvent(rawBody, sig, secret);

    if (evt.type === "charge.succeeded") {
      const charge = evt.data.object;
      const userId = charge.metadata.user_id;
      await supabase.from("users").update({ credits: 50 }).eq("id", userId);
    }

    return { statusCode: 200, body: JSON.stringify({ received: true }) };
  } catch (error) {
    console.error(error);
    return { statusCode: 400, body: JSON.stringify({ error: error.message }) };
  }
};
