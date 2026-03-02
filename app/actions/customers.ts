"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export type Customer = {
  id: string
  name?: string
  email?: string
  phone?: string
  location?: string
  orders?: number
  total_spent?: number
  last_order_date?: string
  created_at?: string
}

export async function getCustomers(): Promise<
  | { success: true; customers: Customer[] }
  | { success: false; error?: string }
> {
  try {
    const supabase = createAdminClient()

    const { data: orders, error } = await supabase
      .from("orders")
      .select("id, customer_email, customer_name, shipping_address, total, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      return { success: false, error: error.message }
    }

    const byEmail = new Map<
      string,
      {
        name?: string
        email: string
        phone?: string
        location?: string
        orders: number
        total_spent: number
        last_order_date?: string
        first_order_date?: string
      }
    >()

    for (const order of orders || []) {
      const email = (order.customer_email || "").trim().toLowerCase()
      if (!email || email === "unknown@example.com" || email === "no email") continue

      const existing = byEmail.get(email)
      const addr = (order.shipping_address as Record<string, unknown>) || {}
      const city = [addr.city, addr.shipping_city].find(Boolean) as string | undefined
      const state = [addr.state, addr.shipping_state].find(Boolean) as string | undefined
      const location =
        [city, state].filter(Boolean).length > 0
          ? [city, state].filter(Boolean).join(", ")
          : undefined
      const phone = (addr.phone ?? addr.shipping_phone) as string | undefined
      const orderTotal = Number(order.total ?? 0)
      const orderDate = order.created_at as string | undefined

      if (!existing) {
        byEmail.set(email, {
          name: (order.customer_name as string) || undefined,
          email: order.customer_email as string,
          phone: phone && String(phone).trim() ? String(phone).trim() : undefined,
          location,
          orders: 1,
          total_spent: orderTotal,
          last_order_date: orderDate,
          first_order_date: orderDate,
        })
      } else {
        existing.orders += 1
        existing.total_spent += orderTotal
        if (orderDate) {
          if (!existing.last_order_date || orderDate > existing.last_order_date) {
            existing.last_order_date = orderDate
          }
          if (!existing.first_order_date || orderDate < existing.first_order_date) {
            existing.first_order_date = orderDate
          }
        }
        if (phone && String(phone).trim() && !existing.phone) existing.phone = String(phone).trim()
        if (location && !existing.location) existing.location = location
        if (order.customer_name && !existing.name) existing.name = order.customer_name as string
      }
    }

    const customers: Customer[] = Array.from(byEmail.entries()).map(([email, data]) => ({
      id: email,
      name: data.name,
      email: data.email,
      phone: data.phone,
      location: data.location,
      orders: data.orders,
      total_spent: data.total_spent,
      last_order_date: data.last_order_date,
      created_at: data.first_order_date,
    }))

    customers.sort((a, b) => (b.last_order_date || "").localeCompare(a.last_order_date || ""))

    return { success: true, customers }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load customers"
    console.error("[customers] getCustomers:", err)
    return { success: false, error: message }
  }
}
