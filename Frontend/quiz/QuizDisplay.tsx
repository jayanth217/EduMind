"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";

interface QuizQuestion {
  type: "mcq" | "true_false" | "fill_in_the_blank";
  question: string;
  options?: string[];
  correct_answer: string;
}

interface QuizDisplayProps {
  questions: QuizQuestion[];
  onBack: () => void;
}

export default function QuizDisplay({ questions, onBack }: QuizDisplayProps) {
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
  const [showResults, setShowResults] = useState<boolean>(false);

  const handleAnswerChange = (index: number, answer: string) => {
    setUserAnswers((prev) => ({ ...prev, [index]: answer }));
  };

  const handleSubmit = () => {
    setShowResults(true);
  };

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

  if (!showResults) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <header
          className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex items-center cursor-pointer"
          onClick={onBack}
        >
          <ArrowLeft className="h-6 w-6 mr-2 text-white" />
          <h1 className="text-xl font-bold text-white">Your Quiz</h1>
        </header>
        <main className="flex-1 p-6">
          <div className="space-y-6">
            {questions.map((question, index) => (
              <div key={index} className="space-y-4 bg-white p-4 rounded-lg shadow">
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
                        <RadioGroupItem
                          value={option}
                          id={`q${index}-opt${optIndex}`}
                          className="text-purple-600 border-purple-600"
                        />
                        <Label
                          htmlFor={`q${index}-opt${optIndex}`}
                          className="flex-1 cursor-pointer rounded-md border border-purple-200 p-2 hover:bg-purple-50 transition-colors"
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
                      <RadioGroupItem
                        value="True"
                        id={`q${index}-true`}
                        className="text-purple-600 border-purple-600"
                      />
                      <Label
                        htmlFor={`q${index}-true`}
                        className="flex-1 cursor-pointer rounded-md border border-purple-200 p-2 hover:bg-purple-50 transition-colors"
                      >
                        True
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem
                        value="False"
                        id={`q${index}-false`}
                        className="text-purple-600 border-purple-600"
                      />
                      <Label
                        htmlFor={`q${index}-false`}
                        className="flex-1 cursor-pointer rounded-md border border-purple-200 p-2 hover:bg-purple-50 transition-colors"
                      >
                        False
                      </Label>
                    </div>
                  </RadioGroup>
                ) : (
                  <Input
                    value={userAnswers[index] || ""}
                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                    placeholder="Type your answer here..."
                    className="border-purple-200 focus:ring-purple-500 focus:border-purple-500"
                  />
                )}
              </div>
            ))}
            <Button
              onClick={handleSubmit}
              disabled={Object.keys(userAnswers).length < questions.length}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-2"
            >
              Submit Quiz
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const { score, total, percentage } = calculateScore();
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header
        className="bg-gradient-to-r from-purple-600 to-pink-600 p-4 flex items-center cursor-pointer"
        onClick={onBack}
      >
        <ArrowLeft className="h-6 w-6 mr-2 text-white" />
        <h1 className="text-xl font-bold text-white">Quiz Results</h1>
      </header>
      <main className="flex-1 p-6">
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-5xl font-bold text-green-500 mb-4">{score}</h2>
            <p className="text-xl text-purple-800">
              Correct Answers out of {total} ({percentage}%)
            </p>
            <Progress
              value={percentage}
              className="mt-4 h-3 bg-purple-200"
            />
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-purple-700">Question Review:</h3>
            {questions.map((question, index) => (
              <div key={index} className="rounded-lg border border-purple-200 p-4 bg-purple-50/50">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="font-medium text-purple-800">
                      {index + 1}. {question.question}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium text-purple-700">Your answer:</span>{" "}
                      {userAnswers[index] || "Not answered"}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium text-purple-700">Correct answer:</span>{" "}
                      {question.correct_answer}
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
      </main>
    </div>
  );
}
