import { useMemo, useState } from "react";
import { Aperture, ArrowDownToLine, Clapperboard, Film, LoaderCircle, Play, Sparkles, WandSparkles } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const demoProject = {
  project_id: "preview",
  title: "The Last Signal",
  logline: "At the edge of a silent universe, one message forces a stranded explorer to choose between home and the unknown.",
  screenplay: "TITLE: THE LAST SIGNAL\n\nA lone explorer receives a transmission from a place that should not exist. As the signal grows clearer, the mission becomes a test of memory, sacrifice, and the meaning of home.",
  generator: "preview",
  notice: "Preview storyboard. Generate your own story to replace this sample.",
  shots: [
    { shot_number: 1, sequence: "Opening Image", duration_seconds: 5, camera: "Wide establishing shot", visual_description: "A tiny research vessel drifts above a blue planet swallowed by shadow.", image_prompt: "cinematic sci-fi, tiny research vessel above blue planet, anamorphic lens, film grain", image_url: null },
    { shot_number: 2, sequence: "The Signal", duration_seconds: 7, camera: "Slow dolly-in", visual_description: "A console flickers alive; a waveform repeats in a rhythm almost like a heartbeat.", image_prompt: "cinematic closeup of futuristic console waveform, moody practical lighting", image_url: null },
    { shot_number: 3, sequence: "Revelation", duration_seconds: 6, camera: "Over-the-shoulder", visual_description: "The explorer sees coordinates that match a childhood memory no one else knows.", image_prompt: "lone astronaut in cockpit looking at coordinates, cinematic over shoulder shot", image_url: null },
  ],
};

const gradients = [
  "linear-gradient(135deg,#172b45,#0a111b 65%,#bb7848)",
  "linear-gradient(135deg,#3a202c,#131018 65%,#d9a15b)",
  "linear-gradient(135deg,#0c353b,#10141c 65%,#8a9da4)",
  "linear-gradient(135deg,#32264c,#0c101b 65%,#d57c5c)",
  "linear-gradient(135deg,#243a2f,#0d1115 65%,#b8a06a)",
  "linear-gradient(135deg,#3c2633,#101018 65%,#e2b17b)",
];

function downloadJson(project) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(project.title || "storyboard").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [premise, setPremise] = useState("");
  const [genre, setGenre] = useState("Sci-Fi");
  const [tone, setTone] = useState("Atmospheric");
  const [shotCount, setShotCount] = useState(6);
  const [visualStyle, setVisualStyle] = useState("cinematic realism, anamorphic lens, film grain");
  const [useLlm, setUseLlm] = useState(true);
  const [project, setProject] = useState(demoProject);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("storyboard");

  const shots = useMemo(() => project?.shots || [], [project]);

  async function generate() {
    if (premise.trim().length < 12) {
      setError("Give your story premise at least 12 characters.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ premise, genre, tone, shot_count: shotCount, visual_style: visualStyle, use_llm: useLlm }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Generation failed. Is the FastAPI server running?");
      setProject(data);
      setActiveTab("storyboard");
    } catch (e) {
      setError(`${e.message}. Start the backend at http://127.0.0.1:8000.`);
    } finally {
      setLoading(false);
    }
  }

  async function generateImages() {
    if (!project?.project_id || project.project_id === "preview") {
      setError("Generate a story first, then request storyboard images.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API}/api/storyboard/${project.project_id}/images`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Image generation failed");
      setProject(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-icon"><Aperture size={20}/></span><span>AUTO<span className="muted">/</span>DIRECTOR</span></a>
        <div className="top-meta"><span className="live-dot"/> STORY ENGINE <span className="meta-divider"/> CREATIVE STUDIO</div>
        <button className="outline-button" onClick={() => downloadJson(project)}><ArrowDownToLine size={15}/> Export project</button>
      </header>

      <main>
        <section className="hero">
          <div className="eyebrow"><Sparkles size={13}/> YOUR IDEA, DIRECTED</div>
          <h1>Stories deserve<br/><em>the big screen.</em></h1>
          <p className="hero-copy">Turn a spark of an idea into a screenplay, shot sequence, and cinematic storyboard — all in one creative workflow.</p>
          <div className="hero-stats"><span><Film size={14}/> SCREENPLAY</span><span><Clapperboard size={14}/> SHOT DESIGN</span><span><WandSparkles size={14}/> AI STORYBOARD</span></div>
        </section>

        <div className="workspace">
          <aside className="control-panel">
            <div className="panel-heading"><span className="step-number">01</span><div><h2>Story brief</h2><p>Start with a premise. Shape the world.</p></div></div>
            <label htmlFor="premise">YOUR STORY PREMISE</label>
            <textarea id="premise" value={premise} onChange={e => setPremise(e.target.value)} placeholder="A cartographer discovers that every map she draws changes the real world..." rows={5}/>
            <div className="form-row">
              <div><label htmlFor="genre">GENRE</label><select id="genre" value={genre} onChange={e => setGenre(e.target.value)}>{["Sci-Fi","Thriller","Fantasy","Drama","Horror","Adventure","Romance","Mystery"].map(x => <option key={x}>{x}</option>)}</select></div>
              <div><label htmlFor="tone">TONE</label><select id="tone" value={tone} onChange={e => setTone(e.target.value)}>{["Atmospheric","Dark","Hopeful","Tense","Whimsical","Epic","Intimate","Surreal"].map(x => <option key={x}>{x}</option>)}</select></div>
            </div>
            <label htmlFor="style">VISUAL LANGUAGE</label>
            <input id="style" value={visualStyle} onChange={e => setVisualStyle(e.target.value)} maxLength={120}/>
            <div className="shot-control"><label htmlFor="shots">SHOT COUNT <strong>{shotCount}</strong></label><input id="shots" type="range" min="3" max="12" value={shotCount} onChange={e => setShotCount(Number(e.target.value))}/><div className="range-labels"><span>3 SHOTS</span><span>12 SHOTS</span></div></div>
            <label className="toggle-row"><span><strong>Use LLM generation</strong><small>Falls back to demo mode without an API key</small></span><input type="checkbox" checked={useLlm} onChange={e => setUseLlm(e.target.checked)}/></label>
            <button className="generate-button" onClick={generate} disabled={loading}><span>{loading ? <LoaderCircle className="spin" size={17}/> : <Sparkles size={17}/>}</span>{loading ? "DIRECTING YOUR STORY..." : "GENERATE STORYBOARD"}<span className="button-arrow">↗</span></button>
            {error && <div className="error-box">{error}</div>}
            <p className="privacy-note">Your premise is sent to your configured backend only. Avoid submitting sensitive information.</p>
          </aside>

          <section className="story-panel">
            <div className="story-topline"><div><div className="eyebrow">PROJECT / 001</div><h2>{project.title || "Untitled project"}</h2></div><span className="generator-pill">{project.generator === "langchain-openai" ? "● LLM GENERATED" : "● STORY PREVIEW"}</span></div>
            <p className="logline">{project.logline}</p>
            {project.notice && <div className="notice">{project.notice}</div>}
            <div className="tabs"><button className={activeTab === "storyboard" ? "active" : ""} onClick={() => setActiveTab("storyboard")}>STORYBOARD <span>{shots.length}</span></button><button className={activeTab === "screenplay" ? "active" : ""} onClick={() => setActiveTab("screenplay")}>SCREENPLAY</button></div>

            {activeTab === "storyboard" ? <div className="shot-grid">{shots.map((shot, i) => <article className="shot-card" key={`${project.project_id}-${shot.shot_number}`}><div className="shot-art" style={{ background: shot.image_url ? `url(${API}${shot.image_url}) center/cover` : gradients[i % gradients.length] }}>{!shot.image_url && <><div className="art-orbit"/><div className="art-crosshair">+</div><span className="art-index">FRAME {String(shot.shot_number).padStart(2,"0")}</span></>}<span className="shot-duration">{shot.duration_seconds}s</span></div><div className="shot-info"><div className="shot-kicker">SHOT {String(shot.shot_number).padStart(2,"0")} <span> / {shot.sequence}</span></div><h3>{shot.camera}</h3><p>{shot.visual_description}</p><div className="prompt-label">IMAGE PROMPT</div><p className="image-prompt">{shot.image_prompt}</p></div></article>)}</div> : <div className="screenplay-card"><div className="screenplay-head"><span>SCREENPLAY / OUTLINE</span><button onClick={() => navigator.clipboard?.writeText(project.screenplay || "")}>Copy text</button></div><pre>{project.screenplay}</pre></div>}

            <div className="bottom-actions"><button className="outline-button" onClick={() => downloadJson(project)}><ArrowDownToLine size={15}/> Export JSON</button><button className="primary-small" onClick={generateImages} disabled={loading}><Play size={14}/> Generate AI frames</button></div>
          </section>
        </div>
        <footer><span>AUTO/DIRECTOR <span className="muted">©</span> CREATIVE INTELLIGENCE, IN PROGRESS</span><span>BUILT FOR STORYTELLERS <span className="muted">/</span> 2026</span></footer>
      </main>
    </div>
  );
}
