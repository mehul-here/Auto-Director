# Architecture

```text
React + Vite UI
   │ POST /api/generate
   ▼
FastAPI request validation
   │
   ├── No API key / demo mode ──► deterministic template generator
   │
   └── LLM_PROVIDER=openai ────► LangChain prompt chain ──► ChatOpenAI
   │
   ▼
Structured project JSON: logline + screenplay + ordered shots
   │
   ├── React storyboard cards + screenplay view
   ├── Export JSON
   └── Optional POST /api/storyboard/{id}/images
             │ ENABLE_DIFFUSERS=true
             ▼
       Diffusers / Stable Diffusion
             ▼
       Generated storyboard image files
```

## Design notes
- The UI is usable without an LLM key; demo mode validates the front-to-back flow.
- The LLM prompt requests a structured JSON payload. The backend normalizes shot numbering and provides missing image prompts.
- Image generation is explicitly opt-in because local diffusion model downloads and inference can be resource-intensive.
- In-memory storage keeps setup lightweight, but projects do not survive backend restarts.
