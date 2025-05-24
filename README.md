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
| ![](https://github.com/jayanth217/Edumind/blob/main/output_images/login.png) | ![](https://github.com/jayanth217/Edumind/blob/main/output_images/register.png) | ![](https://github.com/jayanth217/Edumind/blob/main/output_images/dashboard.png) |

| AI Chat | Quiz | Results |
|:------:|:----:|:------:|
| ![](https://github.com/jayanth217/Edumind/blob/main/output_images/screenshot1.png) | ![](https://github.com/jayanth217/Edumind/blob/main/output_images/screenshot1.png)<br>![](https://github.com/jayanth217/Edumind/blob/main/output_images/screenshot1.png) | ![](https://github.com/jayanth217/Edumind/blob/main/output_images/screenshot1.png) |

| Summary | Search PDFs |
|:-------:|:-----------:|
| ![](https://github.com/jayanth217/Edumind/blob/main/output_images/screenshot1.png) | ![](https://github.com/jayanth217/Edumind/blob/main/output_images/screenshot1.png) |


## ✅ Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v20.17.0 or higher)
- [Python](https://www.python.org/) (v3.8 or higher)
- [Git](https://git-scm.com/)
- [Ollama](https://ollama.ai) (for running the `mistral:7b` LLM)

To pull the AI model:

```bash
ollama pull mistral:7b
