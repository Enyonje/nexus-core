import os
from openai import OpenAI
from pydantic import BaseModel
from temporalio import activity

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class ClassificationResult(BaseModel):
    intent: str
    confidence: float
    urgency: str
    sentiment: str  # "angry", "neutral", "happy"
    reasoning: str

@activity.defn
async def classify_intent_activity(ticket: dict) -> dict:
    prompt = f"Subject: {ticket['subject']}\nDescription: {ticket['description']}"
    
    completion = client.beta.chat.completions.parse(
        model="gpt-4o-2024-08-06",
        messages=[
            {"role": "system", "content": "Classify intent (refund_request, tech_support, etc) and sentiment (angry, neutral)."},
            {"role": "user", "content": prompt},
        ],
        response_format=ClassificationResult,
    )
    
    return completion.choices[0].message.parsed.dict()