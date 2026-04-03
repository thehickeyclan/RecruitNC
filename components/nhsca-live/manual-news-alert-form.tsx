"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { createManualNewsAlert } from "@/app/nhsca/live/actions/news-alert-actions"
import { Megaphone } from "lucide-react"

export function ManualNewsAlertForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage("")

    const formData = new FormData(e.currentTarget)
    const result = await createManualNewsAlert(formData)

    if (result.success) {
      setMessage("News alert published successfully!")
      e.currentTarget.reset()
    } else {
      setMessage(`Error: ${result.error}`)
    }

    setIsSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="alert_text" className="block text-sm font-medium text-foreground mb-2">
          Alert Message *
        </label>
        <Textarea
          id="alert_text"
          name="alert_text"
          placeholder="Enter your news alert message (e.g., 'NC United advances 5 wrestlers to semifinals!')"
          required
          rows={3}
          className="w-full"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="wrestler_name" className="block text-sm font-medium text-foreground mb-2">
            Wrestler Name (optional)
          </label>
          <Input id="wrestler_name" name="wrestler_name" placeholder="e.g., Liam Cronin" className="w-full" />
        </div>

        <div>
          <label htmlFor="weight_class" className="block text-sm font-medium text-foreground mb-2">
            Weight Class (optional)
          </label>
          <Input id="weight_class" name="weight_class" placeholder="e.g., 157" className="w-full" />
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        <Megaphone className="w-4 h-4 mr-2" />
        {isSubmitting ? "Publishing..." : "Publish News Alert"}
      </Button>

      {message && (
        <p className={`text-sm ${message.includes("Error") ? "text-red-500" : "text-green-500"}`}>{message}</p>
      )}
    </form>
  )
}
