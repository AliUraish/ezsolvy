"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { API_ORIGIN, AppError, postJson } from "@/lib/api"
import { streamSSE } from "@/lib/sse"
import type { ExplanationRequestBody, ExplanationResponse, JobEvent } from "@/lib/types"
import { Textarea } from "@/components/ui/textarea"
import {
  Sparkles,
  Upload,
  Maximize2,
  RotateCcw,
  FileText,
  ImageIcon,
  X,
  Brain,
  BookOpen,
  PenTool,
  Minimize2,
} from "lucide-react"

export default function DashboardPage() {
  const [files, setFiles] = useState<File[]>([])
  const [question, setQuestion] = useState("")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [selectedMode, setSelectedMode] = useState<"explanation" | "summarise" | "notes">("explanation")
  const workspaceRef = useRef<HTMLDivElement | null>(null)
  const [split, setSplit] = useState(50) // percent for Canvas width when resizable
  const isDraggingRef = useRef(false)

  const usageUsed = 150
  const usageTotal = 500
  const usagePercentage = (usageUsed / usageTotal) * 100

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files)
      setFiles((prev) => [...prev, ...newFiles])
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleReset = () => {
    setFiles([])
    setQuestion("")
    setIsFullscreen(false)
    if (document.fullscreenElement) {
      document.exitFullscreen?.()
    }
    setSelectedMode("explanation")
  }

  const handleGenerate = async () => {
    try {
      const imagesBase64: string[] = []
      for (const file of files) {
        const b64 = await fileToBase64(file)
        const stripped = b64.replace(/^data:[^;]+;base64,/, "")
        imagesBase64.push(stripped)
      }

      const body: ExplanationRequestBody = imagesBase64.length > 1
        ? { imagesBase64, audience: undefined, promptHint: question || undefined }
        : imagesBase64.length === 1
          ? { imageBase64: imagesBase64[0], audience: undefined, promptHint: question || undefined }
          : { imageBase64: undefined, imagesBase64: undefined, audience: undefined, promptHint: question || undefined }

      const res = await postJson<ExplanationResponse>("/v1/explanation", body, {
        headers: selectedMode ? { "x-mode": selectedMode } : undefined,
      })

      if (res.mode === "sync") {
        toast({ title: "Explanation ready", description: "Transcript generated (sync)")
        // TODO: render res.result into transcript/canvas sections
      } else {
        toast({ title: "Queued", description: "Processing started..." })
        const abort = new AbortController()
        void streamSSE(`${API_ORIGIN}/v1/jobs/${res.job_id}/stream`, (evt: JobEvent) => {
          if (evt.type === "error") {
            toast({ title: "Job failed", description: String(evt.data?.error?.message || "Unknown error") })
          } else if (evt.type === "complete") {
            const progress = evt.data?.progress
            const result = progress?.result
            toast({ title: "Explanation ready", description: "Transcript generated" })
            // TODO: render result into transcript/canvas sections
            abort.abort()
          }
        }, abort.signal)
      }
    } catch (err: unknown) {
      if (err instanceof AppError) {
        toast({ title: `Error ${err.status}`, description: err.message })
      } else {
        toast({ title: "Error", description: (err as Error)?.message || "Request failed" })
      }
    }
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const enterFullscreen = useCallback(async () => {
    const el = workspaceRef.current
    if (!el) return
    try {
      if (el.requestFullscreen) await el.requestFullscreen()
      // @ts-ignore webkit fallback (Safari)
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
    } catch (err) {
      console.error("[v0] Failed to enter fullscreen:", err)
    }
  }, [])

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      }
      // @ts-ignore webkit compatibility
      else if (document.webkitFullscreenElement) {
        // @ts-ignore
        document.webkitExitFullscreen?.()
      }
    } catch (err) {
      console.error("[v0] Failed to exit fullscreen:", err)
    }
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      enterFullscreen()
    } else {
      exitFullscreen()
    }
  }, [enterFullscreen, exitFullscreen])

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener("fullscreenchange", onChange)
    // @ts-ignore webkit compatibility
    document.addEventListener("webkitfullscreenchange", onChange)
    return () => {
      document.removeEventListener("fullscreenchange", onChange)
      // @ts-ignore webkit compatibility
      document.removeEventListener("webkitfullscreenchange", onChange)
    }
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !isFullscreen || !workspaceRef.current) return
      const rect = workspaceRef.current.getBoundingClientRect()
      const x = e.clientX
      const pct = ((x - rect.left) / rect.width) * 100
      const clamped = Math.min(80, Math.max(20, pct))
      setSplit(clamped)
    }
    const onUp = () => {
      isDraggingRef.current = false
      document.body.classList.remove("select-none", "cursor-col-resize")
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, [isFullscreen])

  const startDrag = useCallback(() => {
    if (!isFullscreen) return
    isDraggingRef.current = true
    document.body.classList.add("select-none", "cursor-col-resize")
  }, [isFullscreen])

  return (
    <div className="min-h-screen bg-[#F5F1ED]">
      <header className="border-b border-[#2D2D2D]/10 bg-[#F5F1ED]/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <Link href="/" className="text-2xl font-bold text-[#2D2D2D]">
              ezsolvy
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="border-[#2D2D2D]/20 hover:bg-[#2D2D2D]/5 bg-transparent"
            >
              <RotateCcw className="size-4 mr-2" />
              Reset
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#2D2D2D]/60 font-medium">Usage this month</span>
              <span className="text-[#2D2D2D] font-semibold">
                {usageUsed} / {usageTotal} queries
              </span>
            </div>
            <div className="h-2 bg-[#2D2D2D]/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#3B82F6] to-[#2563EB] transition-all duration-500"
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-12">
        <div>
          <div className="grid lg:grid-cols-12 gap-8 h-full">
            <div className="lg:col-span-4 space-y-6">
              <div>
                <h1 className="text-4xl font-bold text-[#2D2D2D] mb-2 leading-tight">Start Learning</h1>
                <p className="text-[#2D2D2D]/60 text-lg">Upload files or type your question</p>
              </div>

              {/* Mode Selection */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-[#2D2D2D]/80 uppercase tracking-wide">Select Mode</label>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedMode("explanation")}
                    className={`w-full p-4 rounded-xl text-left transition-all ${
                      selectedMode === "explanation"
                        ? "bg-[#2D2D2D] text-white shadow-lg"
                        : "bg-white border border-[#2D2D2D]/10 text-[#2D2D2D] hover:border-[#2D2D2D]/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Brain className="size-5" />
                      <div>
                        <div className="font-semibold">Explanation</div>
                        <div
                          className={`text-xs ${selectedMode === "explanation" ? "text-white/70" : "text-[#2D2D2D]/50"}`}
                        >
                          Visual step-by-step breakdown
                        </div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedMode("notes")}
                    className={`w-full p-4 rounded-xl text-left transition-all ${
                      selectedMode === "notes"
                        ? "bg-[#2D2D2D] text-white shadow-lg"
                        : "bg-white border border-[#2D2D2D]/10 text-[#2D2D2D] hover:border-[#2D2D2D]/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <PenTool className="size-5" />
                      <div>
                        <div className="font-semibold">Make Notes</div>
                        <div className={`text-xs ${selectedMode === "notes" ? "text-white/70" : "text-[#2D2D2D]/50"}`}>
                          Generate organized notes
                        </div>
                      </div>
                    </div>
                  </button>

                  <button
                    disabled
                    className="w-full p-4 rounded-xl text-left bg-white border border-[#2D2D2D]/10 text-[#2D2D2D]/40 cursor-not-allowed"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BookOpen className="size-5" />
                        <div>
                          <div className="font-semibold">Summarise</div>
                          <div className="text-xs text-[#2D2D2D]/30">Quick content summary</div>
                        </div>
                      </div>
                      <span className="text-xs bg-[#2D2D2D]/10 px-2 py-1 rounded">Soon</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* File Upload */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-[#2D2D2D]/80 uppercase tracking-wide">Upload Files</label>
                <div className="bg-white border-2 border-dashed border-[#2D2D2D]/20 rounded-xl p-8 text-center hover:border-[#3B82F6]/50 transition-all cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="size-8 text-[#2D2D2D]/30 mx-auto mb-3" />
                    <p className="text-sm font-medium text-[#2D2D2D]/60">Drop files or click to upload</p>
                    <p className="text-xs text-[#2D2D2D]/40 mt-1">PDF, PNG, JPG</p>
                  </label>
                </div>

                {files.length > 0 && (
                  <div className="space-y-2">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-white rounded-lg border border-[#2D2D2D]/10"
                      >
                        <ImageIcon className="size-4 text-[#3B82F6] shrink-0" />
                        <span className="text-sm flex-1 truncate text-[#2D2D2D]">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="size-6 p-0 hover:bg-[#2D2D2D]/5"
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Text Input */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-[#2D2D2D]/80 uppercase tracking-wide">
                  {selectedMode === "explanation" && "Or Type Question"}
                  {selectedMode === "notes" && "What You Need to Learn"}
                  {selectedMode === "summarise" && "What to Summarise"}
                </label>
                <Textarea
                  placeholder={
                    selectedMode === "explanation"
                      ? "Enter your question here..."
                      : selectedMode === "notes"
                        ? "Enter what you need to learn..."
                        : "Enter what to summarise..."
                  }
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="min-h-32 resize-none bg-white border-[#2D2D2D]/20 text-[#2D2D2D] placeholder:text-[#2D2D2D]/40 rounded-xl"
                />
              </div>

              {/* Generate Button */}
              <Button
                className="w-full h-14 text-base font-semibold bg-[#2D2D2D] hover:bg-[#2D2D2D]/90 text-white rounded-xl shadow-lg"
                onClick={handleGenerate}
                disabled={files.length === 0 && !question}
              >
                <Sparkles className="size-5 mr-2" />
                Generate Explanation
              </Button>
            </div>

            <div className="lg:col-span-8">
              <div
                ref={workspaceRef}
                className="bg-white rounded-2xl border border-[#2D2D2D]/10 shadow-sm overflow-hidden h-full flex flex-col"
                style={isFullscreen ? { width: "100%", height: "100%" } : {}}
              >
                {/* Header */}
                <div className="p-6 border-b border-[#2D2D2D]/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="size-2 bg-[#3B82F6] rounded-full animate-pulse" />
                    <h2 className="text-xl font-bold text-[#2D2D2D]">AI Workspace</h2>
                    <span className="text-xs text-[#2D2D2D]/50 bg-[#2D2D2D]/5 px-3 py-1 rounded-full">
                      {selectedMode === "explanation" && "Explanation Mode"}
                      {selectedMode === "notes" && "Make Notes Mode"}
                      {selectedMode === "summarise" && "Summarise Mode"}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={toggleFullscreen} className="hover:bg-[#2D2D2D]/5">
                    {isFullscreen ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
                  </Button>
                </div>

                {/* Content Area - Split View */}
                <div className="flex-1 flex overflow-hidden">
                  {/* Canvas Section */}
                  <div className="flex flex-col min-w-[260px]" style={{ width: isFullscreen ? `${split}%` : "50%" }}>
                    <div className="p-4 bg-[#F5F1ED]/50 border-b border-[#2D2D2D]/10">
                      <h3 className="text-sm font-bold text-[#2D2D2D] uppercase tracking-wide flex items-center gap-2">
                        <Sparkles className="size-4 text-[#3B82F6]" />
                        AI Canvas
                      </h3>
                    </div>
                    <div className="flex-1 bg-gradient-to-br from-[#F5F1ED]/30 to-white flex items-center justify-center p-12">
                      <div className="text-center">
                        <div className="size-24 mx-auto mb-6 bg-[#3B82F6]/10 rounded-2xl flex items-center justify-center">
                          <Sparkles className="size-12 text-[#3B82F6]/50" />
                        </div>
                        <p className="text-lg font-semibold text-[#2D2D2D] mb-2">Canvas Ready</p>
                        <p className="text-sm text-[#2D2D2D]/50">Diagrams and visuals will appear here</p>
                      </div>
                    </div>
                  </div>

                  <div
                    onMouseDown={startDrag}
                    className={`w-[6px] ${isFullscreen ? "cursor-col-resize bg-[#2D2D2D]/10 hover:bg-[#2D2D2D]/20" : "bg-[#2D2D2D]/10"} transition-colors`}
                    aria-label="Resize panels"
                    role="separator"
                    aria-orientation="vertical"
                  />

                  {/* Transcript Section */}
                  <div
                    className="flex flex-col min-w-[260px]"
                    style={{ width: isFullscreen ? `${100 - split}%` : "50%" }}
                  >
                    <div className="p-4 bg-[#F5F1ED]/50 border-b border-[#2D2D2D]/10">
                      <h3 className="text-sm font-bold text-[#2D2D2D] uppercase tracking-wide flex items-center gap-2">
                        <FileText className="size-4 text-[#3B82F6]" />
                        Transcript
                      </h3>
                    </div>
                    <div className="flex-1 p-8 overflow-y-auto">
                      <div className="space-y-6">
                        <p className="text-sm text-[#2D2D2D]/40 italic">
                          Transcript will appear here as the AI explains...
                        </p>
                        <div className="space-y-4">
                          <div className="p-4 bg-[#F5F1ED]/50 rounded-xl border border-[#2D2D2D]/5">
                            <p className="font-bold text-[#3B82F6] text-xs mb-2 uppercase tracking-wide">Step 1</p>
                            <p className="text-sm text-[#2D2D2D]/70 leading-relaxed">
                              Understanding the question and identifying key concepts...
                            </p>
                          </div>
                          <div className="p-4 bg-[#F5F1ED]/50 rounded-xl border border-[#2D2D2D]/5">
                            <p className="font-bold text-[#3B82F6] text-xs mb-2 uppercase tracking-wide">Step 2</p>
                            <p className="text-sm text-[#2D2D2D]/70 leading-relaxed">
                              Breaking down the problem into manageable parts...
                            </p>
                          </div>
                          <div className="p-4 bg-[#F5F1ED]/50 rounded-xl border border-[#2D2D2D]/5">
                            <p className="font-bold text-[#3B82F6] text-xs mb-2 uppercase tracking-wide">Step 3</p>
                            <p className="text-sm text-[#2D2D2D]/70 leading-relaxed">
                              Creating visual representations to illustrate concepts...
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
