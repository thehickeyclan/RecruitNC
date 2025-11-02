"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Database, RefreshCw, AlertCircle, CheckCircle, Copy, ExternalLink, Terminal } from "lucide-react"

interface MediaItem {
  id: string
  url: string
  filename: string
  original_name: string
  category: string
  size_bytes: number
  mime_type: string
  created_at: string
  is_active: boolean
  entity_id?: string
  entity_type?: string
  alt_text?: string
  caption?: string
}

interface ApiResponse {
  success: boolean
  data: MediaItem[]
  count: number
  error?: string
  tableExists: boolean
  needsSetup: boolean
  message?: string
}

interface SetupResponse {
  success: boolean
  error?: string
  sql?: string
  instructions?: string
  message?: string
  manualSetupRequired?: boolean
  alreadyExists?: boolean
}

export default function MediaItemsDebugPage() {
  const [response, setResponse] = useState<ApiResponse | null>(null)
  const [setupResponse, setSetupResponse] = useState<SetupResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showSQL, setShowSQL] = useState(false)

  const loadItems = async () => {
    setLoading(true)
    setSetupResponse(null)

    try {
      console.log("Loading media items...")
      const res = await fetch("/api/debug/media-items-raw")
      const data: ApiResponse = await res.json()
      console.log("API Response:", data)
      setResponse(data)
    } catch (error) {
      console.error("Load error:", error)
      setResponse({
        success: false,
        data: [],
        count: 0,
        error: error instanceof Error ? error.message : "Failed to load",
        tableExists: false,
        needsSetup: true,
      })
    } finally {
      setLoading(false)
    }
  }

  const createTable = async () => {
    setCreating(true)

    try {
      console.log("Creating table...")
      const res = await fetch("/api/run-script/create-media-items-table", {
        method: "POST",
      })
      const result: SetupResponse = await res.json()
      console.log("Setup response:", result)

      setSetupResponse(result)
      setShowSQL(true)

      if (result.success) {
        // Wait a moment then reload to verify
        setTimeout(() => {
          loadItems()
        }, 1500)
      }
    } catch (error) {
      console.error("Setup error:", error)
      setSetupResponse({
        success: false,
        error: error instanceof Error ? error.message : "Setup request failed",
        manualSetupRequired: true,
      })
      setShowSQL(true)
    } finally {
      setCreating(false)
    }
  }

  const copySQL = () => {
    const sql = `-- Create media_items table for file management
CREATE TABLE IF NOT EXISTS public.media_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    url TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    entity_id TEXT,
    entity_type TEXT,
    tags TEXT[] DEFAULT '{}',
    alt_text TEXT,
    caption TEXT,
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_media_items_category ON public.media_items(category);
CREATE INDEX IF NOT EXISTS idx_media_items_entity ON public.media_items(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_media_items_active ON public.media_items(is_active);
CREATE INDEX IF NOT EXISTS idx_media_items_created ON public.media_items(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now
DROP POLICY IF EXISTS "Allow all operations on media_items" ON public.media_items;
CREATE POLICY "Allow all operations on media_items" ON public.media_items
    FOR ALL USING (true);

-- Add trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
DROP TRIGGER IF EXISTS update_media_items_updated_at ON public.media_items;
CREATE TRIGGER update_media_items_updated_at 
    BEFORE UPDATE ON public.media_items 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();`

    navigator.clipboard.writeText(sql)
    alert("✅ SQL copied to clipboard! Paste it into your Supabase SQL Editor.")
  }

  useEffect(() => {
    loadItems()
  }, [])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Media Items Debug Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadItems} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Loading..." : "Refresh Data"}
          </Button>
          <Button variant="outline" asChild>
            <a href="/admin/media-manager-v2" target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              Media Manager
            </a>
          </Button>
        </div>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Status
            {response?.tableExists && (
              <Badge variant="outline" className="text-green-600">
                ✅ Ready
              </Badge>
            )}
            {response && !response.tableExists && <Badge variant="destructive">⚠️ Setup Required</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Checking database status...</span>
            </div>
          ) : response ? (
            <div className="space-y-4">
              {/* Status Display */}
              <div className="flex items-center gap-2">
                {response.tableExists ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-green-600 font-medium">Table exists and accessible</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <span className="text-red-600 font-medium">Table missing or inaccessible</span>
                  </>
                )}
              </div>

              {/* Success Message */}
              {response.success && response.message && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{response.message}</AlertDescription>
                </Alert>
              )}

              {/* Setup Required Alert */}
              {response.needsSetup && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-3">
                      <div>
                        <strong>Setup Required:</strong> {response.error}
                      </div>
                      <p className="text-sm">
                        The media_items table needs to be created before you can use the media manager.
                      </p>
                      <div className="flex gap-2">
                        <Button onClick={createTable} disabled={creating} size="sm">
                          {creating ? "⏳ Getting SQL..." : "📋 Get Setup SQL"}
                        </Button>
                        <Button variant="outline" onClick={copySQL} size="sm">
                          <Copy className="h-4 w-4 mr-2" />
                          Copy SQL
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Other Errors */}
              {response.error && !response.needsSetup && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div>
                        <strong>Database Error:</strong> {response.error}
                      </div>
                      {response.message && <div className="text-sm">Details: {response.message}</div>}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="text-muted-foreground">No data available</div>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      {(setupResponse || showSQL) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Manual Setup Instructions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-medium">Follow these steps to create the table:</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Go to your Supabase dashboard</li>
                      <li>
                        Navigate to the <strong>SQL Editor</strong>
                      </li>
                      <li>
                        Click <strong>"New Query"</strong>
                      </li>
                      <li>Copy the SQL below and paste it into the editor</li>
                      <li>
                        Click <strong>"Run"</strong> to execute
                      </li>
                      <li>
                        Return here and click <strong>"Refresh Data"</strong>
                      </li>
                    </ol>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">SQL to execute:</h4>
                  <Button onClick={copySQL} size="sm" variant="outline">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy SQL
                  </Button>
                </div>
                <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto max-h-96 border">
                  {`-- Create media_items table for file management
CREATE TABLE IF NOT EXISTS public.media_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    url TEXT NOT NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    entity_id TEXT,
    entity_type TEXT,
    tags TEXT[] DEFAULT '{}',
    alt_text TEXT,
    caption TEXT,
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_media_items_category ON public.media_items(category);
CREATE INDEX IF NOT EXISTS idx_media_items_entity ON public.media_items(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_media_items_active ON public.media_items(is_active);
CREATE INDEX IF NOT EXISTS idx_media_items_created ON public.media_items(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now
DROP POLICY IF EXISTS "Allow all operations on media_items" ON public.media_items;
CREATE POLICY "Allow all operations on media_items" ON public.media_items
    FOR ALL USING (true);

-- Add trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
DROP TRIGGER IF EXISTS update_media_items_updated_at ON public.media_items;
CREATE TRIGGER update_media_items_updated_at 
    BEFORE UPDATE ON public.media_items 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();`}
                </pre>
              </div>

              <div className="flex gap-2">
                <Button onClick={loadItems} size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Check Again
                </Button>
                <Button variant="outline" onClick={copySQL} size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy SQL Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Display */}
      {response && response.success && response.tableExists && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>📁 Media Items</span>
              <Badge variant="outline">{response.count} items</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {response.data.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📂</div>
                <h3 className="text-lg font-medium mb-2">No media items found</h3>
                <p className="text-muted-foreground mb-4">The table is ready! Upload some files to see them here.</p>
                <Button asChild>
                  <a href="/admin/media-manager-v2">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Go to Media Manager
                  </a>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{response.count}</div>
                    <div className="text-sm text-blue-600">Total Items</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {response.data.filter((item) => item.category === "college-logo").length}
                    </div>
                    <div className="text-sm text-green-600">College Logos</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {response.data.filter((item) => item.category === "athlete-photo").length}
                    </div>
                    <div className="text-sm text-purple-600">Athlete Photos</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {response.data.filter((item) => item.is_active).length}
                    </div>
                    <div className="text-sm text-orange-600">Active Items</div>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-3">
                  {response.data.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{item.original_name}</h3>
                            <Badge variant="outline">{item.category}</Badge>
                            {item.entity_type && <Badge variant="secondary">{item.entity_type}</Badge>}
                            <Badge variant={item.is_active ? "default" : "secondary"}>
                              {item.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>

                          <div className="text-sm text-muted-foreground space-y-1">
                            <div className="flex gap-4">
                              <span>📁 {item.filename}</span>
                              <span>📏 {Math.round(item.size_bytes / 1024)} KB</span>
                              <span>🎭 {item.mime_type}</span>
                            </div>
                            <div className="flex gap-4">
                              <span>📅 {new Date(item.created_at).toLocaleString()}</span>
                              {item.entity_id && (
                                <span>
                                  🔗 {item.entity_type}:{item.entity_id}
                                </span>
                              )}
                            </div>
                            {item.alt_text && <div>📝 Alt: {item.alt_text}</div>}
                          </div>
                        </div>

                        <div className="ml-4 flex flex-col items-end gap-2">
                          {item.mime_type.startsWith("image/") && (
                            <img
                              src={item.url || "/placeholder.svg"}
                              alt={item.alt_text || item.original_name}
                              className="w-20 h-20 object-cover rounded border"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = "/placeholder.svg?height=80&width=80&text=Error"
                              }}
                            />
                          )}
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View File
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
