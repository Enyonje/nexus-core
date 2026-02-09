import { stripe, createStripeCustomer } from "../utils/stripe.js";
import db from "../db/index.js"; // adjust to your DB import

async function backfillStripeCustomers() {
  try {
    // 1. Fetch all users missing stripe_customer_id
    const users = await db.users.find({ stripe_customer_id: null });

    console.log(`Found ${users.length} users without Stripe customers.`);

    for (const user of users) {
      try {
        // 2. Create Stripe customer
        const customerId = await createStripeCustomer(user);

        // 3. Save to DB
        await db.users.update(user.id, { stripe_customer_id: customerId });

        console.log(`✅ Backfilled user ${user.email} → ${customerId}`);
      } catch (err) {
        console.error(`❌ Failed for ${user.email}:`, err.message);
      }
    }

    console.log("Backfill complete.");
  } catch (err) {
    console.error("Migration failed:", err.message);
  }
}

backfillStripeCustomers();