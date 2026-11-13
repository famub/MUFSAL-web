"""MUFSAL - FastAPI app."""
from fastapi import FastAPI

from db import get_connection

app = FastAPI()


@app.get("/db-test")
def db_test():
    """Check that the API can reach the database."""
    with get_connection() as conn:
        row = conn.execute("SELECT COUNT(*) AS accounts FROM users").fetchone()
    return row