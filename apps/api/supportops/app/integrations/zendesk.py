import os
import logging
from temporalio import activity

# Set up logging so we can see the "sent" messages in the worker logs
logger = logging.getLogger(__name__)

@activity.defn()
async def notify_customer_zendesk(data: dict) -> dict:
    """
    Simulates sending a notification back to the Zendesk ticket.
    In production, you would use the 'zenpy' library or 'requests' 
    to call the Zendesk Ticket Update API.
    """
    ticket_id = data.get("ticket_id")
    status = data.get("status")
    customer_email = data.get("customer_email", "the customer")
    
    # Logic to determine the message based on the workflow result
    if status == "refunded":
        message = (
            f"Notification sent to {customer_email}: "
            f"Your refund for Ticket {ticket_id} has been processed successfully. "
            "Please allow 3-5 business days for the funds to appear."
        )
    elif status == "escalated":
        message = (
            f"Notification sent to Support Team: "
            f"Ticket {ticket_id} has exceeded the 24h SLA and requires manual intervention."
        )
    else:
        message = f"Update sent for Ticket {ticket_id}: Processing is underway."

    # In Temporal, activity logs are captured and visible in the Web UI
    activity.logger.info(message)
    
    # Return a summary that the workflow can use for the final audit trail
    return {
        "notification_status": "sent",
        "ticket_id": ticket_id,
        "summary": message
    }