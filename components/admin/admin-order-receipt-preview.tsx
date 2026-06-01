import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatDateTime } from "@/lib/admin-data"
import type { OrderReceiptPreview } from "@/lib/store/order-receipt-preview"
import { Mail } from "lucide-react"

export function AdminOrderReceiptPreview({ receipt }: { receipt: OrderReceiptPreview }) {
  return (
    <Card className="border-[#003366]/20 h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">Customer receipt</CardTitle>
          {receipt.sentAt ? (
            <Badge variant="outline" className="text-xs shrink-0 border-green-600/40 text-green-800">
              <Mail className="h-3 w-3 mr-1" />
              Emailed
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs shrink-0 text-muted-foreground">
              Not sent yet
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Exact copy of the order confirmation email — product names, sizes, and quantities.
        </p>
        {receipt.sentAt && receipt.sentToEmail ? (
          <p className="text-xs text-muted-foreground" suppressHydrationWarning>
            Sent to {receipt.sentToEmail} · {formatDateTime(new Date(receipt.sentAt))}
          </p>
        ) : receipt.customerEmail && !receipt.customerEmail.includes("placeholder") ? (
          <p className="text-xs text-muted-foreground">Will send to {receipt.customerEmail} when eligible</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-[#003366] px-3 py-2 text-center">
          <p className="text-sm font-semibold text-white">NC United Store</p>
        </div>
        <div className="text-sm space-y-1">
          <p>
            Hi <span className="font-medium">{receipt.customerName}</span>,
          </p>
          <p>
            Order <strong>{receipt.orderNumber}</strong>
          </p>
        </div>

        {receipt.items.length === 0 ? (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            No line items on this receipt — totals only. Verify with customer before fulfilling.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-left py-2 pr-2 font-medium">Item</th>
                  <th className="text-center py-2 px-2 font-medium w-12">Qty</th>
                  <th className="text-right py-2 pl-2 font-medium w-16">Price</th>
                </tr>
              </thead>
              <tbody>
                {receipt.items.map((item, idx) => (
                  <tr key={`${item.lineLabel}-${idx}`} className="border-b border-muted/50 last:border-0">
                    <td className="py-2 pr-2 align-top">{item.lineLabel}</td>
                    <td className="py-2 px-2 text-center align-top">{item.quantity}</td>
                    <td className="py-2 pl-2 text-right align-top whitespace-nowrap">
                      {formatCurrency(item.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="text-sm space-y-1 border-t pt-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(receipt.subtotal)}</span>
          </div>
          {receipt.shipping > 0 ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>{formatCurrency(receipt.shipping)}</span>
            </div>
          ) : null}
          {receipt.tax > 0 ? (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{formatCurrency(receipt.tax)}</span>
            </div>
          ) : null}
          {receipt.discount > 0 ? (
            <div className="flex justify-between text-green-700">
              <span>Discount</span>
              <span>-{formatCurrency(receipt.discount)}</span>
            </div>
          ) : null}
          <div className="flex justify-between font-bold pt-1">
            <span>Total</span>
            <span>{formatCurrency(receipt.total)}</span>
          </div>
        </div>

        {receipt.shippingAddressPlain ? (
          <div className="text-sm border-t pt-3">
            <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Shipping to</p>
            <p>{receipt.shippingAddressPlain}</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground border-t pt-3">No shipping address on receipt.</p>
        )}
      </CardContent>
    </Card>
  )
}
