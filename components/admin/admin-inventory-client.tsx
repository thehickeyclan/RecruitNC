"use client"

import { useState, useMemo } from "react"
import { type InventoryProduct, updateVariantStock } from "@/app/actions/inventory"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { AlertTriangle, Package, Search, TrendingDown, PackageX } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface InventoryClientProps {
  initialProducts: InventoryProduct[]
}

export function InventoryClient({ initialProducts }: InventoryClientProps) {
  const [products, setProducts] = useState<InventoryProduct[]>(initialProducts)
  const [searchQuery, setSearchQuery] = useState("")
  const [updatingStocks, setUpdatingStocks] = useState<Set<string>>(new Set())

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products
    const query = searchQuery.toLowerCase()
    return products.filter(
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
  }, [products, searchQuery])

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

    return {
      totalVariants,
      lowStockVariants,
      outOfStockVariants,
      totalStockValue,
    }
  }, [products])

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
        toast.success("Stock updated successfully")
      } else {
        toast.error(result.error || "Failed to update stock")
      }
    } catch (error: unknown) {
      console.error("[inventory] Error updating stock:", error)
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
        <Badge variant="destructive" className="gap-1">
          <PackageX className="h-3 w-3" />
          Out of Stock
        </Badge>
      )
    }
    if (quantity <= 5) {
      return (
        <Badge variant="outline" className="gap-1 border-orange-500 text-orange-600">
          <AlertTriangle className="h-3 w-3" />
          Low Stock ({quantity})
        </Badge>
      )
    }
    return <Badge variant="secondary">{quantity} in stock</Badge>
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
        <p className="text-muted-foreground">
          Track and manage stock levels for all products and variants
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Variants</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVariants}</div>
            <p className="text-xs text-muted-foreground">Active product variants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.lowStockVariants}</div>
            <p className="text-xs text-muted-foreground">Variants with ≤5 in stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <PackageX className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.outOfStockVariants}</div>
            <p className="text-xs text-muted-foreground">Variants with 0 in stock</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Units</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStockValue}</div>
            <p className="text-xs text-muted-foreground">Total inventory units</p>
          </CardContent>
        </Card>
      </div>

      {(stats.lowStockVariants > 0 || stats.outOfStockVariants > 0) && (
        <Alert variant={stats.outOfStockVariants > 0 ? "destructive" : "default"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Stock Alert</AlertTitle>
          <AlertDescription>
            {stats.outOfStockVariants > 0 && (
              <>
                <strong>{stats.outOfStockVariants}</strong> variant
                {stats.outOfStockVariants !== 1 ? "s" : ""} out of stock.
                {stats.lowStockVariants > 0 && " "}
              </>
            )}
            {stats.lowStockVariants > 0 && (
              <>
                <strong>{stats.lowStockVariants}</strong> variant
                {stats.lowStockVariants !== 1 ? "s" : ""} running low (≤5 units).
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
          <CardDescription>Search and manage inventory for all products</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by product name, category, SKU, size, or color..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Product</TableHead>
                  <TableHead className="w-[100px]">Category</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead className="w-[120px]">SKU</TableHead>
                  <TableHead className="w-[150px]">Current Stock</TableHead>
                  <TableHead className="w-[200px]">Update Stock</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      {searchQuery ? "No products found matching your search." : "No products found."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.flatMap((product) => [
                    <TableRow key={product.id}>
                      <TableCell colSpan={7} className="bg-muted/50 p-0">
                        <div className="flex items-center gap-3 p-4">
                          {product.image_url ? (
                            <Image
                              src={product.image_url}
                              alt={product.name}
                              width={48}
                              height={48}
                              className="h-12 w-12 rounded-md object-cover"
                              unoptimized={product.image_url.includes("blob.")}
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
                              <Package className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {product.variants.length} variant
                              {product.variants.length !== 1 ? "s" : ""}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>,
                    ...product.variants.map((variant, index) => (
                      <TableRow
                        key={`${product.id}-${variant.id}`}
                        className={cn(
                          index === product.variants.length - 1 && "border-b-2"
                        )}
                      >
                        <TableCell />
                        <TableCell>
                          <Badge variant="outline">{product.category ?? "—"}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {variant.color} / {variant.size}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs">{variant.sku}</code>
                        </TableCell>
                        <TableCell>
                          <div className="text-lg font-bold">{variant.stock_quantity}</div>
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
                    )),
                  ])
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface StockUpdateInputProps {
  variantId: string
  currentStock: number
  onUpdate: (variantId: string, newQuantity: number) => void
  isUpdating: boolean
}

function StockUpdateInput({
  variantId,
  currentStock,
  onUpdate,
  isUpdating,
}: StockUpdateInputProps) {
  const [value, setValue] = useState(currentStock.toString())

  const handleSubmit = () => {
    const numValue = parseInt(value, 10)
    if (!Number.isNaN(numValue) && numValue !== currentStock) {
      onUpdate(variantId, numValue)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit()
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={handleKeyDown}
        disabled={isUpdating}
        className="w-24"
      />
      <Button
        size="sm"
        onClick={handleSubmit}
        disabled={
          isUpdating ||
          value === currentStock.toString() ||
          parseInt(value, 10) === currentStock
        }
      >
        {isUpdating ? "Saving..." : "Update"}
      </Button>
    </div>
  )
}
