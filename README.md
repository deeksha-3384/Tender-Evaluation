# AI tender evaluation system

Full-stack starter: **FastAPI** backend (PDF + OCR + Anthropic + PostgreSQL/SQLAlchemy stack) and **React + Vite** frontend with **Tailwind CSS** and **shadcn/ui**.

## Prerequisites

- **Python** 3.11+ (recommended)
- **Node.js** 20+ and npm
- **PostgreSQL** (local install; create a database for the app)
- **Tesseract OCR** installed and on your `PATH` (required for `pytesseract`)
  - Windows: install via [UB Mannheim build](https://github.com/UB-Mannheim/tesseract/wiki) or your package manager, then ensure the install folder is on `PATH`.

## Backend

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:

- Windows (PowerShell): `.\.venv\Scripts\Activate.ps1`
- macOS/Linux: `source .venv/bin/activate`

```bash
pip install -r requirements.txt
copy .env.example .env   # Windows — edit DATABASE_URL and ANTHROPIC_API_KEY
# or: cp .env.example .env
```

Edit `.env` with your PostgreSQL URL and Anthropic API key.

Run the API (default [http://127.0.0.1:8000](http://127.0.0.1:8000); interactive docs at `/docs`):

```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

`main.py` is a minimal app with CORS for the Vite dev server and `/health`. Add SQLAlchemy models, PDF ingestion (PyMuPDF), OCR (`pytesseract`), and Anthropic calls as you build the evaluation flow.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The UI uses Tailwind and a sample **shadcn/ui** `Button` in `src/components/ui/button.tsx`. `components.json` is set up so you can add more components with the shadcn CLI when needed.

Production build:

```bash
npm run build
npm run preview
```

## Project layout

- `backend/` — FastAPI application (`main.py`, `requirements.txt`)
- `frontend/` — Vite + React + TypeScript + Tailwind + shadcn/ui

## Notes

- No Docker is required; use local PostgreSQL and local Tesseract.
- Ensure the backend CORS `allow_origins` in `main.py` matches your frontend URL if you change ports or deploy.
