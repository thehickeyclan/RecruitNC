"use client"

import { FormEvent, useEffect, useRef, useState } from "react"
import { CheckCircle2, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { WeekendWarsAthleteSearchResult } from "@/lib/weekend-wars"

export function WeekendWarsRsvpForm() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<WeekendWarsAthleteSearchResult[]>([])
  const [selected, setSelected] = useState<WeekendWarsAthleteSearchResult | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [weightClass, setWeightClass] = useState("")
  const [highSchool, setHighSchool] = useState("")
  const [wrestlingClub, setWrestlingClub] = useState("")
  const [attendingSaturday, setAttendingSaturday] = useState(false)
  const [attendingSunday, setAttendingSunday] = useState(false)
  const [carpool, setCarpool] = useState<"yes" | "no" | "">("")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submittedName, setSubmittedName] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (selected || query.trim().length < 2) {
      setResults([])
      setSearching(false)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      setSearchError(null)
      try {
        const response = await fetch(`/api/weekend-wars/athletes/search?q=${encodeURIComponent(query.trim())}`)
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || "Unable to search")
        setResults(data.athletes ?? [])
      } catch (error) {
        setSearchError(error instanceof Error ? error.message : "Unable to search")
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 250)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, selected])

  const chooseAthlete = (athlete: WeekendWarsAthleteSearchResult) => {
    setSelected(athlete)
    setQuery(athlete.name)
    setResults([])
    setWeightClass(athlete.weightClass ?? "")
    setHighSchool(athlete.highSchool ?? "")
    setWrestlingClub(athlete.wrestlingClub ?? "")
    setSubmitError(null)
  }

  const chooseAnother = () => {
    setSelected(null)
    setQuery("")
    setResults([])
    setWeightClass("")
    setHighSchool("")
    setWrestlingClub("")
    setSubmitError(null)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitError(null)
    if (!selected) return setSubmitError("Choose your RecruitNC profile")
    if (!attendingSaturday && !attendingSunday) return setSubmitError("Select Saturday, Sunday, or both")
    if (!carpool) return setSubmitError("Answer the carpool question")

    setSubmitting(true)
    try {
      const response = await fetch("/api/weekend-wars/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athleteId: selected.id,
          weightClass,
          highSchool,
          wrestlingClub,
          attendingSaturday,
          attendingSunday,
          openToCarpool: carpool === "yes",
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Unable to save RSVP")
      setSubmittedName(data.athleteName || selected.name)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to save RSVP")
    } finally {
      setSubmitting(false)
    }
  }

  if (submittedName) {
    const attendance = attendingSaturday && attendingSunday ? "Saturday and Sunday" : attendingSaturday ? "Saturday" : "Sunday"
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-6 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-300" />
        <h2 className="mt-4 text-2xl font-black text-white">You&apos;re on the list</h2>
        <p className="mt-2 text-white/70">
          {submittedName} is marked for {attendance}.
        </p>
        <p className="mt-1 text-sm text-white/55">
          Carpool: {carpool === "yes" ? "Open to coordinating" : "Not at this time"}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-5 border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
          onClick={() => setSubmittedName(null)}
        >
          Update this RSVP
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="relative">
        <Label htmlFor="weekend-wars-athlete-search" className="text-white">
          Find your RecruitNC profile
        </Label>
        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <Input
            id="weekend-wars-athlete-search"
            type="search"
            autoComplete="off"
            placeholder="Start typing the athlete's name"
            value={query}
            disabled={Boolean(selected)}
            onChange={(event) => {
              setQuery(event.target.value)
              setSearchError(null)
            }}
            className="h-12 border-white/15 bg-white/10 pl-10 text-base text-white placeholder:text-white/35"
          />
          {searching ? (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-white/50" />
          ) : null}
        </div>

        {!selected && results.length > 0 ? (
          <div className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-white/15 bg-[#0B1D3A] shadow-2xl">
            {results.map((athlete) => (
              <button
                key={athlete.id}
                type="button"
                className="block w-full border-b border-white/10 px-4 py-3 text-left last:border-0 hover:bg-white/10"
                onClick={() => chooseAthlete(athlete)}
              >
                <span className="block font-bold text-white">{athlete.name}</span>
                <span className="mt-0.5 block text-xs text-white/55">
                  {[athlete.highSchool, athlete.weightClass ? `${athlete.weightClass} lbs` : null, athlete.wrestlingClub]
                    .filter(Boolean)
                    .join(" · ") || "RecruitNC profile"}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {!selected && !searching && query.trim().length >= 2 && results.length === 0 && !searchError ? (
          <p className="mt-2 text-sm text-white/55">
            No RecruitNC athlete profile matched that name. Check the spelling or contact NC United.
          </p>
        ) : null}
        {searchError ? <p className="mt-2 text-sm text-red-300">{searchError}</p> : null}
        {selected ? (
          <button type="button" onClick={chooseAnother} className="mt-2 text-sm font-semibold text-[#D3B574] hover:underline">
            Choose a different athlete
          </button>
        ) : null}
      </div>

      {selected ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="weekend-wars-weight" className="text-white/80">Current weight</Label>
              <Input
                id="weekend-wars-weight"
                value={weightClass}
                onChange={(event) => setWeightClass(event.target.value)}
                placeholder="e.g. 138"
                className="mt-2 border-white/15 bg-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div>
              <Label htmlFor="weekend-wars-school" className="text-white/80">High school</Label>
              <Input
                id="weekend-wars-school"
                value={highSchool}
                onChange={(event) => setHighSchool(event.target.value)}
                placeholder="High school"
                className="mt-2 border-white/15 bg-white/10 text-white placeholder:text-white/30"
              />
            </div>
            <div>
              <Label htmlFor="weekend-wars-club" className="text-white/80">Wrestling club</Label>
              <Input
                id="weekend-wars-club"
                value={wrestlingClub}
                onChange={(event) => setWrestlingClub(event.target.value)}
                placeholder="Club"
                className="mt-2 border-white/15 bg-white/10 text-white placeholder:text-white/30"
              />
            </div>
          </div>

          <fieldset className="rounded-xl border border-white/15 bg-white/5 p-4">
            <legend className="px-1 text-sm font-bold text-white">Which practices will you attend?</legend>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10">
                <Checkbox
                  checked={attendingSaturday}
                  onCheckedChange={(value) => setAttendingSaturday(value === true)}
                  className="mt-0.5 border-white/40 data-[state=checked]:border-[#D3B574] data-[state=checked]:bg-[#D3B574] data-[state=checked]:text-[#0B1D3A]"
                />
                <span>
                  <span className="block font-bold text-white">Saturday · August 29</span>
                  <span className="mt-1 block text-xs leading-relaxed text-white/55">Weekend Wars</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10">
                <Checkbox
                  checked={attendingSunday}
                  onCheckedChange={(value) => setAttendingSunday(value === true)}
                  className="mt-0.5 border-white/40 data-[state=checked]:border-[#D3B574] data-[state=checked]:bg-[#D3B574] data-[state=checked]:text-[#0B1D3A]"
                />
                <span>
                  <span className="block font-bold text-white">Sunday · August 30</span>
                  <span className="mt-1 block text-xs leading-relaxed text-white/55">Super 32 Prep Series</span>
                </span>
              </label>
            </div>
          </fieldset>

          <fieldset className="rounded-xl border border-white/15 bg-white/5 p-4">
            <legend className="px-1 text-sm font-bold text-white">Are you open to coordinating a carpool?</legend>
            <RadioGroup value={carpool} onValueChange={(value) => setCarpool(value as "yes" | "no")} className="mt-3 sm:grid-cols-2">
              <Label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 text-white hover:bg-white/10">
                <RadioGroupItem value="yes" className="border-white/40 text-[#D3B574]" />
                Yes, I&apos;m open to carpooling
              </Label>
              <Label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-4 text-white hover:bg-white/10">
                <RadioGroupItem value="no" className="border-white/40 text-[#D3B574]" />
                No, not at this time
              </Label>
            </RadioGroup>
          </fieldset>

          {submitError ? <p className="text-sm font-medium text-red-300">{submitError}</p> : null}

          <Button
            type="submit"
            disabled={submitting}
            className="h-12 w-full bg-[#CC0000] text-base font-black text-white hover:bg-[#a90000]"
          >
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save RSVP
          </Button>
        </>
      ) : null}
    </form>
  )
}
