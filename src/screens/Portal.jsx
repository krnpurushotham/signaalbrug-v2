/* SignaalBrug v2 — Refugee portal: onboarding → tailored FAQ → escalation channels. */
import React, { useState, useEffect, useRef, useMemo } from "react";
import { SBStore, getSiteConfig, createCase, logSearch, decryptCase, fmt } from "../lib/store";
import {
  useDb, Icon, Brand, Modal, Field, SegControl, ChannelBadge, Timeline, EmptyState,
  toast, CHANNELS, SITUATIONS, CATEGORIES, LANGS, STATUS_META,
} from "../components/index.jsx";
import { MapView } from "../components/MapView.jsx";

const PREFS_KEY = "sb2.portal.prefs";
export function getPrefs() { try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch { return {}; } }
function setPrefs(p) { try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* private mode */ } }

function useCountUp(target) {
  const [n, setN] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    const from = prev.current; prev.current = target;
    if (from === target) return;
    const t0 = performance.now();
    let raf;
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 700);
      setN(Math.round(from + (target - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return n;
}

/* ---------- shell ---------- */
function PortalShell({ nav, children, prefs, showPrefs }) {
  return (
    <div className="atmo" style={{ minHeight: "100vh" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "16px 16px 60px" }}>
        <div className="spread" style={{ marginBottom: 18 }}>
          <button onClick={() => nav("/portal/home")} style={{ display: "inline-flex" }} aria-label="RefugeeHelp home"><Brand /></button>
          <div className="row" style={{ gap: 6 }}>
            {showPrefs && prefs.lang ? (
              <button className="chip" onClick={() => { setPrefs({}); nav("/portal"); }} title="Change language or situation">
                <Icon name="globe" size={14} /> {(LANGS.find(([c]) => c === prefs.lang) || ["", "?"])[1]}
                {prefs.situation ? <span> · {SITUATIONS[prefs.situation].short}</span> : null}
              </button>
            ) : null}
            <button className="btn btn-ghost btn-sm" onClick={() => nav("/")}>Home</button>
          </div>
        </div>
        {children}
        <p className="hint" style={{ textAlign: "center", marginTop: 40 }}>
          SignaalBrug — concept for RefugeeHelp / VluchtelingenWerk Nederland · demo only, no real client data
        </p>
      </div>
    </div>
  );
}

/* ---------- onboarding ---------- */
function Onboarding({ nav }) {
  const db = useDb();
  const [prefs, setP] = useState(getPrefs());
  const step = !prefs.lang ? 1 : 2;
  const enabledLangs = getSiteConfig(db).enabledLangs;
  return (
    <PortalShell nav={nav} prefs={prefs} showPrefs={false}>
      <div className="col" style={{ alignItems: "center", textAlign: "center", marginTop: 14, gap: 4 }}>
        <h1 className="rev" style={{ fontSize: "clamp(28px, 5vw, 40px)" }}>
          {step === 1 ? "Welcome · Welkom · أهلاً" : "What is your situation?"}
        </h1>
        <p className="rev rev-1" style={{ color: "var(--ink-2)", maxWidth: 520 }}>
          {step === 1 ? "Choose your language to get information that fits your situation." : "Your answer tailors every page — housing, procedures and rights differ per group."}
        </p>
        <div className="row rev rev-1" style={{ gap: 6, margin: "10px 0 6px" }}>
          <span className="chip" style={{ background: step >= 1 ? "var(--green-100)" : "var(--n-100)", color: "var(--green-800)" }}>1 · Language</span>
          <span className="chip" style={{ background: step === 2 ? "var(--green-100)" : "var(--n-100)", color: step === 2 ? "var(--green-800)" : "var(--ink-3)" }}>2 · Situation</span>
        </div>
      </div>

      {step === 1 ? (
        <div className="rev rev-2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, marginTop: 18 }}>
          {LANGS.filter(([code]) => enabledLangs.includes(code)).map(([code, label]) => (
            <button key={code} className="card card-hover" style={{ padding: "16px 12px", minHeight: 56, fontWeight: 600, fontSize: 16 }}
              onClick={() => { const p = { ...prefs, lang: code }; setPrefs(p); setP(p); }}>
              {label}
              {code !== "en" ? <div className="hint" style={{ fontWeight: 500, marginTop: 2 }}>demo subset</div> : null}
            </button>
          ))}
        </div>
      ) : (
        <div className="col" style={{ marginTop: 18, gap: 10 }}>
          {prefs.lang !== "en" ? (
            <div className="help-banner rev"><span><Icon name="globe" size={17} /></span>
              <span>Demo build: the interface is shown in English. In production this flow is fully translated{["ar", "fa", "ps", "prs"].includes(prefs.lang) ? " with right-to-left layout" : ""}.</span>
            </div>
          ) : null}
          {Object.entries(SITUATIONS).map(([key, s], i) => (
            <button key={key} className={"card card-hover rev rev-" + (i + 1)} style={{ padding: "18px 20px", textAlign: "left", display: "flex", gap: 14, alignItems: "center" }}
              onClick={() => { const p = { ...prefs, situation: key }; setPrefs(p); setP(p); nav("/portal/home"); }}>
              <span className="avatar" style={{ background: ["oklch(0.5 0.11 150)", "oklch(0.55 0.12 70)", "oklch(0.5 0.10 240)", "oklch(0.5 0.09 195)"][i], width: 44, height: 44, fontSize: 17 }}>{s.label.charAt(0)}</span>
              <span className="grow">
                <span style={{ display: "block", fontWeight: 700, fontFamily: "var(--font-display)", fontSize: 18 }}>{s.label}</span>
                <span style={{ color: "var(--ink-2)", fontSize: 14 }}>{s.blurb}</span>
              </span>
              <Icon name="next" />
            </button>
          ))}
        </div>
      )}
    </PortalShell>
  );
}

/* ---------- resolver-first home ---------- */
function PortalHome({ nav }) {
  const db = useDb();
  const prefs = getPrefs();
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(null);
  const counter = useCountUp(db.counters.resolvedCases);
  const situation = prefs.situation || "asylum_seeker";

  const entries = useMemo(() => db.faq.filter((f) => f.situations.includes(situation)), [db.faq, situation]);
  const q = query.trim().toLowerCase();
  const filtered = q ? entries.filter((f) => (f.translations.en.q + " " + f.translations.en.a).toLowerCase().includes(q)) : entries;
  const videos = db.resources.filter((r) => r.type === "video" && r.situations.includes(situation));
  const byCat = {};
  filtered.forEach((f) => { (byCat[f.category] = byCat[f.category] || []).push(f); });
  const catOrder = CATEGORIES.filter((c) => byCat[c]);

  const submitSearch = (e) => {
    e.preventDefault();
    if (!q) return;
    logSearch(query.trim(), filtered.length, situation);
    if (filtered.length === 0) toast("No results — we logged your question to improve this page");
  };

  return (
    <PortalShell nav={nav} prefs={prefs} showPrefs={true}>
      <div className="col" style={{ gap: 22 }}>
        <div className="rev" style={{ textAlign: "center", marginTop: 8 }}>
          <h1 style={{ fontSize: "clamp(26px, 4.6vw, 36px)" }}>How can we help you?</h1>
          <p style={{ color: "var(--ink-2)", marginTop: 6 }}>
            Answers below are tailored for: <strong>{SITUATIONS[situation].label}</strong>
          </p>
        </div>

        <form className="rev rev-1" onSubmit={submitSearch} style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 16, top: 15, color: "var(--ink-3)" }}><Icon name="search" /></span>
          <input className="input" style={{ paddingLeft: 46, minHeight: 52, borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-1)", background: "var(--n-0)" }}
            placeholder="Search your question… (e.g. housing, work, documents)"
            value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search the FAQ" />
        </form>

        <div className="row rev rev-1" style={{ justifyContent: "center" }}>
          <span className="chip chip-green chip-lg"><Icon name="check" size={15} /> {counter.toLocaleString()} questions resolved by VWN volunteers</span>
        </div>

        {q && filtered.length === 0 ? (
          <EmptyState icon="search" title={'No answers yet for "' + query + '"'}>
            Press Enter to log this question — our team uses it to add missing answers. Or send us your question below.
          </EmptyState>
        ) : null}

        {catOrder.map((cat, ci) => (
          <section key={cat} className={"rev rev-" + Math.min(ci + 2, 6)}>
            <h2 style={{ fontSize: 15, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-3)", marginBottom: 10 }}>{fmt.cap(cat)}</h2>
            <div className="col" style={{ gap: 8 }}>
              {byCat[cat].map((f) => {
                const open = openId === f.id;
                const vids = (f.resourceIds || []).map((id) => db.resources.find((r) => r.id === id)).filter(Boolean);
                return (
                  <div className={"acc" + (open ? " open" : "")} key={f.id}>
                    <button className="acc-q" onClick={() => setOpenId(open ? null : f.id)} aria-expanded={open}>
                      {f.translations.en.q}
                      {f.source === "insight" ? <span className="chip chip-green" style={{ marginLeft: 4 }}>New</span> : null}
                      <span className="acc-caret"><Icon name="down" size={17} /></span>
                    </button>
                    {open ? (
                      <div className="acc-a">
                        {f.translations.en.a}
                        {vids.length ? (
                          <div className="row-wrap" style={{ marginTop: 10 }}>
                            {vids.map((v) => (
                              <a key={v.id} className="chip chip-green chip-lg" href={v.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                                <Icon name="play" size={15} /> {v.titles.en}
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {videos.length ? (
          <section>
            <h2 style={{ fontSize: 15, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ink-3)", marginBottom: 10 }}>Video explanations</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
              {videos.map((v) => (
                <a key={v.id} className="card card-hover" href={v.url} target="_blank" rel="noopener noreferrer" style={{ padding: "14px 16px", textDecoration: "none", color: "inherit", display: "flex", gap: 11, alignItems: "center" }}>
                  <span style={{ color: "var(--green-700)", flex: "none" }}><Icon name="play" size={26} /></span>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{v.titles.en}</span>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        <section className="card" style={{ padding: 22, background: "var(--green-900)", color: "#fff" }}>
          <h2 style={{ fontSize: 20, color: "#fff" }}>Didn't find your answer?</h2>
          <p style={{ color: "oklch(0.88 0.03 150)", marginTop: 4, fontSize: 14.5 }}>A VluchtelingenWerk volunteer will pick this up — usually within one working day.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginTop: 16 }}>
            {[
              { to: "/portal/form", icon: "doc", t: "Send your question", d: "Detailed support form" },
              { to: "/portal/appointment", icon: "calendar", t: "Request an appointment", d: "Digital consultation — video call" },
              { to: "/portal/callback", icon: "phone", t: "Request a callback", d: "We call you back" },
            ].map((c) => (
              <button key={c.to} onClick={() => nav(c.to)} className="card-hover" style={{ background: "oklch(1 0 0 / .1)", borderRadius: "var(--r-md)", padding: "15px 16px", textAlign: "left", color: "#fff", display: "flex", gap: 12, alignItems: "center" }}>
                <Icon name={c.icon} size={22} />
                <span><span style={{ display: "block", fontWeight: 700 }}>{c.t}</span><span style={{ fontSize: 12.5, opacity: 0.75 }}>{c.d}</span></span>
              </button>
            ))}
          </div>
        </section>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button className="card card-hover" style={{ padding: "15px 18px", display: "flex", gap: 12, alignItems: "center", textAlign: "left" }} onClick={() => nav("/portal/map")}>
            <span style={{ color: "var(--green-700)" }}><Icon name="map" size={22} /></span>
            <span><span style={{ display: "block", fontWeight: 700 }}>Find help near you</span><span className="hint">Reception &amp; consultation points</span></span>
          </button>
          <button className="card card-hover" style={{ padding: "15px 18px", display: "flex", gap: 12, alignItems: "center", textAlign: "left" }} onClick={() => nav("/portal/track")}>
            <span style={{ color: "var(--green-700)" }}><Icon name="search" size={22} /></span>
            <span><span style={{ display: "block", fontWeight: 700 }}>Track my case</span><span className="hint">Check status with your RQ-code</span></span>
          </button>
        </div>
      </div>
    </PortalShell>
  );
}

/* ---------- form helpers ---------- */
function validateContact(form) {
  const errs = {};
  if (!form.name || form.name.trim().length < 2) errs.name = "Please enter your full name.";
  if (form.contactMethod === "phone" && !/^\+?[\d\s\-()]{8,}$/.test(form.phone || "")) errs.phone = "Enter a valid phone number (e.g. +31 6 12345678).";
  if (form.contactMethod === "email" && !/^[\w.+-]+@[\w-]+\.[\w.]{2,}$/.test(form.email || "")) errs.email = "Enter a valid email address.";
  if (!form.consent) errs.consent = "Please confirm you agree before sending.";
  return errs;
}

function ConsentBox({ checked, onChange, error }) {
  return (
    <div className="col" style={{ gap: 8 }}>
      <div className="well" style={{ padding: "11px 14px", fontSize: 13, color: "var(--ink-2)" }}>
        <strong>Demo notice:</strong> this is a demonstration system. Please do not enter real personal data — anything you type is sample data only.
      </div>
      <label className="row" style={{ alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 20, height: 20, marginTop: 1, accentColor: "var(--green-700)" }} />
        <span style={{ fontSize: 14 }}>I agree that VluchtelingenWerk may use this information to handle my question. <span className="req">*</span></span>
      </label>
      {error ? <span className="err-msg">{error}</span> : null}
    </div>
  );
}

function FormSuccess({ kase, nav }) {
  return (
    <div className="card rev" style={{ padding: "36px 28px", textAlign: "center" }}>
      <div style={{ display: "inline-flex", padding: 16, borderRadius: 999, background: "var(--green-100)", color: "var(--green-800)", marginBottom: 14 }}><Icon name="check" size={30} /></div>
      <h2 style={{ fontSize: 24 }}>We received your request</h2>
      <p style={{ color: "var(--ink-2)", marginTop: 8 }}>Keep this case code to track your request:</p>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 30, fontWeight: 700, letterSpacing: ".06em", margin: "12px 0 6px", color: "var(--green-800)" }}>{kase.code}</div>
      <p className="hint">A volunteer with the right skills and language will pick this up.</p>
      <div className="row" style={{ justifyContent: "center", marginTop: 20, gap: 10 }}>
        <button className="btn btn-secondary" onClick={() => nav("/portal/track")}>Track my case</button>
        <button className="btn btn-primary" onClick={() => nav("/portal/home")}>Back to help page</button>
      </div>
    </div>
  );
}

/* ---------- support form (F7) ---------- */
function SupportForm({ nav }) {
  const db = useDb();
  const prefs = getPrefs();
  const [f, setF] = useState({ contactMethod: "phone", language: prefs.lang || "en", situation: prefs.situation || "asylum_seeker", emergency: null, consent: false });
  const [errs, setErrs] = useState({});
  const [sent, setSent] = useState(null);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const enabledLangs = getSiteConfig(db).enabledLangs;

  const submit = (e) => {
    e.preventDefault();
    const errors = validateContact(f);
    if (!f.category) errors.category = "Choose the topic that fits best.";
    if (!f.description || f.description.trim().length < 20) errors.description = "Describe your question in at least 20 characters — it helps us route it to the right volunteer.";
    if (f.attachTooBig) errors.attachment = "Attachment must be 1 MB or smaller.";
    setErrs(errors);
    if (Object.keys(errors).length) return;
    const kase = createCase({
      channel: "web",
      requester: { name: f.name.trim(), contactMethod: f.contactMethod, phone: f.phone, email: f.email, municipality: f.municipality, consent: true },
      language: f.language, situation: f.situation, category: f.category,
      originalText: f.description.trim(), selfReportedUrgent: f.emergency === true,
    });
    setSent(kase);
  };

  if (sent) return <PortalShell nav={nav} prefs={prefs} showPrefs><FormSuccess kase={sent} nav={nav} /></PortalShell>;
  return (
    <PortalShell nav={nav} prefs={prefs} showPrefs>
      <BackLink nav={nav} />
      <div className="card rev" style={{ padding: "26px 24px" }}>
        <h1 style={{ fontSize: 26 }}>Send your question</h1>
        <p style={{ color: "var(--ink-2)", margin: "6px 0 20px" }}>Fields with <span className="req">*</span> are required.</p>
        <form className="col" style={{ gap: 16 }} onSubmit={submit} noValidate>
          <Field label="Full name" required error={errs.name}>
            <input className={"input" + (errs.name ? " invalid" : "")} value={f.name || ""} onChange={(e) => set("name", e.target.value)} autoComplete="off" />
          </Field>
          <Field label="How should we contact you?" required>
            <SegControl value={f.contactMethod} onChange={(v) => set("contactMethod", v)}
              options={[{ value: "phone", label: "Phone" }, { value: "email", label: "Email" }, { value: "in_person", label: "In person" }]} />
          </Field>
          {f.contactMethod === "phone" ? (
            <Field label="Phone number" required error={errs.phone}>
              <input className={"input" + (errs.phone ? " invalid" : "")} inputMode="tel" placeholder="+31 6 …" value={f.phone || ""} onChange={(e) => set("phone", e.target.value)} />
            </Field>
          ) : null}
          {f.contactMethod === "email" ? (
            <Field label="Email address" required error={errs.email}>
              <input className={"input" + (errs.email ? " invalid" : "")} inputMode="email" placeholder="you@example.org" value={f.email || ""} onChange={(e) => set("email", e.target.value)} />
            </Field>
          ) : null}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Language" required>
              <select className="select" value={f.language} onChange={(e) => set("language", e.target.value)}>
                {LANGS.filter(([c]) => enabledLangs.includes(c)).map(([c, l]) => <option key={c} value={c}>{l}</option>)}
              </select>
            </Field>
            <Field label="Your situation" required>
              <select className="select" value={f.situation} onChange={(e) => set("situation", e.target.value)}>
                {Object.entries(SITUATIONS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Municipality or AZC location" hint="Optional — helps us find help nearby">
              <input className="input" value={f.municipality || ""} onChange={(e) => set("municipality", e.target.value)} />
            </Field>
            <Field label="Topic" required error={errs.category}>
              <select className={"select" + (errs.category ? " invalid" : "")} value={f.category || ""} onChange={(e) => set("category", e.target.value)}>
                <option value="" disabled>Choose a topic…</option>
                {CATEGORIES.filter((c) => c !== "general").map((c) => <option key={c} value={c}>{fmt.cap(c)}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Describe your question" required error={errs.description} hint={!errs.description ? "Minimum 20 characters. Write in your own language if you prefer — we translate it." : null}>
            <textarea className={"textarea" + (errs.description ? " invalid" : "")} value={f.description || ""} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <Field label="Is this an emergency?">
            <SegControl value={f.emergency} onChange={(v) => set("emergency", v)}
              options={[{ value: false, label: "No" }, { value: true, label: "Yes" }]} />
          </Field>
          {f.emergency === true ? (
            <div className="help-banner" style={{ background: "var(--red-100)", color: "var(--red-700)" }}>
              <strong style={{ flex: "none" }}>112</strong>
              <span>If you or someone else is in immediate danger, call <strong>112</strong> now. This form is not monitored 24/7.</span>
            </div>
          ) : null}
          <Field label="Attachment" hint="Optional, max 1 MB (photo of a letter, document…)" error={errs.attachment}>
            <input className="input" type="file" style={{ paddingTop: 10 }}
              onChange={(e) => { const file = e.target.files[0]; set("attachTooBig", file && file.size > 1024 * 1024); set("attachment", file ? file.name : null); }} />
          </Field>
          <ConsentBox checked={f.consent} onChange={(v) => set("consent", v)} error={errs.consent} />
          <button className="btn btn-primary btn-lg" type="submit">Send my question</button>
        </form>
      </div>
    </PortalShell>
  );
}

/* ---------- appointment (F8) ---------- */
function AppointmentForm({ nav }) {
  const prefs = getPrefs();
  const [f, setF] = useState({ contactMethod: "email", language: prefs.lang || "en", situation: prefs.situation || "asylum_seeker", consent: false });
  const [errs, setErrs] = useState({});
  const [sent, setSent] = useState(null);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const days = useMemo(() => Array.from({ length: 5 }, (_, i) => {
    const d = new Date(Date.now() + (i + 1) * 864e5);
    return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }) };
  }), []);
  const slots = ["09:00", "09:30", "10:30", "11:00", "13:30", "14:30", "15:00", "16:00"];

  const submit = (e) => {
    e.preventDefault();
    const errors = validateContact(f);
    if (!f.topic) errors.topic = "Choose a topic for the consultation.";
    if (!f.date || !f.slot) errors.slot = "Pick a date and a time slot.";
    setErrs(errors);
    if (Object.keys(errors).length) return;
    const kase = createCase({
      channel: "appointment",
      requester: { name: f.name.trim(), contactMethod: f.contactMethod, phone: f.phone, email: f.email, consent: true },
      language: f.language, situation: f.situation, category: f.topic,
      originalText: "Appointment request — digital consultation about " + f.topic + " on " + f.date + " at " + f.slot + ".",
      appointment: { topic: fmt.cap(f.topic), date: f.date, slot: f.slot },
    });
    setSent(kase);
  };

  if (sent) return <PortalShell nav={nav} prefs={prefs} showPrefs><FormSuccess kase={sent} nav={nav} /></PortalShell>;
  return (
    <PortalShell nav={nav} prefs={prefs} showPrefs>
      <BackLink nav={nav} />
      <div className="card rev" style={{ padding: "26px 24px" }}>
        <h1 style={{ fontSize: 26 }}>Request an appointment</h1>
        <p style={{ color: "var(--ink-2)", margin: "6px 0 18px" }}>VWN digital consultation hour — the conversation takes place as a <strong>video call (Teams)</strong>. You receive the link by email or SMS.</p>
        <form className="col" style={{ gap: 16 }} onSubmit={submit} noValidate>
          <Field label="Topic" required error={errs.topic}>
            <select className={"select" + (errs.topic ? " invalid" : "")} value={f.topic || ""} onChange={(e) => set("topic", e.target.value)}>
              <option value="" disabled>Choose a topic…</option>
              {["procedure", "housing", "family", "work", "finance", "education", "documents"].map((c) => <option key={c} value={c}>{fmt.cap(c)}</option>)}
            </select>
          </Field>
          <Field label="Pick a day" required>
            <div className="row-wrap">
              {days.map((d) => (
                <button type="button" key={d.key} className={"btn btn-sm " + (f.date === d.key ? "btn-primary" : "btn-secondary")} onClick={() => set("date", d.key)}>{d.label}</button>
              ))}
            </div>
          </Field>
          <Field label="Pick a time slot" required error={errs.slot} hint={!errs.slot ? "Demo slot grid — production reads real availability" : null}>
            <div className="row-wrap">
              {slots.map((sl) => (
                <button type="button" key={sl} className={"btn btn-sm " + (f.slot === sl ? "btn-primary" : "btn-secondary")} onClick={() => set("slot", sl)} disabled={["09:30", "14:30"].includes(sl)}>{sl}</button>
              ))}
            </div>
          </Field>
          <Field label="Full name" required error={errs.name}>
            <input className={"input" + (errs.name ? " invalid" : "")} value={f.name || ""} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="How should we send the link?" required>
            <SegControl value={f.contactMethod} onChange={(v) => set("contactMethod", v)}
              options={[{ value: "email", label: "Email" }, { value: "phone", label: "SMS" }]} />
          </Field>
          {f.contactMethod === "email" ? (
            <Field label="Email address" required error={errs.email}>
              <input className={"input" + (errs.email ? " invalid" : "")} inputMode="email" value={f.email || ""} onChange={(e) => set("email", e.target.value)} />
            </Field>
          ) : (
            <Field label="Phone number" required error={errs.phone}>
              <input className={"input" + (errs.phone ? " invalid" : "")} inputMode="tel" placeholder="+31 6 …" value={f.phone || ""} onChange={(e) => set("phone", e.target.value)} />
            </Field>
          )}
          <ConsentBox checked={f.consent} onChange={(v) => set("consent", v)} error={errs.consent} />
          <button className="btn btn-primary btn-lg" type="submit">Request appointment</button>
        </form>
      </div>
    </PortalShell>
  );
}

/* ---------- callback (F8) ---------- */
function CallbackForm({ nav }) {
  const prefs = getPrefs();
  const [f, setF] = useState({ contactMethod: "phone", consent: false, window: "Weekdays 09:00–12:00" });
  const [errs, setErrs] = useState({});
  const [sent, setSent] = useState(null);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const submit = (e) => {
    e.preventDefault();
    const errors = validateContact({ ...f, contactMethod: "phone" });
    setErrs(errors);
    if (Object.keys(errors).length) return;
    const kase = createCase({
      channel: "callback",
      requester: { name: f.name.trim(), contactMethod: "phone", phone: f.phone, email: f.email, consent: true },
      language: prefs.lang || "en", situation: prefs.situation,
      originalText: "Callback request" + (f.note ? ": " + f.note : "") + " — preferred window " + f.window + ".",
      callback: { window: f.window },
    });
    setSent(kase);
  };
  if (sent) return <PortalShell nav={nav} prefs={prefs} showPrefs><FormSuccess kase={sent} nav={nav} /></PortalShell>;
  return (
    <PortalShell nav={nav} prefs={prefs} showPrefs>
      <BackLink nav={nav} />
      <div className="card rev" style={{ padding: "26px 24px" }}>
        <h1 style={{ fontSize: 26 }}>Request a callback</h1>
        <p style={{ color: "var(--ink-2)", margin: "6px 0 18px" }}>Leave your number and a volunteer calls you back in your preferred window.</p>
        <form className="col" style={{ gap: 16 }} onSubmit={submit} noValidate>
          <Field label="Full name" required error={errs.name}>
            <input className={"input" + (errs.name ? " invalid" : "")} value={f.name || ""} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Phone number" required error={errs.phone}>
            <input className={"input" + (errs.phone ? " invalid" : "")} inputMode="tel" placeholder="+31 6 …" value={f.phone || ""} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="Email" hint="Optional">
            <input className="input" inputMode="email" value={f.email || ""} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="When can we reach you?" required>
            <select className="select" value={f.window} onChange={(e) => set("window", e.target.value)}>
              {["Weekdays 09:00–12:00", "Weekdays 12:00–17:00", "Weekdays 17:00–20:00", "Any time"].map((w) => <option key={w}>{w}</option>)}
            </select>
          </Field>
          <Field label="What is it about?" hint="Optional, one line helps us prepare">
            <input className="input" value={f.note || ""} onChange={(e) => set("note", e.target.value)} />
          </Field>
          <ConsentBox checked={f.consent} onChange={(v) => set("consent", v)} error={errs.consent} />
          <button className="btn btn-primary btn-lg" type="submit">Request callback</button>
        </form>
      </div>
    </PortalShell>
  );
}

/* ---------- track my case ---------- */
function TrackCase({ nav }) {
  const db = useDb();
  const prefs = getPrefs();
  const [code, setCode] = useState("");
  const [result, setResult] = useState(undefined);
  const submit = (e) => {
    e.preventDefault();
    const c = db.cases.find((x) => x.code.toLowerCase() === code.trim().toLowerCase());
    setResult(c || null);
  };
  return (
    <PortalShell nav={nav} prefs={prefs} showPrefs>
      <BackLink nav={nav} />
      <div className="card rev" style={{ padding: "26px 24px" }}>
        <h1 style={{ fontSize: 26 }}>Track my case</h1>
        <form className="row" style={{ marginTop: 16, gap: 10 }} onSubmit={submit}>
          <input className="input grow" placeholder="RQ-1041" value={code} onChange={(e) => setCode(e.target.value)} style={{ fontFamily: "var(--font-mono)", letterSpacing: ".04em" }} aria-label="Case code" />
          <button className="btn btn-primary" type="submit">Check status</button>
        </form>
        {result === null ? <p className="err-msg" style={{ marginTop: 12 }}>No case found with that code. Check the code on your confirmation screen.</p> : null}
        {result ? (
          <div className="col" style={{ marginTop: 22, gap: 14 }}>
            <div className="row-wrap">
              <span className="chip chip-lg" style={{ fontFamily: "var(--font-mono)" }}>{result.code}</span>
              <span className="chip chip-lg" style={{ background: result.status === "resolved" ? "var(--green-100)" : "var(--amber-100)", color: result.status === "resolved" ? "var(--green-800)" : "var(--amber-700)" }}>
                {STATUS_META[result.status].label}
              </span>
              <ChannelBadge channel={result.channel} lg />
            </div>
            <div className="well" style={{ padding: 16 }}>
              {result.status === "resolved"
                ? <span>Your request is resolved. {result.resolution.statement && !result.resolution.encrypted ? <span><br /><strong>Outcome:</strong> {result.resolution.statement}</span> : "Your volunteer shared the outcome with you directly."}</span>
                : result.status === "in_progress"
                  ? "A volunteer is working on your request. You will be contacted via your preferred channel."
                  : "Your request is waiting for review. It is in the queue with the right team."}
            </div>
            <Timeline items={result.timeline.filter((t) => !t.event.startsWith("AI triage"))} />
          </div>
        ) : null}
      </div>
    </PortalShell>
  );
}

/* ---------- portal map ---------- */
function PortalMap({ nav }) {
  const db = useDb();
  const prefs = getPrefs();
  const situation = prefs.situation || "asylum_seeker";
  const [all, setAll] = useState(false);
  const locs = all ? db.locations : db.locations.filter((l) => l.situations.includes(situation));
  return (
    <PortalShell nav={nav} prefs={prefs} showPrefs>
      <BackLink nav={nav} />
      <div className="spread" style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: 26 }}>Find help near you</h1>
        <SegControl value={all} onChange={setAll} options={[{ value: false, label: "For my situation" }, { value: true, label: "All locations" }]} />
      </div>
      <MapView locations={locs} height={440} fly />
    </PortalShell>
  );
}

/* ---------- QR receipt (token-gated) ---------- */
function ReceiptScreen({ nav, caseId }) {
  const db = useDb();
  const kase = db.cases.find((c) => c.id === caseId || c.code === caseId);
  const [token, setToken] = useState("");
  const [plan, setPlan] = useState(null);
  const [err, setErr] = useState(null);
  const unlock = async (e) => {
    e.preventDefault();
    try {
      const text = await decryptCase(kase.resolution.ciphertext, token.trim());
      setPlan(JSON.parse(text)); setErr(null);
    } catch {
      setErr("That token doesn't match. Check the 6 characters on your hand-off note.");
    }
  };
  return (
    <PortalShell nav={nav} prefs={getPrefs()} showPrefs={false}>
      <div className="card rev" style={{ padding: "26px 24px", maxWidth: 560, margin: "0 auto" }}>
        <div className="row" style={{ gap: 10, marginBottom: 8 }}><Icon name="lock" size={22} /><h1 style={{ fontSize: 24 }}>Your action plan</h1></div>
        {!kase ? <p className="err-msg">Case not found.</p> : !kase.resolution.ciphertext ? (
          <p style={{ color: "var(--ink-2)" }}>This case has no encrypted hand-off yet. Ask your volunteer to complete the Encrypt &amp; Lock step.</p>
        ) : plan ? (
          <div className="col" style={{ gap: 10 }}>
            <p className="hint">Case {kase.code} · decrypted on this device only</p>
            {plan.map((step, i) => (
              <div key={i} className="well" style={{ padding: "12px 14px", display: "flex", gap: 10 }}>
                <span className="avatar" style={{ background: "var(--green-700)", width: 24, height: 24, fontSize: 12 }}>{i + 1}</span>
                <span style={{ fontSize: 14.5 }}>{step}</span>
              </div>
            ))}
            <p className="hint">Demo cryptography (AES-256, WebCrypto) — not audited for production use.</p>
          </div>
        ) : (
          <form className="col" style={{ gap: 12 }} onSubmit={unlock}>
            <p style={{ color: "var(--ink-2)", fontSize: 14.5 }}>Enter the 6-character token your volunteer gave you to unlock the plan for case <strong style={{ fontFamily: "var(--font-mono)" }}>{kase.code}</strong>.</p>
            <input className="input" style={{ fontFamily: "var(--font-mono)", fontSize: 22, letterSpacing: ".3em", textAlign: "center", textTransform: "uppercase" }} maxLength={6} value={token} onChange={(e) => setToken(e.target.value)} aria-label="Unlock token" />
            {err ? <span className="err-msg">{err}</span> : null}
            <button className="btn btn-primary btn-lg" type="submit" disabled={token.trim().length !== 6}>Unlock</button>
          </form>
        )}
      </div>
    </PortalShell>
  );
}

function BackLink({ nav }) {
  return <button className="btn btn-ghost btn-sm" style={{ marginBottom: 12 }} onClick={() => nav("/portal/home")}><Icon name="back" size={16} /> Back to help page</button>;
}

/* ---------- portal router ---------- */
export function PortalApp({ route, nav }) {
  const prefs = getPrefs();
  if (route.startsWith("/receipt/")) return <ReceiptScreen nav={nav} caseId={route.split("/")[2]} />;
  if (route === "/portal" && prefs.lang && prefs.situation) return <PortalHome nav={nav} />;
  if (route === "/portal") return <Onboarding nav={nav} />;
  if (route === "/portal/home") return (prefs.lang && prefs.situation) ? <PortalHome nav={nav} /> : <Onboarding nav={nav} />;
  if (route === "/portal/form") return <SupportForm nav={nav} />;
  if (route === "/portal/appointment") return <AppointmentForm nav={nav} />;
  if (route === "/portal/callback") return <CallbackForm nav={nav} />;
  if (route === "/portal/track") return <TrackCase nav={nav} />;
  if (route === "/portal/map") return <PortalMap nav={nav} />;
  return <Onboarding nav={nav} />;
}
