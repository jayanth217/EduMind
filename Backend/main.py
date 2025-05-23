from flask import Flask, request, jsonify
from langchain_ollama import ChatOllama
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
import logging
from bson.objectid import ObjectId
import os
from datetime import datetime
from flask_cors import CORS
import sys
import re
import json
from docx import Document
import PyPDF2
import time
import random
from difflib import SequenceMatcher
from datetime import datetime, timedelta
from flask_pymongo import PyMongo
from dotenv import load_dotenv
import bcrypt
import jwt

# Ensure UTF-8 encoding for stdout and stderr
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# Directory to save logs and quizzes
LOG_STORAGE_DIR = os.path.join(os.getcwd(), 'logs')
QUIZ_STORAGE_DIR = os.path.join(os.getcwd(), 'generated_quizzes')
for directory in [LOG_STORAGE_DIR, QUIZ_STORAGE_DIR]:
    if not os.path.exists(directory):
        os.makedirs(directory)

# Setup logging for chat and quiz activities
chat_logger = logging.getLogger('chat')
chat_logger.setLevel(logging.INFO)
chat_handler = logging.FileHandler(os.path.join(LOG_STORAGE_DIR, 'chat_logs.log'), encoding='utf-8')
chat_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
chat_logger.addHandler(chat_handler)
chat_logger.addHandler(logging.StreamHandler(sys.stdout))

quiz_logger = logging.getLogger('quiz')
quiz_logger.setLevel(logging.INFO)
quiz_handler = logging.FileHandler(os.path.join(LOG_STORAGE_DIR, 'quiz_logs.log'), encoding='utf-8')
quiz_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
quiz_logger.addHandler(quiz_handler)
quiz_logger.addHandler(logging.StreamHandler(sys.stdout))

chat_logger.info("Starting Flask app and initializing chat logger")
quiz_logger.info("Starting Flask app and initializing quiz logger")

# Initialize Flask app
app = Flask(_name_)

# Enable CORS for frontend
CORS(app, resources={r"/*": {"origins": ["http://localhost:3003", "http://localhost:3000"]}})

# Set maximum upload size to 50MB
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB limit

# Load environment variables
load_dotenv()
app.config["MONGO_URI"] = os.getenv("MONGO_URI")
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")

# Validate environment variables
if not app.config["MONGO_URI"]:
    quiz_logger.error("MONGO_URI is not set. Please check your .env file.")
    exit(1)
if not app.config["SECRET_KEY"]:
    quiz_logger.error("SECRET_KEY is not set. Please check your .env file.")
    exit(1)

# Initialize MongoDB
try:
    mongo = PyMongo(app)
    if mongo.db is None:
        quiz_logger.error("MongoDB initialization failed: mongo.db is None.")
        exit(1)
    with app.app_context():
        mongo.db.command('ping')
        quiz_logger.info("MongoDB connection established")
except Exception as e:
    quiz_logger.error(f"Failed to connect to MongoDB: {e}")
    exit(1)

# Global variables for pipelines
chat_pipeline = None
summarize_pipeline = None
mcq_pipeline = None
true_false_pipeline = None
fill_in_the_blank_pipeline = None

# Initialize the model (mistral:7b)
def initialise_model():
    global chat_pipeline, summarize_pipeline, mcq_pipeline, true_false_pipeline, fill_in_the_blank_pipeline
    try:
        # Chat prompt
        chat_prompt = PromptTemplate.from_template(
            "You are EduMind Chatbot, an AI assistant designed to help students learn and explore knowledge. "
            "Answer the following question in a clear and concise manner: {question}"
        )

        # Summarization prompt
        summarize_prompt = PromptTemplate.from_template(
            "You are EduMind Chatbot. Provide a detailed summary of the following text in exactly 2 paragraphs, totaling 300-400 words. "
            "Focus on the main ideas, key details, and overall context, omitting minor details. Use natural paragraph breaks and ensure the summary is comprehensive. "
            "Output only the summary with no additional text or explanations. Text to summarize: {text}"
        )

        # Updated MCQ Prompt to enforce strict single-answer format
        mcq_prompt = PromptTemplate.from_template(
            "Generate EXACTLY {num_questions} multiple-choice questions (MCQs) at {difficulty} difficulty level based on the following material: {material}. "
            "Each MCQ MUST have EXACTLY one correct answer among four distinct options labeled a), b), c), and d). "
            "You MUST generate ONLY multiple-choice questions with four options and a single correct answer. "
            "Do NOT generate True/False, Fill-in-the-Blank, or questions with multiple correct answers. "
            "The answer MUST be a single letter: a, b, c, or d, with no additional text or description. "
            "If you cannot generate exactly {num_questions} valid MCQs, output 'Error: Unable to generate exact number of valid MCQs' and stop. "
            "Each MCQ must be unique, cover different aspects of the material, and avoid repetition. "
            "Format each MCQ strictly as:\n"
            "<number>. <question>\n"
            "a) <option1>\n"
            "b) <option2>\n"
            "c) <option3>\n"
            "d) <option4>\n"
            "Answer: <a, b, c, or d>\n"
            "Return only the formatted questions, with no additional text or comments."
        )

        # True/False Prompt
        true_false_prompt = PromptTemplate.from_template(
            "Generate exactly {num_questions} True/False questions at {difficulty} difficulty level based on the following material: {material}. "
            "You MUST generate EXACTLY {num_questions} questions, numbered from 1 to {num_questions}, with no fewer and no more. "
            "ONLY generate True/False questions. Do NOT generate multiple-choice, fill-in-the-blank, or any other question types under any circumstances. "
            "Each question must be a statement with a True or False answer (e.g., 'Answer: True'). "
            "Ensure questions are diverse, cover different aspects of the material, and do not repeat or focus on the same topic excessively. "
            "If you cannot generate the exact number, output 'Error: Unable to generate exact number of questions' instead. "
            "Format each question as:\n"
            "<number>. <statement>\n"
            "Answer: <True or False>\n"
            "Return only the questions in the specified format, with no additional text."
        )

        # Fill-in-the-Blank Prompt
        fill_in_the_blank_prompt = PromptTemplate.from_template(
            "Generate exactly {num_questions} Fill-in-the-Blank questions at {difficulty} difficulty level based on the following material: {material}. "
            "You MUST generate EXACTLY {num_questions} questions, numbered from 1 to {num_questions}, with no fewer and no more. "
            "ONLY generate Fill-in-the-Blank questions. Do NOT generate multiple-choice, true/false, or any other question types under any circumstances. "
            "Each question must be a sentence with a blank (_) and an answer that fits the blank (e.g., 'Answer: word'). "
            "Ensure questions are diverse, cover different aspects of the material, and do not repeat or focus on the same topic excessively. "
            "If you cannot generate the exact number, output 'Error: Unable to generate exact number of questions' instead. "
            "Format each question as:\n"
            "<number>. <sentence with a blank> _____\n"
            "Answer: <correct word/phrase>\n"
            "Return only the questions in the specified format, with no additional text."
        )

        # Initialize the ChatOllama model with increased context
        model = ChatOllama(
            model="mistral:latest",
            base_url="http://127.0.0.1:11434",
            num_ctx=2048,
            temperature=0.7
        )
        output_parser = StrOutputParser()

        # Create pipelines
        chat_pipeline = chat_prompt | model | output_parser
        summarize_pipeline = summarize_prompt | model | output_parser
        mcq_pipeline = mcq_prompt | model | output_parser
        true_false_pipeline = true_false_prompt | model | output_parser
        fill_in_the_blank_pipeline = fill_in_the_blank_prompt | model | output_parser

        chat_logger.info("Successfully initialized ChatOllama model with mistral:7b")
        quiz_logger.info("Successfully initialized quiz and summarize pipelines with mistral:7b")
    except Exception as e:
        chat_logger.error(f"Failed to initialize mistral:7b: {str(e)}", exc_info=True)
        quiz_logger.error(f"Failed to initialize mistral:7b: {str(e)}", exc_info=True)
        chat_pipeline = None
        summarize_pipeline = None
        mcq_pipeline = None
        true_false_pipeline = None
        fill_in_the_blank_pipeline = None

# Initialize the model on startup
initialise_model()

# Function to check similarity between two strings
def similarity(a, b):
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

# Function to extract text from a Word document (.docx)
def extract_text_from_docx(file):
    try:
        doc = Document(file)
        text = [para.text for para in doc.paragraphs if para.text.strip()]
        return '\n'.join(text)
    except Exception as e:
        quiz_logger.error(f"Error extracting text from Word document: {e}")
        raise

# Function to extract text from a PDF file
def extract_text_from_pdf(file):
    try:
        start_time = time.time()
        reader = PyPDF2.PdfReader(file)
        num_pages = len(reader.pages)
        quiz_logger.info(f"Processing PDF with {num_pages} pages")

        max_pages = 50
        pages_to_process = min(num_pages, max_pages)
        if num_pages > max_pages:
            quiz_logger.warning(f"PDF has {num_pages} pages, but only processing the first {max_pages} pages")

        text = [reader.pages[i].extract_text() for i in range(pages_to_process) if reader.pages[i].extract_text().strip()]
        extracted_text = '\n'.join(text)
        processing_time = time.time() - start_time
        quiz_logger.info(f"Extracted text from {pages_to_process} pages in {processing_time:.2f} seconds")
        return extracted_text
    except Exception as e:
        quiz_logger.error(f"Error extracting text from PDF: {e}")
        raise

# Function to parse plain text into JSON for different question types
# Function to parse plain text into JSON for different question types
def parse_plain_text_to_json(response, num_questions, quiz_type, material, difficulty):
    try:
        questions = []
        lines = response.split('\n')
        current_question = None
        options = []
        correct_answer = None

        question_pattern = re.compile(r'^\d+\.\s*(.?)(?:\s_\s*)?$')
        option_pattern = re.compile(r'^\s*[a-d]\)\s*(.?)\s$')
        # Updated answer pattern to handle 'Answer: c)' or 'Answer: d)' format
        answer_pattern = re.compile(r'^Answer:\s*([a-d])\)?\s*$', re.IGNORECASE)

        if quiz_type == "mcq":
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                question_match = question_pattern.match(line)
                option_match = option_pattern.match(line)
                answer_match = answer_pattern.match(line)

                if question_match:
                    question_text = question_match.group(1)
                    if current_question and len(options) == 4 and correct_answer:
                        option_label = correct_answer.lower().strip()
                        if option_label not in ['a', 'b', 'c', 'd']:
                            quiz_logger.warning(f"Invalid answer label '{correct_answer}' for '{current_question}', skipping")
                            current_question = question_text
                            options = []
                            correct_answer = None
                            continue
                        option_index = ord(option_label) - ord('a')
                        correct_answer_text = options[option_index]
                        questions.append({
                            "type": "mcq",
                            "question": current_question,
                            "options": options[:4],
                            "correct_answer": correct_answer_text
                        })
                        quiz_logger.info(f"Parsed MCQ: '{current_question}', Answer: '{correct_answer_text}'")
                    current_question = question_text
                    options = []
                    correct_answer = None
                elif option_match and current_question:
                    options.append(option_match.group(1))
                elif answer_match and current_question:
                    correct_answer = answer_match.group(1).strip().lower()
                elif line.startswith('Answer:') and current_question:
                    quiz_logger.warning(f"Malformed answer format '{line}' for '{current_question}', skipping question")
                    current_question = None
                    options = []
                    correct_answer = None

            if current_question and len(options) == 4 and correct_answer:
                option_label = correct_answer.lower().strip()
                if option_label in ['a', 'b', 'c', 'd']:
                    option_index = ord(option_label) - ord('a')
                    correct_answer_text = options[option_index]
                    questions.append({
                        "type": "mcq",
                        "question": current_question,
                        "options": options[:4],
                        "correct_answer": correct_answer_text
                    })
                    quiz_logger.info(f"Parsed MCQ: '{current_question}', Answer: '{correct_answer_text}'")
                else:
                    quiz_logger.warning(f"Invalid answer label '{correct_answer}' for '{current_question}', skipping")

        elif quiz_type == "true_false":
            answer_pattern_tf = re.compile(r'^Answer:\s*(True|False)\s*$', re.IGNORECASE)
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                question_match = question_pattern.match(line)
                answer_match = answer_pattern_tf.match(line)
                if question_match:
                    question_text = question_match.group(1)
                    if current_question and correct_answer:
                        questions.append({
                            "type": "true_false",
                            "question": current_question,
                            "correct_answer": correct_answer
                        })
                        quiz_logger.info(f"Parsed T/F: '{current_question}', Answer: '{correct_answer}'")
                    current_question = question_text
                    correct_answer = None
                elif answer_match and current_question:
                    correct_answer = answer_match.group(1).capitalize()
            if current_question and correct_answer:
                questions.append({
                    "type": "true_false",
                    "question": current_question,
                    "correct_answer": correct_answer
                })
                quiz_logger.info(f"Parsed T/F: '{current_question}', Answer: '{correct_answer}'")

        elif quiz_type == "fill_in_the_blank":
            answer_pattern_fib = re.compile(r'^Answer:\s*(.?)\s$', re.IGNORECASE)
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                question_match = question_pattern.match(line)
                answer_match = answer_pattern_fib.match(line)
                if question_match:
                    question_text = question_match.group(1)
                    if current_question and correct_answer:
                        questions.append({
                            "type": "fill_in_the_blank",
                            "question": current_question,
                            "correct_answer": correct_answer
                        })
                        quiz_logger.info(f"Parsed Fill-in: '{current_question}', Answer: '{correct_answer}'")
                    current_question = question_text
                    correct_answer = None
                elif answer_match and current_question:
                    correct_answer = answer_match.group(1).strip()
            if current_question and correct_answer:
                questions.append({
                    "type": "fill_in_the_blank",
                    "question": current_question,
                    "correct_answer": correct_answer
                })
                quiz_logger.info(f"Parsed Fill-in: '{current_question}', Answer: '{correct_answer}'")

        # Retry if fewer questions than requested
        if len(questions) < num_questions and "Error: Unable to generate exact number of valid MCQs" not in response:
            quiz_logger.warning(f"Generated {len(questions)} questions, expected {num_questions}. Retrying up to 3 times...")
            for attempt in range(3):
                retry_response = mcq_pipeline.invoke({'material': material, 'difficulty': difficulty, 'num_questions': num_questions - len(questions)})
                retry_questions = parse_plain_text_to_json(retry_response, num_questions - len(questions), quiz_type, material, difficulty)
                for q in retry_questions:
                    if not any(existing_q['question'] == q['question'] for existing_q in questions):
                        questions.append(q)
                if len(questions) >= num_questions:
                    break
                quiz_logger.warning(f"Attempt {attempt + 1}/3: Generated {len(questions)} questions")
            if len(questions) < num_questions:
                quiz_logger.error(f"Failed to generate {num_questions} questions after 3 attempts. Returning {len(questions)} questions.")

        return questions[:num_questions]
    except Exception as e:
        quiz_logger.error(f"Error parsing plain text response: {e}")
        return []

# Function to save quiz to a file
def save_quiz_to_file(quiz_data):
    try:
        timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
        filename = f"quiz_{timestamp}.json"
        filepath = os.path.join(QUIZ_STORAGE_DIR, filename)
        data_to_save = {"questions": quiz_data, "timestamp": timestamp}
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data_to_save, f, indent=4, ensure_ascii=False)
        quiz_logger.info(f"Quiz saved to {filepath}")
        return filename.split('.')[0]
    except Exception as e:
        quiz_logger.error(f"Error saving quiz to file: {e}")
        return None

# Route for user registration
@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        if not all([email, password]):
            return jsonify({"error": "Email and password are required"}), 400

        # Find user by email
        user = mongo.db.users.find_one({"email": email})
        if not user:
            return jsonify({"error": "Invalid email or password"}), 401

        # Verify password
        if not bcrypt.checkpw(password.encode('utf-8'), user["password"]):
            return jsonify({"error": "Invalid email or password"}), 401

        # Generate JWT token
        token = jwt.encode({
            "user_id": str(user["_id"]),
            "exp": datetime.utcnow() + timedelta(hours=24)
        }, app.config["SECRET_KEY"], algorithm="HS256")

        quiz_logger.info(f"User logged in: {email}")
        return jsonify({
            "message": "Login successful",
            "token": token,
            "user": {
                "id": str(user["_id"]),
                "name": user["name"],
                "email": user["email"]
            }
        }), 200
    except Exception as e:
        quiz_logger.error(f"Error during login: {e}")
        return jsonify({"error": "Login failed. Please try again."}), 500
    
@app.route('/api/user', methods=['GET'])
def get_user():
    token = request.headers.get('Authorization').replace('Bearer ', '') if request.headers.get('Authorization') else None
    if not token:
        return jsonify({"error": "No token provided"}), 401

    try:
        payload = jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])
        user_id = payload.get("user_id")
        user = mongo.db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({"error": "User not found"}), 404

        return jsonify({
            "name": user.get("name", "Anonymous"),
            "email": user.get("email")
        }), 200
    except Exception as e:
        quiz_logger.error(f"Error fetching user: {e}")
        return jsonify({"error": "Invalid token"}), 401

@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        name = data.get('name')  # Already optional
        email = data.get('email')
        password = data.get('password')
        confirm_password = data.get('confirmPassword')

        if not all([email, password, confirm_password]):
            return jsonify({"error": "Email, password, and confirm password are required"}), 400

        if password != confirm_password:
            return jsonify({"error": "Passwords do not match"}), 400

        if len(password) < 8:
            return jsonify({"error": "Password must be at least 8 characters long"}), 400

        if mongo.db.users.find_one({"email": email}):
            return jsonify({"error": "Email already registered"}), 400

        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

        user = {
            "name": name if name else "Anonymous",
            "email": email,
            "password": hashed_password,
            "created_at": datetime.utcnow()
        }
        result = mongo.db.users.insert_one(user)

        token = jwt.encode({
            "user_id": str(result.inserted_id),
            "exp": datetime.utcnow() + timedelta(hours=24)
        }, app.config["SECRET_KEY"], algorithm="HS256")

        quiz_logger.info(f"User registered: {email}")
        return jsonify({
            "message": "Registration successful",
            "token": token,
            "user": {
                "id": str(result.inserted_id),
                "name": name if name else "Anonymous",
                "email": email
            }
        }), 201
    except Exception as e:
        quiz_logger.error(f"Error during registration: {e}")
        return jsonify({"error": "Registration failed. Please try again."}), 500

# Route for forgot password
@app.route('/forgot-password', methods=['POST'])
def forgot_password():
    try:
        data = request.get_json()
        email = data.get('resetEmail')

        if not email:
            return jsonify({"error": "Email is required"}), 400

        # Check if email exists
        user = mongo.db.users.find_one({"email": email})
        if not user:
            return jsonify({"error": "Email not found"}), 404

        # In a real app, generate a reset token and send an email
        quiz_logger.info(f"Password reset requested for: {email}")
        return jsonify({"message": "Password reset link sent to your email"}), 200

    except Exception as e:
        quiz_logger.error(f"Error during forgot password: {e}")
        return jsonify({"error": "Failed to process request. Please try again."}), 500

# Chat endpoint
@app.route('/chat', methods=['POST'])
def chat():
    chat_logger.info("Received a request to /chat endpoint")
    try:
        data = request.get_json()
        chat_logger.info(f"Received JSON data: {data}")
        if not data or 'question' not in data:
            chat_logger.error("Invalid request: 'question' field is required")
            return jsonify({"error": "Invalid request: 'question' field is required."}), 400

        question = data['question']
        chat_logger.info(f"Received chat request: {question}")

        if not chat_pipeline:
            chat_logger.error("Chat pipeline is not available due to initialization failure")
            return jsonify({"error": "Chat pipeline is not available due to initialization failure."}), 500

        # Detect summarization intent and select appropriate pipeline
        is_summarization = any(keyword in question.lower() for keyword in ['summarize', 'summary'])
        pipeline = summarize_pipeline if is_summarization else chat_pipeline
        input_data = {"text": question.split(":", 1)[-1].strip()} if is_summarization else {"question": question}

        chat_logger.info("Invoking chat pipeline...")
        response = pipeline.invoke(input_data)
        chat_logger.info(f"Chat pipeline response: {response}")

        response_data = {
            "response": response,
            "timestamp": datetime.now().isoformat()
        }
        chat_logger.info(f"Sending response: {response_data}")
        return jsonify(response_data)
    except Exception as e:
        chat_logger.error(f"Error in chat endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

# Extract text endpoint
@app.route('/extract_text', methods=['POST'])
def extract_text():
    quiz_logger.info("Received a request to /extract_text endpoint")
    try:
        if 'file' not in request.files:
            quiz_logger.error('No file provided.')
            return jsonify({'error': 'No file provided.'}), 400

        file = request.files['file']
        if not file or file.filename == '':
            quiz_logger.error('No file selected.')
            return jsonify({'error': 'No file selected.'}), 400

        filename = file.filename.lower()
        if not (filename.endswith('.docx') or filename.endswith('.pdf')):
            quiz_logger.error('Unsupported file type. Please upload a Word document (.docx) or PDF file.')
            return jsonify({'error': 'Unsupported file type. Please upload a Word document (.docx) or PDF file.'}), 400

        if filename.endswith('.docx'):
            text = extract_text_from_docx(file)
        else:
            text = extract_text_from_pdf(file)

        if not text.strip():
            quiz_logger.error('No text could be extracted from the file.')
            return jsonify({'error': 'No text could be extracted from the file.'}), 400

        quiz_logger.info(f"Extracted text: {text[:100]}...")
        return jsonify({'text': text})
    except Exception as e:
        quiz_logger.error(f"Error in extract_text endpoint: {str(e)}")
        return jsonify({'error': f'Failed to extract text: {str(e)}'}), 500

# Quiz generation endpoint
def parse_timestamp(timestamp_str, default_format='%Y-%m-%d_%H-%M-%S'):
    formats = [
        '%Y-%m-%d_%H-%M-%S',  # Full format
        '%Y-%m-%d',           # Date-only format
    ]
    for fmt in formats:
        try:
            return datetime.strptime(timestamp_str, fmt)
        except ValueError:
            continue
    raise ValueError(f"Time data {timestamp_str} does not match any format: {formats}")

@app.route('/generate_quiz', methods=['POST'])
def generate_quiz():
    quiz_logger.info("Received a request to /generate_quiz endpoint")
    try:
        data = request.get_json()
        quiz_logger.info(f"Received JSON data: {data}")

        if not data:
            quiz_logger.error("No JSON data provided in the request.")
            return jsonify({'error': 'No JSON data provided in the request.'}), 400

        material = data.get('text', '')
        quiz_type = data.get('question_type', 'multiple-choice')
        num_questions = data.get('num_questions', 5)
        difficulty = data.get('difficulty', 'medium')

        if not material:
            quiz_logger.error("No study material provided in the request.")
            return jsonify({'error': 'No study material provided.'}), 400

        quiz_type_map = {
            "multiple-choice": "mcq",
            "true-false": "true_false",
            "fill-in-the-blank": "fill_in_the_blank"
        }
        quiz_type = quiz_type_map.get(quiz_type, "mcq")

        try:
            num_questions = int(num_questions)
            if num_questions < 1 or num_questions > 50:
                quiz_logger.error(f"Invalid number of questions: {num_questions}. Must be between 1 and 50.")
                return jsonify({'error': 'Number of questions must be between 1 and 50.'}), 400
        except (ValueError, TypeError):
            quiz_logger.error(f"Invalid num_questions value: {num_questions}. Must be an integer.")
            return jsonify({'error': 'Number of questions must be an integer.'}), 400

        max_material_length = 4000
        if len(material) > max_material_length:
            material = material[:max_material_length]
            quiz_logger.warning(f"Material truncated to {max_material_length} characters")

        quiz_logger.info(f"Generating quiz with material: {material[:100]}..., quiz_type: {quiz_type}, difficulty: {difficulty}, num_questions: {num_questions}")

        quiz_pipeline = {
            "mcq": mcq_pipeline,
            "true_false": true_false_pipeline,
            "fill_in_the_blank": fill_in_the_blank_pipeline
        }.get(quiz_type)

        if not quiz_pipeline:
            quiz_logger.error(f"Unsupported quiz_type: {quiz_type}")
            return jsonify({'error': f'Unsupported quiz_type: {quiz_type}'}), 400

        start_time = time.time()
        quiz_response = quiz_pipeline.invoke({
            'material': material,
            'difficulty': difficulty,
            'num_questions': num_questions
        })
        processing_time = time.time() - start_time
        quiz_logger.info(f"Quiz generation took {processing_time:.2f} seconds")
        quiz_logger.info(f"Raw quiz response: {quiz_response}")

        quiz_data = parse_plain_text_to_json(quiz_response, num_questions, quiz_type, material, difficulty)
        quiz_id = save_quiz_to_file(quiz_data)

        if len(quiz_data) < num_questions:
            quiz_logger.warning(f"Generated {len(quiz_data)} questions, expected {num_questions}. Retrying up to 3 times...")
            for attempt in range(3):
                retry_response = quiz_pipeline.invoke({
                    'material': material,
                    'difficulty': difficulty,
                    'num_questions': num_questions - len(quiz_data)
                })
                retry_questions = parse_plain_text_to_json(retry_response, num_questions - len(quiz_data), quiz_type, material, difficulty)
                quiz_data.extend([q for q in retry_questions if not any(existing_q['question'] == q['question'] for existing_q in quiz_data)])
                if len(quiz_data) >= num_questions:
                    break
                quiz_logger.warning(f"Attempt {attempt + 1}/3: Generated {len(quiz_data)} questions")
            if len(quiz_data) < num_questions:
                quiz_logger.error(f"Failed to generate {num_questions} questions after 3 attempts. Returning {len(quiz_data)} questions.")

        # Remove duplicates based on question text
        seen_questions = set()
        unique_quiz_data = []
        for q in quiz_data:
            question_text = q.get('question', '')
            if question_text not in seen_questions:
                seen_questions.add(question_text)
                unique_quiz_data.append(q)
        quiz_data = unique_quiz_data[:num_questions]

        quiz_logger.info(f"Generated quiz: {quiz_data}")
        return jsonify({'quiz_id': quiz_id, 'questions': quiz_data})
    except Exception as e:
        quiz_logger.error(f"Error in generate_quiz: {str(e)}")
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500



def migrate_quiz_files():
    quiz_files = [f for f in os.listdir(QUIZ_STORAGE_DIR) if f.endswith('.json')]
    for quiz_file in quiz_files:
        filepath = os.path.join(QUIZ_STORAGE_DIR, quiz_file)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                quiz_data = json.load(f)
            if isinstance(quiz_data, list):
                timestamp = quiz_file.split('_')[1].split('.')[0]
                new_data = {"questions": quiz_data, "timestamp": timestamp}
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(new_data, f, indent=4, ensure_ascii=False)
                quiz_logger.info(f"Migrated {quiz_file} to new format")
            elif not isinstance(quiz_data, dict) or 'questions' not in quiz_data:
                quiz_logger.warning(f"Invalid format for {quiz_file}, skipping migration")
        except json.JSONDecodeError as e:
            quiz_logger.error(f"Corrupted file {quiz_file}: {e}")
        except Exception as e:
            quiz_logger.error(f"Error migrating {quiz_file}: {e}")

if not hasattr(migrate_quiz_files, 'run_once'):
    migrate_quiz_files()
    migrate_quiz_files.run_once = True



@app.route('/submit_answer', methods=['POST'])
def submit_answer():
    quiz_logger.info("Received a request to /submit-answer endpoint")
    try:
        data = request.get_json()
        quiz_logger.info(f"Received JSON data: {data}")

        quiz_id = data.get('quiz_id')
        question_index = data.get('question_index')
        user_answer = data.get('user_answer')

        if not all([quiz_id, question_index, user_answer]):
            quiz_logger.error("Missing required fields: quiz_id, question_index, or user_answer")
            return jsonify({'error': 'Missing required fields.'}), 400

        filepath = os.path.join(QUIZ_STORAGE_DIR, f"{quiz_id}.json")
        if not os.path.exists(filepath):
            quiz_logger.error(f"Quiz file not found: {filepath}")
            return jsonify({'error': 'Quiz not found.'}), 404

        with open(filepath, 'r', encoding='utf-8') as f:
            quiz_data = json.load(f)
        questions = quiz_data.get('questions', [])
        if 0 <= question_index < len(questions):
            questions[question_index]['user_answer'] = user_answer
            correct_answer = questions[question_index].get('correct_answer')
            questions[question_index]['score'] = 1 if user_answer.lower() == correct_answer.lower() else 0
            quiz_data['questions'] = questions
            
            # Calculate total score and percentage
            total_questions = len(questions)
            total_correct = sum(q.get('score', 0) for q in questions)
            quiz_data['total_score'] = total_correct
            quiz_data['percentage'] = (total_correct / total_questions * 100) if total_questions > 0 else 0

            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(quiz_data, f, indent=4, ensure_ascii=False)
            quiz_logger.info(f"Updated answer for quiz {quiz_id}, question {question_index}")
            return jsonify({'status': 'success', 'total_score': quiz_data['total_score'], 'percentage': quiz_data['percentage']}), 200
        else:
            quiz_logger.error(f"Invalid question_index: {question_index}")
            return jsonify({'error': 'Invalid question index.'}), 400
    except Exception as e:
        quiz_logger.error(f"Error in submit_answer: {str(e)}")
        return jsonify({'error': f'An error occurred: {str(e)}'}), 500

@app.route('/dashboard-stats', methods=['GET'])
def get_dashboard_stats():
    quiz_logger.info("Received a request to /dashboard-stats endpoint")
    try:
        quiz_files = [f for f in os.listdir(QUIZ_STORAGE_DIR) if f.endswith('.json')]
        if not quiz_files:
            quiz_logger.info("No quiz files found")
            return jsonify({
                "total_study_sessions": 0,
                "quizzes_completed": 0,
                "average_score": 0,
                "study_streak": 0,
                "trends": {"sessions": 0, "quizzes": 0, "score": 0}
            }), 200

        total_sessions = len(quiz_files)
        total_questions = 0
        total_correct = 0
        scores = []
        timestamps = []

        for quiz_file in quiz_files:
            filepath = os.path.join(QUIZ_STORAGE_DIR, quiz_file)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    quiz_data = json.load(f)
                quiz_logger.debug(f"Loaded {quiz_file}: {json.dumps(quiz_data)[:100]}...")
                if not isinstance(quiz_data, dict):
                    quiz_logger.warning(f"Skipping {quiz_file} due to invalid format: {type(quiz_data)}")
                    continue
                questions = quiz_data.get('questions', [])
                if not isinstance(questions, list):
                    quiz_logger.warning(f"Invalid questions format in {quiz_file}")
                    continue
                total_questions += len(questions)
                for question in questions:
                    if not isinstance(question, dict):
                        quiz_logger.warning(f"Invalid question in {quiz_file}")
                        continue
                    if 'user_answer' in question and 'correct_answer' in question:
                        if question['user_answer'] == question['correct_answer']:
                            total_correct += 1
                    if 'score' in question:
                        scores.append(float(question.get('score', 0)))
                timestamp_str = quiz_data.get('timestamp', quiz_file.split('_')[1].split('.')[0])
                timestamps.append(parse_timestamp(timestamp_str))
            except json.JSONDecodeError as e:
                quiz_logger.error(f"Corrupted file {quiz_file}: {e}")
                continue
            except Exception as e:
                quiz_logger.error(f"Error processing {quiz_file}: {e}")
                continue

        quizzes_completed = total_questions
        average_score = (sum(scores) / len(scores) * 100) if scores else 0

        study_streak = 1
        if timestamps:
            timestamps.sort()
            current_streak = 1
            for i in range(1, len(timestamps)):
                if (timestamps[i] - timestamps[i-1]).days == 1:
                    current_streak += 1
                else:
                    current_streak = 1
                study_streak = max(study_streak, current_streak)

        last_week = datetime.now() - timedelta(days=7)
        last_week_files = [f for f in quiz_files if parse_timestamp(f.split('_')[1].split('.')[0]) < last_week]
        last_week_questions = sum(len(json.load(open(os.path.join(QUIZ_STORAGE_DIR, f), 'r', encoding='utf-8')).get('questions', [])) for f in last_week_files if os.path.exists(os.path.join(QUIZ_STORAGE_DIR, f)))
        last_week_scores = [float(q.get('score', 0)) for f in last_week_files if os.path.exists(os.path.join(QUIZ_STORAGE_DIR, f)) for q in json.load(open(os.path.join(QUIZ_STORAGE_DIR, f), 'r', encoding='utf-8')).get('questions', [])]
        last_week_average_score = (sum(last_week_scores) / len(last_week_scores) * 100) if last_week_scores else 0

        trends = {
            "sessions": ((total_sessions - len(last_week_files)) / len(last_week_files) * 100) if last_week_files else (total_sessions * 100) if total_sessions > 0 else 0,
            "quizzes": ((quizzes_completed - last_week_questions) / last_week_questions * 100) if last_week_questions else (quizzes_completed * 100) if quizzes_completed > 0 else 0,
            "score": ((average_score - last_week_average_score) / last_week_average_score * 100) if last_week_average_score else (average_score * 100) if average_score > 0 else 0
        }

        response = {
            "total_study_sessions": total_sessions,
            "quizzes_completed": quizzes_completed,
            "average_score": round(average_score, 2),
            "study_streak": study_streak,
            "trends": {k: round(v, 2) for k, v in trends.items()}
        }
        quiz_logger.info(f"Dashboard stats: {response}")
        return jsonify(response), 200
    except Exception as e:
        quiz_logger.error(f"Error in get_dashboard_stats: {str(e)}", exc_info=True)
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route('/recent-activity', methods=['GET'])
def get_recent_activity():
    quiz_logger.info("Received a request to /recent-activity endpoint")
    try:
        activities = []
        quiz_files = [f for f in os.listdir(QUIZ_STORAGE_DIR) if f.endswith('.json')]
        log_files = [os.path.join(LOG_STORAGE_DIR, 'quiz_logs.log'), os.path.join(LOG_STORAGE_DIR, 'chat_logs.log')]

        for quiz_file in sorted(quiz_files, key=lambda x: os.path.getmtime(os.path.join(QUIZ_STORAGE_DIR, x)), reverse=True)[:3]:
            filepath = os.path.join(QUIZ_STORAGE_DIR, quiz_file)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    quiz_data = json.load(f)
                questions = quiz_data.get('questions', [])
                percentage = quiz_data.get('percentage', 0)  # Use the stored percentage
                timestamp_str = quiz_data.get('timestamp', quiz_file.split('_')[1].split('.')[0])
                timestamp = parse_timestamp(timestamp_str)
                activities.append({
                    "id": len(activities) + 1,
                    "type": "quiz",
                    "title": "Quiz Completed",
                    "description": f"{timestamp.strftime('%Y-%m-%d')} - Score: {percentage:.0f}%",
                    "time": time_ago(timestamp.strftime('%Y-%m-%d %H:%M:%S')),
                    "icon": "Brain",
                    "quiz_id": quiz_file.split('.')[0],
                    "score": percentage  # Use the stored percentage
                })
            except Exception as e:
                quiz_logger.error(f"Error processing {quiz_file} for activity: {e}")
                continue

        for log_file in log_files:
            if os.path.exists(log_file):
                with open(log_file, 'r', encoding='utf-8') as f:
                    for line in f.readlines()[-10:]:
                        match = re.match(r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})', line)
                        if match and "Received a request to /chat" in line:
                            timestamp_str = match.group(1)
                            activities.append({
                                "id": len(activities) + 1,
                                "type": "chat",
                                "title": "AI Chat Session",
                                "description": "User interaction",
                                "time": time_ago(timestamp_str),
                                "icon": "MessageSquare"
                            })

        return jsonify(activities[:5])
    except Exception as e:
        quiz_logger.error(f"Error in get_recent_activity: {str(e)}", exc_info=True)
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

# Helper function to calculate time ago
def time_ago(timestamp_str):
    try:
        timestamp = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S')
        delta = datetime.now() - timestamp
        if delta.days > 0:
            return f"{delta.days} days ago"
        elif delta.seconds // 3600 > 0:
            return f"{delta.seconds // 3600} hours ago"
        else:
            return f"{delta.seconds // 60} minutes ago"
    except ValueError:
        quiz_logger.warning(f"Invalid timestamp format for time_ago: {timestamp_str}")
        return "Unknown time"

@app.route('/get-quiz/<quiz_id>', methods=['GET'])
def get_quiz(quiz_id):
    quiz_logger.info(f"Received a request to /get-quiz/{quiz_id}")
    try:
        filepath = os.path.join(QUIZ_STORAGE_DIR, f"{quiz_id}.json")
        if not os.path.exists(filepath):
            quiz_logger.error(f"Quiz file not found: {filepath}")
            return jsonify({"error": "Quiz not found"}), 404
        with open(filepath, 'r', encoding='utf-8') as f:
            quiz_data = json.load(f)
        if not isinstance(quiz_data, dict) or 'questions' not in quiz_data:
            quiz_logger.error(f"Invalid quiz format in {quiz_id}")
            return jsonify({"error": "Invalid quiz format"}), 400
        quiz_logger.info(f"Retrieved quiz {quiz_id}")
        return jsonify(quiz_data), 200
    except Exception as e:
        quiz_logger.error(f"Error in get_quiz: {str(e)}", exc_info=True)
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

# Health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    chat_logger.info("Health check endpoint accessed")
    try:
        mongo.db.command('ping')
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.now().isoformat(),
            'chat_pipeline_available': chat_pipeline is not None,
            'summarize_pipeline_available': summarize_pipeline is not None,
            'quiz_pipelines_available': all([mcq_pipeline, true_false_pipeline, fill_in_the_blank_pipeline]),
            'mongo_connected': True
        }), 200
    except Exception as e:
        quiz_logger.error(f"MongoDB health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'timestamp': datetime.now().isoformat(),
            'chat_pipeline_available': chat_pipeline is not None,
            'summarize_pipeline_available': summarize_pipeline is not None,
            'quiz_pipelines_available': all([mcq_pipeline, true_false_pipeline, fill_in_the_blank_pipeline]),
            'mongo_connected': False,
            'error': str(e)
        }), 500

if _name_ == '_main_':
    app.run(host='0.0.0.0', port=5000, debug=True)
