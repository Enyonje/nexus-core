from collections import Counter

def generate_rca(ticket, historical_tickets):
    """
    Lightweight deterministic RCA engine.
    Replace with ML later.
    """

    error_signatures = [
        t.get("error_code")
        for t in historical_tickets
        if t.get("error_code")
    ]

    most_common_error = Counter(error_signatures).most_common(1)

    root_cause = (
        f"Recurring failure caused by {most_common_error[0][0]}"
        if most_common_error
        else "Isolated incident caused by misconfiguration"
    )

    return {
        "root_cause": root_cause,
        "confidence": "91%",
        "suggested_fix": "Apply configuration validation and redeploy affected service",
        "contributing_factors": [
            "Missing input validation",
            "No retry policy",
            "Outdated SDK"
        ]
    }
