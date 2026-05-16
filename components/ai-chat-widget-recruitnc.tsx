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
import { X, Send, Loader2, Mic, MicOff, Home, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDataDawgMessage } from "@/lib/data-dawg-render-links"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: Date
  messageId?: string
  queryResults?: any[]
  queryType?: string
}

// RecruitNC-specific suggested prompts based on current page
const getSuggestedPrompts = (pathname: string): string[] => {
  if (pathname?.includes("/rankings") || pathname?.includes("/public-rankings")) {
    return [
      "Show me all Class of 2026 rankings",
      "Show me all Class of 2027 rankings",
      "Who are the top 10 ranked prospects?",
      "What athletes are ranked in the top 30?",
    ]
  }
  
  return [
    "Show me all Class of 2026 rankings",
    "Show me all Class of 2027 rankings",
    "What was our best year for NHSCA All-Americans?",
    "Who are our 4x state champions?",
  ]
}

const DATA_DAWG_IMAGE_URL =
  "https://w8v0puzioqkz0xzh.public.blob.vercel-storage.com/logo/mrF_BS_MLNADT9HWhny2B-Data%20Dawg%203.png"

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
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [avatarState, setAvatarState] = useState<"idle" | "greeting" | "thinking" | "success">("idle")
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeechSupported, setIsSpeechSupported] = useState(false)
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

  const handleSplashDismiss = () => {
    setShowSplash(false)
    localStorage.setItem("data-dawg-intro-seen", "true")
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
      const conversationHistory = messages.slice(-5).map(m => ({
        role: m.role,
        content: m.content,
        queryResults: m.queryResults || null,
        queryType: m.queryType || null
      }))

      const chatPayload = {
        message: userMessage.content,
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
                I can help you find information about:
              </p>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-[#D3B574]">•</span>
                  <span>College commitments and recruiting status</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#D3B574]">•</span>
                  <span>High school career records and match history</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#D3B574]">•</span>
                  <span>Prospect rankings and achievements</span>
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
          onClick={() => setIsOpen(true)}
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
            onClick={() => setIsOpen(true)}
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
                          Hey, I&apos;m Data Dawg. Ask me anything about North Carolina wrestling recruiting — college commitments, career records, or prospect rankings.
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
                                className="whitespace-pre-wrap [&_a]:text-[#D3B574] [&_a]:hover:text-[#c4a665] [&_a]:underline"
                                dangerouslySetInnerHTML={{ __html: formatDataDawgMessage(message.content) }}
                              />
                            )}
                            <p className={cn(
                              "text-[10px] mt-2",
                              isUser ? "text-[#0A1628]/60" : "text-gray-500"
                            )}>
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
    </>
  )
}
