import pg from "pg"

async function main() {
  const rawUrl = process.env.POSTGRES_URL_NON_POOLING
  if (!rawUrl) throw new Error("POSTGRES_URL_NON_POOLING is required")

  const url = new URL(rawUrl)
  url.searchParams.delete("sslmode")
  const client = new pg.Client({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false },
  })

  await client.connect()
  let transactionOpen = false
  try {
    await client.query("begin")
    transactionOpen = true

    const sample = await client.query<{
      id: string
      product_id: string
      stock_quantity: number
      name: string
      price: string
      sku: string
      color: string
      size: string
    }>(`
      select pv.id, pv.product_id, pv.stock_quantity, p.name, p.price,
             pv.sku, pv.color, pv.size
      from public.product_variants pv
      join public.products p on p.id = pv.product_id
      where pv.stock_quantity >= 2
        and p.in_stock = true
        and coalesce(p.show_in_public_store, true) = true
      order by pv.stock_quantity desc
      limit 1
    `)
    const variant = sample.rows[0]
    if (!variant) throw new Error("No in-stock public variant is available for verification")

    const orderId = crypto.randomUUID()
    const orderNumber = `VERIFY-${Date.now()}`
    const price = Number(variant.price)
    await client.query(
      `
        insert into public.orders (
          id, order_number, customer_email, email, customer_name,
          shipping_first_name, shipping_last_name,
          billing_first_name, billing_last_name,
          shipping_address_line1, shipping_address_line2, shipping_city,
          shipping_state, shipping_postal_code, shipping_country, shipping_phone,
          billing_address_line1, billing_address_line2, billing_city,
          billing_state, billing_postal_code, billing_country,
          shipping_address, shipping_method, order_type,
          subtotal, shipping_cost, tax, discount, total, status,
          stripe_payment_intent_id, stripe_session_id, promo_code
        ) values (
          $1, $2, 'verification@ncwrestlingunited.com',
          'verification@ncwrestlingunited.com', 'Store Verification',
          'Store', 'Verification', 'Store', 'Verification',
          '2080 E Williams St', null, 'Apex', 'NC', '27539', 'US', null,
          '2080 E Williams St', null, 'Apex', 'NC', '27539', 'US',
          '{"address1":"2080 E Williams St","city":"Apex","state":"NC","zipCode":"27539"}'::jsonb,
          '{"id":"pickup","name":"Verification pickup","price":0}'::jsonb,
          'merchandise', $3, 0, 0, 0, $3, 'pending', null, null, null
        )
      `,
      [orderId, orderNumber, price],
    )

    await client.query(
      `
        insert into public.order_items (
          order_id, product_id, variant_id, product_name, sku, variant,
          color, size, quantity, price, subtotal, image_url
        ) values (
          $1, $2, $3, $4, $5,
          jsonb_build_object('color', $6::text, 'size', $7::text),
          $6, $7, 1, $8, $8, null
        )
      `,
      [
        orderId,
        variant.product_id,
        variant.id,
        variant.name,
        variant.sku,
        variant.color,
        variant.size,
        price,
      ],
    )

    await client.query("select public.reserve_store_order_inventory($1)", [orderId])
    const reserved = await client.query<{ status: string; quantity: number }>(
      "select status, quantity from public.store_inventory_reservations where order_id = $1",
      [orderId],
    )
    if (reserved.rows[0]?.status !== "pending" || reserved.rows[0]?.quantity !== 1) {
      throw new Error("Inventory reservation was not created correctly")
    }

    await client.query("select public.consume_store_order_inventory($1)", [orderId])
    const consumed = await client.query<{ status: string }>(
      "select status from public.store_inventory_reservations where order_id = $1",
      [orderId],
    )
    const stock = await client.query<{ stock_quantity: number }>(
      "select stock_quantity from public.product_variants where id = $1",
      [variant.id],
    )
    if (consumed.rows[0]?.status !== "consumed") {
      throw new Error("Inventory reservation was not consumed")
    }
    if (stock.rows[0]?.stock_quantity !== variant.stock_quantity - 1) {
      throw new Error("Inventory was not decremented exactly once")
    }

    await client.query("select public.consume_store_order_inventory($1)", [orderId])
    const idempotentStock = await client.query<{ stock_quantity: number }>(
      "select stock_quantity from public.product_variants where id = $1",
      [variant.id],
    )
    if (idempotentStock.rows[0]?.stock_quantity !== variant.stock_quantity - 1) {
      throw new Error("Repeated fulfillment decremented inventory more than once")
    }

    console.log("store inventory reservation verification passed (transaction rolled back)")
  } finally {
    if (transactionOpen) await client.query("rollback")
    await client.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
