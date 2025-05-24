# 📚 EduMind – AI-Powered Interactive Study Companion

**EduMind** is an AI-powered educational platform that helps students automatically generate quizzes, summarize study content, and interact with an AI tutor. It supports document uploads (PDF/Word) or pasted text and provides instant quiz feedback and summaries.

---

## ✨ Features

- 📄 **Quiz Generator**  
  Upload study material in PDF, Word, or plain text format to generate:
  - Multiple Choice Questions (MCQs)
  - True/False Questions
  - Fill-in-the-Blank Questions

- 💬 **AI Chat**  
  Ask questions or clarify doubts through a chat powered by `mistral:7b` via `langchain_ollama`.

- 📝 **Summarization**  
  Get clear and concise summaries (1–2 paragraphs) from documents.

- 🔍 **Search PDFs**  
  Access uploaded PDFs, search, and download them locally for offline use.

---

## 🖼️ Screenshots


| Login | Register | Dashboard |
|:-----:|:--------:|:---------:|
| ![](https://github.com/jayanth217/EduMind/blob/main/output_images/login.jpg) | ![](https://github.com/jayanth217/EduMind/blob/main/output_images/register.jpg) | ![](https://github.com/jayanth217/EduMind/blob/main/output_images/Dashboard.jpg) |

| AI Chat | Quiz | Results |
|:------:|:----:|:------:|
| ![](https://github.com/jayanth217/Edumind/blob/main/output_images/AI_chat.png) | ![](https://github.com/jayanth217/Edumind/blob/main/output_images/Quiz_generator.png)<br>![](https://github.com/jayanth217/Edumind/blob/main/output_images/quiz_questions.png) | ![](https://github.com/jayanth217/Edumind/blob/main/output_images/quiz_result.png) |

| Summary | Search PDFs |
|:-------:|:-----------:|
| ![](https://github.com/jayanth217/Edumind/blob/main/output_images/summarization.png) | ![](https://github.com/jayanth217/Edumind/blob/main/output_images/search_materials.png) |


## ✅ Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v20.17.0 or higher)
- [Python](https://www.python.org/) (v3.8 or higher)
- [Git](https://git-scm.com/)
- [Ollama](https://ollama.ai) (for running the `mistral:7b` LLM)

To pull the AI model:

```bash
ollama pull mistral:7b
```
---
🚀 Getting Started

Step 1: Clone the Repository
```bash
git clone https://github.com/jayanth217/EduMind.git
cd EduMind
```
Step 2: Backend Setup
```bash
cd Backend

# Install dependencies
pip install flask langchain_ollama PyPDF2 python-docx flask_cors

# Start Flask server
python grok.py
```
>Server runs on: http://0.0.0.0:5000

Step 3: Frontend Setup
```bash
cd ../Frontend

# Install frontend dependencies
npm install

# Start development server
npm run dev
```
>Frontend runs on: http://localhost:3003


---

## 🧪 Usage Guide

### 📥 Generate a Quiz

- Navigate to: [http://localhost:3003/quiz/display](http://localhost:3003/quiz/display)
- Upload a study document or paste content
- Select the number of questions and question type
- Click **Generate Quiz**

### ✅ Take the Quiz

- After generation, you'll be redirected automatically
- Submit your answers
- Instantly view your score and feedback

### 🤖 Chat with AI

- Visit the **AI Chat** section
- Pose study-related questions to the `mistral:7b` LLM

### 📚 Summarization

- Upload your PDFs or Word documents
- Receive concise summaries in 1–2 paragraphs

### 🔍 Search PDFs

- Browse uploaded files
- Download any document for local use

>Download any document for local use


---


## 👨‍💻 Developed By

- **Jayanth**  
  GitHub: [@jayanth217](https://github.com/jayanth217)

- **Pranavsai**  
  GitHub: [@Pranavsai1410](https://github.com/Pranavsai1410)

---

## 📄 License

This project is licensed under the **MIT License**.  
You are free to use, modify, and distribute it.
