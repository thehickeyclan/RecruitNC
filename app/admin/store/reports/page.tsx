"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Download, RefreshCw, Shirt, TrendingUp } from "lucide-react"
import { HardLink } from "@/components/hard-link"
import { formatCurrency } from "@/lib/admin-data"
import {
  storeSalesReportToCsv,
  type StoreProductFamily,
  type StoreSalesReport,
} from "@/lib/store/sales-report"

const FAMILY_LABELS: Record<Exclude<StoreProductFamily, "all">, string> = {
  singlet: "Singlets",
  tee: "Tees",
  shorts: "Shorts",
  sweatshirt: "Sweatshirts",
  headwear: "Headwear",
  accessories: "Accessories",
  other: "Other",
}

const YEAR_OPTIONS = ["ytd", "2026", "2025", "2024", "all"] as const

export default function StoreSalesReportsPage() {
  const [report, setReport] = useState<StoreSalesReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState<string>("ytd")
  const [family, setFamily] = useState<StoreProductFamily>("all")
  const [size, setSize] = useState<string>("all")

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ year, family })
      if (size !== "all") params.set("size", size)
      const res = await fetch(`/api/admin/store/sales-report?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to load report")
      const data = (await res.json()) as StoreSalesReport
      setReport(data)
    } catch (err) {
      console.error("[RecruitNC] store sales report:", err)
      setReport(null)
    } finally {
      setLoading(false)
    }
  }, [year, family, size])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const sizeOptions = useMemo(() => {
    if (!report) return []
    return report.bySize.map((row) => row.size).filter((s) => s && s !== "—")
  }, [report])

  const headline = useMemo(() => {
    if (!report) return null
    const familyLabel =
      family === "all" ? "store merchandise" : FAMILY_LABELS[family as Exclude<StoreProductFamily, "all">]
    if (size !== "all") {
      return `${report.summary.units.toLocaleString()} size ${size} ${familyLabel} · ${formatCurrency(report.summary.revenue)}`
    }
    if (family === "singlet" && report.topByUnits[0]) {
      return `Best-selling singlet: ${report.topByUnits[0].name} (${report.topByUnits[0].units} sold)`
    }
    if (family === "tee" && report.topByRevenue[0]) {
      return `Top tee by revenue: ${report.topByRevenue[0].name} (${formatCurrency(report.topByRevenue[0].revenue)})`
    }
    return `${report.summary.units.toLocaleString()} units · ${report.summary.orders.toLocaleString()} orders · ${formatCurrency(report.summary.revenue)}`
  }, [report, family, size])

  function downloadCsv() {
    if (!report) return
    const csv = storeSalesReportToCsv(report)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `store-sales-${year}-${family}${size !== "all" ? `-size-${size}` : ""}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-[#0A1628] p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              <HardLink href="/admin/store">
                <ArrowLeft className="h-4 w-4" />
              </HardLink>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Store Sales Reports</h1>
              <p className="text-white/60 mt-1">
                Merchandise only — units and revenue by product, size, and category
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={downloadCsv}
              disabled={!report || loading}
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              onClick={fetchReport}
              disabled={loading}
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs value={year} onValueChange={setYear}>
            <TabsList className="bg-[#0f1c2e] border border-white/10 flex-wrap h-auto">
              {YEAR_OPTIONS.map((y) => (
                <TabsTrigger
                  key={y}
                  value={y}
                  className="data-[state=active]:bg-[#D3B574] data-[state=active]:text-[#0A1628] text-white/70"
                >
                  {y === "ytd" ? "YTD" : y === "all" ? "All" : y}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap gap-2">
            <Select value={family} onValueChange={(v) => setFamily(v as StoreProductFamily)}>
              <SelectTrigger className="w-[160px] bg-[#0f1c2e] border-white/10 text-white">
                <SelectValue placeholder="Product type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All merchandise</SelectItem>
                {(Object.keys(FAMILY_LABELS) as Array<Exclude<StoreProductFamily, "all">>).map((key) => (
                  <SelectItem key={key} value={key}>
                    {FAMILY_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={size} onValueChange={setSize}>
              <SelectTrigger className="w-[140px] bg-[#0f1c2e] border-white/10 text-white">
                <SelectValue placeholder="Size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sizes</SelectItem>
                {sizeOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-white/40" />
          </div>
        ) : report ? (
          <>
            <Card className="bg-[#0f1c2e] border-white/10">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm text-white/50">{report.range.label} · paid store orders</p>
                    <p className="text-xl font-semibold text-white mt-1">{headline}</p>
                  </div>
                  <Badge variant="outline" className="border-[#D3B574]/40 text-[#D3B574] w-fit">
                    {report.summary.lineCount} line items
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-4">
              <SummaryCard label="Revenue" value={formatCurrency(report.summary.revenue)} icon={TrendingUp} />
              <SummaryCard label="Units sold" value={report.summary.units.toLocaleString()} icon={Shirt} />
              <SummaryCard label="Orders" value={report.summary.orders.toLocaleString()} icon={Shirt} />
              <SummaryCard
                label="Unique products"
                value={String(new Set(report.byProductAndSize.map((r) => r.name)).size)}
                icon={Shirt}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <RankingCard
                title="Top 10 by revenue"
                description="Best sellers in dollars for this filter"
                rows={report.topByRevenue}
              />
              <RankingCard
                title="Top 10 by units"
                description="Most quantity sold for this filter"
                rows={report.topByUnits}
                showUnitsFirst
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="bg-[#0f1c2e] border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Sales by size</CardTitle>
                  <CardDescription className="text-white/50">
                    e.g. how many Medium singlets this period
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="text-white/70">Size</TableHead>
                        <TableHead className="text-white/70 text-center">Units</TableHead>
                        <TableHead className="text-white/70 text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.bySize.length === 0 ? (
                        <TableRow className="border-white/10">
                          <TableCell colSpan={3} className="text-center py-8 text-white/50">
                            No sized merchandise in this filter
                          </TableCell>
                        </TableRow>
                      ) : (
                        report.bySize.map((row) => (
                          <TableRow key={row.size} className="border-white/10 hover:bg-white/5">
                            <TableCell className="text-white font-medium">{row.size}</TableCell>
                            <TableCell className="text-center text-white/80">{row.units}</TableCell>
                            <TableCell className="text-right text-[#D3B574]">{formatCurrency(row.revenue)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className="bg-[#0f1c2e] border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Product + size detail</CardTitle>
                  <CardDescription className="text-white/50">
                    Specific SKU-level breakdown (top 100 rows)
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0 max-h-[420px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="text-white/70">Product</TableHead>
                        <TableHead className="text-white/70 text-center">Size</TableHead>
                        <TableHead className="text-white/70 text-center">Qty</TableHead>
                        <TableHead className="text-white/70 text-right">$</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.byProductAndSize.map((row, idx) => (
                        <TableRow key={`${row.name}-${row.size}-${row.color}-${idx}`} className="border-white/10 hover:bg-white/5">
                          <TableCell className="text-white text-sm">
                            <div className="truncate max-w-[220px]" title={row.name}>
                              {row.name}
                            </div>
                            {row.color ? (
                              <div className="text-xs text-white/50">{row.color}</div>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-center text-white/80">{row.size}</TableCell>
                          <TableCell className="text-center text-white/80">{row.units}</TableCell>
                          <TableCell className="text-right text-[#D3B574]">{formatCurrency(row.revenue)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <Card className="bg-[#0f1c2e] border-white/10">
            <CardContent className="py-12 text-center text-white/50">Could not load sales report.</CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: typeof TrendingUp
}) {
  return (
    <Card className="bg-[#0f1c2e] border-white/10">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-white/70">{label}</CardTitle>
        <Icon className="h-4 w-4 text-[#D3B574]" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
      </CardContent>
    </Card>
  )
}

function RankingCard({
  title,
  description,
  rows,
  showUnitsFirst,
}: {
  title: string
  description: string
  rows: StoreSalesReport["topByRevenue"]
  showUnitsFirst?: boolean
}) {
  return (
    <Card className="bg-[#0f1c2e] border-white/10">
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
        <CardDescription className="text-white/50">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-white/70 w-8">#</TableHead>
              <TableHead className="text-white/70">Product</TableHead>
              <TableHead className="text-white/70 text-center">Units</TableHead>
              <TableHead className="text-white/70 text-right">Revenue</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="border-white/10">
                <TableCell colSpan={4} className="text-center py-8 text-white/50">
                  No products in this filter
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, i) => (
                <TableRow key={`${row.productId ?? row.name}-${i}`} className="border-white/10 hover:bg-white/5">
                  <TableCell className="text-white/40">{i + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-0">
                      {row.imageUrl ? (
                        <img src={row.imageUrl} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                      ) : null}
                      <div className="min-w-0">
                        <div className="text-white text-sm truncate max-w-[180px]" title={row.name}>
                          {row.name}
                        </div>
                        <div className="text-xs text-white/50 capitalize">{row.family}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className={`text-center ${showUnitsFirst ? "text-white font-semibold" : "text-white/70"}`}>
                    {row.units}
                  </TableCell>
                  <TableCell className={`text-right ${showUnitsFirst ? "text-[#D3B574]" : "text-[#D3B574] font-semibold"}`}>
                    {formatCurrency(row.revenue)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
