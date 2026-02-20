# Vercel serverless entry point — re-exports the FastAPI app for Vercel Python runtime.
import sys
import os

# Add the backend root to sys.path so imports (db, routes, middleware, models) resolve correctly.
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import app  # noqa: E402, F401
