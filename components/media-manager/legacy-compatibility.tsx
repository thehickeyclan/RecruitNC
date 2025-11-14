"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ImageUpload } from "@/components/image-upload"
import { NewImageUpload } from "./new-image-upload"
import { shouldUseNewMediaManager } from "@/lib/media-manager/config"
import { Info, Zap, ArrowRight } from "lucide-react"

interface LegacyCompatibilityProps {
  category: string
  entityId?: string
  entityType?: string
  onUploadComplete: (url: string) => void
}

export function LegacyCompatibility({ category, entityId, entityType, onUploadComplete }: LegacyCompatibilityProps) {
  const [useNewSystem, setUseNewSystem] = useState(shouldUseNewMediaManager())
  const [showComparison, setShowComparison] = useState(false)

  return (
    <div className="space-y-6">
      {/* System Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Media System Selection
          </CardTitle>
          <CardDescription>Choose between the legacy system and the new media manager</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Label htmlFor="system-toggle">Use New Media Manager</Label>
              <Badge variant={useNewSystem ? "default" : "secondary"}>
                {useNewSystem ? "New System" : "Legacy System"}
              </Badge>
            </div>
            <Switch id="system-toggle" checked={useNewSystem} onCheckedChange={setUseNewSystem} />
          </div>

          <Button variant="outline" onClick={() => setShowComparison(!showComparison)} className="w-full">
            {showComparison ? "Hide" : "Show"} Feature Comparison
          </Button>
        </CardContent>
      </Card>

      {/* Feature Comparison */}
      {showComparison && (
        <Card>
          <CardHeader>
            <CardTitle>Feature Comparison</CardTitle>
            <CardDescription>See what's different between the legacy and new systems</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3 text-gray-600">Legacy System</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Basic file upload
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Simple categorization
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Direct blob storage
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    No metadata tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    No search capabilities
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-3 text-green-600">New System</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Advanced file upload with preview
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Detailed categorization & tagging
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Metadata extraction & storage
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Alt text & accessibility
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Advanced search & filtering
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Entity relationship tracking
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {useNewSystem ? (
          <>
            <NewImageUpload
              category={category as any}
              entityId={entityId}
              entityType={entityType}
              onUploadComplete={onUploadComplete}
            />
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">New System Active</CardTitle>
                <CardDescription>You're using the enhanced media manager with advanced features</CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    The new system provides better organization, search capabilities, and metadata tracking. If you
                    encounter any issues, you can switch back to the legacy system above.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <ImageUpload category={category} onUploadComplete={onUploadComplete} entityName={entityId} />
            <Card>
              <CardHeader>
                <CardTitle className="text-blue-600">Legacy System Active</CardTitle>
                <CardDescription>You're using the original media upload system</CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <ArrowRight className="h-4 w-4" />
                  <AlertDescription>
                    Consider trying the new media manager for enhanced features like tagging, metadata tracking, and
                    advanced search capabilities.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
