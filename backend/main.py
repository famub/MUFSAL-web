"""MUFSAL - FastAPI app."""
from fastapi import FastAPI, Request
from fastapi.templating import Jinja2Templates

from db import get_connection

app = FastAPI()

templates = Jinja2Templates(directory="templets")


@app.get("/db-test")
def db_test():
    """Check that the API can reach the database."""
    with get_connection() as conn:
        row = conn.execute("SELECT COUNT(*) AS accounts FROM users").fetchone()
    return row