"use client"

import Link from "next/link"
import { StoreLink } from "@/components/store-link"
import Image from "next/image"
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
import { Button } from "@/components/ui/button"

export interface AdminProduct {
  id: string
  name: string
  sku: string
  status: "active" | "draft" | "out-of-stock"
  price: number
  stock: number
  image: string | null
  featured: boolean
  category: string
}

interface AdminProductsClientProps {
  products: AdminProduct[]
}

export function AdminProductsClient({ products }: AdminProductsClientProps) {
  if (products.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Products</CardTitle>
          <Button asChild>
            <Link href="/admin/products/new">Add product</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No products found.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Products</CardTitle>
          <p className="text-sm text-muted-foreground">
            {products.length} product{products.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/products/new">Add product</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="relative h-12 w-12 rounded overflow-hidden bg-muted">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover"
                          unoptimized={product.image.includes("blob.")}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
                          —
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {product.sku}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        product.status === "active"
                          ? "default"
                          : product.status === "out-of-stock"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {product.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${product.price.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">{product.stock}</TableCell>
                  <TableCell>{product.featured ? "Yes" : "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm capitalize">
                    {product.category}
                  </TableCell>
                  <TableCell className="flex items-center gap-1">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/products/${product.id}`}>Edit</Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <StoreLink href={`/store/product/${product.id}`} target="_blank" rel="noopener noreferrer">
                        View
                      </StoreLink>
                    </Button>
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
