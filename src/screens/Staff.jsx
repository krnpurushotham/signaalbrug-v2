/* SignaalBrug v2 — Staff shell, Add New Entry (walk-in / email / voice), unified Inbox. */
import React, { useState, useRef } from "react";
import { SBStore, AI, fb, getSiteConfig, createCase, fmt } from "../lib/store";
import {
  useDb, Icon, Brand, Avatar, Field, SegControl, ChannelBadge, UrgencyChip, AssigneeChip,
  HelpBanner, EmptyState, toast, CHANNELS, SITUATIONS, CATEGORIES, LANGS,
} from "../components/index.jsx";

export function myUser(db, session) {
  return db.volunteers.find((v) => v.id === (session && session.userId)) || null;
}

/* Volunteers see their own + unassigned cases; admins see everything. */
export function visibleCasesFor(db, session) {
  if (!session || session.role === "admin") return db.cases;
  return db.cases.filter((c) => !c.assignedTo || c.assignedTo === session.userId);
}

/* ---------- shell ---------- */
export function StaffShell({ route, nav, children, title, actions }) {
  const db = useDb();
  const session = SBStore.session.get();
  const me = myUser(db, session);
  const isAdmin = session && session.role === "admin";
  const [settingsOpen, setSettingsOpen] = useState(false);
  const unreadMine = db.cases.filter((c) => c.assignedTo === (me && me.id) && c.unread && c.status !== "resolved").length;
  const pendingCount = visibleCasesFor(db, session).filter((c) => c.status === "pending").length;
  const showAnalytics = isAdmin || getSiteConfig(db).volunteerAnalytics;

  const NAV = [
    { to: "/staff/add", icon: "plus", label: "Add New Entry" },
    { to: "/staff/inbox", icon: "inbox", label: "Inbox", pip: pendingCount || null },
    { to: "/staff/board", icon: "board", label: "Triage Board" },
    { to: "/staff/queue", icon: "queue", label: isAdmin ? "Assignments" : "My Queue", pip: !isAdmin && unreadMine ? unreadMine : null },
    { to: "/staff/map", icon: "map", label: "Map" },
    ...(isAdmin ? [
      { to: "/staff/insights", icon: "bulb", label: "Content Insights" },
      { to: "/staff/users", icon: "user", label: "User Management" },
      { to: "/staff/config", icon: "settings", label: "Site Config" },
    ] : []),
    ...(showAnalytics ? [{ to: "/staff/analytics", icon: "chart", label: "Analytics" }] : []),
  ];
  const isOn = (to) => route === to || (to === "/staff/board" && route.startsWith("/staff/case/"));

  return (
    <div className="shell">
      <aside className="sidebar">
        <button onClick={() => nav("/staff/inbox")} style={{ padding: "2px 10px", display: "inline-flex" }}><Brand dark size={26} /></button>
        <nav className="side-nav" aria-label="Staff navigation">
          {NAV.map((n, i) => (
            <button key={n.to} className={"side-link" + (isOn(n.to) ? " on" : "")} onClick={() => nav(n.to)}>
              <span className="num">{i + 1}</span>
              <Icon name={n.icon} size={17} />
              {n.label}
              {n.pip ? <span className="pip">{n.pip}</span> : null}
            </button>
          ))}
        </nav>
        <div style={{ marginTop: "auto", padding: "10px 6px" }} className="col">
          {me ? (
            <div className="row" style={{ gap: 9, padding: "4px 6px" }}>
              <Avatar vol={me} size={30} />
              <div className="grow" style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: "#fff" }}>{me.name}</div>
                <div style={{ fontSize: 11.5, opacity: 0.7 }}>{isAdmin ? "Admin" : "Volunteer"}</div>
              </div>
              <button className="btn btn-ghost btn-sm" style={{ color: "oklch(0.85 0.03 150)" }} title="Settings" onClick={() => setSettingsOpen(true)}><Icon name="settings" size={16} /></button>
            </div>
          ) : null}
          <button className="btn btn-ghost btn-sm" style={{ color: "oklch(0.8 0.04 150)", justifyContent: "flex-start" }} onClick={() => { SBStore.session.set(null); nav("/"); }}>Home</button>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <h1 className="screen-title grow" style={{ fontSize: 21 }}>{title}</h1>
          {actions}
          {!["/staff/add", "/staff/users", "/staff/config"].includes(route) ? (
            <button className="btn btn-primary" onClick={() => nav("/staff/add")}><Icon name="plus" size={17} /> Add New Entry</button>
          ) : null}
        </div>
        <div className="screen">{children}</div>
      </div>

      <nav className="bottom-nav" aria-label="Staff navigation">
        {NAV.slice(0, 5).map((n) => (
          <button key={n.to} className={isOn(n.to) ? "on" : ""} onClick={() => nav(n.to)}>
            <Icon name={n.icon} size={19} />
            {n.label.split(" ")[0]}
          </button>
        ))}
        {showAnalytics ? (
          <button className={route === "/staff/analytics" ? "on" : ""} onClick={() => nav("/staff/analytics")}><Icon name="chart" size={19} />Stats</button>
        ) : null}
      </nav>

      {settingsOpen ? <SettingsDrawer onClose={() => setSettingsOpen(false)} /> : null}
    </div>
  );
}

/* ---------- settings drawer: AI provider + data source ---------- */
function SettingsDrawer({ onClose }) {
  const db = useDb();
  const [config, setConfig] = useState(db.settings.firebaseConfig || "");
  const [busy, setBusy] = useState(false);
  return (
    <div className="overlay" style={{ justifyContent: "flex-end", alignItems: "stretch", padding: 0 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="drawer col" style={{ gap: 20 }}>
        <div className="spread">
          <h3 style={{ fontSize: 19 }}>Demo settings</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><Icon name="close" /></button>
        </div>

        <div className="col" style={{ gap: 8 }}>
          <strong style={{ fontSize: 14 }}>AI provider</strong>
          <SegControl value={db.settings.aiProvider} onChange={(v) => SBStore.update((d) => { d.settings.aiProvider = v; })}
            options={[{ value: "mock", label: "Mock" }, { value: "gemini", label: "Gemini" }, { value: "anthropic", label: "Anthropic" }]} />
          <p className="hint">
            {db.settings.aiProvider === "mock"
              ? "Deterministic mock — reproducible output, never fails on stage. (Recommended for the demo.)"
              : "Stub: in the production build this switches the AiAdapter to a live model via an API key (VITE_AI_PROVIDER). The demo keeps using mock output."}
          </p>
        </div>

        <div className="col" style={{ gap: 8 }}>
          <strong style={{ fontSize: 14 }}>Data source</strong>
          <div className="row-wrap">
            <span className={"chip chip-lg " + (fb.status === "connected" ? "chip-green" : "")}>
              <span className="dot"></span>{fb.status === "connected" ? "Firebase connected" : "Local dataset (in-browser)"}
            </span>
            {fb.status === "error" ? <span className="chip chip-red">Error</span> : null}
          </div>
          {fb.status !== "connected" ? (
            <div className="col" style={{ gap: 8 }}>
              <p className="hint">Paste your Firebase web config (JSON with apiKey + projectId) to mirror the dataset to Firestore. The app stays fully functional without it.</p>
              <textarea className="textarea" style={{ fontFamily: "var(--font-mono)", fontSize: 12, minHeight: 90 }} placeholder='{"apiKey":"…","projectId":"signaalbrug-demo", …}' value={config} onChange={(e) => setConfig(e.target.value)} />
              {fb.error ? <span className="err-msg">{fb.error}</span> : null}
              <button className="btn btn-secondary btn-sm" disabled={busy || !config.trim()} onClick={async () => { setBusy(true); const ok = await fb.connect(config); setBusy(false); if (ok) toast("Firebase connected — dataset now mirrored to Firestore"); }}>
                {busy ? "Connecting…" : "Connect Firebase"}
              </button>
            </div>
          ) : (
            <div className="row-wrap">
              <button className="btn btn-secondary btn-sm" onClick={async () => { const ok = await fb.pull(); toast(ok ? "Pulled latest snapshot from Firestore" : "No snapshot found yet — make a change to push one"); }}>Pull from Firestore</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { fb.disconnect(); toast("Back to local dataset"); }}>Disconnect</button>
            </div>
          )}
        </div>

        <div className="col" style={{ gap: 8 }}>
          <strong style={{ fontSize: 14 }}>Demo data</strong>
          <button className="btn btn-secondary btn-sm" onClick={() => { SBStore.reset(); toast("Demo reset — fresh seed data loaded"); }}>Reset demo data</button>
          <p className="hint">Restores the seeded cases, FAQ and analytics in ~1 second. Safe between pitches.</p>
        </div>
      </div>
    </div>
  );
}

/* ---------- Add New Entry (F2: first nav item) ---------- */
export function AddEntryScreen({ nav }) {
  const db = useDb();
  const session = SBStore.session.get();
  const me = myUser(db, session);
  const [mode, setMode] = useState("manual");
  return (
    <StaffShell route="/staff/add" nav={nav} title="Add New Entry">
      <div className="col" style={{ gap: 16 }}>
        <HelpBanner id="add">Log anything that comes in outside the portal — a walk-in at a consultation point, a phone call, a forwarded email or a voice note. Everything lands in the same inbox and triage board.</HelpBanner>
        <SegControl value={mode} onChange={setMode} options={[
          { value: "manual", label: "Walk-in / Phone" }, { value: "email", label: "Paste an email" }, { value: "voice", label: "Voice note" },
        ]} />
        {mode === "manual" ? <ManualEntryForm nav={nav} me={me} /> : mode === "email" ? <EmailEntryForm nav={nav} me={me} /> : <VoiceEntryForm nav={nav} me={me} />}
      </div>
    </StaffShell>
  );
}

function entryFormDefaults() {
  return { contactMethod: "in_person", language: "en", situation: "asylum_seeker", channel: "walkin" };
}

function StaffCaseFields({ f, set, errs }) {
  return (
    <React.Fragment>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Full name" required error={errs.name}>
          <input className={"input" + (errs.name ? " invalid" : "")} value={f.name || ""} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Phone or email" error={errs.contact} hint="At least one if follow-up is needed">
          <input className="input" value={f.contact || ""} onChange={(e) => set("contact", e.target.value)} placeholder="+31 6 … or name@…" />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <Field label="Language" required>
          <select className="select" value={f.language} onChange={(e) => set("language", e.target.value)}>
            {LANGS.map(([c, l]) => <option key={c} value={c}>{l}</option>)}
          </select>
        </Field>
        <Field label="Situation" required>
          <select className="select" value={f.situation} onChange={(e) => set("situation", e.target.value)}>
            {Object.entries(SITUATIONS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </select>
        </Field>
        <Field label="Topic" required error={errs.category}>
          <select className={"select" + (errs.category ? " invalid" : "")} value={f.category || ""} onChange={(e) => set("category", e.target.value)}>
            <option value="" disabled>Choose…</option>
            {CATEGORIES.filter((c) => c !== "general").map((c) => <option key={c} value={c}>{fmt.cap(c)}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Description" required error={errs.description} hint={!errs.description ? "Min 20 characters — AI triage runs on this text" : null}>
        <textarea className={"textarea" + (errs.description ? " invalid" : "")} value={f.description || ""} onChange={(e) => set("description", e.target.value)} />
      </Field>
    </React.Fragment>
  );
}

function submitStaffCase(f, me, nav, channel) {
  const isEmail = (f.contact || "").includes("@");
  const kase = createCase({
    channel: channel || f.channel,
    requester: { name: f.name.trim(), contactMethod: isEmail ? "email" : f.contact ? "phone" : "in_person", phone: !isEmail ? f.contact : null, email: isEmail ? f.contact : null, municipality: f.municipality, consent: true },
    language: f.language, situation: f.situation, category: f.category,
    originalText: f.description.trim(), selfReportedUrgent: f.urgent, audioUrl: f.audioUrl,
  }, me ? me.name : "Staff");
  toast("Case " + kase.code + " created — landed in the Inbox");
  nav("/staff/case/" + kase.id);
}

function validateStaffCase(f) {
  const errs = {};
  if (!f.name || f.name.trim().length < 2) errs.name = "Name is required.";
  if (!f.category) errs.category = "Pick a topic.";
  if (!f.description || f.description.trim().length < 20) errs.description = "At least 20 characters.";
  return errs;
}

function ManualEntryForm({ nav, me }) {
  const [f, setF] = useState(entryFormDefaults());
  const [errs, setErrs] = useState({});
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  return (
    <form className="card col" style={{ padding: 22, gap: 16 }} onSubmit={(e) => {
      e.preventDefault();
      const errors = validateStaffCase(f); setErrs(errors);
      if (!Object.keys(errors).length) submitStaffCase(f, me, nav);
    }} noValidate>
      <div className="row-wrap">
        <Field label="Channel" required>
          <SegControl value={f.channel} onChange={(v) => set("channel", v)} options={[
            { value: "walkin", label: "Walk-in" }, { value: "callback", label: "Phone call" },
          ]} />
        </Field>
        <Field label="Logged by">
          <span className="chip chip-lg" style={{ background: "var(--n-50)" }}>{me ? me.name : "Staff"}</span>
        </Field>
        <Field label="Emergency?">
          <SegControl value={!!f.urgent} onChange={(v) => set("urgent", v)} options={[{ value: false, label: "No" }, { value: true, label: "Yes" }]} />
        </Field>
      </div>
      <StaffCaseFields f={f} set={set} errs={errs} />
      <button className="btn btn-primary btn-lg" type="submit" style={{ alignSelf: "flex-start" }}>Create case</button>
    </form>
  );
}

function EmailEntryForm({ nav, me }) {
  const [raw, setRaw] = useState("");
  const [f, setF] = useState(null);
  const [errs, setErrs] = useState({});
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const extract = () => {
    const parsed = AI.parseUnstructured(raw);
    setF({ ...entryFormDefaults(), channel: "email", name: parsed.name || "", contact: parsed.email || parsed.phone || "", description: parsed.description || raw.trim() });
    toast("Fields extracted — review and confirm");
  };
  return (
    <div className="card col" style={{ padding: 22, gap: 16 }}>
      <Field label="Paste the raw email" hint="The AiAdapter extracts name, contact details and the question for you to confirm">
        <textarea className="textarea" style={{ minHeight: 140, fontFamily: "var(--font-mono)", fontSize: 13 }} value={raw} onChange={(e) => setRaw(e.target.value)}
          placeholder={"From: amina@example.org\nSubject: question about my documents\n\nDear VluchtelingenWerk, my name is Amina Yusuf and I …"} />
      </Field>
      <button className="btn btn-secondary" style={{ alignSelf: "flex-start" }} disabled={raw.trim().length < 20} onClick={extract}><Icon name="sparkle" size={16} /> Extract fields with AI</button>
      {f ? (
        <form className="col" style={{ gap: 16, paddingTop: 6 }} onSubmit={(e) => {
          e.preventDefault();
          const errors = validateStaffCase(f); setErrs(errors);
          if (!Object.keys(errors).length) submitStaffCase(f, me, nav, "email");
        }} noValidate>
          <StaffCaseFields f={f} set={set} errs={errs} />
          <button className="btn btn-primary btn-lg" type="submit" style={{ alignSelf: "flex-start" }}>Confirm &amp; create case</button>
        </form>
      ) : null}
    </div>
  );
}

function VoiceEntryForm({ nav, me }) {
  const [recording, setRecording] = useState(false);
  const [supported] = useState(() => !!(window.SpeechRecognition || window.webkitSpeechRecognition));
  const [f, setF] = useState({ ...entryFormDefaults(), channel: "voice" });
  const [errs, setErrs] = useState({});
  const recRef = useRef(null);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const start = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true; rec.interimResults = true; rec.lang = "en-US";
    rec.onresult = (e) => {
      const text = Array.from(e.results).map((r) => r[0].transcript).join(" ");
      set("description", text);
    };
    rec.onend = () => setRecording(false);
    recRef.current = rec; rec.start(); setRecording(true);
    set("audioUrl", "live-recording");
  };
  const stop = () => { if (recRef.current) recRef.current.stop(); setRecording(false); };

  return (
    <div className="card col" style={{ padding: 22, gap: 16 }}>
      <div className="row-wrap">
        {supported ? (
          <button type="button" className={"btn " + (recording ? "btn-danger" : "btn-secondary")} onClick={recording ? stop : start}>
            <Icon name="mic" size={17} /> {recording ? "Stop recording" : "Record voice note"}
          </button>
        ) : (
          <span className="chip chip-amber chip-lg">Speech recognition not available in this browser — type the transcript below</span>
        )}
        {recording ? <span className="chip chip-red"><span className="dot" style={{ animation: "pulse 1s infinite" }}></span>Listening… speak the requester's question</span> : null}
      </div>
      <form className="col" style={{ gap: 16 }} onSubmit={(e) => {
        e.preventDefault();
        const errors = validateStaffCase(f); setErrs(errors);
        if (!Object.keys(errors).length) submitStaffCase(f, me, nav, "voice");
      }} noValidate>
        <StaffCaseFields f={f} set={set} errs={errs} />
        <button className="btn btn-primary btn-lg" type="submit" style={{ alignSelf: "flex-start" }}>Create voice case</button>
      </form>
    </div>
  );
}

/* ---------- unified Inbox ---------- */
export function InboxScreen({ nav }) {
  const db = useDb();
  const session = SBStore.session.get();
  const isVolunteer = session && session.role === "volunteer";
  const [channelFilter, setChannelFilter] = useState(null);
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const visible = visibleCasesFor(db, session);
  const cases = visible
    .filter((c) => (channelFilter ? c.channel === channelFilter : true))
    .filter((c) => (status === "all" ? true : c.status === status))
    .filter((c) => {
      if (!q.trim()) return true;
      const t = q.toLowerCase();
      return (c.code + " " + c.requester.name + " " + c.originalText + " " + (c.translatedText || "")).toLowerCase().includes(t);
    })
    .sort((a, b) => new Date(b.timestamps.created) - new Date(a.timestamps.created));
  const counts = {};
  visible.forEach((c) => { counts[c.channel] = (counts[c.channel] || 0) + 1; });

  return (
    <StaffShell route="/staff/inbox" nav={nav} title="Inbox — all channels">
      <div className="col" style={{ gap: 14 }}>
        <HelpBanner id="inbox">This inbox consolidates all six intake channels — web form, appointments, callbacks, walk-ins, email and voice notes — into one stream. Nothing lives in a silo anymore.</HelpBanner>
        {isVolunteer ? (
          <div className="row-wrap">
            <span className="chip chip-green chip-lg"><span className="dot"></span>Showing your cases + unassigned</span>
            <span className="hint">Cases owned by other volunteers are hidden for you — admins see everything.</span>
          </div>
        ) : null}
        <div className="row-wrap">
          {Object.entries(CHANNELS).map(([key, m]) => (
            <button key={key} className={"chip chip-lg " + (channelFilter === key ? m.cls : "")} style={channelFilter && channelFilter !== key ? { opacity: 0.45 } : null}
              onClick={() => setChannelFilter(channelFilter === key ? null : key)}>
              <span className="dot" style={{ background: m.dot }}></span>{m.label} <span style={{ opacity: 0.6 }}>{counts[key] || 0}</span>
            </button>
          ))}
        </div>
        <div className="row-wrap">
          <SegControl value={status} onChange={setStatus} options={[
            { value: "all", label: "All" }, { value: "pending", label: "Pending" },
            { value: "in_progress", label: "In progress" }, { value: "resolved", label: "Resolved" },
          ]} />
          <div className="grow" style={{ position: "relative", minWidth: 200 }}>
            <span style={{ position: "absolute", left: 12, top: 12, color: "var(--ink-3)" }}><Icon name="search" size={16} /></span>
            <input className="input" style={{ paddingLeft: 38, minHeight: 42 }} placeholder="Search cases…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="col" style={{ gap: 8 }}>
          {cases.length === 0 ? (
            <EmptyState icon="inbox" title="No cases match these filters">Try clearing the channel or status filter, or add a new entry.</EmptyState>
          ) : cases.map((c, i) => (
            <div key={c.id} className={"list-row rev rev-" + Math.min(i + 1, 6)} onClick={() => nav("/staff/case/" + c.id)} role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") nav("/staff/case/" + c.id); }}>
              <span className="code" style={{ fontSize: 13, color: "var(--ink-2)", flex: "none" }}>{c.code}</span>
              <ChannelBadge channel={c.channel} />
              <div className="grow" style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {c.requester.name}
                  <span style={{ fontWeight: 450, color: "var(--ink-3)" }}> · {(c.translatedText || c.originalText).slice(0, 80)}…</span>
                </div>
                <div className="row-wrap" style={{ gap: 6, marginTop: 3 }}>
                  {c.duplicateOf ? <span className="chip chip-amber"><Icon name="merge" size={13} /> Possible duplicate</span> : null}
                  {c.language !== "en" ? <span className="chip">{c.language.toUpperCase()} → EN</span> : null}
                  {(c.tags || []).slice(0, 2).map((t) => <span className="chip" key={t}>{t}</span>)}
                </div>
              </div>
              <UrgencyChip urgency={c.urgency} />
              <AssigneeChip kase={c} volunteers={db.volunteers} />
              <span className="hint" style={{ flex: "none", width: 64, textAlign: "right" }}>{fmt.timeAgo(c.timestamps.created)}</span>
            </div>
          ))}
        </div>
      </div>
    </StaffShell>
  );
}
