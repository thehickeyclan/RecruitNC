"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export interface AdminPromoCode {
  id: string
  code: string
  type: "percentage" | "fixed" | "free_shipping"
  value: number
  usage: number
  limit: number | null
  start_date: string | null
  end_date: string | null
  active: boolean
  created_at: string | null
  min_order_value?: number | null
  max_uses_per_customer?: number | null
}

interface AdminPromoCodesClientProps {
  promoCodes: AdminPromoCode[]
}

function formatDate(value: string | null): string {
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

function formatType(type: string): string {
  if (type === "percentage") return "Percentage"
  if (type === "fixed") return "Fixed"
  if (type === "free_shipping") return "Free shipping"
  return type
}

function formatValue(type: string, value: number): string {
  if (type === "percentage") return `${value}%`
  if (type === "fixed") return `$${value.toFixed(2)}`
  if (type === "free_shipping") return "—"
  return String(value)
}

export function AdminPromoCodesClient({ promoCodes }: AdminPromoCodesClientProps) {
  if (promoCodes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Promo codes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No promo codes found.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Promo codes</CardTitle>
        <p className="text-sm text-muted-foreground">
          {promoCodes.length} code{promoCodes.length !== 1 ? "s" : ""}
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Usage</TableHead>
                <TableHead className="text-right">Limit</TableHead>
                <TableHead>Valid from</TableHead>
                <TableHead>Valid until</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promoCodes.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono font-medium">{row.code}</TableCell>
                  <TableCell>{formatType(row.type)}</TableCell>
                  <TableCell className="text-right">
                    {formatValue(row.type, row.value)}
                  </TableCell>
                  <TableCell className="text-right">{row.usage}</TableCell>
                  <TableCell className="text-right">
                    {row.limit == null ? "—" : row.limit}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(row.start_date)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(row.end_date)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.active ? "default" : "secondary"}>
                      {row.active ? "Active" : "Inactive"}
                    </Badge>
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
