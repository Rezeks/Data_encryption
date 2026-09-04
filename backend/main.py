"""
CryptoLab — FastAPI application.

Run with:
    uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from ciphers import get_cipher, list_ciphers

app = FastAPI(
    title="CryptoLab API",
    description="Educational cryptography toolkit",
    version="1.0.0",
)

# Allow the frontend (served on a different port or file://) to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response models ─────────────────────────────────────────────

class CipherRequest(BaseModel):
    cipher: str
    text: str
    params: dict = {}


class CipherResponse(BaseModel):
    result: str


# ── Routes ─────────────────────────────────────────────────────────────────

@app.get("/api/ciphers")
def get_ciphers():
    """Return a list of all available ciphers with their metadata."""
    return list_ciphers()


@app.post("/api/encrypt", response_model=CipherResponse)
def encrypt(req: CipherRequest):
    """Encrypt text using the specified cipher."""
    cipher = get_cipher(req.cipher)
    if cipher is None:
        raise HTTPException(status_code=404, detail=f"Шифр '{req.cipher}' не найден")
    try:
        result = cipher.encrypt(req.text, **req.params)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return CipherResponse(result=result)


@app.post("/api/decrypt", response_model=CipherResponse)
def decrypt(req: CipherRequest):
    """Decrypt text using the specified cipher."""
    cipher = get_cipher(req.cipher)
    if cipher is None:
        raise HTTPException(status_code=404, detail=f"Шифр '{req.cipher}' не найден")
    try:
        result = cipher.decrypt(req.text, **req.params)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return CipherResponse(result=result)


# ── Serve frontend static files (optional convenience) ─────────────────────
# If the frontend folder exists next to the backend, serve it at /
import pathlib

_frontend = pathlib.Path(__file__).resolve().parent.parent / "frontend"
if _frontend.is_dir():
    app.mount("/", StaticFiles(directory=str(_frontend), html=True), name="frontend")
