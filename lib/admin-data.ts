// Admin dashboard types and helpers

/** Display category for orders list and reporting. Synced with Stripe/product source. */
export type OrderCategory = "Apparel" | "Blue Sub" | "Drop-In" | "Tournament Fee" | "Donation" | "Other"

export interface Order {
  id: string
  orderNumber: string
  customerName: string
  customerEmail: string
  date: Date
  status: "pending" | "paid" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded"
  items: number
  total: number
  /** Human-readable category for filters and display. */
  category: OrderCategory
  /** Product names from order_items for "what they ordered" display. */
  productSummary: string
  orderType?: "product" | "practice-dropin"
  shippingAddress?: {
    line1: string
    line2?: string | null
    city: string
    state: string
    zip: string
    country: string
    phone?: string | null
  }
  shippingMethod?: string
  phone?: string | null
}

export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  location: string
  orders: number
  totalSpent: number
  lastOrderDate: Date
}

export interface PromoCode {
  id: string
  code: string
  type: "percentage" | "fixed" | "free_shipping"
  value: number
  usage: number
  limit: number | null
  startDate: Date
  endDate: Date | null
  active: boolean
}

/** Badge variant for order status. */
export function getStatusColor(
  status: Order["status"]
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "shipped":
    case "delivered":
    case "paid":
      return "default"
    case "processing":
    case "pending":
      return "secondary"
    case "cancelled":
    case "refunded":
      return "destructive"
    default:
      return "outline"
  }
}

/** Format currency for display. */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

/** Format a date only (e.g. "Jan 15, 2025"). */
export function formatDate(date: Date | string | null | undefined): string {
  if (date == null) return "N/A"
  const d = typeof date === "string" ? new Date(date) : date
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "Invalid Date"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d)
}

/** Format date and time (e.g. "Jan 15, 2025, 2:30 PM"). */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (date == null) return "N/A"
  const d = typeof date === "string" ? new Date(date) : date
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "Invalid Date"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d)
}
