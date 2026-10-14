from __future__ import annotations

import os
import uuid
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="Auto-Director API",
    description="Generate screenplays, shot sequences, and optional storyboard images from a premise.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PROJECTS: dict[str, dict] = {}


class GenerateRequest(BaseModel):
    premise: str = Field(min_length=12, max_length=2500)
    genre: str = Field(default="Sci-Fi", max_length=60)
    tone: str = Field(default="Cinematic", max_length=60)
    shot_count: int = Field(default=6, ge=3, le=12)
    visual_style: str = Field(default="cinematic realism", max_length=120)
    use_llm: bool = True


def demo_generate(req: GenerateRequest) -> dict:
    """Deterministic, no-key fallback so the entire app works on first launch."""
    premise = req.premise.strip()
    title_words = premise.split()[:5]
    title = " ".join(title_words).strip(" .,:;!?") or "Untitled Story"
    logline = (
        f"A {req.tone.lower()} {req.genre.lower()} story in which "
        f"{premise[0].lower() + premise[1:]} The protagonist must make a defining choice before the final scene."
    )
    beats = [
        ("Opening Image", "Establish the world and the protagonist's ordinary reality."),
        ("Inciting Incident", "Introduce an unexpected event that makes the original plan impossible."),
        ("Rising Tension", "Escalate the stakes and reveal a contradiction in the protagonist's beliefs."),
        ("Midpoint Turn", "Reveal new information that changes the meaning of the mission."),
        ("Climax", "Force the protagonist to make an irreversible choice."),
        ("Resolution", "Show the consequences and leave a resonant final image."),
    ]
    screenplay_lines = [
        f"TITLE: {title}",
        f"GENRE: {req.genre} | TONE: {req.tone}",
        "",
        "LOGLINE",
        logline,
        "",
        "SCREENPLAY OUTLINE",
    ]
    shots = []
    for i in range(req.shot_count):
        beat_name, beat_desc = beats[i % len(beats)]
        camera = ["Wide establishing shot", "Slow dolly-in", "Over-the-shoulder medium shot",
                  "Low-angle tracking shot", "Tight close-up", "Crane pull-back"][i % 6]
        light = ["dawn haze", "hard side light", "neon reflections", "silhouette against backlight"][i % 4]
        description = f"{beat_desc} Story premise: {premise}"
        shot = {
            "shot_number": i + 1,
            "sequence": beat_name,
            "duration_seconds": [5, 7, 4, 8, 6, 5][i % 6],
            "camera": camera,
            "visual_description": description,
            "image_prompt": (
                f"{req.visual_style}, {req.genre}, {req.tone}, {camera.lower()}, {light}, "
                f"storyboard frame for: {premise}. No text, no watermark."
            ),
            "image_url": None,
        }
        shots.append(shot)
        screenplay_lines.extend([
            "",
            f"SCENE {i + 1}: {beat_name.upper()}",
            f"VISUAL: {camera}; {light}.",
            f"ACTION: {description}",
            "DIRECTOR'S NOTE: Let composition and blocking communicate the emotional turn.",
        ])
    return {
        "title": title,
        "logline": logline,
        "screenplay": "\n".join(screenplay_lines),
        "shots": shots,
        "generator": "template-demo",
        "notice": "Demo mode: configure an LLM API key for model-generated screenplay content.",
    }


def llm_generate(req: GenerateRequest) -> dict:
    """Use LangChain + ChatOpenAI when configured; fail over clearly to demo mode."""
    if os.getenv("LLM_PROVIDER", "").lower() != "openai" or not os.getenv("OPENAI_API_KEY"):
        return demo_generate(req)
    try:
        from langchain_openai import ChatOpenAI
        from langchain_core.prompts import ChatPromptTemplate
        import json

        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an experienced film writer and assistant director. Return only valid JSON with keys:
title (string), logline (string), screenplay (string), shots (array).
Each shot must have shot_number, sequence, duration_seconds, camera, visual_description, image_prompt, image_url (null).
Create coherent story beats and visually specific, filmable shots. Do not include markdown fences."""),
            ("human", """Premise: {premise}
Genre: {genre}
Tone: {tone}
Shot count: {shot_count}
Visual style: {visual_style}
Generate a concise screenplay outline and exactly the requested number of sequential shots.""")
        ])
        chain = prompt | ChatOpenAI(model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"), temperature=0.7) 
        response = chain.invoke({
            "premise": req.premise, "genre": req.genre, "tone": req.tone,
            "shot_count": req.shot_count, "visual_style": req.visual_style
        })
        payload = json.loads(response.content)
        if not isinstance(payload.get("shots"), list) or len(payload["shots"]) == 0:
            raise ValueError("LLM returned no shots")
        payload["shots"] = payload["shots"][:req.shot_count]
        for i, shot in enumerate(payload["shots"], 1):
            shot["shot_number"] = i
            shot.setdefault("image_url", None)
            shot.setdefault("image_prompt", shot.get("visual_description", req.premise))
        payload["generator"] = "langchain-openai"
        payload["notice"] = "Generated with the configured LLM provider. Review outputs before production use."
        return payload
    except Exception as exc:
        # Keep the product usable, but make fallback transparent.
        data = demo_generate(req)
        data["notice"] = f"LLM generation failed; showing demo output instead. Details: {type(exc).__name__}"
        return data


def create_images(project: dict) -> dict:
    if os.getenv("ENABLE_DIFFUSERS", "false").lower() != "true":
        raise HTTPException(status_code=400, detail="Diffusers is disabled. Set ENABLE_DIFFUSERS=true and install backend/requirements-diffusers.txt.")
    try:
        import torch
        from diffusers import StableDiffusionPipeline
        from pathlib import Path

        model_id = os.getenv("DIFFUSERS_MODEL_ID", "stable-diffusion-v1-5/stable-diffusion-v1-5")
        device = "cuda" if torch.cuda.is_available() else "cpu"
        dtype = torch.float16 if device == "cuda" else torch.float32
        pipe = StableDiffusionPipeline.from_pretrained(model_id, torch_dtype=dtype)
        pipe = pipe.to(device)
        out_dir = Path("outputs") / project["project_id"]
        out_dir.mkdir(parents=True, exist_ok=True)
        for shot in project["shots"]:
            image = pipe(shot["image_prompt"], num_inference_steps=20, guidance_scale=7.0).images[0]
            path = out_dir / f"shot_{shot['shot_number']:02d}.png"
            image.save(path)
            shot["image_url"] = f"/outputs/{project['project_id']}/{path.name}"
        return project
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Image generation failed: {type(exc).__name__}: {exc}")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "llm_enabled": os.getenv("LLM_PROVIDER", "").lower() == "openai" and bool(os.getenv("OPENAI_API_KEY")),
        "diffusers_enabled": os.getenv("ENABLE_DIFFUSERS", "false").lower() == "true",
    }


@app.post("/api/generate")
def generate(req: GenerateRequest):
    generated = llm_generate(req) if req.use_llm else demo_generate(req)
    project_id = str(uuid.uuid4())
    project = {"project_id": project_id, **generated, "request": req.model_dump()}
    PROJECTS[project_id] = project
    return project


@app.get("/api/storyboard/{project_id}")
def get_storyboard(project_id: str):
    if project_id not in PROJECTS:
        raise HTTPException(status_code=404, detail="Project not found. Generate a storyboard first.")
    return PROJECTS[project_id]


@app.post("/api/storyboard/{project_id}/images")
def generate_images(project_id: str):
    if project_id not in PROJECTS:
        raise HTTPException(status_code=404, detail="Project not found. Generate a storyboard first.")
    PROJECTS[project_id] = create_images(PROJECTS[project_id])
    return PROJECTS[project_id]
