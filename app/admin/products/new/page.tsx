"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { ImageUpload } from "@/components/admin/image-upload"
import { createProduct } from "@/app/actions/products"
import { toast } from "sonner"
import Link from "next/link"
import { Loader2, ExternalLink } from "lucide-react"
import { VariantEditor, type Variant } from "@/components/admin/variant-editor"

export default function NewProductPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const [productName, setProductName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [basePrice, setBasePrice] = useState("24.99")
  const [comparePrice, setComparePrice] = useState("")
  const [sku, setSku] = useState("")
  const [hasVariants, setHasVariants] = useState(true)
  const [trackInventory, setTrackInventory] = useState(true)
  const [status, setStatus] = useState<"draft" | "active" | "archived">("draft")
  const [featured, setFeatured] = useState(false)
  const [showInPublicStore, setShowInPublicStore] = useState(true)
  const [images, setImages] = useState<string[]>([])

  const [variantData, setVariantData] = useState<Variant[]>([])

  const handleSave = async (publishNow: boolean) => {
    const errors: string[] = []

    if (!productName.trim()) errors.push("Product name is required")
    if (!category) errors.push("Category must be selected")
    if (!basePrice || Number.parseFloat(basePrice) <= 0) errors.push("Valid price is required")

    if (errors.length > 0) {
      toast.error(
        <div className="space-y-1">
          <div className="font-semibold">Cannot save product. Please fix:</div>
          <ul className="list-disc list-inside text-sm">
            {errors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>,
        { duration: 4000 }
      )
      return
    }

    setSaving(true)
    try {
      const result = await createProduct({
        name: productName,
        description: description || "No description provided",
        category,
        price: Number.parseFloat(basePrice),
        comparePrice: comparePrice ? Number.parseFloat(comparePrice) : undefined,
        sku: sku || `NCU-${Date.now()}`,
        status: publishNow ? "active" : status,
        featured,
        images:
          images.length > 0
            ? images
                .filter((img) => img && img.trim())
                .map((img) => (typeof img === "string" ? { url: img.trim() } : { url: String(img) }))
            : [{ url: "/placeholder.svg?height=400&width=400" }],
        hasVariants,
        variants:
          hasVariants && variantData.length > 0
            ? variantData.map((v) => ({
                sku:
                  v.sku ||
                  `${sku || "NCU"}-${v.color?.substring(0, 3).toUpperCase() || "DEF"}-${v.size || "OS"}`,
                size: v.size || "One Size",
                color: v.color || "Default",
                colorHex: v.colorHex,
                priceAdjustment: v.priceAdj ?? 0,
                stock: v.stock ?? 0,
                active: v.active ?? true,
              }))
            : hasVariants && variantData.length === 0
              ? []
              : undefined,
        trackInventory,
        requiresShipping: true,
        showInPublicStore,
      })

      if (result.success) {
        toast.success(publishNow ? "Product published successfully!" : "Product saved as draft")
        window.location.href = "/admin/products"
      } else {
        toast.error(result.error || "Failed to save product")
      }
    } catch (error) {
      console.error("[RecruitNC] Save product error:", error)
      const message = error instanceof Error ? error.message : "An error occurred while saving"
      toast.error(message, { duration: 6000 })
    } finally {
      setSaving(false)
    }
  }

  const handlePreview = () => {
    toast.info("Save the product first to preview it in the store")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add New Product</h1>
          <p className="text-muted-foreground mt-1">Create a new product for your store</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/products">
            <Button type="button" variant="outline" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button type="button" variant="outline" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save as Draft
          </Button>
          <Button type="button" onClick={() => handleSave(true)} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save & Publish
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Product Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="NC United Classic T-Shirt"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your product..."
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Basic HTML formatting is supported: bold, italic, lists, links
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">
                  Category <span className="text-destructive">*</span>
                </Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="t-shirts">T-Shirts</SelectItem>
                    <SelectItem value="sweatshirts">Sweatshirts</SelectItem>
                    <SelectItem value="athletic-wear">Athletic Wear</SelectItem>
                    <SelectItem value="headwear">Headwear</SelectItem>
                    <SelectItem value="accessories">Accessories</SelectItem>
                    <SelectItem value="practice-fee">Practice Fee</SelectItem>
                    <SelectItem value="national_team">National team (invite-only)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Product Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ImageUpload images={images} onChange={setImages} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price">Base Price</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      className="pl-7"
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="compare-price">Compare at Price</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="compare-price"
                      type="number"
                      step="0.01"
                      className="pl-7"
                      placeholder="29.99"
                      value={comparePrice}
                      onChange={(e) => setComparePrice(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Show a strikethrough price</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  placeholder="NCU-TEE-001"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Track inventory</Label>
                  <p className="text-sm text-muted-foreground">Monitor stock levels for this product</p>
                </div>
                <Switch checked={trackInventory} onCheckedChange={setTrackInventory} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Variants</CardTitle>
                <Switch checked={hasVariants} onCheckedChange={setHasVariants} />
              </div>
            </CardHeader>
            {hasVariants && (
              <CardContent>
                <VariantEditor baseSku={sku || "NCU"} variants={variantData} onChange={setVariantData} />
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shipping</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (lbs)</Label>
                  <Input id="weight" type="number" step="0.1" placeholder="0.5" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="length">Length (in)</Label>
                  <Input id="length" type="number" placeholder="12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="width">Width (in)</Label>
                  <Input id="width" type="number" placeholder="8" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height (in)</Label>
                  <Input id="height" type="number" placeholder="2" />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="requires-shipping" defaultChecked />
                <Label htmlFor="requires-shipping" className="font-normal">
                  This product requires shipping
                </Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Search Engine Optimization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="page-title">Page Title</Label>
                <Input
                  id="page-title"
                  placeholder="NC United Classic T-Shirt - Premium Wrestling Apparel"
                />
                <p className="text-xs text-muted-foreground">60 characters recommended</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="meta-description">Meta Description</Label>
                <Textarea
                  id="meta-description"
                  rows={3}
                  placeholder="High-quality wrestling t-shirt featuring the NC United logo..."
                />
                <p className="text-xs text-muted-foreground">160 characters recommended</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="url-handle">URL Handle</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 bg-muted text-sm text-muted-foreground">
                    /products/
                  </span>
                  <Input id="url-handle" className="rounded-l-none" placeholder="nc-united-classic-tshirt" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={status}
                onValueChange={(v: "draft" | "active" | "archived") => setStatus(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center justify-between">
                <Label htmlFor="featured">Featured product</Label>
                <Switch id="featured" checked={featured} onCheckedChange={setFeatured} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-in-store">Show in public store</Label>
                  <p className="text-sm text-muted-foreground">Uncheck for invite-only or internal products</p>
                </div>
                <Switch id="show-in-store" checked={showInPublicStore} onCheckedChange={setShowInPublicStore} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product-type">Product Type</Label>
                <Input id="product-type" placeholder="T-Shirt" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor</Label>
                <Input id="vendor" placeholder="NC United" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="collections">Collections</Label>
                <Select>
                  <SelectTrigger id="collections">
                    <SelectValue placeholder="Select collections" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new-arrivals">New Arrivals</SelectItem>
                    <SelectItem value="best-sellers">Best Sellers</SelectItem>
                    <SelectItem value="sale">Sale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                {images[0] ? (
                  <img
                    src={images[0]}
                    alt={productName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">No image</p>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full mt-2 bg-transparent"
                onClick={handlePreview}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Preview in store
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
