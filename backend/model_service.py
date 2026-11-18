"""Asks the MUFSAL knee model for a grade.

The model itself (KL-FuseNet: ConvNeXt-Base + ResNet-50 + GeM) runs on our Hugging Face Space
(Sarahalshalaan/mufsal-knee-api), because it needs more memory than the site has. This file only
sends the X-ray there and reads the answer, so the site needs no torch and works the same on
every computer and on Render.

.env:
    MODEL_API_URL   https://sarahalshalaan-mufsal-knee-api.hf.space
    MODEL_API_KEY   the same secret that is saved in the Space (never put it on GitHub)
"""
import base64
import json
import os
import urllib.request

TIMEOUT = 180     # seconds: a sleeping Space needs a minute or two to wake up


def predict(image_bytes):
    """image_bytes -> dict(grade, confidence, within1, severe, probs[5], gradcam_png bytes).
    Raises if the Space is not set up, cannot be reached or refuses the image."""
    url = os.environ.get("MODEL_API_URL", "").rstrip("/")
    if not url:
        raise RuntimeError("MODEL_API_URL is not set in .env")

    req = urllib.request.Request(
        url + "/predict",
        data=image_bytes,
        headers={"Content-Type": "application/octet-stream",
                 "X-Api-Key": os.environ.get("MODEL_API_KEY", "")},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=TIMEOUT) as answer:
        r = json.loads(answer.read())

    r["gradcam_png"] = base64.b64decode(r["gradcam_png"])
    return r
