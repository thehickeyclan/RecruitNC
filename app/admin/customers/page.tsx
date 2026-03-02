"use client"

import { useEffect, useState } from "react"
import { AdminCustomersClient } from "@/components/admin-customers-client"
import { getCustomers, type Customer } from "@/app/actions/customers"

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadCustomers() {
      const result = await getCustomers()
      if (result.success) {
        setCustomers(result.customers)
      }
      setLoading(false)
    }
    loadCustomers()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">Loading customers...</div>
      </div>
    )
  }

  return <AdminCustomersClient customers={customers} />
}
