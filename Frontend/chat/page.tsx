"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Send, Moon, Sun, Copy, Menu, PenSquare } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useChat } from "../ChatContext"
import { useTheme } from "next-themes"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter, SyntaxHighlighterProps } from "react-syntax-highlighter"
import { vs, vs2015 } from "react-syntax-highlighter/dist/esm/styles/hljs"
import { v4 as uuidv4 } from 'uuid'

interface Message {
  id: string
  content: string
  role: "user" | "assistant"
  timestamp: Date
  displayedContent?: string
}

export default function ChatPage() {
  const { messages, addMessage, setMessages, typingMessageId, setTypingMessageId } = useChat()
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mainContainerRef = useRef<HTMLDivElement>(null)
  const inputContainerRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const { theme, setTheme } = useTheme()
  const [viewportHeight, setViewportHeight] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  // Constants for layout calculations
  const HEADER_HEIGHT = 48 // 12px height + padding
  const TOP_PADDING = 48 // pt-12 (3rem = 48px)
  const BOTTOM_PADDING = 128 // pb-32 (8rem = 128px)
  const ADDITIONAL_OFFSET = 16 // Fine-tuning offset

  useEffect(() => {
    const checkMobileAndViewport = () => {
      const isMobileDevice = window.innerWidth < 768
      setIsMobile(isMobileDevice)

      // Capture the viewport height
      const vh = window.innerHeight
      setViewportHeight(vh)

      // Apply fixed height to main container on mobile
      if (isMobileDevice && mainContainerRef.current) {
        mainContainerRef.current.style.height = `${vh}px`
      }
    }

    checkMobileAndViewport()

    // Set initial height
    if (mainContainerRef.current) {
      mainContainerRef.current.style.height = isMobile ? `${viewportHeight}px` : "100svh"
    }

    // Update on resize
    window.addEventListener("resize", checkMobileAndViewport)

    return () => {
      window.removeEventListener("resize", checkMobileAndViewport)
    }
  }, [isMobile, viewportHeight])

  useEffect(() => {
    if (!isLoading && !typingMessageId) {
      scrollToBottom()
    }
  }, [messages, isLoading, typingMessageId])

  useEffect(() => {
    if (!typingMessageId) return

    const messageToType = messages.find((msg) => msg.id === typingMessageId)
    if (
      !messageToType ||
      messageToType.role !== "assistant" ||
      messageToType.displayedContent === messageToType.content
    ) {
      setTypingMessageId(null)
      return
    }

    const typingSpeed = 20
    const timer = setTimeout(() => {
      const currentDisplayed = messageToType.displayedContent || ""
      const fullContent = messageToType.content || ""
      const nextCharIndex = currentDisplayed.length + 1

      if (nextCharIndex <= fullContent.length) {
        setMessages((prev: Message[]) =>
          prev.map((msg) =>
            msg.id === typingMessageId ? { ...msg, displayedContent: fullContent.slice(0, nextCharIndex) } : msg
          )
        )
      } else {
        setTypingMessageId(null)
      }
    }, typingSpeed)

    return () => clearTimeout(timer)
  }, [messages, typingMessageId, setMessages, setTypingMessageId])

  // Focus the textarea on component mount (only on desktop)
  useEffect(() => {
    if (textareaRef.current && !isMobile) {
      textareaRef.current.focus()
    }
  }, [isMobile])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!inputValue.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message to send.",
        variant: "destructive",
      })
      return
    }

    const userMessage: Message = {
      id: uuidv4(),
      content: inputValue,
      role: "user",
      timestamp: new Date(),
    }

    addMessage(userMessage)
    setInputValue("")
    setIsLoading(true)

    try {
      const response = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question: userMessage.content }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      const data = await response.json()
      const assistantMessage: Message = {
        id: uuidv4(),
        content: data.response || "I'm sorry, I couldn't process that request.",
        role: "assistant",
        timestamp: new Date(),
        displayedContent: "",
      }

      addMessage(assistantMessage)
      setTypingMessageId(assistantMessage.id)
    } catch (error) {
      console.error("Error in handleSendMessage:", error)
      const errorMessage: Message = {
        id: uuidv4(),
        content: "Sorry, there was an error connecting to the server. Please try again later.",
        role: "assistant",
        timestamp: new Date(),
        displayedContent: "",
      }
      addMessage(errorMessage)
      setTypingMessageId(errorMessage.id)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isLoading && !isMobile && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    } else if (!isLoading && e.key === "Enter" && e.metaKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleToggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      toast({
        title: "Copied",
        description: "Code copied to clipboard!",
        variant: "default",
      })
    }).catch((err) => {
      console.error("Failed to copy code:", err)
      toast({
        title: "Error",
        description: "Failed to copy code.",
        variant: "destructive",
      })
    })
  }

  const formatTimestamp = (date: Date) => {
    return date
      .toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      .toLowerCase()
  }

  const resolvedTheme = theme || "light"

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)

    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      const newHeight = Math.max(24, Math.min(textarea.scrollHeight, 160))
      textarea.style.height = `${newHeight}px`
    }
  }

  const handleInputContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (
      e.target === e.currentTarget ||
      (e.currentTarget === inputContainerRef.current && !(e.target as HTMLElement).closest("button"))
    ) {
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }
  }

  return (
    <div
      ref={mainContainerRef}
      className={cn(
        "flex flex-col overflow-hidden",
        resolvedTheme === "dark" ? "bg-gray-900" : "bg-gray-50"
      )}
      style={{ height: isMobile ? `${viewportHeight}px` : "100svh" }}
    >
      <header className={cn(
        "fixed top-0 left-0 right-0 h-12 flex items-center px-4 z-20",
        resolvedTheme === "dark" ? "bg-gray-900" : "bg-gray-50"
      )}>
        <div className="w-full flex items-center justify-between px-2">
          <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
            <Menu className={cn("h-5 w-5", resolvedTheme === "dark" ? "text-gray-300" : "text-gray-700")} />
            <span className="sr-only">Menu</span>
          </Button>
          <h1 className={cn(
            "text-base font-medium",
            resolvedTheme === "dark" ? "text-gray-200" : "text-gray-800"
          )}>
            EduMind Chat
          </h1>
          <Button
            onClick={handleToggleTheme}
            variant="ghost"
            size="icon"
            className="rounded-full h-8 w-8"
          >
            {resolvedTheme === "dark" ? (
              <Sun className="h-5 w-5 text-gray-300" />
            ) : (
              <Moon className="h-5 w-5 text-gray-700" />
            )}
            <span className="sr-only">Toggle Theme</span>
          </Button>
        </div>
      </header>

      <div
        ref={chatContainerRef}
        className="flex-grow pb-32 pt-12 px-4 overflow-y-auto"
      >
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn("flex flex-col", msg.role === "user" ? "items-end" : "items-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] px-4 py-2 rounded-2xl",
                  msg.role === "user"
                    ? cn(
                        "rounded-br-none",
                        resolvedTheme === "dark"
                          ? "bg-gray-700 text-white border border-gray-600"
                          : "bg-white text-gray-900 border border-gray-200"
                      )
                    : resolvedTheme === "dark"
                      ? "bg-gray-800 text-white"
                      : "bg-gray-100 text-gray-900"
                )}
              >
                {msg.role === "assistant" ? (
                  <ReactMarkdown
                    components={{
                      code({ node, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || "")
                        const codeContent = String(children).replace(/\n$/, "")

                        if (match) {
                          const styleTheme = resolvedTheme === "dark" ? vs2015 : vs
                          return (
                            <div className="relative w-full">
                              <Button
                                onClick={() => handleCopyCode(codeContent)}
                                className={cn(
                                  "absolute right-2 top-2 h-8 w-8 p-0 rounded-md",
                                  resolvedTheme === "dark"
                                    ? "bg-gray-600 hover:bg-gray-500"
                                    : "bg-gray-200 hover:bg-gray-300"
                                )}
                                title="Copy code"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <SyntaxHighlighter
                                {...props as SyntaxHighlighterProps}
                                style={styleTheme}
                                language={match[1]}
                                PreTag="div"
                                className="rounded-md mt-4 w-full"
                              >
                                {codeContent}
                              </SyntaxHighlighter>
                            </div>
                          )
                        }
                        return <code className={className} {...props}>{children}</code>
                      },
                    }}
                  >
                    {msg.displayedContent || msg.content}
                  </ReactMarkdown>
                ) : (
                  msg.displayedContent || msg.content
                )}
              </div>
              <div
                className={cn(
                  "flex items-center mt-1 text-xs",
                  msg.role === "user" ? "justify-end mr-2" : "justify-start ml-2",
                  resolvedTheme === "dark" ? "text-gray-500" : "text-gray-400"
                )}
              >
                <div
                  className={cn("w-2 h-2 rounded-full mr-2", resolvedTheme === "dark" ? "bg-gray-500" : "bg-gray-300")}
                ></div>
                {formatTimestamp(msg.timestamp)}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className={cn("flex flex-col items-start")}>
              <div
                className={cn(
                  "max-w-[80%] px-4 py-2 rounded-2xl",
                  resolvedTheme === "dark" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-900"
                )}
              >
                <span className={cn("animate-pulse", resolvedTheme === "dark" ? "text-gray-400" : "text-gray-600")}>
                  Thinking<span className="ml-1">.</span><span className="ml-1">.</span><span className="ml-1">.</span>
                </span>
              </div>
              <div
                className={cn(
                  "flex items-center mt-1 text-xs justify-start ml-2",
                  resolvedTheme === "dark" ? "text-gray-500" : "text-gray-400"
                )}
              >
                <div
                  className={cn("w-2 h-2 rounded-full mr-2", resolvedTheme === "dark" ? "bg-gray-500" : "bg-gray-300")}
                ></div>
                {formatTimestamp(new Date())}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className={cn(
        "fixed bottom-0 left-0 right-0 p-4",
        resolvedTheme === "dark" ? "bg-gray-900" : "bg-gray-50"
      )}>
        <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto">
          <div
            ref={inputContainerRef}
            className={cn(
              "relative w-full rounded-3xl border p-3 cursor-text",
              resolvedTheme === "dark"
                ? "bg-gray-800 border-gray-600"
                : "bg-white border-gray-200",
              isLoading && "opacity-80"
            )}
            onClick={handleInputContainerClick}
          >
            <div className="pb-9">
              <Textarea
                ref={textareaRef}
                placeholder={isLoading ? "Waiting for response..." : "Ask anything about your studies..."}
                className={cn(
                  "min-h-[24px] max-h-[160px] w-full rounded-3xl border-0 bg-transparent placeholder:text-base focus-visible:ring-0 focus-visible:ring-offset-0 text-base pl-2 pr-4 pt-0 pb-0 resize-none overflow-y-auto leading-tight",
                  resolvedTheme === "dark"
                    ? "text-white placeholder:text-gray-500"
                    : "text-gray-900 placeholder:text-gray-400"
                )}
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (textareaRef.current) {
                    textareaRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
                  }
                }}
              />
            </div>
            <div className="absolute bottom-3 right-3">
              <Button
                type="submit"
                variant="outline"
                size="icon"
                className={cn(
                  "rounded-full h-8 w-8 border-0 flex-shrink-0 transition-all duration-200",
                  inputValue.trim() ? "bg-black scale-110" : "bg-gray-200"
                )}
                disabled={isLoading || !inputValue.trim()}
              >
                <Send className={cn("h-4 w-4 transition-colors", inputValue.trim() ? "text-white" : "text-gray-500")} />
                <span className="sr-only">Submit</span>
              </Button>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-center">
            <div
              className={cn("w-1.5 h-1.5 rounded-full mr-1.5", resolvedTheme === "dark" ? "bg-emerald-500" : "bg-emerald-400")}
            ></div>
            <p className={cn("text-xs", resolvedTheme === "dark" ? "text-gray-500" : "text-gray-400")}>
              Running on simulated AI responses – EduMind keeps your data private
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
