"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileText, FileUp, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function SummarizePage() {
  const [activeTab, setActiveTab] = useState("text")
  const [text, setText] = useState("")
  const [summary, setSummary] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [fileName, setFileName] = useState("")
  const { toast } = useToast()

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setIsLoading(true)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch("http://localhost:5000/extract_text", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to extract text from file")
      }

      const data = await response.json()
      setText(data.text)
      toast({
        title: "File processed successfully",
        description: `Extracted ${data.text.length} characters from ${file.name}`,
      })
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error processing file",
        description: "There was an error extracting text from your file. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSummarize = async () => {
    if (!text.trim()) {
      toast({
        title: "No text to summarize",
        description: "Please enter or upload some text first.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setSummary("")

    try {
      // For demonstration, we'll use the chat endpoint to get a summary
      const response = await fetch("http://localhost:5000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: `Please provide a concise summary of the following text: ${text.substring(0, 2000)}...`,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate summary")
      }

      const data = await response.json()
      setSummary(data.response)
    } catch (error) {
      console.error("Error:", error)
      toast({
        title: "Error generating summary",
        description: "There was an error summarizing your text. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container py-8">
      <Card className="mx-auto max-w-4xl">
        <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Text Summarizer
          </CardTitle>
          <CardDescription className="text-amber-100">Get concise summaries of your documents</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text">Enter Text</TabsTrigger>
              <TabsTrigger value="file">Upload File</TabsTrigger>
            </TabsList>
            <TabsContent value="text" className="mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="text-input">Text to Summarize</Label>
                  <Textarea
                    id="text-input"
                    placeholder="Paste your text here..."
                    className="min-h-[200px]"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="file" className="mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file-upload">Upload Document</Label>
                  <div className="grid w-full items-center gap-1.5">
                    <Label
                      htmlFor="file-upload"
                      className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-input bg-muted/50 px-4 py-5 text-center"
                    >
                      <FileUp className="mb-2 h-8 w-8 text-muted-foreground" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{fileName || "Upload a file"}</p>
                        <p className="text-xs text-muted-foreground">Drag and drop or click to upload</p>
                        <p className="text-xs text-muted-foreground">Supports .docx and .pdf files</p>
                      </div>
                      <Input
                        id="file-upload"
                        type="file"
                        accept=".docx,.pdf"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={isLoading}
                      />
                    </Label>
                  </div>
                  {fileName && <p className="text-sm text-muted-foreground">Selected file: {fileName}</p>}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {summary && (
            <div className="mt-6 space-y-2">
              <h3 className="text-lg font-semibold">Summary</h3>
              <div className="rounded-md border bg-muted/50 p-4">
                <p className="whitespace-pre-wrap">{summary}</p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t bg-muted/50 px-6 py-4">
          <Button onClick={handleSummarize} disabled={isLoading || !text.trim()} className="ml-auto">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Summarize
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

