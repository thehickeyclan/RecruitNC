"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, CheckCircle, AlertCircle, Database, Upload, Settings } from "lucide-react"

export default function SetupCollegeMasterPage() {
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [results, setResults] = useState<any>(null)
  const { toast } = useToast()

  const steps = [
    {
      title: "Create Database Tables",
      description: "Create college_master and college_aliases tables",
      action: createTables,
      icon: Database,
    },
    {
      title: "Populate Colleges",
      description: "Import all colleges from athlete records",
      action: populateColleges,
      icon: Upload,
    },
    {
      title: "Manual Setup",
      description: "Go to College Master page to set divisions",
      action: () => window.open("/admin/college-master", "_blank"),
      icon: Settings,
    },
  ]

  async function createTables() {
    try {
      setLoading(true)

      const response = await fetch("/api/run-script/create-college-master-table", {
        method: "POST",
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Success",
          description: "Database tables created successfully",
        })
        setStep(1)
      } else {
        throw new Error(result.error || "Failed to create tables")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create tables",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  async function populateColleges() {
    try {
      setLoading(true)

      const response = await fetch("/api/college-master/populate", {
        method: "POST",
      })

      const result = await response.json()

      if (result.success) {
        setResults(result)
        toast({
          title: "Success",
          description: `Processed ${result.summary.total} colleges. Created ${result.summary.created}, Found ${result.summary.existing} existing.`,
        })
        setStep(2)
      } else {
        throw new Error(result.error || "Failed to populate colleges")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to populate colleges",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Setup College Master System</h1>
        <p className="text-gray-600 mt-2">Initialize the college master system to manage divisions and aliases.</p>
      </div>

      <div className="space-y-6">
        {steps.map((stepItem, index) => {
          const Icon = stepItem.icon
          const isCompleted = step > index
          const isCurrent = step === index
          const isDisabled = step < index

          return (
            <Card key={index} className={`${isCurrent ? "border-blue-500" : ""} ${isCompleted ? "bg-green-50" : ""}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-full ${
                      isCompleted
                        ? "bg-green-100 text-green-600"
                        : isCurrent
                          ? "bg-blue-100 text-blue-600"
                          : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {isCompleted ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      Step {index + 1}: {stepItem.title}
                    </h3>
                    <p className="text-sm text-gray-600 font-normal">{stepItem.description}</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={stepItem.action}
                  disabled={isDisabled || loading}
                  variant={isCompleted ? "outline" : "default"}
                >
                  {loading && isCurrent ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {isCompleted ? "Completed" : isCurrent ? "Run Step" : "Waiting"}
                </Button>
              </CardContent>
            </Card>
          )
        })}

        {results && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Population Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center p-4 bg-blue-50 rounded">
                  <div className="text-2xl font-bold text-blue-600">{results.summary.total}</div>
                  <div className="text-sm text-gray-600">Total Colleges</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded">
                  <div className="text-2xl font-bold text-green-600">{results.summary.created}</div>
                  <div className="text-sm text-gray-600">Created</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded">
                  <div className="text-2xl font-bold text-yellow-600">{results.summary.existing}</div>
                  <div className="text-sm text-gray-600">Already Existed</div>
                </div>
              </div>

              {results.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-red-600 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Errors ({results.errors.length})
                  </h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {results.errors.map((error: any, index: number) => (
                      <div key={index} className="text-sm bg-red-50 p-2 rounded">
                        <strong>{error.college}:</strong> {error.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {step >= 2 && (
          <Card className="border-green-500 bg-green-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <h3 className="text-lg font-semibold text-green-800">Setup Complete!</h3>
              </div>
              <p className="text-green-700 mb-4">The college master system is now ready. You can now:</p>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <span>Set divisions for each college manually</span>
                </div>
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <span>Add aliases for colleges (UNC = University of North Carolina)</span>
                </div>
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <span>Use bulk operations to set multiple colleges at once</span>
                </div>
              </div>
              <Button onClick={() => window.open("/admin/college-master", "_blank")}>
                Open College Master Manager
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
