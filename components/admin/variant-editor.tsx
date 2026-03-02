"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Plus, X, Trash2 } from "lucide-react"

export interface Variant {
  id: string
  size: string
  color: string
  colorHex?: string
  sku: string
  priceAdj: number
  stock: number
  active: boolean
}

interface VariantEditorProps {
  baseSku: string
  variants: Variant[]
  onChange: (variants: Variant[]) => void
}

export function VariantEditor({ baseSku, variants, onChange }: VariantEditorProps) {
  const [sizes, setSizes] = useState<string[]>(["S", "M", "L", "XL"])
  const [colors, setColors] = useState<string[]>(["Navy", "Red", "White", "Gray"])
  const [colorHexMap, setColorHexMap] = useState<Record<string, string>>({})
  const [newSize, setNewSize] = useState("")
  const [newColor, setNewColor] = useState("")
  const [newColorHex, setNewColorHex] = useState("")

  const addSize = () => {
    if (newSize.trim() && !sizes.includes(newSize.trim())) {
      setSizes([...sizes, newSize.trim()])
      setNewSize("")
    }
  }

  const removeSize = (size: string) => {
    setSizes(sizes.filter((s) => s !== size))
    onChange(variants.filter((v) => v.size !== size))
  }

  const addColor = () => {
    if (newColor.trim() && !colors.includes(newColor.trim())) {
      setColors([...colors, newColor.trim()])
      if (newColorHex.trim()) {
        setColorHexMap((prev) => ({ ...prev, [newColor.trim()]: newColorHex.trim() }))
      }
      setNewColor("")
      setNewColorHex("")
    }
  }

  const removeColor = (color: string) => {
    setColors(colors.filter((c) => c !== color))
    setColorHexMap((prev) => {
      const next = { ...prev }
      delete next[color]
      return next
    })
    onChange(variants.filter((v) => v.color !== color))
  }

  const generateVariants = () => {
    const newVariants: Variant[] = []

    for (const size of sizes) {
      for (const color of colors) {
        const id = `${color}-${size}`
        const existing = variants.find((v) => v.id === id)

        newVariants.push({
          id,
          size,
          color,
          colorHex: existing?.colorHex ?? colorHexMap[color],
          sku:
            existing?.sku ??
            `${baseSku}-${color.substring(0, 3).toUpperCase()}-${size}`.replace(/\s/g, "-"),
          priceAdj: existing?.priceAdj ?? 0,
          stock: Math.max(0, existing?.stock ?? 0),
          active: existing?.active ?? true,
        })
      }
    }

    onChange(newVariants)
  }

  const updateVariant = (id: string, field: keyof Variant, value: string | number | boolean) => {
    onChange(
      variants.map((v) =>
        v.id === id ? { ...v, [field]: value } : v
      )
    )
  }

  const deleteVariant = (id: string) => {
    onChange(variants.filter((v) => v.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label>Size Options</Label>
        <div className="flex flex-wrap gap-2">
          {sizes.map((size) => (
            <Badge key={size} variant="secondary" className="gap-1">
              {size}
              <button
                type="button"
                onClick={() => removeSize(size)}
                className="ml-1 hover:text-destructive"
                aria-label={`Remove size ${size}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Add size (e.g., One Size, Youth M)"
            value={newSize}
            onChange={(e) => setNewSize(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSize())}
          />
          <Button type="button" variant="outline" size="sm" onClick={addSize}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <Label>Color Options</Label>
        <div className="flex flex-wrap gap-2">
          {colors.map((color) => (
            <Badge key={color} variant="secondary" className="gap-2">
              {colorHexMap[color] && (
                <div
                  className="w-3 h-3 rounded-full border border-gray-300"
                  style={{ backgroundColor: colorHexMap[color] }}
                />
              )}
              {color}
              <button
                type="button"
                onClick={() => removeColor(color)}
                className="ml-1 hover:text-destructive"
                aria-label={`Remove color ${color}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Input
            placeholder="Color name (e.g., Navy)"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addColor())}
            className="flex-1 min-w-[120px]"
          />
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Input
              type="color"
              value={newColorHex || "#000000"}
              onChange={(e) => setNewColorHex(e.target.value)}
              className="w-16 h-10 p-1 cursor-pointer"
              title="Pick color"
            />
            <Input
              placeholder="Hex (e.g., #002147)"
              value={newColorHex}
              onChange={(e) => setNewColorHex(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addColor())}
              className="flex-1"
            />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addColor}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Add hex color codes to ensure color swatches match your actual products. Each color will be combined with all
          sizes when you generate variants.
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={generateVariants}
        className="w-full bg-transparent"
      >
        Generate {sizes.length * colors.length} Variants
      </Button>

      {colors.length === 1 && sizes.length > 1 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-200">
          <p className="text-sm font-medium mb-1">Tip: Add Multiple Colors</p>
          <p className="text-xs opacity-90">
            You currently have {sizes.length} sizes but only 1 color. To show multiple color options on the product
            page, add more colors above (e.g., Navy, Grey, Red) and click &quot;Generate Variants&quot; to create all
            size/color combinations.
          </p>
        </div>
      )}

      {variants.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Variant</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="w-24">Price Adj.</TableHead>
                <TableHead className="w-24">Stock</TableHead>
                <TableHead className="w-12">Active</TableHead>
                <TableHead className="w-12">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((variant) => (
                <TableRow key={variant.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {variant.colorHex && (
                        <div
                          className="w-4 h-4 rounded-full border border-gray-300"
                          style={{ backgroundColor: variant.colorHex }}
                        />
                      )}
                      {variant.color} / {variant.size}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="text"
                      className="h-8 text-sm"
                      value={variant.sku}
                      onChange={(e) => updateVariant(variant.id, "sku", e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        className="h-8 pl-5 text-sm"
                        value={variant.priceAdj}
                        onChange={(e) =>
                          updateVariant(variant.id, "priceAdj", Number.parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      className="h-8 text-sm"
                      value={variant.stock}
                      onChange={(e) =>
                        updateVariant(variant.id, "stock", Math.max(0, parseInt(e.target.value, 10) || 0))
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Checkbox
                      checked={variant.active}
                      onCheckedChange={(checked) => updateVariant(variant.id, "active", checked === true)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteVariant(variant.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      aria-label={`Delete variant ${variant.color} ${variant.size}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {variants.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Showing {variants.length} variant{variants.length !== 1 ? "s" : ""}. You can edit stock levels, price
          adjustments, and SKUs for each variant.
        </p>
      )}
    </div>
  )
}
