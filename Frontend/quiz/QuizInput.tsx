"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileUp, FileText, Loader2, Brain, AlertCircle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

type QuestionType = "multiple-choice" | "true-false" | "fill-in-the-blank";
type DifficultyLevel = "easy" | "medium" | "hard";

interface QuizQuestion {
  type: "mcq" | "true_false" | "fill_in_the_blank";
  question: string;
  options?: string[];
  correct_answer: string;
}

interface QuizInputProps {
  onGenerate: (questions: QuizQuestion[]) => void;
}

export default function QuizInput({ onGenerate }: QuizInputProps) {
  const [material, setMaterial] = useState<string>("");
  const [numQuestions, setNumQuestions] = useState<string>("");
  const [questionType, setQuestionType] = useState<QuestionType>("multiple-choice");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("text");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setFileName(selectedFile.name);
    const formData = new FormData();
    formData.append("file", selectedFile);

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:5000/extract_text", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to extract text");
      }
      const data: { text: string } = await response.json();
      setMaterial(data.text);
      setActiveTab("text"); // switch to text tab to show extracted content
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!material.trim()) {
      setError("Please provide study material or upload a file.");
      return;
    }

    const numQuestionsInt = Number.parseInt(numQuestions);
    if (isNaN(numQuestionsInt) || numQuestionsInt < 1) {
      setError("Please enter a valid number of questions (at least 1).");
      return;
    }

    setIsLoading(true);
    setError(null);

    const generateQuizAttempt = async (): Promise<QuizQuestion[]> => {
      const response = await fetch("http://localhost:5000/generate_quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: material,
          question_type: questionType,
          difficulty: difficulty,
          num_questions: numQuestionsInt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate quiz");
      }

      const data: { quiz_id: string; questions: QuizQuestion[] } = await response.json();
      return data.questions.map((q: QuizQuestion) => ({ ...q, answer: q.correct_answer }));
    };

    try {
      let generatedQuestions = await generateQuizAttempt();
      let attempts = 0;
      const maxAttempts = 3;

      while (generatedQuestions.length < numQuestionsInt && attempts < maxAttempts) {
        generatedQuestions = await generateQuizAttempt();
        attempts++;
      }

      if (generatedQuestions.length < numQuestionsInt) {
        setError(`Could only generate ${generatedQuestions.length} questions.`);
        setIsLoading(false);
        return;
      }

      onGenerate(generatedQuestions);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container py-8">
      <Card className="mx-auto max-w-4xl">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Quiz Generator
          </CardTitle>
          <CardDescription className="text-purple-100">
            Create custom quizzes from your notes or documents
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="text">Enter Text</TabsTrigger>
              <TabsTrigger value="file">Upload File</TabsTrigger>
            </TabsList>
            <TabsContent value="text" className="mt-4">
              <div className="space-y-4">
                <Label htmlFor="study-material">Study Material</Label>
                <Textarea
                  id="study-material"
                  placeholder="Paste your study material here..."
                  className="min-h-[200px]"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </TabsContent>
            <TabsContent value="file" className="mt-4">
              <div className="space-y-4">
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
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quiz-type" className="text-sm font-semibold">Quiz Type</Label>
              <Select
                value={questionType}
                onValueChange={(value: QuestionType) => setQuestionType(value)}
                disabled={isLoading}
              >
                <SelectTrigger className="border-purple-200 focus:ring-purple-500">
                  <SelectValue placeholder="Select quiz type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                  <SelectItem value="true-false">True/False</SelectItem>
                  <SelectItem value="fill-in-the-blank">Fill in the Blank</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="difficulty" className="text-sm font-semibold">Difficulty</Label>
              <Select
                value={difficulty}
                onValueChange={(value: DifficultyLevel) => setDifficulty(value)}
                disabled={isLoading}
              >
                <SelectTrigger className="border-purple-200 focus:ring-purple-500">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="num-questions" className="text-sm font-semibold">Number of Questions</Label>
              <Input
                id="num-questions"
                type="number"
                value={numQuestions}
                onChange={(e) => setNumQuestions(e.target.value)}
                placeholder="e.g., 10"
                min="1"
                className="border-purple-200 focus:ring-purple-500"
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="border-t bg-muted/50 px-6 py-4">
          <Button
            onClick={handleGenerateQuiz}
            disabled={isLoading || !material.trim() || !numQuestions}
            className="ml-auto bg-gradient-to-r from-purple-600 to-pink-600 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Generate Quiz
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
