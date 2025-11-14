"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Database, CheckCircle, XCircle, RefreshCw, Key, ViewIcon as Index, Shield } from "lucide-react"

interface TableCheckResult {
  success: boolean
  tableExists: boolean
  columns: Array<{
    column_name: string
    data_type: string
    is_nullable: string
    column_default: string | null
  }>
  foreignKeys: Array<{
    constraint_name: string
    column_name: string
    foreign_table_name: string
    foreign_column_name: string
  }>
  indexes: Array<{
    indexname: string
    indexdef: string
  }>
  policies: Array<{
    policyname: string
    permissive: string
    cmd: string
    qual: string
  }>
  canQuery: boolean
  queryError: string | null
  sampleData: any[]
}

export default function CheckEditRequestsTablePage() {
  const [result, setResult] = useState<TableCheckResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkTable = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/debug/check-edit-requests-table")
      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || "Failed to check table")
      }
    } catch (err) {
      setError("Network error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkTable()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Checking edit_requests table...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Database className="h-8 w-8" />
              Edit Requests Table Check
            </h1>
            <p className="text-muted-foreground mt-2">Verify the edit_requests table structure and configuration</p>
          </div>
          <Button onClick={checkTable} disabled={loading}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Check
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <>
          {/* Overall Status */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {result.tableExists ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                Table Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant={result.tableExists ? "default" : "destructive"}>
                    {result.tableExists ? "EXISTS" : "MISSING"}
                  </Badge>
                  <span className="text-sm">Table exists</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={result.canQuery ? "default" : "destructive"}>
                    {result.canQuery ? "QUERYABLE" : "ERROR"}
                  </Badge>
                  <span className="text-sm">Can query table</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={result.columns.length > 0 ? "default" : "secondary"}>
                    {result.columns.length} COLUMNS
                  </Badge>
                  <span className="text-sm">Table columns</span>
                </div>
              </div>

              {result.queryError && (
                <Alert variant="destructive" className="mt-4">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>Query Error: {result.queryError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Detailed Information */}
          <Tabs defaultValue="columns" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="columns">Columns ({result.columns.length})</TabsTrigger>
              <TabsTrigger value="constraints">Foreign Keys ({result.foreignKeys.length})</TabsTrigger>
              <TabsTrigger value="indexes">Indexes ({result.indexes.length})</TabsTrigger>
              <TabsTrigger value="policies">RLS Policies ({result.policies.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="columns">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Table Columns
                  </CardTitle>
                  <CardDescription>Column structure and data types</CardDescription>
                </CardHeader>
                <CardContent>
                  {result.columns.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border border-gray-300 px-4 py-2 text-left">Column Name</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Data Type</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Nullable</th>
                            <th className="border border-gray-300 px-4 py-2 text-left">Default</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.columns.map((column, index) => (
                            <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                              <td className="border border-gray-300 px-4 py-2 font-mono text-sm">
                                {column.column_name}
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-sm">{column.data_type}</td>
                              <td className="border border-gray-300 px-4 py-2 text-sm">
                                <Badge variant={column.is_nullable === "YES" ? "secondary" : "default"}>
                                  {column.is_nullable}
                                </Badge>
                              </td>
                              <td className="border border-gray-300 px-4 py-2 text-sm font-mono">
                                {column.column_default || "NULL"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No columns found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="constraints">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Foreign Key Constraints
                  </CardTitle>
                  <CardDescription>Relationships to other tables</CardDescription>
                </CardHeader>
                <CardContent>
                  {result.foreignKeys.length > 0 ? (
                    <div className="space-y-3">
                      {result.foreignKeys.map((fk, index) => (
                        <div key={index} className="p-3 border rounded-lg bg-blue-50">
                          <div className="font-semibold text-blue-900">{fk.constraint_name}</div>
                          <div className="text-sm text-blue-700 mt-1">
                            <code>{fk.column_name}</code> → <code>{fk.foreign_table_name}</code>.
                            <code>{fk.foreign_column_name}</code>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No foreign key constraints found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="indexes">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Index className="h-5 w-5" />
                    Database Indexes
                  </CardTitle>
                  <CardDescription>Performance optimization indexes</CardDescription>
                </CardHeader>
                <CardContent>
                  {result.indexes.length > 0 ? (
                    <div className="space-y-3">
                      {result.indexes.map((index, i) => (
                        <div key={i} className="p-3 border rounded-lg bg-green-50">
                          <div className="font-semibold text-green-900">{index.indexname}</div>
                          <div className="text-sm text-green-700 mt-1 font-mono">{index.indexdef}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No indexes found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="policies">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Row Level Security Policies
                  </CardTitle>
                  <CardDescription>Access control policies</CardDescription>
                </CardHeader>
                <CardContent>
                  {result.policies.length > 0 ? (
                    <div className="space-y-3">
                      {result.policies.map((policy, index) => (
                        <div key={index} className="p-3 border rounded-lg bg-purple-50">
                          <div className="font-semibold text-purple-900">{policy.policyname}</div>
                          <div className="text-sm text-purple-700 mt-1">
                            <Badge variant="outline" className="mr-2">
                              {policy.cmd}
                            </Badge>
                            <Badge variant="outline">{policy.permissive}</Badge>
                          </div>
                          {policy.qual && (
                            <div className="text-xs text-purple-600 mt-2 font-mono bg-purple-100 p-2 rounded">
                              {policy.qual}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No RLS policies found</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Sample Data */}
          {result.sampleData.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Sample Data</CardTitle>
                <CardDescription>First record from the table</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto">
                  {JSON.stringify(result.sampleData[0], null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
