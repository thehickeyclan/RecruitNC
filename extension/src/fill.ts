/**
 * The form filler: finds each box on a college's questionnaire, works out what it asks from its
 * label (lib/questionnaire/fields.ts, the same list the Interest forms page shows), and types the
 * family's answer in. It never presses Submit, never overwrites what is already typed, and leaves
 * a box it is unsure of empty and marked for the family.
 */
import { fieldForLabel, normalizeLabel, type Answers } from "../../lib/questionnaire/fields"

type Box = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement

export type FillResult = { filled: number; needYou: string[] }

const FILLED = "data-ncu-filled"
const OK = "0 0 0 2px #22c55e"
const TODO = "0 0 0 2px #f59e0b"

const STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware",
  DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
  PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
  VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
}
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]

const visible = (el: Element) => {
  const r = (el as HTMLElement).getClientRects()
  return r.length > 0 && getComputedStyle(el).visibility !== "hidden"
}

/** Text of a node with its inputs and dropdown options left out. */
function ownText(node: Element): string {
  const clone = node.cloneNode(true) as Element
  clone.querySelectorAll("select, option, input, textarea, script, style").forEach((n) => n.remove())
  return (clone.textContent ?? "").replace(/\s+/g, " ").trim()
}

/** What a box is called on the page. */
export function labelOf(el: Box): string {
  // Front Rush's date picker: the box the family types in is a twin of the hidden, labelled one.
  const twinOf = el.id?.endsWith("_dateInput_text") ? document.getElementById(el.id.replace(/_dateInput_text$/, "")) : null
  if (twinOf && twinOf !== el) return labelOf(twinOf as Box)
  const explicit = el.labels?.[0] ? ownText(el.labels[0]) : ""
  if (explicit) return explicit
  const aria = el.getAttribute("aria-label") || (el.getAttribute("aria-labelledby") ?? "").split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ").trim()
  if (aria) return aria
  const wrap = el.closest("label")
  if (wrap && ownText(wrap)) return ownText(wrap)
  const td = el.closest("td")
  if (td?.previousElementSibling && ownText(td.previousElementSibling)) return ownText(td.previousElementSibling)
  let node: Element | null = el
  for (let i = 0; i < 4 && node; i++) {
    let prev = node.previousElementSibling
    while (prev) {
      const t = ownText(prev)
      if (t && t.length < 80) return t
      prev = prev.previousElementSibling
    }
    node = node.parentElement
    if (node && node.querySelectorAll("input, select, textarea").length > 3) break
  }
  return (el as HTMLInputElement).placeholder || ""
}

/** Set a value so React, Angular and ASP.NET pages all see it. */
function setValue(el: Box, value: string) {
  if (el.value === value) return
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, value)
  for (const type of ["input", "change", "blur"]) el.dispatchEvent(new Event(type, { bubbles: true }))
}

function pickOption(select: HTMLSelectElement, wanted: string[]): boolean {
  const want = wanted.map((w) => w.toLowerCase().trim()).filter(Boolean)
  const opt = [...select.options].find((o) => want.includes(o.text.toLowerCase().trim()) || want.includes(o.value.toLowerCase().trim()))
  if (!opt) return false
  setValue(select, opt.value)
  return true
}

/** A dropdown still on its first choice ("Select...") or the page's default (Front Rush inches start at 0) counts as empty. */
const isEmpty = (el: Box) =>
  el instanceof HTMLSelectElement
    ? el.selectedIndex <= 0 ||
      Boolean(el.options[el.selectedIndex]?.defaultSelected) ||
      // Front Rush's inches box loads on "0" right after "Select", set by the page, not the family.
      (el.selectedIndex === 1 && el.options[1].text.trim() === "0")
    : !el.value.trim()
const isMonthList = (s: HTMLSelectElement) => [...s.options].some((o) => /^jan/i.test(o.text.trim()))
const isDayList = (s: HTMLSelectElement) => [...s.options].some((o) => o.text.trim() === "31") && ![...s.options].some((o) => /^(19|20)\d\d$/.test(o.text.trim()))
const isYearList = (s: HTMLSelectElement) => [...s.options].some((o) => /^(19|20)\d\d$/.test(o.text.trim()))

/** A box sits in the high school's own address block (Front Rush asks for the school's city too). */
function inSchoolBlock(el: Box): boolean {
  let node = el.parentElement
  for (let i = 0; i < 5 && node; i++, node = node.parentElement) {
    const boxes = node.querySelectorAll("input, select")
    if (boxes.length > 12) return false
    if ([...boxes].some((b) => b !== el && /school name|^hs |high school$/i.test(labelOf(b as Box)))) return true
  }
  return false
}

/** The heading of the section a box sits in ("Personal Contacts", "Parent/Guardian Information"). */
export function sectionOf(el: Element): string {
  let node: Element | null = el
  for (let i = 0; i < 9 && node; i++, node = node.parentElement) {
    let prev = node.previousElementSibling
    for (let c = 0; c < 4 && prev; c++, prev = prev.previousElementSibling) {
      // A block of boxes is not a heading; look past it (Front Rush puts one between).
      if (prev.querySelector("input, select, textarea")) continue
      // The first line only: SIDEARM puts a sentence under the heading in the same block.
      const t = ((prev as HTMLElement).innerText ?? ownText(prev)).split("\n")[0].trim().slice(0, 120)
      if (t && i >= 2) return t
    }
  }
  return ""
}

/** In a parent or emergency-contact block, a bare "First", "Email" or "Cell" is the parent's. */
const PARENT_SECTION = /parent|guardian|emergency|personal contacts|family contact/i
function parentValue(key: string, answers: Answers, label: string): string | undefined {
  const [first, ...rest] = (answers.parent1Name ?? "").split(/\s+/)
  if (key === "firstName") return first || undefined
  if (key === "lastName") return rest.join(" ") || undefined
  if (key === "email") return answers.parent1Email
  if (key === "cell") return answers.parent1Phone
  if (key === "parent1Relation") return answers.parent1Relation
  if (/^(main|home|phone|primary)( phone)?( #| number)?$/.test(normalizeLabel(label))) return answers.parent1Phone
  return undefined
}

function nearPassword(el: Box): boolean {
  let node = el.parentElement
  for (let i = 0; i < 6 && node; i++, node = node.parentElement) {
    if (node.querySelectorAll("input, select, textarea").length > 8) return false
    if ([...node.querySelectorAll("input[type=password]")].some(visible)) return true
  }
  return false
}

/** Fill every box we can. Safe to run again: a box already filled, by us or the family, is left. */
export type FillHooks = {
  /** Set a page's own date picker (Telerik, on Front Rush) by its id; see page.ts. */
  setDate?: (id: string, iso: string) => void
}

export function fillPage(answers: Answers, root: ParentNode = document, hooks: FillHooks = {}): FillResult {
  const boxes = [...root.querySelectorAll<Box>("input, select, textarea")].filter(
    (el) => !["hidden", "password", "submit", "button", "image", "file", "reset", "checkbox"].includes((el as HTMLInputElement).type) && visible(el),
  )
  let filled = 0
  const needYou: string[] = []
  const dob = answers.dob ? answers.dob.split("-") : null
  const seenRadio = new Set<string>()

  for (const el of boxes) {
    // Never type into a sign-in or account block. Only the small block round a visible password
    // box counts: SIDEARM and Front Rush pages are one big form that also holds the site's login.
    if (nearPassword(el)) continue
    const label = labelOf(el)
    const norm = normalizeLabel(label)

    if (el instanceof HTMLInputElement && el.type === "radio") {
      if (seenRadio.has(el.name)) continue
      seenRadio.add(el.name)
      const group = [...root.querySelectorAll<HTMLInputElement>(`input[type=radio][name="${CSS.escape(el.name)}"]`)]
      // Marketing opt-ins (NCSA, IMG...) are always "No thanks".
      const groupText = `${el.name} ${group.map((g) => labelOf(g)).join(" ")}`.toLowerCase()
      if (/opt.?in|ncsa|img academy|maximize my recruiting|hearing more/.test(groupText) && !group.some((g) => g.checked)) {
        const no = group.find((g) => /^no\b|no thanks/i.test(labelOf(g).trim()))
        if (no) {
          no.click()
          filled++
        }
      }
      continue
    }

    if (!isEmpty(el) && !el.hasAttribute(FILLED)) continue

    let ok = false
    if (el instanceof HTMLSelectElement && dob && /birth|^day$|^month$|^year$/.test(norm)) {
      if (isMonthList(el)) ok = pickOption(el, [MONTHS[Number(dob[1]) - 1], dob[1], String(Number(dob[1])), new Date(Number(dob[0]), Number(dob[1]) - 1, 1).toLocaleString("en-US", { month: "long" })])
      else if (isDayList(el)) ok = pickOption(el, [dob[2], String(Number(dob[2]))])
      else if (isYearList(el) && /birth|year/.test(norm) && !/grad/.test(norm)) ok = pickOption(el, [dob[0]])
    } else if (/^height$/.test(norm) && answers.heightFt) {
      const ft = answers.heightFt
      const inch = answers.heightIn ?? "0"
      ok = el instanceof HTMLSelectElement ? pickOption(el, [`${ft}'${inch}"`, `${ft}' ${inch}"`, `${ft}-${inch}`, `${ft}'${inch}`]) : (setValue(el, `${ft}'${inch}"`), true)
    } else {
      const inParentBlock = PARENT_SECTION.test(sectionOf(el))
      const field = fieldForLabel(label)
      if (inParentBlock && (!field || ["firstName", "lastName", "email", "cell", "parent1Relation"].includes(field.key))) {
        const value = parentValue(field?.key ?? "", answers, label)
        if (value && !(el instanceof HTMLSelectElement)) {
          setValue(el, value)
          el.setAttribute(FILLED, "1")
          el.style.boxShadow = OK
          filled++
        }
        continue
      }
      if (!field) continue
      if (["street", "city", "state", "zip"].includes(field.key) && inSchoolBlock(el)) continue
      let value = answers[field.key]
      if (!value) {
        if (field.core) needYou.push(field.label)
        continue
      }
      if (field.key === "dob" && el instanceof HTMLInputElement && el.type !== "date") {
        value = `${dob![1]}/${dob![2]}/${dob![0]}`
        // Front Rush's date picker (Telerik): the labelled box is hidden state; the family types in its twin.
        if (el.id.endsWith("_dateInput_text")) {
          // Typed text is not parsed by the picker; set it through the page's own code too.
          setValue(el, value)
          hooks.setDate?.(el.id.replace(/_dateInput_text$/, ""), answers.dob!)
          el.setAttribute(FILLED, "1")
          el.style.boxShadow = OK
          filled++
          continue
        }
      }
      if (el instanceof HTMLSelectElement) {
        const extra = field.key === "state" ? [STATES[value.toUpperCase()] ?? "", Object.keys(STATES).find((k) => STATES[k].toLowerCase() === value.toLowerCase()) ?? ""] : []
        ok = pickOption(el, [value, ...extra])
      } else {
        setValue(el, value)
        ok = true
      }
    }
    if (ok) {
      el.setAttribute(FILLED, "1")
      el.style.boxShadow = OK
      filled++
    } else if ((el as HTMLInputElement).required) {
      el.style.boxShadow = TODO
    }
  }

  // Required boxes still empty: the family's to finish.
  for (const el of boxes) {
    if ((el as HTMLInputElement).required && isEmpty(el) && (el as HTMLInputElement).type !== "radio") el.style.boxShadow = TODO
  }
  return { filled, needYou: [...new Set(needYou)] }
}

/** The page now says the form went through. */
export function looksSubmitted(text: string): boolean {
  return /thank you for (your|submitting|completing|filling)|thanks for (your|submitting)|successfully (submitted|received|saved)|has been (submitted|received)|submission (was |has been )?(received|complete)|we('ve| have) received your|questionnaire (is )?complete/i.test(text)
}

/** Which college on the family's list this form belongs to, from its address. */
export function schoolForUrl(href: string, forms: Array<{ schoolId: string; urls: string[] }>): string | null {
  const here = decodeURIComponent(href).toLowerCase()
  for (const f of forms) {
    for (const u of f.urls) {
      try {
        const url = new URL(u)
        // The parts that name this one form: the last path segment and every query value.
        const tokens = [url.pathname.split("/").filter(Boolean).pop() ?? "", ...[...url.searchParams.values()]]
          .map((t) => decodeURIComponent(t).toLowerCase())
          .filter((t) => t.length >= 2 && !/^(recruit|questionnaire\.aspx|playersubmit\.aspx|sb_output\.aspx|index|form)$/.test(t))
        const sameHost = here.includes(url.hostname.replace(/^www\./, "").toLowerCase())
        if (tokens.length && tokens.every((t) => here.includes(t)) && (sameHost || tokens.some((t) => t.length >= 8))) return f.schoolId
      } catch {
        // A malformed link on file matches nothing.
      }
    }
  }
  return null
}
