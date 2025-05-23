"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, FileText, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface SearchResult {
  id: string
  title: string
  excerpt: string
  type: "document" | "chat" | "quiz"
  date: string
  icon: React.ReactNode
  author?: string
  bookName?: string
  details?: string
  image?: string
  downloadLink?: string
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const { toast } = useToast()

  const mockResults: SearchResult[] = [
    {
      id: "3",
      title: "Eloquent JavaScript",
      excerpt: "A modern introduction to JavaScript programming.",
      type: "document",
      date: "Today",
      icon: <FileText className="h-5 w-5 text-amber-500" />,
      author: "Marijn Haverbeke",
      bookName: "Eloquent JavaScript",
      details: "Learn modern JavaScript with deep concepts and exercises.",
      image: "https://eloquentjavascript.net/img/cover.jpg",
      downloadLink: "https://eloquentjavascript.net/Eloquent_JavaScript.pdf",
    },
    {
      id: "4",
      title: "Java Programming Guide",
      excerpt: "Comprehensive Java material with OOP concepts and examples.",
      type: "document",
      date: "Just now",
      icon: <FileText className="h-5 w-5 text-amber-500" />,
      author: "Herbert Schildt",
      bookName: "Java: The Complete Reference",
      details: "Covers core Java, data structures, and interview questions.",
      image: "https://m.media-amazon.com/images/I/61605LQW7dL._AC_UF1000,1000_QL80_.jpg",
      downloadLink: "https://www.sietk.org/downloads/javabook.pdf",
    },
    {
      id: "2",
      title: "Python Crash Course",
      excerpt: "Beginner-friendly Python guide with hands-on examples.",
      type: "document",
      date: "Today",
      icon: <FileText className="h-5 w-5 text-amber-500" />,
      author: "Eric Matthes",
      bookName: "Python Crash Course",
      details: "Learn Python fundamentals, OOP, and mini projects.",
      image: "https://m.media-amazon.com/images/I/71pys4B4OVL._AC_UF1000,1000_QL80_.jpg",
      downloadLink: "http://khwarizmi.org/wp-content/uploads/2021/04/Eric_Matthes_Python_Crash_Course_A_Hands.pdf",
    },
    {
      id: "1",
      title: "The C Programming Language",
      excerpt: "Foundational C programming text by creators of the language.",
      type: "document",
      date: "Today",
      icon: <FileText className="h-5 w-5 text-amber-500" />,
      author: "Kernighan & Ritchie",
      bookName: "The C Programming Language",
      details: "Learn the C language from the definitive source.",
      image: "https://images-na.ssl-images-amazon.com/images/I/41WcVaeM7cL.jpg",
      downloadLink: "https://www.davidebove.com/wp-content/uploads/2018/03/The_C_Programming_Language.pdf",
    },
    {
      id: "5",
      title: "C++ Primer",
      excerpt: "Modern C++ from basics to advanced topics.",
      type: "document",
      date: "Today",
      icon: <FileText className="h-5 w-5 text-amber-500" />,
      author: "Stanley B. Lippman",
      bookName: "C++ Primer",
      details: "C++11/14, OOP, STL and more.",
      image: "https://images-na.ssl-images-amazon.com/images/I/51et0cP1APL.jpg",
      downloadLink: "https://www.cs.cmu.edu/afs/cs/academic/class/15213-f18/www/recitations/rec07/cpp-primer.pdf",
    },
    {
      id: "6",
      title: "Introduction to Algorithms",
      excerpt: "CLRS algorithm bible for CS students.",
      type: "document",
      date: "Today",
      icon: <FileText className="h-5 w-5 text-amber-500" />,
      author: "Cormen, Leiserson, Rivest, Stein",
      bookName: "CLRS",
      details: "DSA, graphs, sorting, DP and more.",
      image: "https://images-na.ssl-images-amazon.com/images/I/61JLiCovxVL.jpg",
      downloadLink: "https://staff.ustc.edu.cn/~csli/graduate/algorithms/book6/Introduction%20to%20Algorithms%203rd%20Edition.pdf",
    },
    {
      id: "7",
      title: "Discrete Mathematics",
      excerpt: "Learn the mathematics behind computing.",
      type: "document",
      date: "Today",
      icon: <FileText className="h-5 w-5 text-amber-500" />, // Fixed syntax error here
      author: "Kenneth Rosen",
      bookName: "Discrete Mathematics and Its Applications",
      details: "Logic, proofs, sets, relations, functions.",
      image: "https://images-na.ssl-images-amazon.com/images/I/81jK7om5c7L.jpg",
      downloadLink: "https://mathsgee.com/wp-content/uploads/2021/06/discrete_mathematics_and_its_applications_7th_edition.pdf",
    },
    {
      id: "8",
      title: "Let Us C",
      excerpt: "Popular beginner-friendly C programming book.",
      type: "document",
      date: "Today",
      icon: <FileText className="h-5 w-5 text-amber-500" />,
      author: "Yashavant Kanetkar",
      bookName: "Let Us C",
      details: "C basics, control structures, arrays, pointers.",
      image: "https://images-na.ssl-images-amazon.com/images/I/712DkiJZbQL.jpg",
      downloadLink: "https://mega.nz/file/LetUsC", // Placeholder; replace with a valid link if available
    },
  ]

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Empty search",
        description: "Please enter a search term.",
        variant: "destructive",
      })
      return
    }

    setIsSearching(true)

    setTimeout(() => {
      // Filter results based on search query and active tab
      const filteredResults = mockResults.filter((result) => {
        const query = searchQuery.toLowerCase()
        const matchesQuery =
          result.title.toLowerCase().includes(query) ||
          result.excerpt.toLowerCase().includes(query) ||
          (result.author && result.author.toLowerCase().includes(query)) ||
          (result.bookName && result.bookName.toLowerCase().includes(query)) ||
          (result.details && result.details.toLowerCase().includes(query))
        const matchesTab = activeTab === "all" || result.type === activeTab
        return matchesQuery && matchesTab
      })

      setResults(filteredResults)
      setIsSearching(false)
    }, 1200)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch()
  }

  return (
    <div className="container py-8">
      <Card className="mx-auto max-w-5xl">
        <CardHeader className="bg-gradient-to-r from-red-500 to-pink-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search
          </CardTitle>
          <CardDescription className="text-red-100">
            Find textbooks and learning resources instantly
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Search your content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                <span className="ml-2 hidden sm:inline">Search</span>
              </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="document">Documents</TabsTrigger>
                <TabsTrigger value="chat">Chats</TabsTrigger>
                <TabsTrigger value="quiz">Quizzes</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                <SearchResults results={searchQuery ? results : mockResults} isSearching={isSearching} />
              </TabsContent>
              <TabsContent value="document" className="mt-4">
                <SearchResults
                  results={searchQuery ? results.filter((r) => r.type === "document") : mockResults.filter((r) => r.type === "document")}
                  isSearching={isSearching}
                />
              </TabsContent>
              <TabsContent value="chat" className="mt-4">
                <SearchResults
                  results={searchQuery ? results.filter((r) => r.type === "chat") : mockResults.filter((r) => r.type === "chat")}
                  isSearching={isSearching}
                />
              </TabsContent>
              <TabsContent value="quiz" className="mt-4">
                <SearchResults
                  results={searchQuery ? results.filter((r) => r.type === "quiz") : mockResults.filter((r) => r.type === "quiz")}
                  isSearching={isSearching}
                />
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SearchResults({
  results,
  isSearching,
}: {
  results: SearchResult[]
  isSearching: boolean
}) {
  if (isSearching) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">Searching...</p>
        </div>
      </div>
    )
  }

  if (results.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="text-center">
          <Search className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">No results found. Try a different search term.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {results.map((result) => (
        <div
          key={result.id}
          className="flex flex-col md:flex-row cursor-pointer items-start md:items-center space-y-4 md:space-y-0 md:space-x-6 rounded-lg border p-4 transition-colors hover:bg-muted/50"
        >
          {result.image && (
            <img
              src={result.image}
              alt="cover"
              className="w-32 h-44 object-cover rounded-lg shadow-md"
            />
          )}
          <div className="flex-1 space-y-2">
            <div className="flex items-center space-x-2">
              {result.icon}
              <h3 className="font-medium text-lg">{result.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{result.excerpt}</p>
            {result.author && (
              <p className="text-sm">
                <span className="font-semibold">Author:</span> {result.author}
              </p>
            )}
            {result.bookName && (
              <p className="text-sm">
                <span className="font-semibold">Book:</span> {result.bookName}
              </p>
            )}
            {result.details && <p className="text-sm text-muted-foreground">{result.details}</p>}
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{result.date}</span>
              {result.downloadLink && (
                <a
                  href={result.downloadLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 px-3 py-1 rounded-md"
                >
                  Download
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
