"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { type Athlete, deleteAthlete } from "@/services/athlete-service"
import { toast } from "@/components/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface AthletesTableProps {
  athletes: Athlete[]
}

export default function AthletesTable({ athletes }: AthletesTableProps) {
  const router = useRouter()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [athleteToDelete, setAthleteToDelete] = useState<Athlete | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteClick = (athlete: Athlete) => {
    setAthleteToDelete(athlete)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!athleteToDelete) return

    setIsDeleting(true)
    try {
      const success = await deleteAthlete(athleteToDelete.id)
      if (success) {
        toast({
          title: "Success",
          description: `${athleteToDelete.name} has been deleted.`,
        })
        router.refresh()
      } else {
        throw new Error("Failed to delete athlete")
      }
    } catch (error) {
      console.error("Error deleting athlete:", error)
      toast({
        title: "Error",
        description: "Failed to delete athlete. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
      setAthleteToDelete(null)
    }
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Athlete</TableHead>
            <TableHead>High School</TableHead>
            <TableHead>College</TableHead>
            <TableHead>Division</TableHead>
            <TableHead>Weight Class</TableHead>
            <TableHead>Graduation Year</TableHead>
            <TableHead>Commitment Date</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {athletes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                No athletes found
              </TableCell>
            </TableRow>
          ) : (
            athletes.map((athlete) => (
              <TableRow key={athlete.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 rounded-full overflow-hidden">
                      <Image
                        src={athlete.photourl || "/placeholder.svg?height=40&width=40&query=wrestler"}
                        alt={athlete.name}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    </div>
                    <span className="font-medium">{athlete.name}</span>
                  </div>
                </TableCell>
                <TableCell>{athlete.highschool}</TableCell>
                <TableCell>{athlete.college}</TableCell>
                <TableCell>
                  <Badge variant="outline">{athlete.division}</Badge>
                </TableCell>
                <TableCell>{athlete.weightclass}</TableCell>
                <TableCell>{athlete.graduationyear}</TableCell>
                <TableCell>
                  {new Date(athlete.commitmentdate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/athletes/edit/${athlete.id}`}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(athlete)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {athleteToDelete?.name}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
