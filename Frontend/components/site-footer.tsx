import { BookOpen } from "lucide-react"

export function SiteFooter() {
  return (
    <footer className="border-t py-6">
      <div className="container mx-auto flex justify-center">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} EduMind AI Learning Platform
          </p>
        </div>
      </div>
    </footer>
  )
}
