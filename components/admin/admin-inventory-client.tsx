"use client"

import { useState, useMemo } from "react"
import { type InventoryProduct, updateVariantStock } from "@/app/actions/inventory"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, Package, Search, TrendingDown, PackageX, ArrowLeft, RefreshCw, Download, Plus, Minus } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { HardLink } from "@/components/hard-link"

interface InventoryClientProps {
  initialProducts: InventoryProduct[]
}

type FilterView = "all" | "low" | "out"

export function InventoryClient({ initialProducts }: InventoryClientProps) {
  const [products, setProducts] = useState<InventoryProduct[]>(initialProducts)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterView, setFilterView] = useState<FilterView>("all")
  const [updatingStocks, setUpdatingStocks] = useState<Set<string>>(new Set())

  const stats = useMemo(() => {
    let totalVariants = 0
    let lowStockVariants = 0
    let outOfStockVariants = 0
    let totalStockValue = 0

    products.forEach((product) => {
      product.variants.forEach((variant) => {
        totalVariants++
        if (variant.stock_quantity === 0) {
          outOfStockVariants++
        } else if (variant.stock_quantity <= 5) {
          lowStockVariants++
        }
        totalStockValue += variant.stock_quantity
      })
    })

    return { totalVariants, lowStockVariants, outOfStockVariants, totalStockValue }
  }, [products])

  const filteredProducts = useMemo(() => {
    let filtered = products

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          (product.category ?? "").toLowerCase().includes(query) ||
          product.variants.some(
            (v) =>
              v.sku.toLowerCase().includes(query) ||
              v.size.toLowerCase().includes(query) ||
              v.color.toLowerCase().includes(query)
          )
      )
    }

    // Filter by stock status
    if (filterView === "low") {
      filtered = filtered
        .map(p => ({
          ...p,
          variants: p.variants.filter(v => v.stock_quantity > 0 && v.stock_quantity <= 5)
        }))
        .filter(p => p.variants.length > 0)
    } else if (filterView === "out") {
      filtered = filtered
        .map(p => ({
          ...p,
          variants: p.variants.filter(v => v.stock_quantity === 0)
        }))
        .filter(p => p.variants.length > 0)
    }

    return filtered
  }, [products, searchQuery, filterView])

  const handleStockUpdate = async (variantId: string, newQuantity: number) => {
    if (newQuantity < 0) {
      toast.error("Stock quantity cannot be negative")
      return
    }

    setUpdatingStocks((prev) => new Set(prev).add(variantId))

    try {
      const result = await updateVariantStock(variantId, newQuantity)

      if (result.success) {
        setProducts((prev) =>
          prev.map((product) => ({
            ...product,
            variants: product.variants.map((variant) =>
              variant.id === variantId ? { ...variant, stock_quantity: newQuantity } : variant
            ),
          }))
        )
        toast.success("Stock updated")
      } else {
        toast.error(result.error || "Failed to update stock")
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to update stock")
    } finally {
      setUpdatingStocks((prev) => {
        const next = new Set(prev)
        next.delete(variantId)
        return next
      })
    }
  }

  const getStockBadge = (quantity: number) => {
    if (quantity === 0) {
      return (
        <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">
          <PackageX className="h-3 w-3 mr-1" />
          Out of Stock
        </Badge>
      )
    }
    if (quantity <= 5) {
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Low ({quantity})
        </Badge>
      )
    }
    return (
      <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
        {quantity} in stock
      </Badge>
    )
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
              <h1 className="text-3xl font-bold text-white">Inventory Management</h1>
              <p className="text-white/60 mt-1">Track and manage stock levels for all products</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-[#0f1c2e] border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/70">Total Variants</CardTitle>
              <Package className="h-4 w-4 text-[#D3B574]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalVariants}</div>
              <p className="text-xs text-white/50">Active product variants</p>
            </CardContent>
          </Card>

          <Card className="bg-[#0f1c2e] border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/70">Total Units</CardTitle>
              <TrendingDown className="h-4 w-4 text-[#D3B574]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{stats.totalStockValue}</div>
              <p className="text-xs text-white/50">Total inventory units</p>
            </CardContent>
          </Card>

          <Card className={cn(
            "bg-[#0f1c2e] border-white/10",
            stats.lowStockVariants > 0 && "border-yellow-500/30"
          )}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/70">Low Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">{stats.lowStockVariants}</div>
              <p className="text-xs text-white/50">Variants with 1-5 units</p>
            </CardContent>
          </Card>

          <Card className={cn(
            "bg-[#0f1c2e] border-white/10",
            stats.outOfStockVariants > 0 && "border-red-500/30"
          )}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/70">Out of Stock</CardTitle>
              <PackageX className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{stats.outOfStockVariants}</div>
              <p className="text-xs text-white/50">Variants with 0 units</p>
            </CardContent>
          </Card>
        </div>

        {/* Alert Banner */}
        {(stats.lowStockVariants > 0 || stats.outOfStockVariants > 0) && (
          <Alert className={cn(
            "border",
            stats.outOfStockVariants > 0 
              ? "bg-red-500/10 border-red-500/30 text-red-400" 
              : "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
          )}>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="font-semibold">Stock Alert</AlertTitle>
            <AlertDescription className="text-white/70">
              {stats.outOfStockVariants > 0 && (
                <><strong className="text-red-400">{stats.outOfStockVariants}</strong> variant{stats.outOfStockVariants !== 1 ? "s" : ""} out of stock. </>
              )}
              {stats.lowStockVariants > 0 && (
                <><strong className="text-yellow-400">{stats.lowStockVariants}</strong> variant{stats.lowStockVariants !== 1 ? "s" : ""} running low.</>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Filter Tabs */}
        <Tabs value={filterView} onValueChange={(v) => setFilterView(v as FilterView)} className="w-full">
          <TabsList className="bg-[#0f1c2e] border border-white/10 p-1">
            <TabsTrigger value="all" className="data-[state=active]:bg-[#D3B574] data-[state=active]:text-[#0A1628] text-white/70">
              All Variants
              <Badge variant="secondary" className="ml-2 bg-white/10 text-white/70">{stats.totalVariants}</Badge>
            </TabsTrigger>
            <TabsTrigger value="low" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-black text-white/70">
              <AlertTriangle className="h-4 w-4 mr-1.5" />
              Low Stock
              <Badge variant="secondary" className="ml-2 bg-yellow-500/20 text-yellow-400">{stats.lowStockVariants}</Badge>
            </TabsTrigger>
            <TabsTrigger value="out" className="data-[state=active]:bg-red-500 data-[state=active]:text-white text-white/70">
              <PackageX className="h-4 w-4 mr-1.5" />
              Out of Stock
              <Badge variant="secondary" className="ml-2 bg-red-500/20 text-red-400">{stats.outOfStockVariants}</Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search and Table */}
        <Card className="bg-[#0f1c2e] border-white/10">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-white">Products</CardTitle>
                <CardDescription className="text-white/50">
                  {filteredProducts.length} product{filteredProducts.length !== 1 ? "s" : ""} 
                  {searchQuery && ` matching "${searchQuery}"`}
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <Input
                  placeholder="Search products, SKUs, sizes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/70 w-[250px]">Product</TableHead>
                  <TableHead className="text-white/70">Variant</TableHead>
                  <TableHead className="text-white/70">SKU</TableHead>
                  <TableHead className="text-white/70 text-center">Stock</TableHead>
                  <TableHead className="text-white/70">Quick Update</TableHead>
                  <TableHead className="text-white/70">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow className="border-white/10">
                    <TableCell colSpan={6} className="text-center py-12 text-white/50">
                      {searchQuery ? "No products found matching your search." : "No products found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.flatMap((product) =>
                    product.variants.map((variant, index) => (
                      <TableRow
                        key={`${product.id}-${variant.id}`}
                        className={cn(
                          "border-white/10 hover:bg-white/5",
                          variant.stock_quantity === 0 && "bg-red-500/5",
                          variant.stock_quantity > 0 && variant.stock_quantity <= 5 && "bg-yellow-500/5"
                        )}
                      >
                        <TableCell>
                          {index === 0 ? (
                            <div className="flex items-center gap-3">
                              {product.image_url ? (
                                <Image
                                  src={product.image_url}
                                  alt={product.name}
                                  width={40}
                                  height={40}
                                  className="h-10 w-10 rounded object-cover"
                                  unoptimized={product.image_url.includes("blob.")}
                                />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded bg-white/10">
                                  <Package className="h-5 w-5 text-white/40" />
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-white">{product.name}</div>
                                <div className="text-xs text-white/50">{product.category ?? "Uncategorized"}</div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-white/30 text-sm pl-[52px]">↳</span>
                          )}
                        </TableCell>
                        <TableCell className="text-white">
                          {variant.color} / {variant.size}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs text-white/60 bg-white/5 px-2 py-1 rounded">{variant.sku}</code>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn(
                            "text-xl font-bold",
                            variant.stock_quantity === 0 && "text-red-400",
                            variant.stock_quantity > 0 && variant.stock_quantity <= 5 && "text-yellow-400",
                            variant.stock_quantity > 5 && "text-white"
                          )}>
                            {variant.stock_quantity}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StockUpdateInput
                            variantId={variant.id}
                            currentStock={variant.stock_quantity}
                            onUpdate={handleStockUpdate}
                            isUpdating={updatingStocks.has(variant.id)}
                          />
                        </TableCell>
                        <TableCell>{getStockBadge(variant.stock_quantity)}</TableCell>
                      </TableRow>
                    ))
                  )
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface StockUpdateInputProps {
  variantId: string
  currentStock: number
  onUpdate: (variantId: string, newQuantity: number) => void
  isUpdating: boolean
}

function StockUpdateInput({ variantId, currentStock, onUpdate, isUpdating }: StockUpdateInputProps) {
  const [value, setValue] = useState(currentStock.toString())

  const handleSubmit = () => {
    const numValue = parseInt(value, 10)
    if (!Number.isNaN(numValue) && numValue !== currentStock) {
      onUpdate(variantId, numValue)
    }
  }

  const handleQuickAdjust = (delta: number) => {
    const newValue = Math.max(0, currentStock + delta)
    onUpdate(variantId, newValue)
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 bg-white/5 border-white/10 text-white hover:bg-white/10"
        onClick={() => handleQuickAdjust(-1)}
        disabled={isUpdating || currentStock === 0}
      >
        <Minus className="h-3 w-3" />
      </Button>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        className="w-16 h-8 text-center bg-white/5 border-white/10 text-white"
        disabled={isUpdating}
      />
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 bg-white/5 border-white/10 text-white hover:bg-white/10"
        onClick={() => handleQuickAdjust(1)}
        disabled={isUpdating}
      >
        <Plus className="h-3 w-3" />
      </Button>
      {isUpdating && <RefreshCw className="h-4 w-4 animate-spin text-white/40 ml-2" />}
    </div>
  )
}
