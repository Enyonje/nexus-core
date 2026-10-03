import os
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def analyze_ticket(subject: str, summary: str) -> dict:
    prompt = f"""
You are a senior customer support AI.

Ticket Subject:
{subject}

Ticket Summary:
{summary}

Return JSON ONLY with:
- category
- suggested_reply
- confidence (0 to 1)
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2
    )

    content = response.choices[0].message.content

    # Safe fallback parsing
    try:
        import json
        return json.loads(content)
    except:
        return {
            "category": "Unknown",
            "suggested_reply": "Needs human review.",
            "confidence": 0.0
        }
