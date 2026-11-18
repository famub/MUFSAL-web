"""MUFSAL - temporary diagnostic for the AI connection.

Run it from the backend folder:      python check-ai.py
Delete it once the problem is found. It changes nothing.

It walks the same path the site walks, one link at a time, and stops at the
first broken one. The API key is never printed.
"""
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

# Antivirus and school proxies re-sign HTTPS with a certificate of their own.
# Windows trusts it, so the browser is happy, but Python keeps its own list and
# refuses. truststore makes Python read the Windows store instead.
TRUSTSTORE = "not installed"
try:
    import truststore
    truststore.inject_into_ssl()
    TRUSTSTORE = "ON - Python is reading the Windows certificate store"
except ImportError:
    pass
except Exception as _e:                       # Python older than 3.10
    TRUSTSTORE = f"could not start ({_e})"


def head(n, title):
    print(f"\n{'=' * 60}\n[{n}] {title}\n{'=' * 60}")


def die(message, hint):
    print(f"\n  >>> STOPPED HERE: {message}")
    print(f"  >>> WHAT TO DO:   {hint}\n")
    sys.exit(1)


# ---------------------------------------------------------------- 1
head(0, "Certificates")
print(f"  Python     : {sys.version.split()[0]}")
print(f"  truststore : {TRUSTSTORE}")

head(1, "Reading .env")
try:
    from dotenv import load_dotenv
except ImportError:
    die("python-dotenv is not installed in this venv",
        "run:  pip install -r requirements.txt")

load_dotenv(HERE / ".env")
url = os.environ.get("MODEL_API_URL", "").strip().rstrip("/")
key = os.environ.get("MODEL_API_KEY", "").strip()

print(f"  MODEL_API_URL = {url or '(EMPTY)'}")
print(f"  MODEL_API_KEY = {'set, ' + str(len(key)) + ' characters' if key else '(EMPTY)'}")

if not url:
    die("MODEL_API_URL is empty", "add it to backend/.env and ask Sara for the value")
if not key:
    die("MODEL_API_KEY is empty", "ask Sara for the key and add it to backend/.env")

# ---------------------------------------------------------------- 2
head(2, "Is the Space awake?")
try:
    t0 = time.time()
    with urllib.request.urlopen(url + "/", timeout=180) as r:
        body = r.read(300).decode("utf-8", "replace")
    print(f"  HTTP {r.status} in {time.time() - t0:.1f}s")
    print(f"  answer: {body}")
except urllib.error.HTTPError as e:
    print(f"  HTTP {e.code}: {e.read(300).decode('utf-8', 'replace')}")
except Exception as e:
    if "CERTIFICATE_VERIFY_FAILED" in str(e):
        die("the certificate was refused - an antivirus or a proxy is re-signing HTTPS",
            "run:  pip install truststore     then run this file again")
    die(f"cannot reach the Space ({type(e).__name__}: {e})",
        "check your internet, or open the URL above in a browser")

# ---------------------------------------------------------------- 3
head(3, "Sending a real X-ray to /predict")
xrays = sorted((HERE / "uploads" / "xrays").glob("*.png"))
if not xrays:
    die("no X-ray found in backend/uploads/xrays",
        "upload one case from the site first, then run this again")

sample = xrays[-1]
print(f"  file: {sample.name}  ({sample.stat().st_size} bytes)")

req = urllib.request.Request(
    url + "/predict",
    data=sample.read_bytes(),
    headers={"Content-Type": "application/octet-stream", "X-Api-Key": key},
    method="POST",
)
try:
    t0 = time.time()
    with urllib.request.urlopen(req, timeout=180) as r:
        answer = json.loads(r.read())
    print(f"  HTTP {r.status} in {time.time() - t0:.1f}s")
except urllib.error.HTTPError as e:
    detail = e.read(500).decode("utf-8", "replace")
    print(f"  HTTP {e.code}: {detail}")
    if e.code in (401, 403):
        die("the Space refused the key",
            "your MODEL_API_KEY does not match the one saved in the Space - ask Sara")
    die(f"the Space refused the request (HTTP {e.code})",
        "send Sara the message above; it comes from her Space, not from your computer")
except Exception as e:
    die(f"the request failed ({type(e).__name__}: {e})",
        "if it says timeout, the Space was asleep - run this again, it wakes in a minute")

print(f"  keys returned: {sorted(answer)}")
for k in ("grade", "confidence", "probs", "gradcam_png"):
    if k not in answer:
        die(f"the answer has no '{k}'",
            "the Space changed its answer shape - tell Sara, model_service.py expects it")
print(f"  grade      = {answer['grade']}")
print(f"  confidence = {answer['confidence']}")
print(f"  probs      = {answer['probs']}  (sum = {sum(answer['probs']):.3f})")

# ---------------------------------------------------------------- 4
head(4, "Can the result be saved?")
try:
    from db import get_connection
except Exception as e:
    die(f"cannot load db.py ({type(e).__name__}: {e})", "check backend/.env database settings")

try:
    with get_connection() as conn:
        rows = conn.execute("""
            SELECT c.case_id, c.submitted_at,
                   (a.case_id IS NOT NULL) AS has_ai_result
            FROM cases c
            LEFT JOIN ai_results a ON a.case_id = c.case_id
            ORDER BY c.case_id DESC LIMIT 5
        """).fetchall()
except Exception as e:
    die(f"cannot read the database ({type(e).__name__}: {e})",
        "is PostgreSQL running? are the DB_* lines in .env right?")

print("  the five newest cases:")
missing = 0
for row in rows:
    mark = "yes" if row["has_ai_result"] else "NO  <-- empty"
    if not row["has_ai_result"]:
        missing += 1
    print(f"    case {row['case_id']:>3}  created {row['submitted_at']:%Y-%m-%d %H:%M}   AI result: {mark}")

# ---------------------------------------------------------------- 5
head(5, "Can the Grad-CAM folder be written?")
folder = HERE / "uploads" / "gradcam"
try:
    folder.mkdir(parents=True, exist_ok=True)
    probe = folder / "_write-test.tmp"
    probe.write_bytes(b"ok")
    probe.unlink()
    print(f"  {folder} - writable")
except Exception as e:
    die(f"cannot write there ({type(e).__name__}: {e})",
        "the folder is read-only or the path is wrong")

# ---------------------------------------------------------------- verdict
print(f"\n{'=' * 60}")
if missing:
    print("  Every link works on its own, yet some cases have no AI result.")
    print("  So the model and the database are fine, and the failure happens")
    print("  while the site is running. Upload one case from the site, then")
    print("  copy the red error from the cmd window - that is the real cause.")
else:
    print("  Everything works, and every recent case has its AI result.")
print(f"{'=' * 60}\n")
