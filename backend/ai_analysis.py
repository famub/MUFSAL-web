"""Runs the knee model on a new case and saves the result (grade, confidence, probabilities, priority, Grad-CAM).

Never raises: if the model cannot run (Space asleep, no internet, ...) the case is still created and the
doctor sees "AI analysis not ready yet", exactly as before.

The upload pages call analyze_case_later(): the model answers in the background, so the patient or
the radiologist is not kept waiting, and the result shows up for the doctor a few seconds later.
"""
import logging
import threading
from pathlib import Path

from priority import compute_priority
from queries_cases import save_ai_result

log = logging.getLogger("mufsal.ai")
GRADCAM_DIR = Path(__file__).resolve().parent / "uploads" / "gradcam"


def analyze_case(case_id, xray_file):
    """xray_file: path of the saved X-ray. Returns True when the result was saved."""
    try:
        import model_service
        r = model_service.predict(Path(xray_file).read_bytes())

        GRADCAM_DIR.mkdir(parents=True, exist_ok=True)
        (GRADCAM_DIR / f"{case_id}.png").write_bytes(r["gradcam_png"])

        save_ai_result(
            case_id, r["grade"], round(r["confidence"], 3), [round(p, 3) for p in r["probs"]],
            compute_priority(r["grade"], r["confidence"]),
            f"uploads/gradcam/{case_id}.png",     # same style as seed.sql
        )
        return True
    except Exception:
        log.exception("AI analysis failed for case %s", case_id)
        return False


def analyze_case_later(case_id, xray_file):
    """Starts analyze_case in the background and returns at once."""
    threading.Thread(target=analyze_case, args=(case_id, xray_file), daemon=True).start()
