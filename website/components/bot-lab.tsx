"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { BALANCED_BOT, BOT_ATTRIBUTES, BotDraft, createPk3, generateFiles, GUY_BOT, interpolateProfile, pk3Filename, Skill, validateDraft } from "@/lib/bot-lab";
import { Q3ColoredText } from "@/components/q3-colored-text";
import { GuyModelViewer } from "@/components/guy-model-viewer";
import { supportsGuyPreview } from "@/lib/guy-model";

const GROUPS = ["Combat & perception", "Weapon aim", "Chat", "Movement & behavior", "Resources"] as const;
const clone = (draft: BotDraft) => structuredClone(draft);

function download(name: string, data: BlobPart, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function BotLab() {
  const [draft, setDraft] = useState<BotDraft>(() => clone(GUY_BOT));
  const [profile, setProfile] = useState<Skill>(4);
  const [notice, setNotice] = useState("");
  const validation = useMemo(() => validateDraft(draft), [draft]);
  const files = useMemo(() => { try { return generateFiles(draft); } catch { return null; } }, [draft]);
  const preview = interpolateProfile(draft, draft.spawnSkill);
  const set = <K extends keyof BotDraft>(key: K, value: BotDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const importJson = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    try { const parsed: unknown = JSON.parse(await file.text()); const result = validateDraft(parsed); if (!result.ok) throw new Error(result.errors.join(" ")); setDraft(clone(result.value)); setNotice("Draft imported and validated."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Could not import draft."); }
  };
  const exportPk3 = async () => {
    if (!files) return; const bytes = createPk3([{ name: files.botPath, content: files.bot }, { name: files.characterPath, content: files.character }]);
    download(await pk3Filename(draft.slug, bytes), bytes.slice().buffer, "application/zip");
  };

  return <div className="space-y-6">
    <section className="grid border border-border bg-card lg:grid-cols-[1.2fr_.8fr]">
      <div className="p-5 sm:p-8"><p className="font-mono text-xs font-bold uppercase tracking-[.2em] text-primary">Local loadout workshop</p><h1 className="mt-3 font-mono text-4xl font-black uppercase tracking-[-.06em] sm:text-6xl">Bot Lab</h1><p className="mt-4 max-w-2xl leading-7 text-muted-foreground">Design format-compatible Quake III bots entirely in your browser. Nothing is uploaded, and exports reference—but never copy—game assets.</p></div>
      <div className="border-t border-border bg-background p-5 lg:border-l lg:border-t-0"><span className="font-mono text-xs uppercase text-muted-foreground">Arena preview · skill {draft.spawnSkill}</span><div className="mt-5 border-l-4 border-primary pl-4 text-3xl font-black"><Q3ColoredText text={draft.displayName || draft.slug} /></div><p className="mt-4 font-mono text-xs text-muted-foreground">Attack {preview[2]?.toFixed(2)} · Aim {preview[16]?.toFixed(2)} · Reaction {preview[6]?.toFixed(2)}</p></div>
    </section>

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-6">
        <section className="border border-border bg-card p-5 sm:p-7"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-mono text-xl font-black uppercase">Identity / appearance</h2><div className="flex gap-2"><button className="bot-button" type="button" onClick={() => setDraft(clone(BALANCED_BOT))}>Balanced</button><button className="bot-button" type="button" onClick={() => setDraft(clone(GUY_BOT))}>GUY</button></div></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {([['slug','Internal slug'],['displayName','Quake-colored name'],['model','Body model'],['skin','Body skin'],['headModel','Head model (optional)'],['headSkin','Head skin (optional)'],['weaponWeights','Weapon weights'],['itemWeights','Item weights'],['chatFile','Chat file'],['chatName','Chat name']] as const).map(([key,label]) => <label className="bot-label" key={key}>{label}<input className="bot-input" value={draft[key]} onChange={(e) => set(key,e.target.value)} /></label>)}
            <label className="bot-label">Gender<select className="bot-input" value={draft.gender} onChange={(e) => set("gender", e.target.value as BotDraft["gender"])}><option>male</option><option>female</option><option>neuter</option></select></label>
            {(['color1','color2'] as const).map((key) => <label className="bot-label" key={key}>{key}<input className="bot-input" type="number" min="0" max="7" value={draft[key]} onChange={(e) => set(key, Number(e.target.value))} /></label>)}
            <label className="bot-label">Spawn skill<select className="bot-input" value={draft.spawnSkill} onChange={(e) => set("spawnSkill", Number(e.target.value) as BotDraft["spawnSkill"])}>{[1,2,3,4,5].map(x => <option key={x}>{x}</option>)}</select></label>
          </div>
          <div className="mt-6">
            <div className="mb-3 flex items-baseline justify-between gap-3"><h3 className="font-mono text-sm font-black uppercase tracking-[.12em]">Live model preview</h3><span className="font-mono text-[10px] uppercase tracking-[.12em] text-muted-foreground">Bundled assets only</span></div>
            {supportsGuyPreview(draft) ? <GuyModelViewer /> : <div className="guy-viewer-empty" role="status"><strong>Preview not bundled</strong><span>Only the included GUY default body and head can render here. Other appearance references remain valid for export and are not replaced or approximated.</span></div>}
          </div>
          {draft.metadata?.note ? <p className="mt-4 border-l-2 border-primary pl-3 text-sm text-muted-foreground">{draft.metadata.note}</p> : null}
        </section>

        <section className="border border-border bg-card p-5 sm:p-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="font-mono text-xl font-black uppercase">Character attributes 0–48</h2><p className="mt-2 text-sm text-muted-foreground">Edit canonical profiles 1, 4 and 5. Skills 2 and 3 are deterministic interpolation previews.</p></div><label className="bot-label">Canonical profile<select className="bot-input" value={profile} onChange={(e) => setProfile(Number(e.target.value) as Skill)}><option value="1">1 · novice</option><option value="4">4 · strong</option><option value="5">5 · nightmare</option></select></label></div>
          <div className="mt-6 space-y-7">{GROUPS.map((group) => <fieldset key={group}><legend className="mb-3 font-mono text-sm font-black uppercase text-primary">{group}</legend><div className="grid gap-3 md:grid-cols-2">{BOT_ATTRIBUTES.filter((item) => item.group === group).map((item) => item.resource || item.id < 2 ? <div key={item.id} className="border border-border bg-background p-3 text-sm"><b className="font-mono">{item.id} · {item.label}</b><p className="mt-1 text-muted-foreground">Managed by identity/resources above.</p></div> : <label className="border border-border bg-background p-3" key={item.id}><span className="flex justify-between gap-2 text-sm"><b className="font-mono">{item.id} · {item.label}</b>{item.unused ? <em className="text-xs not-italic text-muted-foreground">declared, currently unused</em> : null}</span><span className="mt-3 grid grid-cols-[1fr_5.5rem] gap-3"><input aria-label={`${item.label} slider`} type="range" min={item.min} max={item.max} step={item.step} value={draft.profiles[profile][item.id]} onChange={(e) => setDraft((current) => ({...current,profiles:{...current.profiles,[profile]:{...current.profiles[profile],[item.id]:Number(e.target.value)}}}))} /><input aria-label={`${item.label} value`} className="bot-input" type="number" min={item.min} max={item.max} step={item.step} value={draft.profiles[profile][item.id]} onChange={(e) => setDraft((current) => ({...current,profiles:{...current.profiles,[profile]:{...current.profiles[profile],[item.id]:Number(e.target.value)}}}))} /></span></label>)}</div></fieldset>)}</div>
        </section>
      </div>

      <aside className="space-y-6 xl:sticky xl:top-4 xl:self-start">
        <section className="border border-border bg-card p-5"><h2 className="font-mono text-lg font-black uppercase">Validate & export</h2><div aria-live="polite" className={`mt-3 text-sm ${validation.ok ? "text-green-400" : "text-red-400"}`}>{validation.ok ? "Ready to export." : <ul className="list-disc pl-5">{validation.errors.slice(0,8).map((error) => <li key={error}>{error}</li>)}</ul>}</div>
          <div className="mt-4 grid gap-2"><label className="bot-button cursor-pointer text-center">Import Bot Lab JSON<input className="sr-only" type="file" accept="application/json,.json" onChange={importJson} /></label><button className="bot-button" disabled={!validation.ok} onClick={() => download(`${draft.slug}.bot-lab.json`, JSON.stringify(draft,null,2)+"\n", "application/json")}>Download editor JSON</button><button className="bot-button" disabled={!files} onClick={() => files && download(`${draft.slug}.bot`, files.bot)}>Download .bot</button><button className="bot-button" disabled={!files} onClick={() => files && download(`${draft.slug}_c.c`, files.character)}>Download character</button><button className="bot-button border-primary bg-primary text-primary-foreground" disabled={!files} onClick={exportPk3}>Download PK3</button></div>{notice ? <p aria-live="polite" className="mt-3 text-sm text-muted-foreground">{notice}</p> : null}
        </section>
        <section className="border border-border bg-background p-5"><h2 className="font-mono text-lg font-black uppercase">Install</h2><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-muted-foreground"><li>Copy the PK3 into the dedicated/static server’s <code className="text-foreground">baseq3</code> directory.</li><li>Restart or reload the filesystem, then use <code className="text-foreground">addbot {draft.slug} {draft.spawnSkill}</code>.</li><li>Loose files keep the shown paths inside your game directory.</li></ol><p className="mt-3 text-sm text-muted-foreground">Browser-hosted games cannot write server files. Install on the host first; this page has no upload or sharing backend.</p></section>
        {files ? <details className="border border-border bg-card p-5"><summary className="cursor-pointer font-mono text-sm font-bold uppercase">Generated output</summary><pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap text-xs">{files.bot}{"\n"}{files.character}</pre></details> : null}
      </aside>
    </div>
  </div>;
}
