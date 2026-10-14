# Auto-Director — AI-Powered Cinematic Story Generation

An end-to-end full-stack prototype that turns a story idea into a structured screenplay, shot list, storyboard cards, and a cinematic feed UI.

**Stack:** React + Vite, FastAPI, LangChain-compatible LLM integration, and optional Hugging Face Diffusers / Stable Diffusion image generation.

## Start from zero

The repository intentionally contains **no story data, API keys, or generated images**. You provide a prompt in the UI. The backend can run in demo mode with no credentials, or call an LLM when you configure an API key. Image generation is optional and can use a hosted inference endpoint or a local Diffusers installation.

### Requirements
- Python 3.10+
- Node.js 18+
- Internet connection only if using a hosted LLM/image provider or installing dependencies

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows PowerShell
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API docs: http://127.0.0.1:8000/docs

Optional environment variables (set before launching backend):

**Windows PowerShell**
```powershell
$env:LLM_PROVIDER="openai"
$env:OPENAI_API_KEY="your_api_key"
$env:OPENAI_MODEL="gpt-4o-mini"
```

**macOS/Linux**
```bash
export LLM_PROVIDER=openai
export OPENAI_API_KEY=your_api_key
export OPENAI_MODEL=gpt-4o-mini
```

Without an API key, the backend uses a deterministic template-based demo generator. The demo mode is functional for testing the whole pipeline, but it is not an LLM-generated screenplay.

### 2. Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Visit the Vite URL shown in the terminal. The frontend expects the API at `http://127.0.0.1:8000`; set `VITE_API_URL` if your backend runs elsewhere.

## How the pipeline works

1. User submits a premise, genre, tone, and desired shot count.
2. FastAPI validates the request and calls the story pipeline.
3. The pipeline produces a logline, screenplay, and sequenced shot descriptions.
4. Optional image generation creates storyboard frames from shot prompts.
5. React renders a cinematic storyboard feed and supports exporting the result as JSON.

## AI integrations

### LLM
Set `LLM_PROVIDER=openai` and `OPENAI_API_KEY`. The integration uses the OpenAI chat model through LangChain when installed. You are billed by the provider for API use. Keep keys in environment variables and never commit them.

### Diffusers / Stable Diffusion
Image generation is optional because local diffusion models can require a compatible GPU, substantial VRAM, and model downloads. The included backend returns descriptive storyboard cards by default. To enable local generation, install the optional dependencies in `backend/requirements-diffusers.txt`, accept the model's license where required, and configure `ENABLE_DIFFUSERS=true`. The implementation attempts to load a Diffusers text-to-image pipeline only when explicitly enabled.

## API endpoints
- `GET /health` — backend status and enabled integrations
- `POST /api/generate` — generate screenplay and shot sequence
- `POST /api/storyboard/{project_id}/images` — generate images for a saved in-memory project (Diffusers must be enabled)
- `GET /api/storyboard/{project_id}` — retrieve the generated project

Projects are held in memory while the backend process is running. This is a prototype, not persistent production storage.

## Project structure

```text
auto_director_github/
├── backend/
│   ├── app/main.py
│   ├── requirements.txt
│   └── requirements-diffusers.txt
├── frontend/
│   ├── src/App.jsx
│   ├── src/main.jsx
│   ├── src/styles.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── scripts/
│   └── check_project.py
├── docs/
│   └── architecture.md
├── .gitignore
└── README.md
```

## GitHub publishing

Create an empty GitHub repository, extract this ZIP, then run:

```bash
git init
git add .
git commit -m "Build Auto-Director cinematic story generation platform"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/auto-director.git
git push -u origin main
```

## Limitations
- No authentication, database, queue, or production rate limiting.
- In-memory project storage resets when the backend restarts.
- Demo mode is template-based; configure an LLM provider for actual model-generated content.
- Image generation is opt-in and may require GPU resources and separate model licensing.
