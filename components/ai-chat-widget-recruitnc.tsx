"use client"

// This is a RecruitNC-specific version of the Data Dawg widget
// Updated with RecruitNC-specific prompts and context
// Original component maintained in LegacyNC

import { useState, useRef, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageCircle, X, Send, Loader2, ThumbsUp, ThumbsDown, Mic, MicOff, Home } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDataDawgMessage } from "@/lib/data-dawg-render-links"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: Date
  feedback?: "positive" | "negative" | null
  messageId?: string
  queryResults?: any[]
  queryType?: string
}

// RecruitNC-specific suggested prompts based on current page
// These questions are aligned with LegacyNC and can actually be answered
const getSuggestedPrompts = (pathname: string): string[] => {
  // Rankings-specific prompts when on rankings pages
  if (pathname?.includes("/rankings") || pathname?.includes("/public-rankings")) {
    return [
      "Show me all Class of 2026 rankings",
      "Show me all Class of 2027 rankings",
      "Who are the top 10 ranked prospects?",
      "What athletes are ranked in the top 30?",
      "Show me rankings by weight class",
    ]
  }
  
  // Use the same prompts as LegacyNC - questions we can actually answer
  return [
    "Show me all Class of 2026 rankings",
    "Show me all Class of 2027 rankings",
    "What was our best year for NHSCA All-Americans?",
    "When are NHSCA's?",
    "Who is the all time winningest wrestler?",
    "Who won the Dave Schultz Award in 2025?",
    "Who are our 4x state champions?",
  ]
}

const DATA_DAWG_IMAGE_URL =
  "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/mrF_BS_MLNADT9HWhny2B-Data%20Dawg%203.png"

export function AIChatWidget() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [showSplash, setShowSplash] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [avatarState, setAvatarState] = useState<"idle" | "greeting" | "thinking" | "success">("idle")
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeechSupported, setIsSpeechSupported] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

  // Get contextual suggested prompts based on current page
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
          console.error("Speech recognition error:", event.error)
          setIsRecording(false)
          if (event.error === "no-speech") {
            // User didn't speak, just stop recording
          } else if (event.error === "not-allowed") {
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

  // Check if user has seen splash screen
  useEffect(() => {
    const hasSeenIntro = localStorage.getItem("data-dawg-intro-seen")
    if (!hasSeenIntro) {
      setShowSplash(true)
      setAvatarState("greeting")
      // Reset to idle after greeting animation
      setTimeout(() => setAvatarState("idle"), 2000)
    }
  }, [])

  // Set avatar state based on loading
  useEffect(() => {
    if (isLoading) {
      setAvatarState("thinking")
    } else if (messages.length > 0 && !isLoading) {
      // Brief success animation after response
      setAvatarState("success")
      setTimeout(() => setAvatarState("idle"), 1000)
    }
  }, [isLoading, messages.length])

  // Greeting animation when chat opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setAvatarState("greeting")
      setTimeout(() => setAvatarState("idle"), 1500)
    }
  }, [isOpen, messages.length])

  const handleSplashDismiss = () => {
    setShowSplash(false)
    localStorage.setItem("data-dawg-intro-seen", "true")
  }

  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Delay focus slightly to allow layout to settle
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

  // Auto-detect project from URL
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

    const userMessage: Message = {
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const project = detectProject()
      // Send conversation history for context (last 5 messages)
      // Include query results from previous assistant messages for follow-up filtering
      const conversationHistory = messages.slice(-5).map(m => ({
        role: m.role,
        content: m.content,
        queryResults: m.queryResults || null,
        queryType: m.queryType || null
      }))

      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          project: project,
          conversationHistory: conversationHistory,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const data = await response.json()

      const assistantMessage: Message = {
        role: "assistant",
        content: data.answer || "I couldn't find an answer to that question.",
        timestamp: new Date(),
        messageId: data.messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Use server-generated messageId if available
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Store query results for follow-up filtering (if available)
      if (data.results && data.results.length > 0) {
        // Store in a way that can be passed to next query
        // We'll include this in conversation history metadata
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

  const handleFeedback = async (messageId: string, feedback: "positive" | "negative") => {
    // Update local state
    setMessages((prev) =>
      prev.map((msg) =>
        msg.messageId === messageId ? { ...msg, feedback } : msg
      )
    )

    // Send feedback to API (non-blocking)
    try {
      const project = detectProject()
      await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "", // Empty message indicates this is a feedback submission
          project: project,
          feedback: feedback,
          messageId: messageId,
        }),
      }).catch(() => {
        // Silently fail - feedback is nice to have but not critical
      })
    } catch (e) {
      // Ignore errors
    }
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
      // Stop recording
      recognitionRef.current.stop()
      setIsRecording(false)
    } else {
      // Start recording
      try {
        recognitionRef.current.start()
        setIsRecording(true)
      } catch (error) {
        console.error("Error starting speech recognition:", error)
        setIsRecording(false)
      }
    }
  }

  // Cleanup on unmount
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-[fadeIn_0.3s_ease-out]">
          <style jsx>{`
            @keyframes fadeIn {
              from {
                opacity: 0;
              }
              to {
                opacity: 1;
              }
            }
            @keyframes slideUp {
              from {
                opacity: 0;
                transform: translateY(20px) scale(0.95);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
          `}</style>
          <Card className="relative max-w-md w-[90vw] bg-white shadow-2xl border-2 border-[#f4c542] animate-[slideUp_0.4s_ease-out]">
            <CardHeader className="bg-gradient-to-br from-[#003366] to-[#002244] text-white p-6 text-center border-b-2 border-[#f4c542]">
              <div className="flex justify-center mb-4">
                <div className={cn(
                  "relative h-40 w-40 overflow-hidden shadow-lg",
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
              <p className="text-sm text-white/90">
                Your NC wrestling recruiting assistant
              </p>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-slate-700 text-center">
                I can help you find information about:
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-[#f4c542] font-bold">•</span>
                  <span>College commitments and recruiting status</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#f4c542] font-bold">•</span>
                  <span>High school career records and match history</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#f4c542] font-bold">•</span>
                  <span>Season-by-season statistics</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#f4c542] font-bold">•</span>
                  <span>Prospect rankings and achievements</span>
                </li>
              </ul>
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => {
                    handleSplashDismiss()
                    setIsOpen(true)
                  }}
                  className="flex-1 bg-[#003366] hover:bg-[#002244] text-white font-semibold"
                >
                  Ask Data Dawg
                </Button>
                <Button
                  onClick={handleSplashDismiss}
                  variant="outline"
                  className="border-[#003366] text-[#003366] hover:bg-slate-50"
                >
                  Got it
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Floating launcher */}
      <div
        className={cn(
          "fixed bottom-20 sm:bottom-4 right-4 z-50 flex items-center gap-3 transition-all duration-500",
          showSplash ? "opacity-0 scale-90" : "opacity-100 scale-100"
        )}
      >
        <Button
          onClick={() => setIsOpen(true)}
          className={cn(
            "h-20 w-20 shadow-xl",
            "bg-transparent hover:bg-transparent",
            "flex items-center justify-center p-0 overflow-visible"
          )}
          size="icon"
          aria-label="Open Data Dawg chat"
        >
          <div className={cn(
            "relative h-full w-full",
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
            onClick={() => setIsOpen(true)}
            className="rounded-full bg-white text-[#003366] shadow-md px-4 py-2 text-sm font-semibold border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Ask Data Dawg
          </button>
        </div>
      </div>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex md:justify-end">
          <div className="absolute inset-0 bg-black/50 md:bg-black/30" onClick={() => setIsOpen(false)} />
          <Card className="relative h-full w-full md:h-full md:w-full md:max-w-md bg-white shadow-2xl border-0 md:border border-slate-200 animate-[slideIn_0.2s_ease-out_forwards] flex flex-col max-h-screen md:max-h-full">
            <style jsx>{`
              @keyframes slideIn {
                from {
                  opacity: 0;
                  transform: translateX(100%);
                }
                to {
                  opacity: 1;
                  transform: translateX(0);
                }
              }
              @keyframes greeting {
                0%, 100% { transform: scale(1) rotate(0deg); }
                25% { transform: scale(1.1) rotate(-5deg); }
                50% { transform: scale(1.15) rotate(5deg); }
                75% { transform: scale(1.1) rotate(-3deg); }
              }
              @keyframes thinking {
                0%, 100% {
                  transform: scale(1);
                  opacity: 1;
                }
                50% {
                  transform: scale(1.05);
                  opacity: 0.8;
                }
              }
              @keyframes thinkingPulse {
                0%, 100% {
                  box-shadow: 0 0 0 0 rgba(244, 197, 66, 0.7);
                }
                50% {
                  box-shadow: 0 0 0 8px rgba(244, 197, 66, 0);
                }
              }
              @keyframes success {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
              }
              .avatar-greeting {
                animation: greeting 1.5s ease-in-out;
              }
              .avatar-thinking {
                animation: thinking 1.5s ease-in-out infinite, thinkingPulse 2s ease-in-out infinite;
              }
              .avatar-success {
                animation: success 0.5s ease-in-out;
              }
            `}</style>
            <CardHeader className="bg-[#003366] text-white p-4 sm:p-4 border-b-2 border-[#f4c542]/60">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={cn(
                    "h-12 w-12 sm:h-12 sm:w-12 overflow-hidden flex-shrink-0",
                    avatarState === "greeting" && "avatar-greeting",
                    avatarState === "thinking" && "avatar-thinking",
                    avatarState === "success" && "avatar-success"
                  )}>
                    <Image
                      src={DATA_DAWG_IMAGE_URL}
                      alt="Data Dawg"
                      width={48}
                      height={48}
                      className="object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-sm font-bold leading-tight truncate">Ask Data Dawg</CardTitle>
                    <p className="text-xs sm:text-[11px] text-white/80 truncate">Your NC wrestling recruiting assistant</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Mobile: Home button to go back to main page */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-10 w-10 text-white hover:bg-blue-600/80 hover:text-white flex-shrink-0 rounded-full border-2 border-white/40 bg-white/10 backdrop-blur-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsOpen(false)
                      router.push("/")
                    }}
                    aria-label="Go to home page"
                  >
                    <Home className="h-5 w-5 font-bold" strokeWidth={2.5} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 sm:h-9 sm:w-9 text-white hover:bg-red-600/80 hover:text-white flex-shrink-0 rounded-full border-2 border-white/40 bg-white/10 backdrop-blur-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsOpen(false)
                    }}
                    aria-label="Close Data Dawg chat"
                  >
                    <X className="h-6 w-6 sm:h-5 sm:w-5 font-bold" strokeWidth={2.5} />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col p-0 overflow-hidden min-h-0" style={{ maxHeight: 'calc(100vh - 80px)' }}>
              <ScrollArea className="flex-1 p-4 sm:p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
                {messages.length === 0 ? (
                  <div className="text-sm text-slate-600 space-y-4">
                    <div className="flex items-start gap-3">
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
                      <div className="bg-slate-100 rounded-2xl px-3 py-2">
                        <p className="text-xs text-slate-900">
                          Hey, I&apos;m Data Dawg. Ask me anything about North Carolina wrestling recruiting — college commitments, career records, match history, or prospect rankings.
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-slate-700">Try one of these:</p>
                      <div className="flex flex-wrap gap-2">
                        {suggestedPrompts.map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            className="text-[11px] rounded-full border border-slate-300 px-3 py-1 bg-white hover:bg-slate-50 text-slate-800"
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
                              "mr-2 mt-1 h-9 w-9 overflow-hidden flex-shrink-0",
                              isLoading && index === messages.length - 1 && "avatar-thinking"
                            )}>
                              <Image
                                src={DATA_DAWG_IMAGE_URL}
                                alt="Data Dawg"
                                width={36}
                                height={36}
                                className="object-contain"
                              />
                            </div>
                          )}
                          <div
                            className={cn(
                              "max-w-[80%] rounded-2xl px-3 py-2 text-xs",
                              isUser
                                ? "bg-[#003366] text-white"
                                : "bg-slate-100 text-slate-900"
                            )}
                          >
                            {isUser ? (
                              <p className="whitespace-pre-wrap">{message.content}</p>
                            ) : (
                              <div
                                className="whitespace-pre-wrap [&_a]:text-blue-600 [&_a]:hover:text-blue-800 [&_a]:underline"
                                dangerouslySetInnerHTML={{ __html: formatDataDawgMessage(message.content) }}
                              />
                            )}
                            {!isUser && message.messageId && (
                              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200">
                                <span className="text-[10px] text-slate-500">Helpful?</span>
                                <button
                                  onClick={() => handleFeedback(message.messageId!, "positive")}
                                  className={cn(
                                    "p-1 rounded hover:bg-slate-200 transition-colors",
                                    message.feedback === "positive" && "bg-green-100"
                                  )}
                                  aria-label="Thumbs up"
                                >
                                  <ThumbsUp className={cn(
                                    "h-3 w-3",
                                    message.feedback === "positive" ? "text-green-600" : "text-slate-400"
                                  )} />
                                </button>
                                <button
                                  onClick={() => handleFeedback(message.messageId!, "negative")}
                                  className={cn(
                                    "p-1 rounded hover:bg-slate-200 transition-colors",
                                    message.feedback === "negative" && "bg-red-100"
                                  )}
                                  aria-label="Thumbs down"
                                >
                                  <ThumbsDown className={cn(
                                    "h-3 w-3",
                                    message.feedback === "negative" ? "text-red-600" : "text-slate-400"
                                  )} />
                                </button>
                              </div>
                            )}
                            <p className="text-[10px] opacity-60 mt-1">
                              {message.timestamp.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                    {isLoading && (
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <div className="h-6 w-6 flex items-center justify-center avatar-thinking">
                          <Image
                            src={DATA_DAWG_IMAGE_URL}
                            alt="Data Dawg thinking"
                            width={24}
                            height={24}
                            className="object-contain"
                          />
                        </div>
                        <span>Data Dawg is thinking…</span>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              <div className="border-t-2 border-slate-300 p-3 sm:p-3 md:p-4 space-y-1 bg-white flex-shrink-0" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                <div className="flex gap-2 sm:gap-2">
                  {isSpeechSupported && (
                    <Button
                      type="button"
                      onClick={handleVoiceRecord}
                      disabled={isLoading}
                      className={cn(
                        "flex-shrink-0 h-auto py-2 sm:py-2 px-3 sm:px-3",
                        isRecording
                          ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                          : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                      )}
                      aria-label={isRecording ? "Stop recording" : "Start voice recording"}
                    >
                      {isRecording ? (
                        <MicOff className="h-4 w-4 sm:h-4 sm:w-4" />
                      ) : (
                        <Mic className="h-4 w-4 sm:h-4 sm:w-4" />
                      )}
                    </Button>
                  )}
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={isSpeechSupported ? "Ask Data Dawg or tap mic to speak…" : "Ask Data Dawg anything about NC wrestling…"}
                    disabled={isLoading || isRecording}
                    className="flex-1 text-sm sm:text-sm px-3 sm:px-3 py-2 sm:py-2 min-w-0 border-2"
                    onFocus={(e) => {
                      // Scroll input into view when keyboard opens
                      setTimeout(() => {
                        e.target.scrollIntoView({ behavior: 'smooth', block: 'end' })
                      }, 300)
                    }}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading || isRecording}
                    className="bg-[#003366] hover:bg-[#002244] text-white px-4 sm:px-3 md:px-4 flex-shrink-0 h-auto py-2 sm:py-2"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 sm:h-4 sm:w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 sm:h-4 sm:w-4" />
                    )}
                  </Button>
                </div>
                {isRecording && (
                  <p className="text-[10px] text-red-600 text-center animate-pulse">
                    🎤 Listening... Speak your question
                  </p>
                )}
                <p className="text-[9px] sm:text-[10px] text-slate-400 text-center sm:text-right pr-1 pt-1">
                  Powered by RecruitNC data.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}

