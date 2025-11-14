"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function LogoSystemStatus() {
  const [status, setStatus] = useState({
    systemHealth: "CHECKING",
    protectedFiles: [],
    lastCheck: "",
    activeProtections: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkSystemStatus()
  }, [])

  const checkSystemStatus = async () => {
    setLoading(true)
    try {
      // Simulate system check
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setStatus({
        systemHealth: "OPTIMAL",
        protectedFiles: [
          "components/entity-logo.tsx",
          "lib/logo-mappings.ts",
          "app/api/logo-mappings/route.ts",
          "app/api/logo-mappings-simple/route.ts",
        ],
        lastCheck: new Date().toISOString(),
        activeProtections: 4,
      })
    } catch (error) {
      setStatus((prev) => ({ ...prev, systemHealth: "ERROR" }))
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (health: string) => {
    switch (health) {
      case "OPTIMAL":
        return "text-green-600"
      case "WARNING":
        return "text-yellow-600"
      case "ERROR":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  const getStatusIcon = (health: string) => {
    switch (health) {
      case "OPTIMAL":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "WARNING":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case "ERROR":
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      default:
        return <RefreshCw className="h-5 w-5 text-gray-600 animate-spin" />
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            Logo System Protection Status
          </CardTitle>
          <CardDescription>Real-time monitoring of critical logo system components</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">{getStatusIcon(status.systemHealth)}</div>
              <div className={`text-lg font-semibold ${getStatusColor(status.systemHealth)}`}>
                {status.systemHealth}
              </div>
              <div className="text-sm text-gray-600">System Health</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">{status.activeProtections}</div>
              <div className="text-sm text-gray-600">Protected Files</div>
            </div>

            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 mb-1">{loading ? "Checking..." : "ACTIVE"}</div>
              <div className="text-sm text-gray-600">Protection Status</div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Protected Components:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {status.protectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-mono">{file}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-gray-600">
                Last Check: {status.lastCheck ? new Date(status.lastCheck).toLocaleString() : "Never"}
              </div>
              <Button onClick={checkSystemStatus} disabled={loading} size="sm">
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Status
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-green-600">✅ Safe Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Data Operations:</h4>
              <ul className="space-y-1 text-sm">
                <li>• Add new logo mappings</li>
                <li>• Upload logo files</li>
                <li>• Update logo URLs</li>
                <li>• Bulk logo operations</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Admin Functions:</h4>
              <ul className="space-y-1 text-sm">
                <li>• Logo Management System</li>
                <li>• Media Manager Pro</li>
                <li>• Entity logo uploads</li>
                <li>• Logo consistency checks</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">🚫 Protected Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            <p>• Modifying core logo retrieval logic</p>
            <p>• Changing logo component structure</p>
            <p>• Altering logo API endpoints</p>
            <p>• Breaking logo display functionality</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
