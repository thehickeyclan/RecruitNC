"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Upload, Download, Info, CheckCircle, AlertCircle } from "lucide-react"
import type { Athlete } from "@/types/athlete"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function BulkImportPage() {
  const [activeTab, setActiveTab] = useState<"csv" | "json" | "manual">("csv")
  const [isUploading, setIsUploading] = useState(false)
  const [csvData, setCsvData] = useState<string>("")
  const [jsonData, setJsonData] = useState<string>("")
  const [parsedAthletes, setParsedAthletes] = useState<Partial<Athlete>[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const { toast } = useToast()

  const [importResults, setImportResults] = useState<{
    success: boolean
    message: string
    importedCount?: number
    failedCount?: number
    importedIds?: string[]
  }>({ success: false, message: "" })
  const [showResults, setShowResults] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "success" | "failed" | "none">("none")

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setErrors([])

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const csvContent = event.target?.result as string
        setCsvData(csvContent)

        // Parse CSV
        const lines = csvContent.split("\n")
        const headers = lines[0].split(",").map((h) => h.trim())

        const athletes: Partial<Athlete>[] = []

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue

          // Handle quoted values properly
          const values: string[] = []
          let currentValue = ""
          let inQuotes = false

          // Process each character in the line
          for (let j = 0; j < lines[i].length; j++) {
            const char = lines[i][j]

            if (char === '"' && (j === 0 || lines[i][j - 1] !== "\\")) {
              inQuotes = !inQuotes
            } else if (char === "," && !inQuotes) {
              values.push(currentValue.trim())
              currentValue = ""
            } else {
              currentValue += char
            }
          }

          // Add the last value
          values.push(currentValue.trim())

          // Remove quotes from values
          const cleanValues = values.map((v) => {
            if (v.startsWith('"') && v.endsWith('"')) {
              return v.substring(1, v.length - 1)
            }
            return v
          })

          const athlete: Record<string, any> = {}

          headers.forEach((header, index) => {
            if (cleanValues[index] !== undefined && cleanValues[index] !== "") {
              // Map CSV headers to athlete properties
              switch (header.toLowerCase()) {
                case "name":
                  athlete.name = cleanValues[index]
                  break
                case "first name":
                case "firstname":
                  athlete.firstName = cleanValues[index]
                  break
                case "last name":
                case "lastname":
                  athlete.lastName = cleanValues[index]
                  break
                case "graduation year":
                case "graduationyear":
                case "class":
                  athlete.graduationYear = Number.parseInt(cleanValues[index])
                  break
                case "weight class":
                case "weightclass":
                  athlete.weightClass = cleanValues[index]
                  break
                case "high school":
                case "highschool":
                  athlete.highSchool = cleanValues[index]
                  break
                case "wrestling club":
                case "wrestlingclub":
                  athlete.wrestlingClub = cleanValues[index]
                  break
                case "college":
                  athlete.college = cleanValues[index]
                  break
                case "division":
                  athlete.division = cleanValues[index]
                  break
                case "commitment date":
                case "commitmentdate":
                  athlete.commitmentDate = cleanValues[index]
                  break
                case "achievements":
                  // Handle achievements as a semicolon-separated list
                  athlete.achievements = cleanValues[index]
                    .split(";")
                    .map((a: string) => a.trim())
                    .filter((a: string) => a)
                  break
                case "nc united team":
                case "ncunitedteam":
                  athlete.ncUnitedTeam = cleanValues[index].toLowerCase()
                  break
                case "gender":
                  athlete.gender = cleanValues[index]
                  break
                case "location":
                  athlete.location = cleanValues[index]
                  break
                case "photo url":
                case "photourl":
                  athlete.photoUrl = cleanValues[index]
                  break
                default:
                  athlete[header] = cleanValues[index]
              }
            }
          })

          // Generate name if not provided but first and last name are
          if (!athlete.name && athlete.firstName && athlete.lastName) {
            athlete.name = `${athlete.firstName} ${athlete.lastName}`
          }

          athletes.push(athlete as Partial<Athlete>)
        }

        setParsedAthletes(athletes)

        toast({
          title: "CSV Parsed Successfully",
          description: `Found ${athletes.length} athletes in the CSV file`,
        })
      } catch (error) {
        console.error("Error parsing CSV:", error)
        setErrors(["Failed to parse CSV file. Please check the format."])
        toast({
          title: "Error Parsing CSV",
          description: "There was an error parsing the CSV file",
          variant: "destructive",
        })
      } finally {
        setIsUploading(false)
      }
    }

    reader.onerror = () => {
      setErrors(["Failed to read the file"])
      setIsUploading(false)
      toast({
        title: "Error Reading File",
        description: "There was an error reading the file",
        variant: "destructive",
      })
    }

    reader.readAsText(file)
  }

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setErrors([])

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const jsonContent = event.target?.result as string
        setJsonData(jsonContent)

        // Parse JSON
        const athletes = JSON.parse(jsonContent)

        if (!Array.isArray(athletes)) {
          throw new Error("JSON must contain an array of athletes")
        }

        // Process achievements if they're strings
        const processedAthletes = athletes.map((athlete) => {
          if (athlete.achievements && typeof athlete.achievements === "string") {
            return {
              ...athlete,
              achievements: athlete.achievements
                .split(";")
                .map((a: string) => a.trim())
                .filter((a: string) => a),
            }
          }
          return athlete
        })

        setParsedAthletes(processedAthletes)

        toast({
          title: "JSON Parsed Successfully",
          description: `Found ${processedAthletes.length} athletes in the JSON file`,
        })
      } catch (error) {
        console.error("Error parsing JSON:", error)
        setErrors(["Failed to parse JSON file. Please check the format."])
        toast({
          title: "Error Parsing JSON",
          description: "There was an error parsing the JSON file",
          variant: "destructive",
        })
      } finally {
        setIsUploading(false)
      }
    }

    reader.onerror = () => {
      setErrors(["Failed to read the file"])
      setIsUploading(false)
      toast({
        title: "Error Reading File",
        description: "There was an error reading the file",
        variant: "destructive",
      })
    }

    reader.readAsText(file)
  }

  const handleManualInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonData(e.target.value)
    setErrors([])

    try {
      if (!e.target.value.trim()) {
        setParsedAthletes([])
        return
      }

      const athletes = JSON.parse(e.target.value)

      if (!Array.isArray(athletes)) {
        throw new Error("JSON must contain an array of athletes")
      }

      // Process achievements if they're strings
      const processedAthletes = athletes.map((athlete) => {
        if (athlete.achievements && typeof athlete.achievements === "string") {
          return {
            ...athlete,
            achievements: athlete.achievements
              .split(";")
              .map((a: string) => a.trim())
              .filter((a: string) => a),
          }
        }
        return athlete
      })

      setParsedAthletes(processedAthletes)
    } catch (error) {
      console.error("Error parsing manual JSON:", error)
      setErrors(["Invalid JSON format"])
    }
  }

  // Verify the import was successful
  const verifyImport = async (ids: string[]) => {
    if (!ids || ids.length === 0) return

    setVerificationStatus("pending")

    try {
      const response = await fetch("/api/athletes/verify-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to verify athletes")
      }

      if (result.verified === ids.length) {
        setVerificationStatus("success")
        toast({
          title: "Verification Successful",
          description: `All ${result.verified} athletes were verified in the database`,
        })
      } else {
        setVerificationStatus("failed")
        toast({
          title: "Verification Incomplete",
          description: `Only ${result.verified} out of ${ids.length} athletes were found in the database`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error verifying import:", error)
      setVerificationStatus("failed")
      toast({
        title: "Verification Failed",
        description: "There was an error verifying the imported athletes",
        variant: "destructive",
      })
    }
  }

  // Replace the handleImport function with this implementation that uses the API
  const handleImport = async () => {
    if (parsedAthletes.length === 0) {
      toast({
        title: "No Athletes to Import",
        description: "Please upload or enter athlete data first",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    setShowResults(false)
    setImportResults({ success: false, message: "" })
    setErrors([])
    setVerificationStatus("none")

    try {
      // Validate required fields
      const missingFields: string[] = []
      parsedAthletes.forEach((athlete, index) => {
        if (!athlete.name && (!athlete.firstName || !athlete.lastName)) {
          missingFields.push(`Athlete #${index + 1}: Missing name or first/last name`)
        }
        if (!athlete.highSchool && !athlete.highschool) {
          missingFields.push(`Athlete #${index + 1}: Missing high school`)
        }
        if (!athlete.wrestlingClub) {
          missingFields.push(`Athlete #${index + 1}: Missing wrestling club`)
        }
        if (!athlete.college) {
          missingFields.push(`Athlete #${index + 1}: Missing college`)
        }
        if (!athlete.division) {
          missingFields.push(`Athlete #${index + 1}: Missing division`)
        }
        if (!athlete.commitmentDate && !athlete.commitmentdate) {
          missingFields.push(`Athlete #${index + 1}: Missing commitment date`)
        }
        if (!athlete.achievements || (Array.isArray(athlete.achievements) && athlete.achievements.length === 0)) {
          missingFields.push(`Athlete #${index + 1}: Missing achievements`)
        }
      })

      if (missingFields.length > 0) {
        setErrors(missingFields)
        toast({
          title: "Validation Error",
          description: "Some athletes are missing required fields",
          variant: "destructive",
        })
        setIsUploading(false)
        return
      }

      // Prepare data for API - ensure consistent field names
      const preparedAthletes = parsedAthletes.map((athlete) => ({
        name: athlete.name,
        firstName: athlete.firstName,
        lastName: athlete.lastName,
        highSchool: athlete.highSchool || athlete.highschool,
        wrestlingClub: athlete.wrestlingClub,
        college: athlete.college,
        division: athlete.division,
        weightClass: athlete.weightClass || athlete.weightclass,
        graduationYear: athlete.graduationYear || athlete.graduationyear,
        commitmentDate: athlete.commitmentDate || athlete.commitmentdate,
        photoUrl: athlete.photoUrl || athlete.photourl,
        achievements: athlete.achievements,
        gender: athlete.gender,
        ncUnitedTeam: athlete.ncUnitedTeam,
        location: athlete.location,
      }))

      // Send data to the API
      const response = await fetch("/api/athletes/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preparedAthletes),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to import athletes")
      }

      // Set import results
      setImportResults({
        success: true,
        message: result.message || `Successfully imported ${parsedAthletes.length} athletes`,
        importedCount: result.importedCount || parsedAthletes.length,
        importedIds: result.importedIds || [],
      })
      setShowResults(true)

      toast({
        title: "Import Successful",
        description: result.message || `Successfully imported ${parsedAthletes.length} athletes`,
      })

      // Verify the import
      if (result.importedIds && result.importedIds.length > 0) {
        verifyImport(result.importedIds)
      }

      // Don't reset form immediately so user can see what was imported
    } catch (error: any) {
      console.error("Error importing athletes:", error)

      setImportResults({
        success: false,
        message: error.message || "Failed to import athletes",
        failedCount: parsedAthletes.length,
      })
      setShowResults(true)

      toast({
        title: "Import Failed",
        description: error.message || "There was an error importing the athletes",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const downloadTemplate = () => {
    const csvHeaders =
      "Name,High School,Wrestling Club,College,Division,Commitment Date,Achievements,Weight Class,Graduation Year,Gender,NC United Team"
    const csvContent = `${csvHeaders}
John Doe,Example High School,Example Club,Example College,NCAA D1,2023-06-15,"State Champion;Regional Champion",157,2025,Male,blue`

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "athlete-import-template.csv"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="mb-6 text-3xl font-bold">Bulk Import Athletes</h1>

      <Card>
        <CardHeader>
          <CardTitle>Import Multiple Athletes</CardTitle>
          <CardDescription>
            Upload a CSV or JSON file containing athlete information, or enter the data manually.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>Required Fields</AlertTitle>
            <AlertDescription>
              The following fields are required for each athlete:
              <ul className="list-disc pl-5 mt-2">
                <li>Name</li>
                <li>High School</li>
                <li>Wrestling Club</li>
                <li>College</li>
                <li>Division</li>
                <li>Commitment Date</li>
                <li>Achievements</li>
              </ul>
            </AlertDescription>
          </Alert>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="mb-4">
              <TabsTrigger value="csv">CSV Upload</TabsTrigger>
              <TabsTrigger value="json">JSON Upload</TabsTrigger>
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            </TabsList>

            <TabsContent value="csv" className="space-y-4">
              <div className="flex items-end gap-4">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="csv-file">Upload CSV File</Label>
                  <Input id="csv-file" type="file" accept=".csv" onChange={handleCsvUpload} disabled={isUploading} />
                </div>
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>CSV should include the following columns:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  <ul className="list-disc pl-5">
                    <li>
                      <strong>Name</strong>
                    </li>
                    <li>
                      <strong>High School</strong>
                    </li>
                    <li>
                      <strong>Wrestling Club</strong>
                    </li>
                    <li>
                      <strong>College</strong>
                    </li>
                  </ul>
                  <ul className="list-disc pl-5">
                    <li>
                      <strong>Division</strong>
                    </li>
                    <li>
                      <strong>Commitment Date</strong>
                    </li>
                    <li>
                      <strong>Achievements</strong> (semicolon-separated)
                    </li>
                    <li>Weight Class (optional)</li>
                    <li>Graduation Year (optional)</li>
                    <li>Gender (optional)</li>
                    <li>NC United Team (optional)</li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="json" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="json-file">Upload JSON File</Label>
                <Input id="json-file" type="file" accept=".json" onChange={handleJsonUpload} disabled={isUploading} />
              </div>

              <div className="text-sm text-muted-foreground">
                <p>JSON should be an array of athlete objects with properties like:</p>
                <pre className="bg-gray-100 p-2 rounded-md mt-2 overflow-x-auto">
                  {`[
  {
    "name": "John Doe",
    "highSchool": "Example High School",
    "wrestlingClub": "Example Club",
    "college": "Example College",
    "division": "NCAA D1",
    "commitmentDate": "2023-06-15",
    "achievements": ["State Champion", "Regional Champion"],
    "weightClass": "157",
    "graduationYear": 2025,
    "gender": "Male",
    "ncUnitedTeam": "blue"
  }
]`}
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manual-json">Enter JSON Data</Label>
                <Textarea
                  id="manual-json"
                  value={jsonData}
                  onChange={handleManualInput}
                  placeholder="Paste JSON array of athlete objects here..."
                  rows={10}
                  className="font-mono"
                />
              </div>
            </TabsContent>
          </Tabs>

          {errors.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <h3 className="text-sm font-medium text-red-800">Errors:</h3>
              <ul className="mt-2 text-sm text-red-700 list-disc pl-5">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {parsedAthletes.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-2">Preview ({parsedAthletes.length} athletes)</h3>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>High School</TableHead>
                      <TableHead>Club</TableHead>
                      <TableHead>College</TableHead>
                      <TableHead>Division</TableHead>
                      <TableHead>Commitment Date</TableHead>
                      <TableHead>Achievements</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedAthletes.slice(0, 5).map((athlete, index) => (
                      <TableRow key={index}>
                        <TableCell>{athlete.name || `${athlete.firstName} ${athlete.lastName}`}</TableCell>
                        <TableCell>{athlete.highSchool || athlete.highschool || "—"}</TableCell>
                        <TableCell>{athlete.wrestlingClub || "—"}</TableCell>
                        <TableCell>{athlete.college || "—"}</TableCell>
                        <TableCell>{athlete.division || "—"}</TableCell>
                        <TableCell>{athlete.commitmentDate || athlete.commitmentdate || "—"}</TableCell>
                        <TableCell>
                          {athlete.achievements && Array.isArray(athlete.achievements)
                            ? athlete.achievements.slice(0, 2).join(", ") +
                              (athlete.achievements.length > 2 ? "..." : "")
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {parsedAthletes.length > 5 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground">
                          ...and {parsedAthletes.length - 5} more athletes
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 flex justify-end">
                <Button onClick={handleImport} disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Import {parsedAthletes.length} Athletes
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
          {showResults && (
            <div
              className={`mt-6 p-4 rounded-md ${importResults.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
            >
              <h3 className={`text-lg font-medium mb-2 ${importResults.success ? "text-green-800" : "text-red-800"}`}>
                {importResults.success ? "Import Successful" : "Import Failed"}
              </h3>
              <p className={importResults.success ? "text-green-700" : "text-red-700"}>{importResults.message}</p>
              {importResults.success && importResults.importedCount && (
                <p className="mt-2 text-green-700">Successfully imported {importResults.importedCount} athletes.</p>
              )}

              {verificationStatus !== "none" && (
                <div className="mt-4 flex items-center">
                  <span className="mr-2">Verification status:</span>
                  {verificationStatus === "pending" && (
                    <span className="flex items-center text-blue-600">
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Verifying...
                    </span>
                  )}
                  {verificationStatus === "success" && (
                    <span className="flex items-center text-green-600">
                      <CheckCircle className="mr-1 h-4 w-4" /> All athletes verified
                    </span>
                  )}
                  {verificationStatus === "failed" && (
                    <span className="flex items-center text-red-600">
                      <AlertCircle className="mr-1 h-4 w-4" /> Verification incomplete
                    </span>
                  )}
                </div>
              )}

              {!importResults.success && (
                <div className="mt-2">
                  <p className="text-red-700">Please check the following:</p>
                  <ul className="list-disc pl-5 mt-1 text-red-700">
                    <li>All required fields are provided</li>
                    <li>The data format is correct</li>
                    <li>There are no duplicate athletes</li>
                  </ul>
                </div>
              )}
              <div className="mt-4 flex justify-end">
                {importResults.success ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCsvData("")
                      setJsonData("")
                      setParsedAthletes([])
                      setShowResults(false)
                      setVerificationStatus("none")
                    }}
                  >
                    Clear Form
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => setShowResults(false)}>
                    Dismiss
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
