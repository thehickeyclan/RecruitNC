/**
 * One-time script to create the NC United Blue product and $55/month price in Stripe.
 * Run: node scripts/create-stripe-blue-product.js
 * Requires: STRIPE_SECRET_KEY in .env.local, .env, or environment
 */

const fs = require("fs")
const path = require("path")

for (const file of [".env.local", ".env"]) {
  const p = path.resolve(process.cwd(), file)
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, "utf8")
    for (const line of content.split("\n")) {
      const m = line.match(/^\s*STRIPE_SECRET_KEY\s*=\s*(.+)\s*$/)
      if (m) process.env.STRIPE_SECRET_KEY = m[1].replace(/^["']|["']$/g, "").trim()
    }
    if (process.env.STRIPE_SECRET_KEY) break
  }
}

const Stripe = require("stripe")

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY
if (!STRIPE_SECRET_KEY) {
  console.error("Missing STRIPE_SECRET_KEY. Set it in .env.local or .env")
  process.exit(1)
}

const stripe = new Stripe(STRIPE_SECRET_KEY)

async function main() {
  const product = await stripe.products.create({
    name: "NC United Blue",
    description: "Monthly membership for NC United Blue wrestling program. Practices Sundays 1–3 PM at UNC Fetzer Hall, Chapel Hill.",
  })
  console.log("Created product:", product.id, product.name)

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 5500, // $55.00 in cents
    currency: "usd",
    recurring: { interval: "month" },
  })
  console.log("Created price:", price.id, "$55.00/month")

  console.log("\nAdd to your .env.local:")
  console.log("STRIPE_BLUE_PRICE_ID=" + price.id)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
