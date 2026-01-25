# Store Product Promotion Integration Guide for RecruitNC

This guide provides everything needed to integrate the NC United Store product promotion feature into RecruitNC, using the same shared Supabase database.

---

## Overview

The integration consists of:
1. **API Route** - Fetches random in-stock products from the shared database
2. **React Component** - Displays products in a rotating carousel format
3. **Integration** - Add component to your homepage or desired page

---

## Step 1: Create the API Route

Create the file: `app/api/store/featured-products/route.ts`

```typescript
import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * API Route to fetch featured products from the NC United Store
 * Queries the products table with joins to product_images for images
 * Based on the store schema documentation
 */
export async function GET(request: Request) {
  try {
    const adminClient = createAdminClient()
    
    // Query random in-stock products with images
    // Using the actual store schema: products table with BIGINT IDs
    // We show random products instead of just featured ones - all products are good!
    const { data: products, error } = await adminClient
      .from("products")
      .select(`
        id,
        name,
        description,
        price,
        slug,
        category,
        featured,
        in_stock,
        display_order,
        product_images (
          url,
          display_order,
          color
        )
      `)
      .eq("in_stock", true)
      .limit(50) // Get more products so we can randomize
    
    if (error) {
      console.error("[Store API] Error fetching products:", error)
      // Return empty array gracefully - component will handle it
      return NextResponse.json({ products: [], count: 0, error: error.message }, { status: 200 })
    }
    
    if (!products || products.length === 0) {
      console.log("[Store API] No in-stock products found")
      return NextResponse.json({ products: [], count: 0 }, { status: 200 })
    }
    
    // Randomize the products array
    const shuffled = [...products].sort(() => Math.random() - 0.5)
    const selectedProducts = shuffled.slice(0, 6) // Take 6 random products
    
    // Transform the data to include primary image and format for component
    const formattedProducts = selectedProducts.map((product: any) => {
      // Get primary image (display_order = 0) or first image
      const images = product.product_images || []
      const primaryImage = images.find((img: any) => img.display_order === 0) || images[0]
      
      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: parseFloat(product.price) || 0,
        image_url: primaryImage?.url || null,
        slug: product.slug,
        category: product.category,
        featured: product.featured,
        in_stock: product.in_stock
      }
    })
    
    return NextResponse.json({ 
      products: formattedProducts,
      count: formattedProducts.length
    })
  } catch (err: any) {
    console.error("[Store API] Exception:", err)
    return NextResponse.json({ 
      products: [], 
      count: 0,
      error: err.message 
    }, { status: 200 }) // Return 200 so component can handle gracefully
  }
}
```

**Note:** This uses `createAdminClient()` from `@/lib/supabase/admin`. If your project uses a different function name (like `getSupabaseAdmin()`), update the import accordingly.

---

## Step 2: Create the React Component

Create the file: `components/store-product-promotion.tsx`

```typescript
"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ShoppingBag, ExternalLink } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface Product {
  id: number // BIGINT from database
  name: string
  description?: string
  price: number
  image_url?: string | null
  slug: string
  category?: string
  featured?: boolean
  in_stock?: boolean
}

export function StoreProductPromotion() {
  const [products, setProducts] = useState<Product[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("/api/store/featured-products")
        const data = await response.json()
        if (data.products && data.products.length > 0) {
          setProducts(data.products)
        }
      } catch (error) {
        console.error("[Store Promotion] Error fetching products:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [])

  // Rotate products every 5 seconds
  useEffect(() => {
    if (products.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % products.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [products.length])

  // Don't render if no products or still loading
  if (loading || products.length === 0) {
    return null
  }

  const currentProduct = products[currentIndex]

  return (
    <div className="mb-8">
      <div className="border border-[#CBAF5D] rounded-lg overflow-hidden bg-white shadow-md hover:shadow-lg transition-shadow">
        <div className="flex flex-col md:flex-row">
          {/* Product Image - Fixed aspect ratio, no cutoff */}
          <div className="relative w-full md:w-48 aspect-square md:aspect-auto md:h-auto bg-gray-100 flex-shrink-0">
            {currentProduct.image_url ? (
              <Image
                src={currentProduct.image_url}
                alt={currentProduct.name}
                fill
                className="object-contain p-2"
                sizes="(max-width: 768px) 100vw, 192px"
                unoptimized={currentProduct.image_url.includes('blob.vercel-storage.com')}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#002147] to-[#B31B1B] flex items-center justify-center">
                <ShoppingBag className="w-16 h-16 text-white/50" />
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex-1 p-4 md:p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-lg text-[#002147] mb-4 line-clamp-2">
                {currentProduct.name}
              </h3>
            </div>
            
            <Link 
              href="https://store.ncwrestlingunited.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4"
            >
              <Button 
                className="w-full bg-[#B31B1B] hover:bg-[#8B1515] text-white font-semibold"
                size="lg"
              >
                <ShoppingBag className="w-5 h-5 mr-2" />
                Shop Now
                <ExternalLink className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Product Indicators (if multiple products) */}
        {products.length > 1 && (
          <div className="flex items-center justify-center gap-2 p-2 bg-gray-50 border-t border-[#CBAF5D]/20">
            {products.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex 
                    ? 'bg-[#B31B1B] w-6' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`View product ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

**Note:** Adjust the color scheme (`#002147`, `#B31B1B`, `#CBAF5D`) to match RecruitNC's brand colors if different.

---

## Step 3: Integrate into Your Page

Add the component to your homepage or desired page:

### For Homepage (`app/page.tsx`):

1. **Add the import** at the top of the file:
```typescript
import { StoreProductPromotion } from "@/components/store-product-promotion"
```

2. **Add the component** in your JSX, ideally after the hero section:
```typescript
export default function HomePage() {
  return (
    <main>
      {/* Hero Section */}
      <section>
        {/* Your hero content */}
      </section>

      {/* Store Product Promotion Banner */}
      <StoreProductPromotion />

      {/* Rest of your content */}
      <section>
        {/* Other sections */}
      </section>
    </main>
  )
}
```

**Best Practice:** Place it near the top of the page (after hero section) for maximum visibility.

---

## Dependencies

Make sure you have these dependencies installed:

```bash
npm install lucide-react
# or
pnpm add lucide-react
```

The component uses:
- `next/image` - Built into Next.js
- `@/components/ui/button` - Your existing UI component library (shadcn/ui)
- `lucide-react` - For icons (ShoppingBag, ExternalLink)

**Check if installed:**
```bash
grep "lucide-react" package.json
```

If it's not listed, install it:
```bash
npm install lucide-react
```

---

## Database Requirements

Since RecruitNC uses the same Supabase database, the following tables should already be accessible:

- `products` - Product catalog
- `product_images` - Product images with display ordering

The API route uses Row Level Security (RLS) policies. Make sure your Supabase admin client has read access to these tables.

**Verify database access:**
1. Check that `SUPABASE_SERVICE_ROLE_KEY` is set in your `.env` file
2. Verify `createAdminClient()` function exists in `@/lib/supabase/admin`
3. Test the API route: `http://localhost:3000/api/store/featured-products`

---

## Customization Options

### Change Rotation Speed
Modify the interval in the component (currently 5000ms = 5 seconds):
```typescript
// In components/store-product-promotion.tsx
const interval = setInterval(() => {
  setCurrentIndex((prev) => (prev + 1) % products.length)
}, 5000) // Change this value (in milliseconds)
```

**Examples:**
- `3000` = 3 seconds
- `7000` = 7 seconds
- `10000` = 10 seconds

### Change Number of Products
Modify the limit in the API route:
```typescript
// In app/api/store/featured-products/route.ts
const selectedProducts = shuffled.slice(0, 6) // Change 6 to desired number
```

**Examples:**
- `3` = Show 3 products
- `5` = Show 5 products
- `10` = Show 10 products

### Adjust Colors
Update the Tailwind classes to match RecruitNC's brand:

**Border Color:**
```typescript
className="border border-[#CBAF5D]" // Change #CBAF5D to your color
```

**Text/Background Color:**
```typescript
className="text-[#002147]" // Change #002147 to your color
```

**Button Color:**
```typescript
className="bg-[#B31B1B] hover:bg-[#8B1515]" // Change both colors
```

**Indicator Dots:**
```typescript
className="bg-[#B31B1B]" // Active indicator color
```

### Change Store URL
If the store URL is different, update the Link href:
```typescript
// In components/store-product-promotion.tsx
<Link 
  href="https://store.ncwrestlingunited.com" // Change if needed
  target="_blank"
  rel="noopener noreferrer"
>
```

### Show Price
If you want to display product prices, add this in the component:
```typescript
{/* Add after the product name */}
<p className="text-lg font-semibold text-[#B31B1B] mb-2">
  ${currentProduct.price.toFixed(2)}
</p>
```

### Change Image Aspect Ratio
Modify the image container:
```typescript
// Current: aspect-square (1:1)
<div className="relative w-full md:w-48 aspect-square ...">

// Options:
// aspect-video (16:9)
// aspect-[4/3] (4:3)
// h-48 (fixed height)
```

---

## Troubleshooting

### Component Not Showing

**Check 1: Browser Console**
- Open browser DevTools (F12)
- Check Console tab for errors
- Look for `[Store Promotion]` or `[Store API]` messages

**Check 2: API Route**
- Visit `http://localhost:3000/api/store/featured-products` directly
- Should return JSON with `products` array
- If error, check server logs

**Check 3: Products in Database**
- Verify products exist with `in_stock = true`
- Check that `product_images` table has data
- Verify Supabase connection is working

**Check 4: Component Import**
- Verify import path: `@/components/store-product-promotion`
- Check that file exists at `components/store-product-promotion.tsx`
- Verify TypeScript paths are configured correctly

### Images Not Loading

**Issue: Images return 404 or broken**
- Verify `product_images` table has valid URLs
- Check that image URLs are accessible (Vercel Blob Storage URLs)
- The `unoptimized` prop handles Vercel Blob Storage images
- Check browser Network tab to see image requests

**Issue: Images are cut off**
- The component uses `object-contain` to prevent cutoff
- If still cut off, adjust the container size or padding

### API Route Errors

**Error: "createAdminClient is not a function"**
- Check that `@/lib/supabase/admin` exports `createAdminClient`
- Verify the import path is correct
- If your project uses a different function name, update the import

**Error: "Supabase service role key is not configured"**
- Check `.env` file for `SUPABASE_SERVICE_ROLE_KEY`
- Verify the key is correct
- Restart dev server after adding env variable

**Error: "relation 'products' does not exist"**
- Verify you're using the same Supabase project as the store
- Check that `products` table exists in your database
- Verify RLS policies allow admin client to read

### Styling Issues

**Issue: Colors don't match brand**
- Update Tailwind classes with your brand colors
- See "Customization Options" section above

**Issue: Component looks broken on mobile**
- Check that Tailwind CSS is configured
- Verify responsive classes (`md:flex-row`, `md:w-48`, etc.)
- Test in browser DevTools mobile view

**Issue: Button doesn't work**
- Verify `@/components/ui/button` exists
- Check that shadcn/ui is properly installed
- Verify Button component is exported correctly

### Performance Issues

**Issue: Slow page load**
- API route caches results (no cache headers set)
- Consider adding caching if needed:
```typescript
return NextResponse.json(data, {
  headers: {
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
  }
})
```

**Issue: Too many API calls**
- Component only fetches once on mount
- Check Network tab to verify single request
- If multiple calls, check for duplicate components

---

## Testing Steps

### 1. Test API Route

**Manual Test:**
1. Start your dev server: `npm run dev`
2. Visit: `http://localhost:3000/api/store/featured-products`
3. Should see JSON response with `products` array
4. Verify products have `image_url`, `name`, etc.

**Expected Response:**
```json
{
  "products": [
    {
      "id": 123,
      "name": "Product Name",
      "price": 29.99,
      "image_url": "https://...",
      "slug": "product-slug",
      ...
    }
  ],
  "count": 6
}
```

**If Empty:**
- Check database for products with `in_stock = true`
- Verify Supabase connection
- Check server logs for errors

### 2. Test Component

**Visual Test:**
1. Add component to a test page
2. Visit the page in browser
3. Verify product banner appears
4. Check that product image loads
5. Verify "Shop Now" button is visible

**Interaction Test:**
1. Wait 5 seconds - product should rotate automatically
2. Click indicator dots - should switch products
3. Click "Shop Now" button - should open store in new tab
4. Verify link goes to correct URL

**Responsive Test:**
1. Open browser DevTools (F12)
2. Toggle device toolbar (mobile view)
3. Verify layout stacks vertically on mobile
4. Verify layout is side-by-side on desktop
5. Check that images don't get cut off

### 3. Test Error Handling

**No Products Test:**
1. Temporarily set `in_stock = false` for all products
2. Reload page
3. Component should hide gracefully (no error)

**API Error Test:**
1. Temporarily break the API route (add `throw new Error("test")`)
2. Reload page
3. Component should hide gracefully (no error in UI)

**Network Error Test:**
1. Disconnect internet
2. Reload page
3. Component should hide gracefully after timeout

### 4. Test Integration

**Homepage Integration:**
1. Add component to homepage
2. Verify it appears in correct location
3. Check that it doesn't break existing layout
4. Verify spacing looks good

**Multiple Pages:**
1. Add component to multiple pages if needed
2. Verify it works on all pages
3. Check that API isn't called multiple times unnecessarily

---

## Summary

This integration provides:
- ✅ Automatic product rotation (every 5 seconds)
- ✅ Manual navigation via indicator dots
- ✅ Responsive design (mobile & desktop)
- ✅ Graceful error handling (hides if no products)
- ✅ Links to main store (no 404 errors)
- ✅ Uses shared Supabase database
- ✅ No price display (cleaner UI)
- ✅ Self-contained component (easy to add/remove)

The component is self-contained and will automatically hide if no products are available, so it's safe to add to any page.

---

## Quick Reference

**Files to Create:**
- `app/api/store/featured-products/route.ts`
- `components/store-product-promotion.tsx`

**Files to Modify:**
- `app/page.tsx` (or your target page)

**Dependencies:**
- `lucide-react` (install if not present)

**Environment Variables:**
- `SUPABASE_SERVICE_ROLE_KEY` (should already exist)

**Database Tables:**
- `products` (read access required)
- `product_images` (read access required)

---

## Support

If you encounter issues:
1. Check the Troubleshooting section above
2. Verify all files are created correctly
3. Check browser console for errors
4. Verify API route returns data
5. Test with a simple page first before integrating

**Common Issues:**
- Missing `lucide-react` → Install it
- API returns empty → Check database for products
- Component doesn't show → Check browser console
- Images don't load → Verify image URLs in database

---

**Questions?** Refer to the LegacyNC implementation or check the code comments in the files above.
