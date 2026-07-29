"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ShoppingBag, Package, Ticket, ArrowRight, ArrowLeft, DollarSign, 
  TrendingUp, TrendingDown, Users, Clock, CheckCircle, Truck, 
  AlertTriangle, BarChart3, PackageCheck, RefreshCw, Wand2
} from "lucide-react"
import { HardLink } from "@/components/hard-link"
import { createClient } from "@/lib/supabase/client"
import { orderItemLineRevenue, orderItemUnits } from "@/lib/store/order-item-revenue"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell } from "recharts"

interface DashboardStats {
  totalRevenue: number
  totalOrders: number
  avgOrderValue: number
  fulfillmentRate: number
  pendingOrders: number
  processingOrders: number
  shippedOrders: number
  deliveredOrders: number
  revenue30d: number
  orders30d: number
  revenue7d: number
  orders7d: number
  lowStockCount: number
  outOfStockCount: number
}

interface RevenueDataPoint {
  date: string
  revenue: number
  orders: number
}

interface TopProduct {
  id: string
  name: string
  revenue: number
  unitsSold: number
  image_url: string | null
}

const STATUS_COLORS = {
  pending: "#EAB308",
  processing: "#3B82F6", 
  shipped: "#8B5CF6",
  delivered: "#22C55E",
}

export default function AdminStoreHubPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [timeRange])

  async function fetchDashboardData() {
    setLoading(true)
    const supabase = createClient()

    // Fetch order stats
    const { data: orders } = await supabase
      .from("orders")
      .select("id, total, status, created_at")

    const now = new Date()
    const days30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const days7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const daysAgo = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90
    const rangeStart = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)

    if (orders) {
      const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0)
      const totalOrders = orders.length
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
      const deliveredCount = orders.filter(o => o.status === "delivered").length
      const fulfillmentRate = totalOrders > 0 ? (deliveredCount / totalOrders) * 100 : 0

      const orders30d = orders.filter(o => new Date(o.created_at) >= days30Ago)
      const orders7d = orders.filter(o => new Date(o.created_at) >= days7Ago)

      setStats({
        totalRevenue,
        totalOrders,
        avgOrderValue,
        fulfillmentRate,
        pendingOrders: orders.filter(o => o.status === "pending").length,
        processingOrders: orders.filter(o => o.status === "processing").length,
        shippedOrders: orders.filter(o => o.status === "shipped").length,
        deliveredOrders: deliveredCount,
        revenue30d: orders30d.reduce((sum, o) => sum + (o.total || 0), 0),
        orders30d: orders30d.length,
        revenue7d: orders7d.reduce((sum, o) => sum + (o.total || 0), 0),
        orders7d: orders7d.length,
        lowStockCount: 0,
        outOfStockCount: 0,
      })

      // Build revenue chart data
      const revenueByDate: Record<string, { revenue: number; orders: number }> = {}
      const ordersInRange = orders.filter(o => new Date(o.created_at) >= rangeStart)
      
      ordersInRange.forEach(order => {
        const date = new Date(order.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        if (!revenueByDate[date]) {
          revenueByDate[date] = { revenue: 0, orders: 0 }
        }
        revenueByDate[date].revenue += order.total || 0
        revenueByDate[date].orders += 1
      })

      const chartData = Object.entries(revenueByDate)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      
      setRevenueData(chartData)
    }

    // Fetch top products by revenue
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("product_id, quantity, price, subtotal, price_at_purchase, products(id, name, image_url)")

    if (orderItems) {
      const productRevenue: Record<string, { name: string; revenue: number; unitsSold: number; image_url: string | null }> = {}
      
      orderItems.forEach((item: any) => {
        const productId = item.product_id
        const product = item.products
        if (!product) return
        
        if (!productRevenue[productId]) {
          productRevenue[productId] = { 
            name: product.name, 
            revenue: 0, 
            unitsSold: 0,
            image_url: product.image_url
          }
        }
        productRevenue[productId].revenue += orderItemLineRevenue(item)
        productRevenue[productId].unitsSold += orderItemUnits(item)
      })

      const sorted = Object.entries(productRevenue)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
      
      setTopProducts(sorted)
    }

    // Fetch inventory alerts
    const { data: variants } = await supabase
      .from("product_variants")
      .select("stock_quantity")

    if (variants) {
      const lowStock = variants.filter((v: any) => v.stock_quantity > 0 && v.stock_quantity <= 5).length
      const outOfStock = variants.filter((v: any) => v.stock_quantity === 0).length
      setStats(prev => prev ? { ...prev, lowStockCount: lowStock, outOfStockCount: outOfStock } : null)
    }

    setLoading(false)
  }

  // orders.total and order_items line values are stored in DOLLARS, not cents.
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
  }

  const pipelineData = stats ? [
    { name: "Pending", value: stats.pendingOrders, color: STATUS_COLORS.pending },
    { name: "Processing", value: stats.processingOrders, color: STATUS_COLORS.processing },
    { name: "Shipped", value: stats.shippedOrders, color: STATUS_COLORS.shipped },
    { name: "Delivered", value: stats.deliveredOrders, color: STATUS_COLORS.delivered },
  ] : []

  return (
    <div className="min-h-screen bg-[#0A1628] p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              <HardLink href="/admin"><ArrowLeft className="h-4 w-4" /></HardLink>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white">Store Dashboard</h1>
              <p className="text-white/60 mt-1">Revenue, orders, inventory, and fulfillment at a glance</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => fetchDashboardData()}
            className="bg-white/5 border-white/10 text-white hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-white/40" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <Card className="bg-[#0f1c2e] border-white/10">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-white/70">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-[#D3B574]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{formatCurrency(stats?.totalRevenue || 0)}</div>
                  <p className="text-xs text-white/50 mt-1">
                    <span className="text-emerald-400">{formatCurrency(stats?.revenue30d || 0)}</span> last 30 days
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#0f1c2e] border-white/10">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-white/70">Total Orders</CardTitle>
                  <ShoppingBag className="h-4 w-4 text-[#D3B574]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{stats?.totalOrders || 0}</div>
                  <p className="text-xs text-white/50 mt-1">
                    <span className="text-emerald-400">+{stats?.orders30d || 0}</span> last 30 days
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-[#0f1c2e] border-white/10">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-white/70">Avg Order Value</CardTitle>
                  <BarChart3 className="h-4 w-4 text-[#D3B574]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{formatCurrency(stats?.avgOrderValue || 0)}</div>
                  <p className="text-xs text-white/50 mt-1">Per transaction</p>
                </CardContent>
              </Card>

              <Card className="bg-[#0f1c2e] border-white/10">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-white/70">Fulfillment Rate</CardTitle>
                  <PackageCheck className="h-4 w-4 text-[#D3B574]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{(stats?.fulfillmentRate || 0).toFixed(1)}%</div>
                  <p className="text-xs text-white/50 mt-1">Orders delivered</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-3 mb-8">
              {/* Revenue Chart */}
              <Card className="bg-[#0f1c2e] border-white/10 lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Revenue Over Time</CardTitle>
                    <CardDescription className="text-white/50">Daily revenue for selected period</CardDescription>
                  </div>
                  <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as "7d" | "30d" | "90d")}>
                    <TabsList className="bg-white/5">
                      <TabsTrigger value="7d" className="data-[state=active]:bg-[#D3B574] data-[state=active]:text-[#0A1628]">7D</TabsTrigger>
                      <TabsTrigger value="30d" className="data-[state=active]:bg-[#D3B574] data-[state=active]:text-[#0A1628]">30D</TabsTrigger>
                      <TabsTrigger value="90d" className="data-[state=active]:bg-[#D3B574] data-[state=active]:text-[#0A1628]">90D</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                        <XAxis dataKey="date" stroke="#ffffff50" fontSize={12} />
                        <YAxis stroke="#ffffff50" fontSize={12} tickFormatter={(v) => `$${(v/100).toFixed(0)}`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#0f1c2e", border: "1px solid #ffffff20", borderRadius: "8px" }}
                          labelStyle={{ color: "#ffffff" }}
                          formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                        />
                        <Bar dataKey="revenue" fill="#D3B574" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Order Pipeline */}
              <Card className="bg-[#0f1c2e] border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Order Pipeline</CardTitle>
                  <CardDescription className="text-white/50">Current order status breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pipelineData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pipelineData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: "#0f1c2e", border: "1px solid #ffffff20", borderRadius: "8px" }}
                          labelStyle={{ color: "#ffffff" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {pipelineData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-white/70">{item.name}</span>
                        <span className="text-sm font-semibold text-white ml-auto">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions + Alerts Row */}
            <div className="grid gap-6 lg:grid-cols-3 mb-8">
              {/* Quick Actions */}
              <Card className="bg-[#0f1c2e] border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button asChild className="w-full justify-between bg-white/5 border-white/10 text-white hover:bg-white/10">
                    <HardLink href="/admin/orders?status=pending">
                      <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-yellow-400" />
                        Process Pending Orders
                      </span>
                      <Badge variant="secondary" className="bg-yellow-400/20 text-yellow-400">{stats?.pendingOrders || 0}</Badge>
                    </HardLink>
                  </Button>
                  <Button asChild className="w-full justify-between bg-white/5 border-white/10 text-white hover:bg-white/10">
                    <HardLink href="/admin/orders?status=processing">
                      <span className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-blue-400" />
                        Ship Processing Orders
                      </span>
                      <Badge variant="secondary" className="bg-blue-400/20 text-blue-400">{stats?.processingOrders || 0}</Badge>
                    </HardLink>
                  </Button>
                  <Button asChild className="w-full justify-between bg-white/5 border-white/10 text-white hover:bg-white/10">
                    <HardLink href="/admin/inventory">
                      <span className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-purple-400" />
                        Manage Inventory
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </HardLink>
                  </Button>
                  <Button asChild className="w-full justify-between bg-white/5 border-white/10 text-white hover:bg-white/10">
                    <HardLink href="/admin/products">
                      <span className="flex items-center gap-2">
                        <ShoppingBag className="h-4 w-4 text-emerald-400" />
                        Manage Products
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </HardLink>
                  </Button>
                </CardContent>
              </Card>

              {/* Inventory Alerts */}
              <Card className="bg-[#0f1c2e] border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    Inventory Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div>
                      <p className="text-sm font-medium text-red-400">Out of Stock</p>
                      <p className="text-xs text-white/50">Variants with 0 units</p>
                    </div>
                    <span className="text-2xl font-bold text-red-400">{stats?.outOfStockCount || 0}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <div>
                      <p className="text-sm font-medium text-yellow-400">Low Stock</p>
                      <p className="text-xs text-white/50">5 or fewer units</p>
                    </div>
                    <span className="text-2xl font-bold text-yellow-400">{stats?.lowStockCount || 0}</span>
                  </div>
                  <Button asChild variant="outline" className="w-full bg-white/5 border-white/10 text-white hover:bg-white/10">
                    <HardLink href="/admin/inventory">
                      View All Inventory
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </HardLink>
                  </Button>
                </CardContent>
              </Card>

              {/* Top Products */}
              <Card className="bg-[#0f1c2e] border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Top Products</CardTitle>
                  <CardDescription className="text-white/50">By revenue</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topProducts.map((product, i) => (
                      <div key={product.id} className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-white/40 w-4">{i + 1}</span>
                        {product.image_url && (
                          <img src={product.image_url} alt={product.name} className="w-10 h-10 rounded object-cover" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{product.name}</p>
                          <p className="text-xs text-white/50">{product.unitsSold} sold</p>
                        </div>
                        <span className="text-sm font-semibold text-[#D3B574]">{formatCurrency(product.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Navigation Links */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { href: "/admin/orders", title: "Orders", description: "Fulfillment & customer details", icon: ShoppingBag, color: "#22C55E" },
                { href: "/admin/orders/payouts", title: "Payouts", description: "Stripe payout history", icon: DollarSign, color: "#3B82F6" },
                { href: "/admin/products", title: "Products", description: "Manage catalog", icon: Package, color: "#8B5CF6" },
                { href: "/admin/inventory", title: "Inventory", description: "Stock & alerts", icon: Package, color: "#EAB308" },
                { href: "/admin/store/analytics", title: "Analytics", description: "Reports & trends", icon: BarChart3, color: "#EC4899" },
                { href: "/admin/store/reports", title: "Sales Reports", description: "Units, sizes & top sellers", icon: BarChart3, color: "#14B8A6" },
                { href: "/admin/store/process-images", title: "Process Images", description: "Batch background removal", icon: Wand2, color: "#F59E0B" },
              ].map(({ href, title, description, icon: Icon, color }) => (
                <HardLink key={href} href={href} className="block">
                  <Card className="bg-[#0f1c2e] border-white/10 hover:border-white/20 transition-all hover:scale-[1.02] cursor-pointer h-full">
                    <CardHeader className="flex flex-row items-center gap-4">
                      <div className="rounded-lg p-3" style={{ backgroundColor: `${color}20` }}>
                        <Icon className="h-5 w-5" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base text-white flex items-center justify-between gap-2">
                          {title}
                          <ArrowRight className="h-4 w-4 shrink-0 text-white/40" />
                        </CardTitle>
                        <CardDescription className="text-white/50 text-sm">{description}</CardDescription>
                      </div>
                    </CardHeader>
                  </Card>
                </HardLink>
              ))}
            </div>

            <p className="mt-8 text-center text-sm text-white/40">
              <HardLink href="/store-app" className="text-[#D3B574] hover:underline font-medium">
                View Public Store →
              </HardLink>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
