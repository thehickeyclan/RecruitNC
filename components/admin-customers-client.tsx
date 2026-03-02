"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface AdminCustomer {
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

interface AdminCustomersClientProps {
  customers: AdminCustomer[]
}

function formatDate(value: string | undefined): string {
  if (!value) return "—"
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return String(value)
  }
}

function formatCurrency(value: number | undefined): string {
  if (value == null) return "—"
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
}

export function AdminCustomersClient({ customers }: AdminCustomersClientProps) {
  if (customers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No customers found.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customers</CardTitle>
        <p className="text-sm text-muted-foreground">
          {customers.length} customer{customers.length !== 1 ? "s" : ""}
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Total spent</TableHead>
                <TableHead>Last order</TableHead>
                <TableHead>First order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{row.email || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{row.phone || "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{row.location || "—"}</TableCell>
                  <TableCell className="text-right">{row.orders ?? "—"}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(row.total_spent)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(row.last_order_date)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(row.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
