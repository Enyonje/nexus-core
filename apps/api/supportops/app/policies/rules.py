# backend/app/policies/rules.py

SAFE_INTENTS = ["general_query", "order_status"]
HIGH_CONFIDENCE_THRESHOLD = 0.85

def evaluate_policy(classification: dict, customer_tier: str = "standard"):
    """
    Returns: {"action": "automate" | "escalate", "reason": str}
    """
    intent = classification["intent"]
    confidence = classification["confidence"]
    
    if confidence < HIGH_CONFIDENCE_THRESHOLD:
        return {"action": "escalate", "reason": "Low AI confidence"}
        
    if intent == "refund_request":
        if customer_tier == "enterprise":
            return {"action": "automate", "reason": "Auto-refund enabled for Enterprise"}
        return {"action": "escalate", "reason": "Refunds require manual review for Standard tier"}
        
    if intent in SAFE_INTENTS:
        return {"action": "automate", "reason": "Safe intent category"}
        
    return {"action": "escalate", "reason": "Default safety fallback"}