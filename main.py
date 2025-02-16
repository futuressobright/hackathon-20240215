from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv
import os
import weave
import wandb
from typing import List, Optional

# Load environment variables
load_dotenv()

wandb.login(key=os.getenv("WANDB_API_KEY"))  # Load from environment
weave.init("interview-hacker")  # ✅ Set project to "interview-hacker"

# Initialize FastAPI
app = FastAPI(title="Interview Assistant API")

# CORS middleware configuration remains the same
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3030"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini
genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))
model = genai.GenerativeModel('gemini-pro')

# Enhanced data models
class InterviewState(BaseModel):
    difficulty_level: float = 1.0
    topic_area: str
    questions_asked: List[str] = []
    responses: List[str] = []
    session_id: str
    question_count: int = 0

class ChatRequest(BaseModel):
    text: str
    session_id: str
    topic_area: Optional[str] = None
    status: str

class ChatResponse(BaseModel):
    response: str
    difficulty_level: float
    next_question: Optional[str] = None

# In-memory storage for interview states
interview_sessions = {}


def adjust_difficulty(current_difficulty: float, response_quality: float) -> float:
    # Make adjustments more pronounced
    adjustment = (response_quality - 0.5) * 0.5  # Changed from 0.2 to 0.5

    # Add momentum - larger changes when moving in same direction
    new_difficulty = current_difficulty + adjustment

    # Keep within bounds but allow full range
    return max(0.2, min(1.8, new_difficulty))  # Changed bounds to allow more range

def assess_response_quality(response: str) -> float:
    prompt = f"""
    Analyze this interview response and rate its quality on a scale of 0 to 1:
    Response: {response}
    Consider:
    - Completeness
    - Technical accuracy
    - Clarity of explanation
    Return only the numeric score.
    """
    try:
        assessment = model.generate_content(prompt)
        return max(0.0, min(1.0, float(assessment.text.strip())))
    except:
        return 0.5

@weave.op()  # ✅ Automatically tracks all function inputs/outputs
def process_interview(session_id: str, text: str, topic_area: str):
    session = interview_sessions.get(session_id)

    if not session:
        session = InterviewState(
            difficulty_level=1.0,
            topic_area=topic_area,
            session_id=session_id,
            question_count=0  # Initialize count
        )
        interview_sessions[session_id] = session

    # Increment question count before processing
    session.question_count += 1

    # Check if we've reached the limit
    if session.question_count >= 5:
        return {
            "response": "Thank you for completing the interview. You've answered all 5 questions.",
            "difficulty_level": session.difficulty_level,
            "next_question": None,
            "status": "complete"  # Add a status field to indicate the interview is complete

        }

    context_prompt = f"""
    You are conducting a structured technical interview about {session.topic_area}.
    Difficulty level: {session.difficulty_level:.1f}
    Candidate response: {text}

    Your task is:
    1. **Evaluate** the response based on **completeness, technical accuracy, and clarity**.
    2. **Give a short, constructive evaluation** of how well the candidate answered.
    3. **DO NOT provide the correct answer** or explain the topic in detail.
    4. **Generate one follow-up question** based on the candidate's response and difficulty level.

    Format your response like this:
    FEEDBACK: [Brief evaluation of the response]
    NEXT_QUESTION: [One follow-up question]
    """

    response = model.generate_content(context_prompt)
    response_parts = response.text.split("NEXT_QUESTION:")
    # Only take the feedback part, removing the FEEDBACK: prefix if it exists
    main_response = response_parts[0].replace("FEEDBACK:", "").strip()
    next_question = response_parts[1].strip() if len(response_parts) > 1 else None

    new_difficulty = adjust_difficulty(session.difficulty_level, assess_response_quality(text))

    session.difficulty_level = new_difficulty
    session.questions_asked.append(next_question or "")
    session.responses.append(text)

    return {
        "response": main_response,  # Changed from ai_feedback
        "difficulty_level": new_difficulty,
        "next_question": next_question,
        "status": "in_progress"
    }

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    response_data = process_interview(request.session_id, request.text, request.topic_area)

    # ✅ Debugging Log
    print("🔥 Process Interview Output:", response_data)

    return ChatResponse(**response_data)  # Still using response_model validation


# Health check endpoint remains the same
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
