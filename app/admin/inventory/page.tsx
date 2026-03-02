import { getInventoryProducts } from "@/app/actions/inventory"
import { InventoryClient } from "@/components/admin/admin-inventory-client"

export const dynamic = "force-dynamic"

export default async function InventoryPage() {
  const products = await getInventoryProducts()

  return <InventoryClient initialProducts={products} />
}
