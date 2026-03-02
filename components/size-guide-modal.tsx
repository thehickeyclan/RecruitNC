"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface SizeGuideModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SizeGuideModal({ open, onOpenChange }: SizeGuideModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Size Guide</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-4">
          Measure your body and compare to the chart below. If you’re between sizes, we recommend sizing up.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-semibold">Size</th>
                <th className="text-left py-2 pr-4 font-semibold">Chest (in)</th>
                <th className="text-left py-2 pr-4 font-semibold">Waist (in)</th>
                <th className="text-left py-2 font-semibold">Length (in)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { size: "S", chest: "34-36", waist: "28-30", length: "26-27" },
                { size: "M", chest: "38-40", waist: "32-34", length: "27-28" },
                { size: "L", chest: "42-44", waist: "36-38", length: "28-29" },
                { size: "XL", chest: "46-48", waist: "40-42", length: "29-30" },
                { size: "2XL", chest: "50-52", waist: "44-46", length: "30-31" },
              ].map((row) => (
                <tr key={row.size} className="border-b">
                  <td className="py-2 pr-4 font-medium">{row.size}</td>
                  <td className="py-2 pr-4">{row.chest}</td>
                  <td className="py-2 pr-4">{row.waist}</td>
                  <td className="py-2">{row.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  )
}
