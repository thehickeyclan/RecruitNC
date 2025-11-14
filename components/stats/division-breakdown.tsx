import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

interface DivisionBreakdownProps {
  divisionBreakdown: {
    D1: number
    D2: number
    D3: number
    NAIA: number
    NJCAA: number
  }
}

export function DivisionBreakdown({ divisionBreakdown }: DivisionBreakdownProps) {
  // Transform the data for the pie chart
  const data = [
    { name: "NCAA D1", value: divisionBreakdown.D1, color: "#ef4444" },
    { name: "NCAA D2", value: divisionBreakdown.D2, color: "#3b82f6" },
    { name: "NCAA D3", value: divisionBreakdown.D3, color: "#10b981" },
    { name: "NAIA", value: divisionBreakdown.NAIA, color: "#f59e0b" },
    { name: "NJCAA", value: divisionBreakdown.NJCAA, color: "#8b5cf6" },
  ].filter((item) => item.value > 0) // Only include divisions with values > 0

  // Calculate total for percentage
  const total = Object.values(divisionBreakdown).reduce((sum, count) => sum + count, 0)

  return (
    <Card className="col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle>Division Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={true}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, value }) => `${name}: ${value} (${Math.round((value / total) * 100)}%)`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} athletes`, "Count"]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
          {data.map((item) => (
            <div key={item.name} className="text-center">
              <div className="font-bold text-lg">{item.value}</div>
              <div className="text-sm text-muted-foreground">{item.name}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
