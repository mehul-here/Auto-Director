"""Lightweight structural checks; no external services or model downloads required."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
required = [
    "README.md", "backend/app/main.py", "backend/requirements.txt",
    "frontend/package.json", "frontend/src/App.jsx", "frontend/src/styles.css",
    "docs/architecture.md",
]
missing = [item for item in required if not (ROOT / item).exists()]
if missing:
    raise SystemExit(f"Missing required files: {missing}")
with (ROOT / "frontend/package.json").open(encoding="utf-8") as f:
    package = json.load(f)
assert "dev" in package["scripts"] and "build" in package["scripts"]
print("Project structure OK.")
