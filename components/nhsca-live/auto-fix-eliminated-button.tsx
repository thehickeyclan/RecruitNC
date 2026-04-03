"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { autoFixEliminatedWrestlers } from "@/app/nhsca/live/actions/roster-actions"
import { Loader2, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function AutoFixEliminatedButton() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  async function handleAutoFix() {
    setIsLoading(true)
    try {
      const result = await autoFixEliminatedWrestlers()

      if (result.success) {
        toast({
          title: "✅ Auto-Fix Complete",
          description: result.message,
        })
      } else {
        toast({
          title: "❌ Error",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Failed to auto-fix eliminated wrestlers",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleAutoFix} disabled={isLoading} variant="outline" className="w-full bg-transparent">
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Updating...
        </>
      ) : (
        <>
          <RefreshCw className="w-4 h-4 mr-2" />
          Auto-Fix Eliminated Wrestlers
        </>
      )}
    </Button>
  )
}
