/**
 * What the recruiting product does, in one place, for every front page that sells it
 * (app/recruitwrestlers, app/guild-recruiting). Only features that exist (inventory 15 Oct 2026).
 */
import type { LucideIcon } from "lucide-react"
import { BarChart3, CalendarCheck, ClipboardList, Eye, FileText, GitCompareArrows, GraduationCap, Inbox, ListChecks, Mail, Map, MessageSquare, Search, Star, Target } from "lucide-react"

export type FeatureItem = { icon: LucideIcon; title: string; body: string }

export const FAMILY_FEATURES: FeatureItem[] = [
  { icon: ListChecks, title: "A plan for every month", body: "What to do now for your grade: profile, college list, questionnaires, emails." },
  { icon: ClipboardList, title: "Your college list", body: "Every school you're considering, with cost, fit, your stage and the next step." },
  { icon: Map, title: "Every program on one map", body: "D1, D2, D3, NAIA and junior college, men's and women's." },
  { icon: GitCompareArrows, title: "Compare colleges", body: "Your scores against admitted students, real cost after aid, rosters." },
  { icon: Mail, title: "Email coaches, ready to send", body: "Drafts built from your verified results, plus the info every questionnaire asks." },
  { icon: Eye, title: "See who's looking", body: "Which college programs viewed your profile, and when." },
  { icon: MessageSquare, title: "Messages from coaches", body: "College coaches write to you here. Parents see every message." },
  { icon: GraduationCap, title: "Learn the process", body: "Rules by level, eligibility, paying for college, the timeline." },
]

export const COACH_FEATURES: FeatureItem[] = [
  { icon: Search, title: "Search every wrestler", body: "Class, weight last competed, honors, committed or not." },
  { icon: BarChart3, title: "Prospect rankings", body: "Men's and women's class boards, built on verified results." },
  { icon: FileText, title: "Scouting reports", body: "Results, significant wins, head to head, academics and contact." },
  { icon: Star, title: "One board for your staff", body: "Star wrestlers, move them through your funnel, log every call and visit." },
  { icon: Inbox, title: "Message families directly", body: "The wrestler and every parent see it, and can reply." },
  { icon: GitCompareArrows, title: "Compare two wrestlers", body: "Head to head, common opponents and strength of schedule." },
  { icon: Target, title: "Your perfect recruit", body: "Set your needs once; every wrestler is flagged against them." },
  { icon: CalendarCheck, title: "Where they compete next", body: "Your recruits' upcoming events, so you know where to watch." },
]

export const EVENTS = [
  "State championships",
  "NHSCA Nationals",
  "Super 32",
  "Fargo",
  "Journeymen",
  "National Duals",
  "Ultimate Club Duals",
  "Women's Nationals",
]
