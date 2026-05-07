"""
AI-based tender evaluation API.
"""

import json
import os
import re
from contextlib import asynccontextmanager
from typing import Any

import fitz
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq

load_dotenv()

GROQ_MODEL = "llama-3.3-70b-versatile"
# Leave headroom for the prompt and model output within context limits.
MAX_TENDER_TEXT_CHARS = 100_000
MAX_BIDDER_TEXT_CHARS = 100_000


def _strip_code_fence(text: str) -> str:
    text = text.strip()
    m = re.match(r"^```(?:json)?\s*\n?(.*?)\n?```\s*$", text, re.DOTALL | re.IGNORECASE)
    if m:
        return m.group(1).strip()
    return text


def extract_pdf_text(data: bytes) -> str:
    doc = fitz.open(stream=data, filetype="pdf")
    try:
        return "\n".join(page.get_text() for page in doc)
    finally:
        doc.close()


def eligibility_criteria_from_groq(client: Groq, tender_text: str) -> list:
    system = (
        "You extract eligibility criteria from tender documents. "
        "Respond with only a JSON array of strings. Each string is one distinct "
        "eligibility criterion. No markdown fences, no commentary."
    )
    user = (
        "From the tender text below, list every eligibility requirement "
        "(who may bid, mandatory registrations, experience, turnover, "
        "certifications, exclusions, etc.).\n\n"
        f"Tender text:\n{tender_text}"
    )
    completion = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.2,
    )
    raw = completion.choices[0].message.content or "[]"
    raw = _strip_code_fence(raw)
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Model returned invalid JSON: {e}",
        ) from e
    if not isinstance(parsed, list):
        raise HTTPException(
            status_code=502,
            detail="Model response was not a JSON array.",
        )
    return parsed


def evaluate_bidder_with_groq(
    client: Groq,
    bidder_text: str,
    criteria: list[str],
) -> dict[str, Any]:
    system = (
        "You evaluate bidder documents against tender eligibility criteria. "
        "Return ONLY a valid JSON object with exactly this schema:\n"
        '{\n'
        '  "results": [\n'
        "    {\n"
        '      "criterion": "<criterion text>",\n'
        '      "verdict": "eligible" | "not_eligible" | "needs_manual_review",\n'
        '      "reason": "<brief evidence-based explanation from bidder text>"\n'
        "    }\n"
        "  ]\n"
        "}\n"
        "No markdown, no extra keys, no commentary."
    )
    user = (
        "Evaluate the bidder document against each eligibility criterion.\n"
        "If evidence clearly satisfies the criterion => eligible.\n"
        "If evidence clearly fails or contradicts => not_eligible.\n"
        "If evidence is missing/ambiguous/insufficient => needs_manual_review.\n\n"
        f"Criteria (JSON array):\n{json.dumps(criteria, ensure_ascii=False)}\n\n"
        f"Bidder document text:\n{bidder_text}"
    )
    completion = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.1,
    )
    raw = completion.choices[0].message.content or "{}"
    raw = _strip_code_fence(raw)
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Model returned invalid JSON: {e}",
        ) from e
    if not isinstance(parsed, dict):
        raise HTTPException(
            status_code=502,
            detail="Model response was not a JSON object.",
        )
    results = parsed.get("results")
    if not isinstance(results, list):
        raise HTTPException(
            status_code=502,
            detail='Model response missing valid "results" array.',
        )
    allowed_verdicts = {"eligible", "not_eligible", "needs_manual_review"}
    normalized_results = []
    for item in results:
        if not isinstance(item, dict):
            raise HTTPException(
                status_code=502,
                detail="Model response contains an invalid result item.",
            )
        criterion = item.get("criterion")
        verdict = item.get("verdict")
        reason = item.get("reason")
        if (
            not isinstance(criterion, str)
            or not isinstance(verdict, str)
            or not isinstance(reason, str)
        ):
            raise HTTPException(
                status_code=502,
                detail="Model response contains malformed result fields.",
            )
        if verdict not in allowed_verdicts:
            raise HTTPException(
                status_code=502,
                detail=f"Model returned unsupported verdict: {verdict}",
            )
        normalized_results.append(
            {
                "criterion": criterion,
                "verdict": verdict,
                "reason": reason,
            }
        )
    return {"results": normalized_results}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: e.g. init DB pool, verify Tesseract path
    yield
    # Shutdown: dispose connections


app = FastAPI(
    title="Tender Evaluation API",
    description="Upload and evaluate tender documents with PyMuPDF and Groq.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://tender-evaluation-red.vercel.app",
        "https://tender-evaluation.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {
        "service": "tender-evaluation-api",
        "docs": "/docs",
        "health": "/health",
    }


@app.post("/upload-tender")
async def upload_tender(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Upload a single PDF file.",
        )
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY is not set. Add it to your environment or .env file.",
        )
    body = await file.read()
    if not body:
        raise HTTPException(status_code=400, detail="Empty file.")
    try:
        text = extract_pdf_text(body)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Could not read PDF: {e}",
        ) from e
    text = text.strip()
    if not text:
        raise HTTPException(
            status_code=400,
            detail="No extractable text found in this PDF.",
        )
    if len(text) > MAX_TENDER_TEXT_CHARS:
        text = text[:MAX_TENDER_TEXT_CHARS]
    client = Groq(api_key=api_key)
    criteria = eligibility_criteria_from_groq(client, text)
    return {"criteria": criteria}


@app.post("/evaluate-bidder")
async def evaluate_bidder(
    file: UploadFile = File(...),
    criteria: str = Form(...),
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Upload a single bidder PDF file.",
        )
    try:
        parsed_criteria = json.loads(criteria)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid criteria JSON string: {e}",
        ) from e
    if not isinstance(parsed_criteria, list) or not parsed_criteria:
        raise HTTPException(
            status_code=400,
            detail="Criteria must be a non-empty JSON array.",
        )
    criteria_list = [c for c in parsed_criteria if isinstance(c, str) and c.strip()]
    if not criteria_list:
        raise HTTPException(
            status_code=400,
            detail="Criteria array must contain non-empty strings.",
        )

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY is not set. Add it to your environment or .env file.",
        )
    body = await file.read()
    if not body:
        raise HTTPException(status_code=400, detail="Empty file.")
    try:
        bidder_text = extract_pdf_text(body)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Could not read bidder PDF: {e}",
        ) from e
    bidder_text = bidder_text.strip()
    if not bidder_text:
        raise HTTPException(
            status_code=400,
            detail="No extractable text found in bidder PDF.",
        )
    if len(bidder_text) > MAX_BIDDER_TEXT_CHARS:
        bidder_text = bidder_text[:MAX_BIDDER_TEXT_CHARS]

    client = Groq(api_key=api_key)
    evaluation = evaluate_bidder_with_groq(client, bidder_text, criteria_list)
    return {
        "criteria_count": len(criteria_list),
        "evaluation": evaluation["results"],
    }
