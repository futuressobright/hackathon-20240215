from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv
import os
from typing import List, Optional

# Load environment variables
load_dotenv()

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
    difficulty_level: float = 1.0  # Scale of 0.0 to 2.0, 1.0 is medium
    topic_area: str
    questions_asked: List[str] = []
    responses: List[str] = []
    session_id: str

class ChatRequest(BaseModel):
    text: str
    session_id: str
    topic_area: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    difficulty_level: float
    next_question: Optional[str] = None

# In-memory storage for interview states (replace with proper database in production)
interview_sessions = {}

def adjust_difficulty(current_difficulty: float, response_quality: float) -> float:
    """
    Adjust difficulty based on response quality
    response_quality: float between 0 and 1
    Returns new difficulty level between 0.0 and 2.0
    """
    adjustment = (response_quality - 0.5) * 0.2  # Gradual adjustment
    new_difficulty = current_difficulty + adjustment
    return max(0.0, min(2.0, new_difficulty))  # Clamp between 0.0 and 2.0

def assess_response_quality(response: str) -> float:
    """
    Analyze response quality using Gemini
    Returns a score between 0 and 1
    """
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
        score = float(assessment.text.strip())
        return max(0.0, min(1.0, score))  # Ensure score is between 0 and 1
    except:
        return 0.5  # Default to neutral if assessment fails

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        # Initialize or retrieve session state
        if request.session_id not in interview_sessions:
            if not request.topic_area:
                raise HTTPException(status_code=400, detail="topic_area required for new session")
            interview_sessions[request.session_id] = InterviewState(
                difficulty_level=1.0,
                topic_area=request.topic_area,
                session_id=request.session_id
            )
        
        session = interview_sessions[request.session_id]
        
        # Generate context-aware prompt
        context_prompt = f"""
        You are conducting a technical interview about {session.topic_area}.
        Current difficulty level: {session.difficulty_level:.1f} (0=beginner, 1=intermediate, 2=expert)
        Previous questions: {', '.join(session.questions_asked[-3:] if session.questions_asked else ['None'])}
        User response: {request.text}
        
        Provide a detailed response and generate a relevant follow-up question 
        appropriate for the current difficulty level.
        Format your response as:
        RESPONSE: [your response]
        NEXT_QUESTION: [follow-up question]
        """
        
        # Get response from Gemini
        response = model.generate_content(context_prompt)
        response_text = response.text
        
        # Parse response and next question
        response_parts = response_text.split("NEXT_QUESTION:")
        main_response = response_parts[0].replace("RESPONSE:", "").strip()
        next_question = response_parts[1].strip() if len(response_parts) > 1 else None
        
        # Assess response quality and adjust difficulty
        response_quality = assess_response_quality(request.text)
        new_difficulty = adjust_difficulty(session.difficulty_level, response_quality)
        
        # Update session state
        session.difficulty_level = new_difficulty
        session.questions_asked.append(next_question if next_question else "")
        session.responses.append(request.text)
        
        return ChatResponse(
            response=main_response,
            difficulty_level=new_difficulty,
            next_question=next_question
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Health check endpoint remains the same
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
