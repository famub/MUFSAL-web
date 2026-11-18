"""Triage priority from the model output. ASSUMPTION - confirm the rule with your supervisor/doctor."""


def compute_priority(grade, confidence):
    grade = int(grade)
    if grade >= 3:
        return "high"
    if grade == 2 or confidence < 0.40:
        return "medium"
    return "low"
