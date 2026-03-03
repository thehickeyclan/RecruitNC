"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ImageUploadWithColors } from "@/components/admin/image-upload-with-colors"
import { updateProduct, getProduct } from "@/app/actions/products"
import { toast } from "sonner"
import Link from "next/link"
import { Loader2, ExternalLink } from "lucide-react"
import { VariantEditor, type Variant } from "@/components/admin/variant-editor"

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [productName, setProductName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [basePrice, setBasePrice] = useState("24.99")
  const [comparePrice, setComparePrice] = useState("")
  const [sku, setSku] = useState("")
  const [currentSlug, setCurrentSlug] = useState("")
  const [hasVariants, setHasVariants] = useState(true)
  const [trackInventory, setTrackInventory] = useState(true)
  const [status, setStatus] = useState<"draft" | "active" | "archived">("draft")
  const [featured, setFeatured] = useState(false)
  const [images, setImages] = useState<Array<{ url: string; color?: string }>>([])

  const [variantData, setVariantData] = useState<Variant[]>([])

  useEffect(() => {
    async function loadProduct() {
      const result = await getProduct(productId)
      if (result.success && result.data) {
        const p = result.data
        setProductName(p.name)
        setDescription(p.description || "")
        setCategory(p.category)
        setBasePrice(p.price?.toString() ?? "24.99")
        setComparePrice("")
        setSku(p.slug || "")
        setCurrentSlug(p.slug || "")
        setStatus(p.in_stock ? "active" : "draft")
        setFeatured(p.featured || false)
        const imageData =
          p.product_images
            ?.sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
            .map((img: any) => ({
              url: img.url,
              color: img.color || undefined,
            })) ?? []
        setImages(imageData)
        if (p.product_variants?.length) {
          const variants: Variant[] = p.product_variants.map((v: any) => ({
            id: `${v.color}-${v.size}`,
            size: v.size ?? "",
            color: v.color ?? "",
            colorHex: undefined,
            sku: v.sku ?? "",
            priceAdj: 0,
            stock: v.stock_quantity ?? 0,
            active: true,
          }))
          setVariantData(variants)
          setHasVariants(true)
        }
      } else {
        toast.error("Failed to load product")
        router.push("/admin/products")
      }
      setLoading(false)
    }
    loadProduct()
  }, [productId, router])

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
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>,
        { duration: 4000 }
      )
      return
    }
    setSaving(true)
    try {
      const result = await updateProduct(productId, {
        name: productName,
        description: description || "No description provided",
        category,
        price: Number.parseFloat(basePrice),
        comparePrice: comparePrice ? Number.parseFloat(comparePrice) : undefined,
        sku: sku || `NCU-${Date.now()}`,
        status: publishNow ? "active" : status,
        featured,
        images: images.length > 0 ? images : [{ url: "/placeholder.svg?height=400&width=400" }],
        hasVariants,
        variants:
          hasVariants && variantData.length > 0
            ? variantData.map((v) => ({
                sku: v.sku,
                size: v.size,
                color: v.color,
                colorHex: v.colorHex,
                priceAdjustment: v.priceAdj,
                stock: v.stock,
                active: v.active,
              }))
            : undefined,
        trackInventory,
        requiresShipping: true,
        urlHandle: currentSlug || productName?.toLowerCase().replace(/\s+/g, "-"),
      })
      if (result.success) {
        toast.success(publishNow ? "Product published successfully!" : "Product updated successfully")
        router.push("/admin/products")
      } else {
        toast.error(result.error ?? "Failed to update product")
      }
    } catch (err) {
      toast.error("An error occurred while saving")
    } finally {
      setSaving(false)
    }
  }

  const handlePreview = () => {
    window.open(`/store-app/product/${productId}`, "_blank")
  }

  const availableColors = Array.from(new Set(variantData.map((v) => v.color).filter(Boolean)))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Product</h1>
          <p className="text-muted-foreground mt-1">Update product information</p>
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
              <ImageUploadWithColors
                images={images}
                onChange={setImages}
                availableColors={availableColors}
              />
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
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={status} onValueChange={(v: "draft" | "active" | "archived") => setStatus(v)}>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                {images[0]?.url ? (
                  <img
                    src={images[0].url}
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
