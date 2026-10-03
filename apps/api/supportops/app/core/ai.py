import random


def generate_ai_reply(ticket_text: str):
    replies = [
        "Thanks for reaching out. We've identified the issue and are applying a fix.",
        "Our system detected a configuration mismatch. This is now resolved.",
        "This appears to be a known issue. We've deployed a workaround.",
        "Your request has been escalated and auto-resolved successfully."
    ]

    confidence = random.randint(60, 95)

    return {
        "reply": random.choice(replies),
        "confidence": confidence
    }
