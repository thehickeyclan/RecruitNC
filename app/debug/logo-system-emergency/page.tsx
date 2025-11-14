"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Database, Image, Zap } from 'lucide-react'

interface LogoSystemStatus {
  databaseConnection: boolean
  logoMappingsCount: number
  mediaItemsCount: number
  criticalLogosStatus: {
    [key: string]: {
      exists: boolean
      url?: string
      error?: string
    }
  }
  sampleAthleteTests: {
    [key: string]: {
      name: string
      college?: string
      highschool?: string
      wrestlingClub?: string
      logoResults: {
        college?: { found: boolean; url?: string }
        highschool?: { found: boolean; url?: string }
        wrestlingClub?: { found: boolean; url?: string }
      }
    }
  }
}

export default function LogoSystemEmergencyPage() {
  const [systemStatus, setSystemStatus] = useState<LogoSystemStatus | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [isFixing, setIsFixing] = useState(false)
  const [fixResults, setFixResults] = useState<any>(null)

  const runEmergencyDiagnostic = async () => {
    setIsChecking(true)
    try {
      const response = await fetch('/api/debug/logo-system-emergency')
      const data = await response.json()
      setSystemStatus(data)
    } catch (error) {
      console.error('Diagnostic error:', error)
    } finally {
      setIsChecking(false)
    }
  }

  const runEmergencyFix = async () => {
    setIsFixing(true)
    try {
      const response = await fetch('/api/debug/emergency-logo-fix', {
        method: 'POST'
      })
      const data = await response.json()
      setFixResults(data)
      // Re-run diagnostic after fix
      setTimeout(() => runEmergencyDiagnostic(), 1000)
    } catch (error) {
      console.error('Fix error:', error)
    } finally {
      setIsFixing(false)
    }
  }

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            Logo System Emergency Diagnostic
          </h1>
          <p className="text-gray-600">
            Comprehensive check of the logo system to identify and fix issues
          </p>
        </div>

        <div className="grid gap-6">
          {/* Control Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Emergency Controls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button 
                  onClick={runEmergencyDiagnostic} 
                  disabled={isChecking}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
                  {isChecking ? "Running Diagnostic..." : "Run Full Diagnostic"}
                </Button>
                
                <Button 
                  onClick={runEmergencyFix} 
                  disabled={isFixing || !systemStatus}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  {isFixing ? "Applying Emergency Fix..." : "Apply Emergency Fix"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          {systemStatus && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    System Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(systemStatus.databaseConnection)}
                      <span>Database Connection</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={systemStatus.logoMappingsCount > 0 ? "default" : "destructive"}>
                        {systemStatus.logoMappingsCount} Logo Mappings
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={systemStatus.mediaItemsCount > 0 ? "default" : "destructive"}>
                        {systemStatus.mediaItemsCount} Media Items
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Critical Logos Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image className="h-5 w-5" />
                    Critical Logos Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(systemStatus.criticalLogosStatus).map(([entity, status]) => (
                      <div key={entity} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{entity}</span>
                          {getStatusIcon(status.exists)}
                        </div>
                        {status.url && (
                          <div className="flex items-center gap-2">
                            <img 
                              src={status.url || "/placeholder.svg"} 
                              alt={entity}
                              className="w-8 h-8 object-contain"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                            <span className="text-xs text-gray-500 truncate">{status.url}</span>
                          </div>
                        )}
                        {status.error && (
                          <p className="text-xs text-red-500 mt-1">{status.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Sample Athlete Tests */}
              <Card>
                <CardHeader>
                  <CardTitle>Sample Athlete Logo Tests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(systemStatus.sampleAthleteTests).map(([athleteId, athlete]) => (
                      <div key={athleteId} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold">{athlete.name}</h3>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => window.open(`/athletes/${athleteId}`, '_blank')}
                          >
                            View Profile
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          {athlete.college && (
                            <div>
                              <p className="font-medium text-blue-600">College: {athlete.college}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {getStatusIcon(athlete.logoResults.college?.found || false)}
                                <span>{athlete.logoResults.college?.found ? 'Logo Found' : 'Logo Missing'}</span>
                              </div>
                              {athlete.logoResults.college?.url && (
                                <img 
                                  src={athlete.logoResults.college.url || "/placeholder.svg"} 
                                  alt={athlete.college}
                                  className="w-6 h-6 object-contain mt-1"
                                />
                              )}
                            </div>
                          )}
                          
                          {athlete.highschool && (
                            <div>
                              <p className="font-medium text-green-600">High School: {athlete.highschool}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {getStatusIcon(athlete.logoResults.highschool?.found || false)}
                                <span>{athlete.logoResults.highschool?.found ? 'Logo Found' : 'Logo Missing'}</span>
                              </div>
                              {athlete.logoResults.highschool?.url && (
                                <img 
                                  src={athlete.logoResults.highschool.url || "/placeholder.svg"} 
                                  alt={athlete.highschool}
                                  className="w-6 h-6 object-contain mt-1"
                                />
                              )}
                            </div>
                          )}
                          
                          {athlete.wrestlingClub && (
                            <div>
                              <p className="font-medium text-orange-600">Wrestling Club: {athlete.wrestlingClub}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {getStatusIcon(athlete.logoResults.wrestlingClub?.found || false)}
                                <span>{athlete.logoResults.wrestlingClub?.found ? 'Logo Found' : 'Logo Missing'}</span>
                              </div>
                              {athlete.logoResults.wrestlingClub?.url && (
                                <img 
                                  src={athlete.logoResults.wrestlingClub.url || "/placeholder.svg"} 
                                  alt={athlete.wrestlingClub}
                                  className="w-6 h-6 object-contain mt-1"
                                />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Fix Results */}
          {fixResults && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Emergency Fix Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><strong>Status:</strong> {fixResults.success ? 'Success' : 'Failed'}</p>
                  <p><strong>Logos Restored:</strong> {fixResults.logosRestored || 0}</p>
                  <p><strong>Mappings Created:</strong> {fixResults.mappingsCreated || 0}</p>
                  {fixResults.message && (
                    <p className="text-sm text-gray-600">{fixResults.message}</p>
                  )}
                  {fixResults.details && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">Details:</h4>
                      <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                        {JSON.stringify(fixResults.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
