"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Brain, FileUp, Loader2, CheckCircle, XCircle, MessageSquare, ArrowLeft } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface QuizQuestion {
  type: "mcq" | "true_false" | "fill_in_the_blank";
  question: string;
  options?: string[];
  correct_answer: string;
}

type QuestionType = "multiple-choice" | "true-false" | "fill-in-the-blank";
type DifficultyLevel = "easy" | "medium" | "hard";

export default function QuizApp() {
  const router = useRouter();

  // State for quiz generation
  const [material, setMaterial] = useState<string>("");
  const [numQuestions, setNumQuestions] = useState<string>(""); // Empty by default, any number allowed
  const [questionType, setQuestionType] = useState<QuestionType>("multiple-choice");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isLoadingQuiz, setIsLoadingQuiz] = useState<boolean>(false);
  const [quizError, setQuizError] = useState<string | null>(null);

  // State for quiz display and results
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({}); // Store answers by question index
  const [showResults, setShowResults] = useState<boolean>(false);

  // Handle file upload and text extraction
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setFileName(selectedFile.name);
    const formData = new FormData();
    formData.append("file", selectedFile);

    setIsLoadingQuiz(true);
    setQuizError(null);
    try {
      const response = await fetch("http://localhost:5000/extract_text", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to extract text");
      }
      const data: { text: string; error?: string } = await response.json();
      setMaterial(data.text);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error in handleFileUpload:", errorMsg);
      setQuizError(errorMsg);
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  // Handle quiz generation with exact number enforcement
  const handleGenerateQuiz = async () => {
    if (!material.trim()) {
      setQuizError("Please provide study material or upload a file.");
      return;
    }

    const numQuestionsInt = Number.parseInt(numQuestions);
    if (isNaN(numQuestionsInt) || numQuestionsInt < 1) {
      setQuizError("Please enter a valid number of questions (at least 1).");
      return;
    }

    setIsLoadingQuiz(true);
    setQuizError(null);

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
      return data.questions.map(q => ({ ...q, answer: q.correct_answer }));
    };

    try {
      let generatedQuestions = await generateQuizAttempt();
      let attempts = 0;
      const maxAttempts = 3;

      // Retry if fewer questions than requested (backend issue workaround)
      while (generatedQuestions.length < numQuestionsInt && attempts < maxAttempts) {
        console.warn(`Generated ${generatedQuestions.length} questions, expected ${numQuestionsInt}. Retrying...`);
        generatedQuestions = await generateQuizAttempt();
        attempts++;
      }

      if (generatedQuestions.length < numQuestionsInt) {
        setQuizError(`Could only generate ${generatedQuestions.length} questions instead of ${numQuestionsInt}. Please try again or adjust your input.`);
      }

      setQuestions(generatedQuestions);
      setUserAnswers({});
      setShowResults(false);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error in handleGenerateQuiz:", errorMsg);
      setQuizError(errorMsg);
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  // Handle answer input
  const handleAnswerChange = (index: number, answer: string) => {
    setUserAnswers(prev => ({ ...prev, [index]: answer }));
  };

  // Handle quiz submission
  const handleSubmit = () => {
    setShowResults(true);
  };

  // Handle back to input
  const handleBackToInput = () => {
    setQuestions([]);
    setUserAnswers({});
    setShowResults(false);
    setQuizError(null);
  };

  // Calculate score
  const calculateScore = () => {
    let correctAnswers = 0;
    questions.forEach((question, index) => {
      if (userAnswers[index]?.toLowerCase() === question.correct_answer.toLowerCase()) {
        correctAnswers++;
      }
    });
    return {
      score: correctAnswers,
      total: questions.length,
      percentage: Math.round((correctAnswers / questions.length) * 100),
    };
  };

  // Quiz input page
  if (questions.length === 0 && !showResults) {
    return (
      <div className="container py-8">
        <Card className="mx-auto max-w-4xl shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-6 w-6" />
              Quiz Generator
            </CardTitle>
            <CardDescription className="text-purple-100">Create your custom quiz!</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="study-material" className="text-lg font-semibold">Study Material</Label>
                <Textarea
                  id="study-material"
                  placeholder="Paste your study material here or upload a file below..."
                  className="min-h-[200px] border-purple-200 focus:ring-purple-500"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  disabled={isLoadingQuiz}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file-upload" className="text-lg font-semibold">Upload File</Label>
                <div className="grid w-full items-center gap-1.5">
                  <Label
                    htmlFor="file-upload"
                    className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-purple-300 bg-purple-50/50 px-4 py-5 text-center hover:border-purple-500 transition-colors"
                  >
                    <FileUp className="mb-2 h-8 w-8 text-purple-500" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-purple-700">{fileName || "Upload a file"}</p>
                      <p className="text-xs text-muted-foreground">Drag and drop or click (.docx, .pdf)</p>
                    </div>
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".docx,.pdf"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isLoadingQuiz}
                    />
                  </Label>
                </div>
                {fileName && <p className="text-sm text-purple-600">Selected: {fileName}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quiz-type" className="text-lg font-semibold">Quiz Type</Label>
                  <Select value={questionType} onValueChange={(value: QuestionType) => setQuestionType(value)} disabled={isLoadingQuiz}>
                    <SelectTrigger id="quiz-type" className="border-purple-200 focus:ring-purple-500">
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
                  <Label htmlFor="difficulty" className="text-lg font-semibold">Difficulty</Label>
                  <Select value={difficulty} onValueChange={(value: DifficultyLevel) => setDifficulty(value)} disabled={isLoadingQuiz}>
                    <SelectTrigger id="difficulty" className="border-purple-200 focus:ring-purple-500">
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
                  <Label htmlFor="num-questions" className="text-lg font-semibold">Number of Questions</Label>
                  <Input
                    id="num-questions"
                    type="number"
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(e.target.value)}
                    min="1"
                    placeholder="Enter any number (e.g., 15)"
                    className="border-purple-200 focus:ring-purple-500"
                    disabled={isLoadingQuiz}
                  />
                </div>
              </div>

              {quizError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{quizError}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/50 px-6 py-4 flex justify-between">
            <Button
              variant="outline"
              onClick={() => router.push("/chat")}
              className="border-purple-300 hover:bg-purple-50"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Go to Chat
            </Button>
            <Button
              onClick={handleGenerateQuiz}
              disabled={isLoadingQuiz || !material.trim() || !numQuestions}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {isLoadingQuiz ? (
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

  // All questions display
  if (questions.length > 0 && !showResults) {
    return (
      <div className="container py-8">
        <Card className="mx-auto max-w-4xl shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-6 w-6" />
              Your Quiz
            </CardTitle>
            <CardDescription className="text-purple-100">Answer all questions below</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-8">
              {questions.map((question, index) => (
                <div key={index} className="space-y-4">
                  <h3 className="text-lg font-semibold text-purple-800">
                    {index + 1}. {question.question}
                  </h3>
                  {question.type === "mcq" && question.options ? (
                    <RadioGroup
                      value={userAnswers[index] || ""}
                      onValueChange={(value) => handleAnswerChange(index, value)}
                      className="space-y-2"
                    >
                      {question.options.map((option, optIndex) => (
                        <div key={optIndex} className="flex items-center space-x-2">
                          <RadioGroupItem value={option} id={`q${index}-opt${optIndex}`} />
                          <Label
                            htmlFor={`q${index}-opt${optIndex}`}
                            className="flex-1 cursor-pointer rounded-md border border-purple-200 p-3 hover:bg-purple-50 transition-colors"
                          >
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : question.type === "true_false" ? (
                    <RadioGroup
                      value={userAnswers[index] || ""}
                      onValueChange={(value) => handleAnswerChange(index, value)}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="True" id={`q${index}-true`} />
                        <Label htmlFor={`q${index}-true`} className="flex-1 cursor-pointer rounded-md border border-purple-200 p-3 hover:bg-purple-50 transition-colors">
                          True
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="False" id={`q${index}-false`} />
                        <Label htmlFor={`q${index}-false`} className="flex-1 cursor-pointer rounded-md border border-purple-200 p-3 hover:bg-purple-50 transition-colors">
                          False
                        </Label>
                      </div>
                    </RadioGroup>
                  ) : (
                    <Input
                      value={userAnswers[index] || ""}
                      onChange={(e) => handleAnswerChange(index, e.target.value)}
                      placeholder="Type your answer here..."
                      className="border-purple-200 focus:ring-purple-500"
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/50 px-6 py-4 flex justify-between">
            <Button
              variant="outline"
              onClick={handleBackToInput}
              className="border-purple-300 hover:bg-purple-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Input
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={Object.keys(userAnswers).length < questions.length}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              Submit Quiz
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Results display
  if (showResults) {
    const { score, total, percentage } = calculateScore();

    return (
      <div className="container py-8">
        <Card className="mx-auto max-w-4xl shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Brain className="h-6 w-6" />
              Quiz Results
            </CardTitle>
            <CardDescription className="text-purple-100">Here’s how you did!</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-purple-800">
                  Your Score: {score}/{total} ({percentage}%)
                </h2>
                <Progress value={percentage} className="mt-2 h-3 bg-purple-200" />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-purple-700">Question Review:</h3>
                {questions.map((question, index) => (
                  <div key={index} className="rounded-lg border border-purple-200 p-4 bg-purple-50/50">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium text-purple-800">{index + 1}. {question.question}</p>
                        <p className="text-sm">
                          <span className="font-medium text-purple-700">Your answer:</span> {userAnswers[index] || "Not answered"}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium text-purple-700">Correct answer:</span> {question.correct_answer}
                        </p>
                      </div>
                      <div>
                        {userAnswers[index]?.toLowerCase() === question.correct_answer.toLowerCase() ? (
                          <CheckCircle className="h-6 w-6 text-green-500" />
                        ) : (
                          <XCircle className="h-6 w-6 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/50 px-6 py-4 flex justify-between">
            <Button
              variant="outline"
              onClick={handleBackToInput}
              className="border-purple-300 hover:bg-purple-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Input
            </Button>
            <Button
              onClick={() => router.push("/chat")}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Go to Chat
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return null; // Fallback, should not occur
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Brain, FileUp, Loader2, CheckCircle, XCircle, ArrowLeft, ArrowRight, Home } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

// Define interfaces for quiz data
interface QuizQuestion {
  type: "mcq" | "true_false" | "fill_in_the_blank";
  question: string;
  options?: string[];
  correct_answer: string; // Changed from 'answer' to match backend
}

interface QuizResult {
  question: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
}

type QuestionType = "multiple-choice" | "true-false" | "fill-in-the-blank";
type DifficultyLevel = "easy" | "medium" | "hard";

export default function QuizApp() {
  const router = useRouter();

  // State for quiz generation
  const [material, setMaterial] = useState<string>("");
  const [numQuestions, setNumQuestions] = useState<string>("5");
  const [questionType, setQuestionType] = useState<QuestionType>("multiple-choice");
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // State for quiz display and results
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [showResults, setShowResults] = useState<boolean>(false);

  // Handle file upload and text extraction
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setFileName(selectedFile.name);
    const formData = new FormData();
    formData.append("file", selectedFile);

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch("http://localhost:5000/extract_text", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to extract text");
      }
      const data: { text: string; error?: string } = await response.json();
      setMaterial(data.text);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error in handleFileUpload:", errorMsg);
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle quiz generation
  const handleGenerateQuiz = async () => {
    if (!material.trim()) {
      setErrorMessage("Please provide study material or upload a file.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch("http://localhost:5000/generate_quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: material, // Changed from 'material' to 'text' to match backend
          question_type: questionType,
          difficulty: difficulty,
          num_questions: Number.parseInt(numQuestions),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate quiz");
      }

      const data: { quiz_id: string; questions: QuizQuestion[] } = await response.json();
      setQuestions(data.questions.map(q => ({ ...q, answer: q.correct_answer }))); // Map 'correct_answer' to 'answer' for display
      setUserAnswers(new Array(data.questions.length).fill(""));
      setCurrentQuestionIndex(0);
      setSelectedAnswer("");
      setShowResults(false);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error("Error in handleGenerateQuiz:", errorMsg);
      setErrorMessage(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle answer selection
  const handleAnswerSelect = (answer: string) => {
    setSelectedAnswer(answer);
    const updatedAnswers = [...userAnswers];
    updatedAnswers[currentQuestionIndex] = answer;
    setUserAnswers(updatedAnswers);
  };

  // Handle navigation
  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedAnswer(userAnswers[currentQuestionIndex + 1] || "");
    } else {
      setShowResults(true);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setSelectedAnswer(userAnswers[currentQuestionIndex - 1] || "");
    }
  };

  // Handle submission
  const handleSubmit = () => {
    setShowResults(true);
  };

  // Handle reset/retry
  const handleReset = () => {
    setMaterial("");
    setNumQuestions("5");
    setQuestionType("multiple-choice");
    setDifficulty("medium");
    setFile(null);
    setFileName("");
    setQuestions([]);
    setUserAnswers([]);
    setCurrentQuestionIndex(0);
    setSelectedAnswer("");
    setShowResults(false);
    setErrorMessage(null);
  };

  // Calculate score
  const calculateScore = () => {
    let correctAnswers = 0;
    questions.forEach((question, index) => {
      if (userAnswers[index]?.toLowerCase() === question.correct_answer.toLowerCase()) {
        correctAnswers++;
      }
    });
    return {
      score: correctAnswers,
      total: questions.length,
      percentage: Math.round((correctAnswers / questions.length) * 100),
    };
  };

  // Render quiz generation form
  if (questions.length === 0 && !showResults) {
    return (
      <div className="container py-8">
        <Card className="mx-auto max-w-4xl shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-6 w-6" />
              Quiz Generator
            </CardTitle>
            <CardDescription className="text-purple-100">Create a custom quiz with a sleek twist!</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="study-material" className="text-lg font-semibold">Study Material</Label>
                <Textarea
                  id="study-material"
                  placeholder="Paste your study material here or upload a file below..."
                  className="min-h-[200px] border-purple-200 focus:ring-purple-500"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file-upload" className="text-lg font-semibold">Upload File</Label>
                <div className="grid w-full items-center gap-1.5">
                  <Label
                    htmlFor="file-upload"
                    className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-purple-300 bg-purple-50/50 px-4 py-5 text-center hover:border-purple-500 transition-colors"
                  >
                    <FileUp className="mb-2 h-8 w-8 text-purple-500" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-purple-700">{fileName || "Upload a file"}</p>
                      <p className="text-xs text-muted-foreground">Drag and drop or click (.docx, .pdf)</p>
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
                {fileName && <p className="text-sm text-purple-600">Selected: {fileName}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quiz-type" className="text-lg font-semibold">Quiz Type</Label>
                  <Select value={questionType} onValueChange={(value: QuestionType) => setQuestionType(value)} disabled={isLoading}>
                    <SelectTrigger id="quiz-type" className="border-purple-200 focus:ring-purple-500">
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
                  <Label htmlFor="difficulty" className="text-lg font-semibold">Difficulty</Label>
                  <Select value={difficulty} onValueChange={(value: DifficultyLevel) => setDifficulty(value)} disabled={isLoading}>
                    <SelectTrigger id="difficulty" className="border-purple-200 focus:ring-purple-500">
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
                  <Label htmlFor="num-questions" className="text-lg font-semibold">Number of Questions</Label>
                  <Select value={numQuestions} onValueChange={setNumQuestions} disabled={isLoading}>
                    <SelectTrigger id="num-questions" className="border-purple-200 focus:ring-purple-500">
                      <SelectValue placeholder="Select number" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="15">15</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {errorMessage && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/50 px-6 py-4">
            <Button
              onClick={handleGenerateQuiz}
              disabled={isLoading || !material.trim()}
              className="ml-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
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

  // Render quiz display
  if (questions.length > 0 && !showResults) {
    const currentQuestion = questions[currentQuestionIndex];

    return (
      <div className="container py-8">
        <Card className="mx-auto max-w-4xl shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Quiz Time!
              </CardTitle>
              <div className="text-sm">
                Question {currentQuestionIndex + 1} of {questions.length}
              </div>
            </div>
            <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="mt-2 h-2 bg-purple-800" />
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-purple-800">{currentQuestion.question}</h2>

              <div className="space-y-4">
                {currentQuestion.type === "mcq" && currentQuestion.options ? (
                  <RadioGroup value={selectedAnswer} onValueChange={handleAnswerSelect} disabled={isLoading}>
                    {currentQuestion.options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`option-${index}`} />
                        <Label
                          htmlFor={`option-${index}`}
                          className="flex-1 cursor-pointer rounded-md border border-purple-200 p-3 hover:bg-purple-50 transition-colors"
                        >
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : currentQuestion.type === "true_false" ? (
                  <RadioGroup value={selectedAnswer} onValueChange={handleAnswerSelect} disabled={isLoading}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="True" id="true" />
                      <Label htmlFor="true" className="flex-1 cursor-pointer rounded-md border border-purple-200 p-3 hover:bg-purple-50 transition-colors">
                        True
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="False" id="false" />
                      <Label htmlFor="false" className="flex-1 cursor-pointer rounded-md border border-purple-200 p-3 hover:bg-purple-50 transition-colors">
                        False
                      </Label>
                    </div>
                  </RadioGroup>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="answer" className="text-lg font-semibold">Your Answer</Label>
                    <Input
                      id="answer"
                      value={selectedAnswer}
                      onChange={(e) => handleAnswerSelect(e.target.value)}
                      placeholder="Type your answer here..."
                      className="border-purple-200 focus:ring-purple-500"
                      disabled={isLoading}
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/50 px-6 py-4 flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0 || isLoading}
              className="border-purple-300 hover:bg-purple-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            {currentQuestionIndex === questions.length - 1 ? (
              <Button
                onClick={handleSubmit}
                disabled={!selectedAnswer || isLoading}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                Submit Quiz
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={!selectedAnswer || isLoading}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Render results
  if (showResults) {
    const { score, total, percentage } = calculateScore();

    return (
      <div className="container py-8">
        <Card className="mx-auto max-w-4xl shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Brain className="h-6 w-6" />
              Quiz Results
            </CardTitle>
            <CardDescription className="text-purple-100">Check out how you did!</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-purple-800">
                  Your Score: {score}/{total} ({percentage}%)
                </h2>
                <Progress value={percentage} className="mt-2 h-3 bg-purple-200" />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-purple-700">Question Review:</h3>
                {questions.map((question, index) => (
                  <div key={index} className="rounded-lg border border-purple-200 p-4 bg-purple-50/50">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium text-purple-800">Question {index + 1}:</p>
                        <p>{question.question}</p>
                        <div className="mt-2">
                          <p className="text-sm">
                            <span className="font-medium text-purple-700">Your answer:</span> {userAnswers[index] || "Not answered"}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium text-purple-700">Correct answer:</span> {question.correct_answer}
                          </p>
                        </div>
                      </div>
                      <div>
                        {userAnswers[index]?.toLowerCase() === question.correct_answer.toLowerCase() ? (
                          <CheckCircle className="h-6 w-6 text-green-500" />
                        ) : (
                          <XCircle className="h-6 w-6 text-red-500" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/50 px-6 py-4 flex justify-between">
            <Button variant="outline" onClick={() => router.push("/")} className="border-purple-300 hover:bg-purple-50">
              <Home className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
            <div className="space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentQuestionIndex(0);
                  setSelectedAnswer("");
                  setUserAnswers(new Array(questions.length).fill(""));
                  setShowResults(false);
                }}
                className="border-purple-300 hover:bg-purple-50"
              >
                Try Again
              </Button>
              <Button
                onClick={handleReset}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                New Quiz
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Fallback for initial load or error
  return (
    <div className="container flex h-[80vh] items-center justify-center">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-purple-700">
            <Brain className="h-6 w-6" />
            Quiz App
          </CardTitle>
          <CardDescription>Get ready to test your knowledge!</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
