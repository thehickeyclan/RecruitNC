"use client"

// This is a RecruitNC-specific version of the Data Dawg widget
// Updated with RecruitNC-specific prompts and context
// Modernized with dark theme matching site aesthetic

import { useState, useRef, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { X, Send, Loader2, Mic, MicOff, Home, Sparkles, MessageSquareWarning, ThumbsUp, ThumbsDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDataDawgMessage } from "@/lib/data-dawg-render-links"
import { DataDawgFeedbackDialog, type DataDawgFeedbackContext } from "@/components/data-dawg-feedback-dialog"
import {
  findDataDawgFeedbackContextFromMessages,
  parseHeyDataDawgChatFeedback,
  stripHeyDataDawgGreeting,
  submitDataDawgFeedbackClient,
} from "@/lib/data-dawg-feedback"
import { getSuggestedPrompts } from "@/lib/data-dawg-suggested-prompts"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: Date
  messageId?: string
  /** True only when the server returned the id, i.e. a query log row exists to vote on. */
  canVote?: boolean
  queryResults?: any[]
  queryType?: string
}

type MessageVote = "positive" | "negative"

const DATA_DAWG_IMAGE_URL =
  "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/mrF_BS_MLNADT9HWhny2B-Data%20Dawg%203.png"

const DATA_DAWG_INTRO_SEEN_KEY = "data-dawg-intro-seen"

const DATA_DAWG_LEGACY_CHAT_API = "/api/ai/chat"
const DATA_DAWG_AGENT_V2_API = "/api/ai/data-dawg-agent"

const DATA_DAWG_USE_LEGACY =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_DATA_DAWG_USE_LEGACY_CHAT === "true"

const DATA_DAWG_MESSAGE_API = DATA_DAWG_USE_LEGACY
  ? DATA_DAWG_LEGACY_CHAT_API
  : DATA_DAWG_AGENT_V2_API

export function AIChatWidget() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [showSplash, setShowSplash] = useState(false)
  const [introSeen, setIntroSeen] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [avatarState, setAvatarState] = useState<"idle" | "greeting" | "thinking" | "success">("idle")
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeechSupported, setIsSpeechSupported] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackContext, setFeedbackContext] = useState<DataDawgFeedbackContext | null>(null)
  const [votes, setVotes] = useState<Record<string, MessageVote>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

  const suggestedPrompts = getSuggestedPrompts(pathname || "")

  // Check if Speech Recognition is supported
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      setIsSpeechSupported(!!SpeechRecognition)

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = false
        recognition.lang = "en-US"

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript
          setInput((prev) => prev + (prev ? " " : "") + transcript)
          setIsRecording(false)
        }

        recognition.onerror = (event: any) => {
          setIsRecording(false)
          if (event.error === "not-allowed") {
            alert("Microphone permission denied. Please enable microphone access in your browser settings.")
          }
        }

        recognition.onend = () => {
          setIsRecording(false)
        }

        recognitionRef.current = recognition
      }
    }
  }, [])

  useEffect(() => {
    if (isLoading) {
      setAvatarState("thinking")
    } else if (messages.length > 0 && !isLoading) {
      setAvatarState("success")
      setTimeout(() => setAvatarState("idle"), 1000)
    }
  }, [isLoading, messages.length])

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setAvatarState("greeting")
      setTimeout(() => setAvatarState("idle"), 1500)
    }
  }, [isOpen, messages.length])

  // Default to "seen" so the intro can't flash before we've read localStorage.
  useEffect(() => {
    try {
      setIntroSeen(localStorage.getItem(DATA_DAWG_INTRO_SEEN_KEY) === "true")
    } catch {
      // Private mode / storage disabled — skip the intro rather than repeat it every open.
      setIntroSeen(true)
    }
  }, [])

  const handleSplashDismiss = () => {
    setShowSplash(false)
    setIntroSeen(true)
    try {
      localStorage.setItem(DATA_DAWG_INTRO_SEEN_KEY, "true")
    } catch {
      // Non-fatal: they just see the intro again next session.
    }
  }

  /** First click on the launcher shows the intro; the intro's own button opens the panel. */
  const openChat = () => {
    if (!introSeen) {
      setShowSplash(true)
      return
    }
    setIsOpen(true)
  }

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isLoading])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", onKeyDown)
    }
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isOpen])

  const detectProject = () => {
    if (typeof window === "undefined") return "recruit-nc"
    const hostname = window.location.hostname
    const pathname = window.location.pathname

    if (hostname.includes("recruit") || pathname.includes("recruit")) {
      return "recruit-nc"
    }
    if (hostname.includes("store") || hostname.includes("shop") || pathname.includes("store") || pathname.includes("shop")) {
      return "ecommerce"
    }
    return "legacy-nc"
  }

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    const trimmed = content.trim()
    const chatFeedback = parseHeyDataDawgChatFeedback(trimmed)

    const userMessage: Message = {
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    if (chatFeedback) {
      try {
        if ("needsDetail" in chatFeedback) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "Got it — what looks incorrect? Try something like: Hey Data Dawg, Cam Stinson placed 3rd at NHSCA 2025, not 5th.",
              timestamp: new Date(),
            },
          ])
          return
        }

        const ctx = findDataDawgFeedbackContextFromMessages(messages)
        const result = await submitDataDawgFeedbackClient({
          correctionNotes: chatFeedback.correctionNotes,
          userQuery: ctx?.userQuery ?? null,
          assistantResponse: ctx?.assistantResponse ?? null,
          messageId: ctx?.messageId ?? null,
          source: "data_dawg_chat_phrase",
        })

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: result.ok
              ? `${result.message} Our team will review your note and fix the data when needed.`
              : `Sorry, I couldn't save that report: ${result.error}. You can also use the link under my previous answer.`,
            timestamp: new Date(),
          },
        ])
      } finally {
        setIsLoading(false)
      }
      return
    }

    try {
      const project = detectProject()
      const conversationHistory = messages.slice(-5).map(m => ({
        role: m.role,
        content: m.content,
        queryResults: m.queryResults || null,
        queryType: m.queryType || null
      }))

      const chatPayload = {
        // Bubble keeps what the user typed; the agent gets it without the greeting so
        // fast-path routing isn't thrown off by a leading "Hey Data Dawg,".
        message: stripHeyDataDawgGreeting(userMessage.content),
        project: project,
        conversationHistory: conversationHistory,
      }

      let response = await fetch(DATA_DAWG_MESSAGE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chatPayload),
      })

      let rawText = await response.text()
      let data: {
        answer?: string
        messageId?: string
        results?: unknown[]
        queryType?: string
        error?: string
      } = {}
      try {
        data = rawText ? (JSON.parse(rawText) as typeof data) : {}
      } catch {
        data = {}
      }

      if (
        !DATA_DAWG_USE_LEGACY &&
        data.queryType === "data_dawg_agent_v2_config" &&
        typeof data.answer === "string"
      ) {
        response = await fetch(DATA_DAWG_LEGACY_CHAT_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(chatPayload),
        })
        rawText = await response.text()
        try {
          data = rawText ? (JSON.parse(rawText) as typeof data) : {}
        } catch {
          data = {}
        }
      }

      if (!response.ok && !(typeof data.answer === "string" && data.answer.trim().length > 0)) {
        throw new Error(data.error || "Failed to get response")
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.answer || "I couldn't find an answer to that question.",
        timestamp: new Date(),
        messageId: data.messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        // A locally-invented id matches no log row, so a vote on it would go nowhere.
        canVote: Boolean(data.messageId),
      }

      setMessages((prev) => [...prev, assistantMessage])

      if (data.results && data.results.length > 0) {
        assistantMessage.queryResults = data.results
        assistantMessage.queryType = data.queryType
      }
    } catch {
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = () => {
    if (!input.trim() || isLoading) return
    void sendMessage(input)
  }

  const handleSuggestionClick = (prompt: string) => {
    void sendMessage(prompt)
  }

  /**
   * Rate an answer. The API PATCHes the query log row by message_id, so this only works
   * for server-issued ids — see `canVote`. Shows the vote immediately and takes it back
   * if it didn't save, rather than claiming a vote we lost.
   */
  const voteOnMessage = async (message: Message, vote: MessageVote) => {
    const id = message.messageId
    if (!id || !message.canVote || votes[id]) return

    setVotes((prev) => ({ ...prev, [id]: vote }))
    try {
      const res = await fetch(DATA_DAWG_MESSAGE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "", feedback: vote, messageId: id }),
      })
      if (!res.ok) throw new Error(`vote rejected (${res.status})`)
    } catch {
      setVotes((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    }
  }

  const openFeedbackForMessage = (assistantIndex: number) => {
    const assistantMessage = messages[assistantIndex]
    if (!assistantMessage || assistantMessage.role !== "assistant") return
    let userQuery: string | null = null
    for (let i = assistantIndex - 1; i >= 0; i--) {
      if (messages[i]?.role === "user") {
        userQuery = messages[i].content
        break
      }
    }
    setFeedbackContext({
      userQuery,
      assistantResponse: assistantMessage.content,
      messageId: assistantMessage.messageId,
    })
    setFeedbackOpen(true)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleVoiceRecord = () => {
    if (!recognitionRef.current) return

    if (isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
    } else {
      try {
        recognitionRef.current.start()
        setIsRecording(true)
      } catch {
        setIsRecording(false)
      }
    }
  }

  useEffect(() => {
    return () => {
      if (recognitionRef.current && isRecording) {
        recognitionRef.current.stop()
      }
    }
  }, [isRecording])

  return (
    <>
      {/* Splash Screen */}
      {showSplash && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-[fadeIn_0.3s_ease-out]">
          <style jsx>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(20px) scale(0.95); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
          <Card className="relative max-w-md w-[90vw] bg-[#0F1E32] shadow-2xl border border-[#1e3a5f] animate-[slideUp_0.4s_ease-out]">
            <CardHeader className="bg-gradient-to-br from-[#13294B] to-[#0A1628] text-white p-6 text-center border-b border-[#D3B574]/30">
              <div className="flex justify-center mb-4">
                <div className={cn(
                  "relative h-32 w-32 overflow-hidden",
                  avatarState === "greeting" && "avatar-greeting",
                  avatarState === "thinking" && "avatar-thinking",
                  avatarState === "success" && "avatar-success"
                )}>
                  <Image
                    src={DATA_DAWG_IMAGE_URL}
                    alt="Data Dawg"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold mb-2">Meet Data Dawg</CardTitle>
              <p className="text-sm text-gray-400">
                Your NC wrestling recruiting assistant
              </p>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-gray-400 text-center">
                Search any athlete in NC history, any high school, and any state or national tournament — results, records, and rankings.
              </p>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-[#D3B574]">•</span>
                  <span>Athletes &amp; schools — NCHSAA, NHSCA, Super32, Fargo, NC United</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#D3B574]">•</span>
                  <span>Tournament results by year (e.g. Fargo 2026, 4A state 2025)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#D3B574]">•</span>
                  <span>Prospect rankings, career records, and college commitments</span>
                </li>
              </ul>
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => {
                    handleSplashDismiss()
                    setIsOpen(true)
                  }}
                  className="flex-1 bg-[#D3B574] hover:bg-[#c4a665] text-[#0A1628] font-semibold"
                >
                  Ask Data Dawg
                </Button>
                <Button
                  onClick={handleSplashDismiss}
                  variant="outline"
                  className="border-[#1e3a5f] text-gray-300 hover:bg-[#1e3a5f]"
                >
                  Got it
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Floating launcher with glow effect */}
      <div
        className={cn(
          "fixed bottom-20 sm:bottom-4 right-4 z-50 flex items-center gap-3 transition-all duration-500",
          showSplash ? "opacity-0 scale-90" : "opacity-100 scale-100"
        )}
      >
        <Button
          onClick={openChat}
          className={cn(
            "h-16 w-16 rounded-full shadow-lg shadow-[#D3B574]/20",
            "bg-gradient-to-br from-[#13294B] to-[#0A1628] hover:from-[#1e3a5f] hover:to-[#13294B]",
            "border-2 border-[#D3B574]/50 hover:border-[#D3B574]",
            "flex items-center justify-center p-0 overflow-hidden transition-all duration-300"
          )}
          size="icon"
          aria-label="Open Data Dawg chat"
        >
          <div className={cn(
            "relative h-12 w-12",
            avatarState === "greeting" && "avatar-greeting",
            avatarState === "thinking" && "avatar-thinking",
            avatarState === "success" && "avatar-success"
          )}>
            <Image
              src={DATA_DAWG_IMAGE_URL}
              alt="Data Dawg"
              fill
              className="object-contain"
            />
          </div>
        </Button>
        <div className="hidden md:block">
          <button
            type="button"
            onClick={openChat}
            className="rounded-full bg-[#0F1E32] text-[#D3B574] shadow-lg px-4 py-2 text-sm font-semibold border border-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white transition-all duration-200"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Ask Data Dawg
            </span>
          </button>
        </div>
      </div>

      {/* Chat panel - Dark theme */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex md:justify-end">
          <div className="absolute inset-0 bg-black/60 md:bg-black/40 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <Card className="relative h-full w-full md:h-full md:w-full md:max-w-md bg-[#0A1628] shadow-2xl border-0 md:border md:border-[#1e3a5f] animate-[slideIn_0.2s_ease-out_forwards] flex flex-col max-h-screen md:max-h-full">
            <style jsx>{`
              @keyframes slideIn {
                from { opacity: 0; transform: translateX(100%); }
                to { opacity: 1; transform: translateX(0); }
              }
              @keyframes greeting {
                0%, 100% { transform: scale(1) rotate(0deg); }
                25% { transform: scale(1.1) rotate(-5deg); }
                50% { transform: scale(1.15) rotate(5deg); }
                75% { transform: scale(1.1) rotate(-3deg); }
              }
              @keyframes thinking {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.05); opacity: 0.8; }
              }
              @keyframes thinkingPulse {
                0%, 100% { box-shadow: 0 0 0 0 rgba(211, 181, 116, 0.7); }
                50% { box-shadow: 0 0 0 8px rgba(211, 181, 116, 0); }
              }
              @keyframes success {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
              }
              .avatar-greeting { animation: greeting 1.5s ease-in-out; }
              .avatar-thinking { animation: thinking 1.5s ease-in-out infinite, thinkingPulse 2s ease-in-out infinite; }
              .avatar-success { animation: success 0.5s ease-in-out; }
            `}</style>
            
            {/* Header */}
            <CardHeader className="bg-gradient-to-r from-[#13294B] to-[#0F1E32] text-white p-4 border-b border-[#D3B574]/30">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={cn(
                    "h-10 w-10 overflow-hidden flex-shrink-0",
                    avatarState === "greeting" && "avatar-greeting",
                    avatarState === "thinking" && "avatar-thinking",
                    avatarState === "success" && "avatar-success"
                  )}>
                    <Image
                      src={DATA_DAWG_IMAGE_URL}
                      alt="Data Dawg"
                      width={40}
                      height={40}
                      className="object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base font-bold leading-tight truncate flex items-center gap-2">
                      Data Dawg
                      <Sparkles className="h-4 w-4 text-[#D3B574]" />
                    </CardTitle>
                    <p className="text-xs text-gray-400 truncate">NC wrestling AI assistant</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-9 w-9 text-gray-400 hover:bg-[#1e3a5f] hover:text-white flex-shrink-0 rounded-lg"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsOpen(false)
                      window.location.href = "/"
                    }}
                    aria-label="Go to home page"
                  >
                    <Home className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-gray-400 hover:bg-red-900/50 hover:text-red-400 flex-shrink-0 rounded-lg"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsOpen(false)
                    }}
                    aria-label="Close Data Dawg chat"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Messages */}
            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden min-h-0" style={{ maxHeight: 'calc(100vh - 80px)' }}>
              <ScrollArea className="flex-1 p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
                {messages.length === 0 ? (
                  <div className="space-y-4">
                    {/* Welcome message */}
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "h-9 w-9 overflow-hidden flex-shrink-0",
                        avatarState === "greeting" && "avatar-greeting"
                      )}>
                        <Image
                          src={DATA_DAWG_IMAGE_URL}
                          alt="Data Dawg"
                          width={36}
                          height={36}
                          className="object-contain"
                        />
                      </div>
                      <div className="bg-[#0F1E32] border border-[#1e3a5f] rounded-2xl rounded-tl-sm px-4 py-3">
                        <p className="text-sm text-gray-300">
                          Hey, I&apos;m Data Dawg. Search any athlete in NC history, any high school, and any state or national tournament for results, records, and rankings — NCHSAA, NHSCA, Super32, Fargo, and more. See something wrong? Say{" "}
                          <span className="text-[#D3B574]">Hey Data Dawg, …</span> with your correction.
                        </p>
                      </div>
                    </div>
                    
                    {/* Suggested prompts */}
                    <div className="space-y-3 pt-2">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Try asking:</p>
                      <div className="flex flex-wrap gap-2">
                        {suggestedPrompts.map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            className="text-xs rounded-lg border border-[#1e3a5f] px-3 py-2 bg-[#0F1E32] hover:bg-[#1e3a5f] hover:border-[#D3B574]/50 text-gray-300 hover:text-white transition-all duration-200"
                            onClick={() => handleSuggestionClick(prompt)}
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message, index) => {
                      const isUser = message.role === "user"
                      return (
                        <div
                          key={index}
                          className={cn("flex", isUser ? "justify-end" : "justify-start")}
                        >
                          {!isUser && (
                            <div className={cn(
                              "mr-2 mt-1 h-8 w-8 overflow-hidden flex-shrink-0",
                              isLoading && index === messages.length - 1 && "avatar-thinking"
                            )}>
                              <Image
                                src={DATA_DAWG_IMAGE_URL}
                                alt="Data Dawg"
                                width={32}
                                height={32}
                                className="object-contain"
                              />
                            </div>
                          )}
                          <div
                            className={cn(
                              "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                              isUser
                                ? "bg-[#D3B574] text-[#0A1628] rounded-tr-sm"
                                : "bg-[#0F1E32] border border-[#1e3a5f] text-gray-200 rounded-tl-sm"
                            )}
                          >
                            {isUser ? (
                              <p className="whitespace-pre-wrap">{message.content}</p>
                            ) : (
                              <div
                                className={cn(
                                  // Answers are real markdown now (lists, headings, bold) — no
                                  // pre-wrap, or the block elements inherit blank-line gaps.
                                  "space-y-2 break-words",
                                  "[&_p]:leading-relaxed",
                                  "[&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5",
                                  "[&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5",
                                  "[&_li]:leading-relaxed [&_li]:marker:text-[#D3B574]/70",
                                  "[&_strong]:font-semibold [&_strong]:text-white",
                                  "[&_h4]:mt-3 [&_h4]:font-semibold [&_h4]:text-white [&_h5]:mt-3 [&_h5]:font-semibold [&_h5]:text-white",
                                  "[&_h6]:mt-3 [&_h6]:font-semibold [&_h6]:text-white",
                                  "[&_hr]:my-3 [&_hr]:border-[#1e3a5f]",
                                  "[&_a]:text-[#D3B574] [&_a]:hover:text-[#c4a665] [&_a]:underline",
                                )}
                                dangerouslySetInnerHTML={{ __html: formatDataDawgMessage(message.content) }}
                              />
                            )}
                            <div className={cn(
                              "mt-2 flex flex-wrap items-center gap-x-3 gap-y-1",
                              isUser ? "text-[#0A1628]/60" : "text-gray-500"
                            )}>
                              <p className="text-[10px]">
                                {message.timestamp.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                              {!isUser ? (
                                <>
                                  {message.canVote && message.messageId ? (
                                    <span className="inline-flex items-center gap-1">
                                      {(
                                        [
                                          { vote: "positive" as const, Icon: ThumbsUp, label: "Helpful answer" },
                                          { vote: "negative" as const, Icon: ThumbsDown, label: "Not a helpful answer" },
                                        ]
                                      ).map(({ vote, Icon, label }) => {
                                        const current = votes[message.messageId as string]
                                        const chosen = current === vote
                                        return (
                                          <button
                                            key={vote}
                                            type="button"
                                            aria-label={label}
                                            aria-pressed={chosen}
                                            disabled={Boolean(current)}
                                            className={cn(
                                              "rounded p-0.5 transition-colors",
                                              chosen ? "text-[#D3B574]" : "text-gray-500 hover:text-[#D3B574]",
                                              current && !chosen && "opacity-30",
                                              !current && "cursor-pointer",
                                            )}
                                            onClick={() => void voteOnMessage(message, vote)}
                                          >
                                            <Icon className="h-3 w-3" />
                                          </button>
                                        )
                                      })}
                                    </span>
                                  ) : null}
                                  <button
                                    type="button"
                                    className="text-[10px] inline-flex items-center gap-1 text-[#D3B574]/90 hover:text-[#D3B574] underline-offset-2 hover:underline"
                                    onClick={() => openFeedbackForMessage(index)}
                                  >
                                    <MessageSquareWarning className="h-3 w-3" />
                                    Hey Data Dawg — something off?
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {isLoading && (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <div className="h-6 w-6 flex items-center justify-center avatar-thinking">
                          <Image
                            src={DATA_DAWG_IMAGE_URL}
                            alt="Data Dawg thinking"
                            width={24}
                            height={24}
                            className="object-contain"
                          />
                        </div>
                        <span>Thinking...</span>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Input area */}
              <div className="border-t border-[#1e3a5f] p-3 space-y-2 bg-[#0F1E32] flex-shrink-0" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                <div className="flex gap-2">
                  {isSpeechSupported && (
                    <Button
                      type="button"
                      onClick={handleVoiceRecord}
                      disabled={isLoading}
                      className={cn(
                        "flex-shrink-0 h-10 w-10 rounded-lg p-0",
                        isRecording
                          ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                          : "bg-[#1e3a5f] hover:bg-[#2a4a6f] text-gray-300"
                      )}
                      aria-label={isRecording ? "Stop recording" : "Start voice recording"}
                    >
                      {isRecording ? (
                        <MicOff className="h-4 w-4" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={isSpeechSupported ? "Ask anything or tap mic..." : "Ask about NC wrestling..."}
                    disabled={isLoading || isRecording}
                    className="flex-1 text-sm px-4 py-2 min-w-0 bg-[#0A1628] border-[#1e3a5f] text-white placeholder:text-gray-500 focus:border-[#D3B574] focus:ring-[#D3B574]/20"
                    onFocus={(e) => {
                      setTimeout(() => {
                        e.target.scrollIntoView({ behavior: 'smooth', block: 'end' })
                      }, 300)
                    }}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading || isRecording}
                    className="bg-[#D3B574] hover:bg-[#c4a665] text-[#0A1628] px-4 flex-shrink-0 h-10 rounded-lg disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {isRecording && (
                  <p className="text-xs text-red-400 text-center animate-pulse">
                    Listening... Speak your question
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <DataDawgFeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        context={feedbackContext}
      />
    </>
  )
}
