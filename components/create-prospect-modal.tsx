"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, UserPlus } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface CreateProspectModalProps {
  isOpen: boolean
  onClose: () => void
  onProspectCreated: () => void
  schoolId?: string
}

const US_STATES = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
]

const WEIGHT_CLASSES = [
  "106", "113", "120", "126", "132", "138", "144", "150", "157", "165", "175", "190", "215", "285"
]

const GRADUATION_YEARS = [
  new Date().getFullYear() + 4,
  new Date().getFullYear() + 3,
  new Date().getFullYear() + 2,
  new Date().getFullYear() + 1,
  new Date().getFullYear(),
]

export function CreateProspectModal({ isOpen, onClose, onProspectCreated, schoolId }: CreateProspectModalProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    state: "",
    highschool: "",
    graduationYear: "",
    weightclass: "",
    gender: "Male",
    email: "",
    phone: "",
    instagram: "",
    notes: "",
  })

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Validation - align with admin athlete mandatory fields
      if (!formData.name || !formData.state || !formData.graduationYear || !formData.highschool || !formData.gender) {
        toast({
          title: "Missing Required Fields",
          description: "Please fill in Name, State, High School, Graduation Year, and Gender",
          variant: "destructive",
        })
        setIsSubmitting(false)
        return
      }

      const response = await fetch("/api/coaches/create-prospect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          state: formData.state,
          highschool: formData.highschool.trim() || null,
          graduationyear: parseInt(formData.graduationYear),
          weightclass: formData.weightclass || null,
          gender: formData.gender,
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          instagram: formData.instagram.trim() || null,
          notes: formData.notes.trim() || null,
          schoolId: schoolId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create prospect")
      }

      toast({
        title: "Prospect Created!",
        description: `${formData.name} has been added to your recruits and is ready to track.`,
      })

      // Reset form
      setFormData({
        name: "",
        state: "",
        highschool: "",
        graduationYear: "",
        weightclass: "",
        gender: "Male",
        email: "",
        phone: "",
        instagram: "",
        notes: "",
      })

      onProspectCreated()
      onClose()
    } catch (error) {
      console.error("Error creating prospect:", error)
      toast({
        title: "Failed to Create Prospect",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <UserPlus className="h-6 w-6 text-[#13294B]" />
            Add New Prospect to Track
          </DialogTitle>
          <DialogDescription>
            Add an athlete to your recruiting pipeline. This can be anyone - NC or out-of-state, ranked or unranked.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-[#13294B] border-b pb-2">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="John Smith"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="state">State *</Label>
                  <Select value={formData.state} onValueChange={(val) => handleChange("state", val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {US_STATES.map((state) => (
                        <SelectItem key={state.code} value={state.code}>
                          {state.name} ({state.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="highschool">High School *</Label>
                  <Input
                    id="highschool"
                    value={formData.highschool}
                    onChange={(e) => handleChange("highschool", e.target.value)}
                    placeholder="Liberty High School"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="graduationYear">Graduation Year *</Label>
                  <Select value={formData.graduationYear} onValueChange={(val) => handleChange("graduationYear", val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADUATION_YEARS.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          Class of {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="weightclass">Weight Class</Label>
                  <Select value={formData.weightclass} onValueChange={(val) => handleChange("weightclass", val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select weight (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TBD">TBD</SelectItem>
                      {WEIGHT_CLASSES.map((weight) => (
                        <SelectItem key={weight} value={weight}>
                          {weight} lbs
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="gender">Gender *</Label>
                  <Select value={formData.gender} onValueChange={(val) => handleChange("gender", val)} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-[#13294B] border-b pb-2">Contact Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="athlete@email.com"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <Label htmlFor="instagram">Instagram Handle</Label>
                  <Input
                    id="instagram"
                    value={formData.instagram}
                    onChange={(e) => handleChange("instagram", e.target.value)}
                    placeholder="@wrestler_username"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <h3 className="font-semibold text-[#13294B] border-b pb-2">Recruiting Notes</h3>
              
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  placeholder="E.g., Saw at Beast of the East, interested in D2 programs, 3.5 GPA..."
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>Privacy:</strong> This prospect will only be visible to you in your "My Recruits" portal. 
                Other coaches will not see them unless you share their information.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-[#13294B] hover:bg-[#1e3a5f] text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Prospect
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

