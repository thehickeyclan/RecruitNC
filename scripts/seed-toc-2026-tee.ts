/** Create or update the official 2026 Tournament of Champions preorder tee. */

import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { uploadGearBytesToBlob } from "../lib/nhsca-gear-background-removal";

const SLUG = "2026-tournament-of-champions-tee";
const PRICE = 30;
const SKU_PREFIX = "TOC26-TEE";
const SIZES = ["S", "M", "L", "XL", "XXL"];
const IMAGES = [
  "public/images/toc/toc-2026-official-tee.png",
  "public/images/store/toc-2026-tee-preorder-banner.png",
];
const root = resolve(__dirname, "..");

function loadEnvFile(rel: string) {
  const path = join(root, rel);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equals = trimmed.indexOf("=");
    if (equals <= 0) continue;
    const key = trimmed.slice(0, equals).trim();
    let value = trimmed.slice(equals + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value.replace(/\r$/, "").trim();
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

async function main() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY");
  if (!process.env.BLOB_READ_WRITE_TOKEN)
    throw new Error("Missing BLOB_READ_WRITE_TOKEN");

  const imageUrls: string[] = [];
  for (const [index, relativePath] of IMAGES.entries()) {
    const sourcePath = join(root, relativePath);
    if (!existsSync(sourcePath))
      throw new Error(`Source image not found: ${sourcePath}`);
    const view = index === 0 ? "front-back-dark" : "preorder-banner";
    imageUrls.push(
      await uploadGearBytesToBlob(
        `store/products/${SLUG}-${view}-${Date.now()}.png`,
        readFileSync(sourcePath),
        "image/png",
      ),
    );
  }

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: existing, error: lookupError } = await admin
    .from("products")
    .select("id")
    .eq("slug", SLUG)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);

  const productRow = {
    name: "2026 Tournament of Champions Tee",
    description:
      "Official navy 2026 NC United Tournament of Champions tee. Tournament of Champions wordmark on the front and ‘One State. One Champion. NC United’ on the back. Preorder only — pickup at the Tournament of Champions in Apex, September 18–19, 2026.",
    category: "t-shirts",
    price: PRICE,
    in_stock: true,
    featured: true,
    image_url: imageUrls[0],
    display_order: 0,
    show_in_public_store: true,
    slug: SLUG,
  };

  let productId: string;
  if (existing?.id) {
    productId = String(existing.id);
    const { error } = await admin
      .from("products")
      .update(productRow)
      .eq("id", productId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await admin
      .from("products")
      .insert(productRow)
      .select("id")
      .single();
    if (error || !data)
      throw new Error(error?.message ?? "Product insert failed");
    productId = String(data.id);
  }

  const { error: deleteImagesError } = await admin
    .from("product_images")
    .delete()
    .eq("product_id", productId);
  if (deleteImagesError) throw new Error(deleteImagesError.message);
  const { error: imageError } = await admin.from("product_images").insert(
    imageUrls.map((imageUrl, displayOrder) => ({
      product_id: productId,
      url: imageUrl,
      color: "Navy",
      display_order: displayOrder,
    })),
  );
  if (imageError) throw new Error(imageError.message);

  // Preserve live inventory and existing variant ids when refreshing product art/copy.
  // Only create a size when it does not already exist.
  const { data: existingVariants, error: variantsLookupError } = await admin
    .from("product_variants")
    .select("id, sku, size")
    .eq("product_id", productId);
  if (variantsLookupError) throw new Error(variantsLookupError.message);

  const existingSkus = new Set(
    (existingVariants ?? []).map((variant) =>
      String(variant.sku ?? "").toUpperCase(),
    ),
  );
  const missingVariants = SIZES.filter(
    (size) => !existingSkus.has(`${SKU_PREFIX}-NVY-${size}`),
  ).map((size) => ({
    product_id: productId,
    color: "Navy",
    size,
    sku: `${SKU_PREFIX}-NVY-${size}`,
    stock_quantity: 100,
  }));

  if (missingVariants.length > 0) {
    const { error: variantError } = await admin
      .from("product_variants")
      .insert(missingVariants);
    if (variantError) throw new Error(variantError.message);
  }

  console.log(`Product ID: ${productId}`);
  console.log(
    `Product URL: https://app.ncwrestlingunited.com/store-app/product/${productId}`,
  );
  console.log(
    `Price: $${PRICE}; sizes: ${SIZES.join(", ")}; fulfillment: TOC pickup`,
  );
  console.log(`Images: ${imageUrls.join(" | ")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
