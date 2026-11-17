"""Tests for the login / registration logic. They need no PostgreSQL: queries_accounts is replaced
by an in-memory copy (fake_queries.py). Run from the backend folder:  python -m pytest tests"""
import importlib.util
import sys
import types
from pathlib import Path

import pytest

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))
sys.path.insert(0, str(Path(__file__).resolve().parent))

if importlib.util.find_spec("psycopg") is None:      # only the error classes are needed here
    pg = types.ModuleType("psycopg"); errors = types.ModuleType("psycopg.errors")
    class Error(Exception): pass
    class UniqueViolation(Error): pass
    class CheckViolation(Error): pass
    errors.UniqueViolation, errors.CheckViolation = UniqueViolation, CheckViolation
    pg.errors = errors
    sys.modules["psycopg"], sys.modules["psycopg.errors"] = pg, errors

import fake_queries                                    # noqa: E402
sys.modules["queries_accounts"] = fake_queries


@pytest.fixture(autouse=True)
def clean():
    import auth_service
    fake_queries.reset_all(); auth_service._fails.clear(); auth_service._lookups.clear()
    yield
