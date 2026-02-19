"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Loader2, Plus } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

type PromoRow = {
  id: string
  code: string
  type: string
  value: number
  stripe_coupon_id: string | null
  max_redemptions: number | null
  redemptions_count: number
  valid_from: string
  valid_until: string | null
  notes: string | null
  created_at: string
}

export default function AdminBluePromoCodesPage() {
  const [codes, setCodes] = useState<PromoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [code, setCode] = useState("")
  const [type, setType] = useState<"percent" | "fixed_amount" | "full_waiver">("percent")
  const [value, setValue] = useState("50")
  const [maxRedemptions, setMaxRedemptions] = useState("")
  const [validUntil, setValidUntil] = useState("")
  const [notes, setNotes] = useState("")
  const { toast } = useToast()

  const loadCodes = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/blue/promo-codes", { credentials: "include" })
      const data = await res.json()
      if (res.ok) setCodes(data.codes ?? [])
    } catch {
      toast({ title: "Failed to load codes", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCodes()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const codeTrim = code.trim().toUpperCase()
    if (!codeTrim) {
      toast({ title: "Enter a code", variant: "destructive" })
      return
    }
    const val = type === "full_waiver" ? 100 : parseFloat(value)
    if (!Number.isFinite(val) || val <= 0) {
      toast({ title: "Enter a valid value", variant: "destructive" })
      return
    }
    if (type === "percent" && val > 100) {
      toast({ title: "Percent cannot exceed 100", variant: "destructive" })
      return
    }
    setCreating(true)
    try {
      const res = await fetch("/api/admin/blue/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          code: codeTrim,
          type,
          value: val,
          max_redemptions: maxRedemptions.trim() ? parseInt(maxRedemptions, 10) : undefined,
          valid_until: validUntil.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: data.error || "Failed to create code", variant: "destructive" })
        setCreating(false)
        return
      }
      toast({ title: "Code created", description: `${codeTrim} is ready for use at checkout.` })
      setCode("")
      setValue("50")
      setMaxRedemptions("")
      setValidUntil("")
      setNotes("")
      loadCodes()
    } catch {
      toast({ title: "Failed to create code", variant: "destructive" })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/admin/blue"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-[#13294B]">Scholarship / promo codes</h1>
            <p className="text-sm text-gray-600">Create codes for Blue checkout. Parents enter the code on the registration form.</p>
          </div>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create code</CardTitle>
            <CardDescription>Code is created in Stripe as a coupon and applied when the parent enters it at checkout.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="space-y-2 min-w-[140px]">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="BLUE50"
                    disabled={creating}
                    maxLength={32}
                  />
                </div>
                <div className="space-y-2 min-w-[140px]">
                  <Label htmlFor="type">Type</Label>
                  <select
                    id="type"
                    value={type}
                    onChange={(e) => setType(e.target.value as "percent" | "fixed_amount" | "full_waiver")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    disabled={creating}
                  >
                    <option value="percent">Percent off</option>
                    <option value="fixed_amount">Fixed $ off</option>
                    <option value="full_waiver">100% off (full waiver)</option>
                  </select>
                </div>
                {type !== "full_waiver" && (
                  <div className="space-y-2 min-w-[120px]">
                    <Label htmlFor="value">{type === "percent" ? "Percent" : "Amount ($)"}</Label>
                    <Input
                      id="value"
                      type="number"
                      min={1}
                      max={type === "percent" ? 100 : 10000}
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      disabled={creating}
                    />
                  </div>
                )}
                <div className="space-y-2 min-w-[120px]">
                  <Label htmlFor="maxRedemptions">Max uses (optional)</Label>
                  <Input
                    id="maxRedemptions"
                    type="number"
                    min={1}
                    value={maxRedemptions}
                    onChange={(e) => setMaxRedemptions(e.target.value)}
                    placeholder="Unlimited"
                    disabled={creating}
                  />
                </div>
                <div className="space-y-2 min-w-[160px]">
                  <Label htmlFor="validUntil">Valid until (optional)</Label>
                  <Input
                    id="validUntil"
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    disabled={creating}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Smith family scholarship"
                  disabled={creating}
                  className="max-w-md"
                />
              </div>
              <Button type="submit" disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                <span className="ml-2">Create code</span>
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Existing codes</CardTitle>
            <CardDescription>Redemptions increment when a parent uses the code at checkout.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#13294B]" />
              </div>
            ) : codes.length === 0 ? (
              <p className="py-8 text-center text-gray-500">No codes yet. Create one above.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Uses</TableHead>
                    <TableHead>Valid until</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono font-medium">{row.code}</TableCell>
                      <TableCell>{row.type.replace("_", " ")}</TableCell>
                      <TableCell>{row.type === "percent" ? `${row.value}%` : row.type === "full_waiver" ? "100%" : `$${row.value}`}</TableCell>
                      <TableCell>{row.redemptions_count}{row.max_redemptions != null ? ` / ${row.max_redemptions}` : ""}</TableCell>
                      <TableCell className="text-sm text-gray-600">{row.valid_until ? new Date(row.valid_until).toLocaleDateString() : "—"}</TableCell>
                      <TableCell className="max-w-[160px] truncate text-gray-600" title={row.notes ?? undefined}>{row.notes || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
