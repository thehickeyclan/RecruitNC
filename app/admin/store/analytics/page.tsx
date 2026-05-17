"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  ArrowLeft, RefreshCw, DollarSign, ShoppingBag, TrendingUp, TrendingDown, 
  BarChart3, PieChart as PieChartIcon, Users, Calendar, Download
} from "lucide-react"
import { HardLink } from "@/components/hard-link"
import { createClient } from "@/lib/supabase/client"
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart
} from "recharts"

interface AnalyticsData {
  // Summary KPIs
  totalRevenue: number
  totalOrders: number
  avgOrderValue: number
  uniqueCustomers: number
  // Period comparisons
  revenueChange: number
  ordersChange: number
  // Charts data
  revenueOverTime: { date: string; revenue: number; orders: number }[]
  revenueByCategory: { name: string; revenue: number; orders: number; color: string }[]
  topProducts: { id: string; name: string; revenue: number; units: number; image_url: string | null }[]
  slowMovers: { id: string; name: string; lastSold: string | null; stock: number }[]
  ordersByDay: { day: string; count: number }[]
}

const CATEGORY_COLORS: Record<string, string> = {
  "Apparel": "#D3B574",
  "Drop-In": "#3B82F6",
  "Blue Sub": "#8B5CF6",
  "Tournament Fee": "#22C55E",
  "Other": "#6B7280",
}

export default function StoreAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("30d")

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  async function fetchAnalytics() {
    setLoading(true)
    const supabase = createClient()

    const now = new Date()
    const daysAgo = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 365 * 10
    const rangeStart = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
    const prevRangeStart = new Date(rangeStart.getTime() - daysAgo * 24 * 60 * 60 * 1000)

    // Fetch all orders
    const { data: orders } = await supabase
      .from("orders")
      .select("id, total, status, created_at, customer_email, shipping_method")
      .order("created_at", { ascending: false })

    // Fetch order items for product breakdown
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("order_id, product_id, quantity, price_at_purchase, products(id, name, image_url, category)")

    if (!orders) {
      setLoading(false)
      return
    }

    // Filter orders in range
    const ordersInRange = orders.filter(o => new Date(o.created_at) >= rangeStart)
    const ordersPrevPeriod = orders.filter(o => {
      const d = new Date(o.created_at)
      return d >= prevRangeStart && d < rangeStart
    })

    // Calculate KPIs
    const totalRevenue = ordersInRange.reduce((sum, o) => sum + (o.total || 0), 0)
    const totalOrders = ordersInRange.length
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
    const uniqueCustomers = new Set(ordersInRange.map(o => o.customer_email).filter(Boolean)).size

    const prevRevenue = ordersPrevPeriod.reduce((sum, o) => sum + (o.total || 0), 0)
    const prevOrders = ordersPrevPeriod.length
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0
    const ordersChange = prevOrders > 0 ? ((totalOrders - prevOrders) / prevOrders) * 100 : 0

    // Revenue over time
    const revenueByDate: Record<string, { revenue: number; orders: number }> = {}
    ordersInRange.forEach(order => {
      const date = new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      if (!revenueByDate[date]) revenueByDate[date] = { revenue: 0, orders: 0 }
      revenueByDate[date].revenue += order.total || 0
      revenueByDate[date].orders += 1
    })
    const revenueOverTime = Object.entries(revenueByDate)
      .map(([date, data]) => ({ date, ...data }))
      .slice(-30) // Last 30 data points max

    // Revenue by category
    const categoryRevenue: Record<string, { revenue: number; orders: number }> = {}
    ordersInRange.forEach(order => {
      const method = typeof order.shipping_method === "string" ? order.shipping_method : ""
      let category = "Apparel"
      if (method.toLowerCase().includes("blue")) category = "Blue Sub"
      else if (method.toLowerCase().includes("drop") || method.toLowerCase().includes("practice")) category = "Drop-In"
      else if (method.toLowerCase().includes("national") || method.toLowerCase().includes("tournament")) category = "Tournament Fee"
      
      if (!categoryRevenue[category]) categoryRevenue[category] = { revenue: 0, orders: 0 }
      categoryRevenue[category].revenue += order.total || 0
      categoryRevenue[category].orders += 1
    })
    const revenueByCategory = Object.entries(categoryRevenue)
      .map(([name, data]) => ({ name, ...data, color: CATEGORY_COLORS[name] || "#6B7280" }))
      .sort((a, b) => b.revenue - a.revenue)

    // Top products
    const productRevenue: Record<string, { name: string; revenue: number; units: number; image_url: string | null }> = {}
    const orderIdsInRange = new Set(ordersInRange.map(o => o.id))
    
    orderItems?.forEach((item: any) => {
      if (!orderIdsInRange.has(item.order_id)) return
      const product = item.products
      if (!product) return
      
      if (!productRevenue[product.id]) {
        productRevenue[product.id] = { name: product.name, revenue: 0, units: 0, image_url: product.image_url }
      }
      productRevenue[product.id].revenue += (item.price_at_purchase || 0) * (item.quantity || 1)
      productRevenue[product.id].units += item.quantity || 1
    })

    const topProducts = Object.entries(productRevenue)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Orders by day of week
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    const ordersByDayCount = [0, 0, 0, 0, 0, 0, 0]
    ordersInRange.forEach(order => {
      const day = new Date(order.created_at).getDay()
      ordersByDayCount[day]++
    })
    const ordersByDay = dayNames.map((day, i) => ({ day, count: ordersByDayCount[i] }))

    setData({
      totalRevenue,
      totalOrders,
      avgOrderValue,
      uniqueCustomers,
      revenueChange,
      ordersChange,
      revenueOverTime,
      revenueByCategory,
      topProducts,
      slowMovers: [],
      ordersByDay,
    })

    setLoading(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount / 100)
  }

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? "+" : ""
    return `${sign}${value.toFixed(1)}%`
  }

  return (
    <div className="min-h-screen bg-[#0A1628] p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              <HardLink href="/admin/store"><ArrowLeft className="h-4 w-4" /></HardLink>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Store Analytics</h1>
              <p className="text-white/60 mt-1">Revenue, orders, and product performance</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
              <TabsList className="bg-[#0f1c2e] border border-white/10">
                <TabsTrigger value="7d" className="data-[state=active]:bg-[#D3B574] data-[state=active]:text-[#0A1628] text-white/70">7D</TabsTrigger>
                <TabsTrigger value="30d" className="data-[state=active]:bg-[#D3B574] data-[state=active]:text-[#0A1628] text-white/70">30D</TabsTrigger>
                <TabsTrigger value="90d" className="data-[state=active]:bg-[#D3B574] data-[state=active]:text-[#0A1628] text-white/70">90D</TabsTrigger>
                <TabsTrigger value="all" className="data-[state=active]:bg-[#D3B574] data-[state=active]:text-[#0A1628] text-white/70">All</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" onClick={() => fetchAnalytics()} className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-white/40" />
          </div>
        ) : data && (
          <>
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-[#0f1c2e] border-white/10">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-white/70">Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-[#D3B574]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{formatCurrency(data.totalRevenue)}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {data.revenueChange >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-400" />
                    )}
                    <span className={data.revenueChange >= 0 ? "text-emerald-400 text-xs" : "text-red-400 text-xs"}>
                      {formatPercent(data.revenueChange)}
                    </span>
                    <span className="text-white/50 text-xs">vs prev period</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#0f1c2e] border-white/10">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-white/70">Orders</CardTitle>
                  <ShoppingBag className="h-4 w-4 text-[#D3B574]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{data.totalOrders}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {data.ordersChange >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-400" />
                    )}
                    <span className={data.ordersChange >= 0 ? "text-emerald-400 text-xs" : "text-red-400 text-xs"}>
                      {formatPercent(data.ordersChange)}
                    </span>
                    <span className="text-white/50 text-xs">vs prev period</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#0f1c2e] border-white/10">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-white/70">Avg Order Value</CardTitle>
                  <BarChart3 className="h-4 w-4 text-[#D3B574]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{formatCurrency(data.avgOrderValue)}</div>
                  <p className="text-xs text-white/50 mt-1">Per transaction</p>
                </CardContent>
              </Card>

              <Card className="bg-[#0f1c2e] border-white/10">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-white/70">Unique Customers</CardTitle>
                  <Users className="h-4 w-4 text-[#D3B574]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{data.uniqueCustomers}</div>
                  <p className="text-xs text-white/50 mt-1">By email</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Revenue Over Time */}
              <Card className="bg-[#0f1c2e] border-white/10 lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-white">Revenue Over Time</CardTitle>
                  <CardDescription className="text-white/50">Daily revenue trend</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.revenueOverTime}>
                        <defs>
                          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#D3B574" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#D3B574" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                        <XAxis dataKey="date" stroke="#ffffff50" fontSize={12} />
                        <YAxis stroke="#ffffff50" fontSize={12} tickFormatter={(v) => `$${(v/100).toFixed(0)}`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#0f1c2e", border: "1px solid #ffffff20", borderRadius: "8px" }}
                          labelStyle={{ color: "#ffffff" }}
                          formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#D3B574" strokeWidth={2} fill="url(#revenueGradient)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Revenue by Category */}
              <Card className="bg-[#0f1c2e] border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Revenue by Category</CardTitle>
                  <CardDescription className="text-white/50">Sales breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.revenueByCategory}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="revenue"
                        >
                          {data.revenueByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#0f1c2e", border: "1px solid #ffffff20", borderRadius: "8px" }}
                          formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {data.revenueByCategory.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-sm text-white/70">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-white">{formatCurrency(item.revenue)}</span>
                          <span className="text-xs text-white/50 ml-2">({item.orders} orders)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Orders by Day */}
              <Card className="bg-[#0f1c2e] border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Orders by Day of Week</CardTitle>
                  <CardDescription className="text-white/50">When customers order most</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.ordersByDay}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                        <XAxis dataKey="day" stroke="#ffffff50" fontSize={12} />
                        <YAxis stroke="#ffffff50" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#0f1c2e", border: "1px solid #ffffff20", borderRadius: "8px" }}
                          labelStyle={{ color: "#ffffff" }}
                        />
                        <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top Products */}
              <Card className="bg-[#0f1c2e] border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Top Products</CardTitle>
                  <CardDescription className="text-white/50">Best sellers by revenue</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="text-white/70">#</TableHead>
                        <TableHead className="text-white/70">Product</TableHead>
                        <TableHead className="text-white/70 text-center">Units</TableHead>
                        <TableHead className="text-white/70 text-right">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.topProducts.slice(0, 5).map((product, i) => (
                        <TableRow key={product.id} className="border-white/10 hover:bg-white/5">
                          <TableCell className="text-white/40 font-medium">{i + 1}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {product.image_url && (
                                <img src={product.image_url} alt="" className="w-8 h-8 rounded object-cover" />
                              )}
                              <span className="text-white text-sm truncate max-w-[150px]">{product.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-white/70">{product.units}</TableCell>
                          <TableCell className="text-right text-[#D3B574] font-semibold">{formatCurrency(product.revenue)}</TableCell>
                        </TableRow>
                      ))}
                      {data.topProducts.length === 0 && (
                        <TableRow className="border-white/10">
                          <TableCell colSpan={4} className="text-center py-8 text-white/50">
                            No product data available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
