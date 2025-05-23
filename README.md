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
| ![](https://github.com/Pranavsai1410/EduMind/blob/main/assests/Screenshot%202025-04-25%20121731.png) | ![](https://github.com/Pranavsai1410/EduMind/blob/main/assests/Screenshot%202025-04-25%20121843.png) | ![](https://github.com/Pranavsai1410/EduMind/blob/main/assests/Screenshot%202025-04-25%20121925.png) |

| AI Chat | Quiz | Results |
|:------:|:----:|:------:|
| ![](https://github.com/Pranavsai1410/EduMind/blob/main/assests/Screenshot%202025-04-25%20122011.png) | ![](https://github.com/Pranavsai1410/EduMind/blob/main/assests/Screenshot%202025-04-25%20122053.png)<br>![](https://github.com/Pranavsai1410/EduMind/blob/main/assests/Screenshot%202025-04-25%20122120.png) | ![](https://github.com/Pranavsai1410/EduMind/blob/main/assests/Screenshot%202025-04-25%20140251.png) |

| Summary | Search PDFs |
|:-------:|:-----------:|
| ![](https://github.com/Pranavsai1410/EduMind/blob/main/assests/Screenshot%202025-04-25%20122217.png) | ![](https://github.com/Pranavsai1410/EduMind/blob/main/assests/Screenshot%202025-04-25%20122823.png) |

---

## ✅ Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v20.17.0 or higher)
- [Python](https://www.python.org/) (v3.8 or higher)
- [Git](https://git-scm.com/)
- [Ollama](https://ollama.ai) (for running the `mistral:7b` LLM)

To pull the AI model:

```bash
ollama pull mistral:7b
