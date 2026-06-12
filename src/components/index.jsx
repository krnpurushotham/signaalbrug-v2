/* SignaalBrug v2 — shared components, hooks, constants. */
import React, { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import QRCode from "qrcode";
import { SBStore, fmt } from "../lib/store";

/* ---------- hooks ---------- */
export function useDb() {
  // Subscribe on a version counter: the store mutates `db` in place, so the
  // snapshot must change identity on every update or React skips the re-render.
  useSyncExternalStore(
    (cb) => SBStore.subscribe(cb),
    () => SBStore.version
  );
  return SBStore.get();
}

export function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash || "#/");
  useEffect(() => {
    const on = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const nav = useCallback((to) => { window.location.hash = to; window.scrollTo(0, 0); }, []);
  return [hash.replace(/^#/, ""), nav];
}

export function useMedia(query) {
  const [m, setM] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setM(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return m;
}

/* ---------- constants ---------- */
export const CHANNELS = {
  web: { label: "Web form", cls: "chip-green", dot: "oklch(0.5 0.12 150)" },
  appointment: { label: "Appointment", cls: "chip-blue", dot: "oklch(0.5 0.10 240)" },
  callback: { label: "Callback", cls: "chip-teal", dot: "oklch(0.5 0.09 195)" },
  walkin: { label: "Walk-in", cls: "chip-amber", dot: "oklch(0.55 0.12 70)" },
  email: { label: "Email", cls: "chip-violet", dot: "oklch(0.5 0.10 300)" },
  voice: { label: "Voice note", cls: "chip-red", dot: "oklch(0.5 0.14 25)" },
};

export const SITUATIONS = {
  asylum_seeker: { label: "Asylum seeker", short: "Asylum", blurb: "I am in (or starting) the asylum procedure" },
  ukraine: { label: "Fled from Ukraine", short: "Ukraine", blurb: "I came to the Netherlands because of the war in Ukraine" },
  status_holder: { label: "Status holder", short: "Status", blurb: "I have a residence permit and I am building my life here" },
  helper: { label: "I'm helping someone", short: "Helper", blurb: "I support a refugee as a host, volunteer or friend" },
};

export const CATEGORIES = ["housing", "procedure", "work", "finance", "health", "education", "family", "documents", "safety", "general"];

export const LANGS = [
  ["en", "English"], ["nl", "Nederlands"], ["ar", "العربية"], ["uk", "Українська"],
  ["ru", "Русский"], ["fa", "فارسی"], ["ti", "ትግርኛ"], ["tr", "Türkçe"],
  ["fr", "Français"], ["es", "Español"], ["so", "Soomaali"], ["ps", "پښتو"], ["prs", "دری"],
];

export const STATUS_META = {
  pending: { label: "Pending review", color: "var(--amber-700)" },
  in_progress: { label: "In progress", color: "var(--blue-700)" },
  resolved: { label: "Resolved", color: "var(--green-700)" },
};

/* ---------- icons (simple geometric strokes only) ---------- */
export function Icon({ name, size = 18 }) {
  const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  const paths = {
    plus: <g {...s}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></g>,
    inbox: <g {...s}><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 13h5l2 3h4l2-3h5" /></g>,
    board: <g {...s}><rect x="3" y="4" width="5" height="16" rx="1.5" /><rect x="9.5" y="4" width="5" height="11" rx="1.5" /><rect x="16" y="4" width="5" height="8" rx="1.5" /></g>,
    queue: <g {...s}><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="13" y2="18" /></g>,
    map: <g {...s}><circle cx="12" cy="10" r="3" /><path d="M12 21c4-4.5 7-7.5 7-11a7 7 0 1 0-14 0c0 3.5 3 6.5 7 11z" /></g>,
    bulb: <g {...s}><circle cx="12" cy="10" r="5.5" /><line x1="10" y1="18.5" x2="14" y2="18.5" /><line x1="10.5" y1="21" x2="13.5" y2="21" /></g>,
    chart: <g {...s}><line x1="5" y1="20" x2="5" y2="12" /><line x1="12" y1="20" x2="12" y2="5" /><line x1="19" y1="20" x2="19" y2="9" /></g>,
    search: <g {...s}><circle cx="11" cy="11" r="6.5" /><line x1="16" y1="16" x2="21" y2="21" /></g>,
    close: <g {...s}><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></g>,
    check: <g {...s}><path d="M5 13l4.5 4.5L19 7" /></g>,
    back: <g {...s}><path d="M14 6l-6 6 6 6" /></g>,
    next: <g {...s}><path d="M10 6l6 6-6 6" /></g>,
    down: <g {...s}><path d="M6 10l6 6 6-6" /></g>,
    mic: <g {...s}><rect x="9.5" y="3.5" width="5" height="10" rx="2.5" /><path d="M6 11.5a6 6 0 0 0 12 0" /><line x1="12" y1="17.5" x2="12" y2="21" /></g>,
    mail: <g {...s}><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3.5 7l8.5 6 8.5-6" /></g>,
    phone: <g {...s}><rect x="7.5" y="3" width="9" height="18" rx="2.5" /><line x1="10.5" y1="17.5" x2="13.5" y2="17.5" /></g>,
    globe: <g {...s}><circle cx="12" cy="12" r="8.5" /><line x1="3.5" y1="12" x2="20.5" y2="12" /><ellipse cx="12" cy="12" rx="4" ry="8.5" /></g>,
    calendar: <g {...s}><rect x="4" y="5.5" width="16" height="15" rx="2.5" /><line x1="4" y1="10" x2="20" y2="10" /><line x1="8.5" y1="3.5" x2="8.5" y2="7" /><line x1="15.5" y1="3.5" x2="15.5" y2="7" /></g>,
    user: <g {...s}><circle cx="12" cy="8" r="3.8" /><path d="M5 20a7 7 0 0 1 14 0" /></g>,
    lock: <g {...s}><rect x="5.5" y="11" width="13" height="9" rx="2.5" /><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" /></g>,
    play: <g {...s}><circle cx="12" cy="12" r="8.5" /><path d="M10 8.8v6.4L15.4 12z" /></g>,
    help: <g {...s}><circle cx="12" cy="12" r="8.5" /><path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 3.1c-.8.4-1 .9-1 1.8" /><line x1="12" y1="17" x2="12" y2="17.01" /></g>,
    settings: <g {...s}><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="8.5" strokeDasharray="3 3.4" /></g>,
    merge: <g {...s}><circle cx="7" cy="7" r="3" /><circle cx="7" cy="17" r="3" /><path d="M10 7h4a4 4 0 0 1 4 4v6" /><path d="M15.5 14.5L18 17l2.5-2.5" /></g>,
    sparkle: <g {...s}><path d="M12 4l1.8 5.4L19 11l-5.2 1.6L12 18l-1.8-5.4L5 11l5.2-1.6z" /></g>,
    qr: <g {...s}><rect x="4" y="4" width="6.5" height="6.5" rx="1" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1" /><line x1="14" y1="14" x2="14" y2="20" /><line x1="17" y1="14" x2="20" y2="14" /><line x1="17" y1="17" x2="20" y2="20" /></g>,
    doc: <g {...s}><rect x="5" y="3.5" width="14" height="17" rx="2.5" /><line x1="8.5" y1="9" x2="15.5" y2="9" /><line x1="8.5" y1="13" x2="15.5" y2="13" /><line x1="8.5" y1="17" x2="12.5" y2="17" /></g>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">{paths[name] || null}</svg>;
}

/* ---------- atoms ---------- */
export function ChannelBadge({ channel, lg }) {
  const m = CHANNELS[channel] || { label: channel, cls: "" };
  return <span className={"chip " + m.cls + (lg ? " chip-lg" : "")}><span className="dot"></span>{m.label}</span>;
}

export function UrgencyChip({ urgency }) {
  if (!urgency) return null;
  const cls = urgency.level === "high" ? "chip-red" : urgency.level === "medium" ? "chip-amber" : "chip";
  return <span className={"chip " + cls} title={"AI urgency score " + urgency.score + "/100"}>{urgency.level === "high" ? "High" : urgency.level === "medium" ? "Medium" : "Low"} · {urgency.score}</span>;
}

export function Avatar({ vol, size = 32 }) {
  if (!vol) return null;
  return <span className="avatar" style={{ background: vol.color, width: size, height: size, fontSize: size * 0.38 }}>{vol.initials}</span>;
}

export function AssigneeChip({ kase, volunteers }) {
  const v = volunteers.find((x) => x.id === kase.assignedTo);
  if (!v) return <span className="chip chip-amber"><span className="dot"></span>Unassigned</span>;
  return (
    <span className="chip" style={{ background: "var(--n-50)", paddingLeft: 4 }}>
      <Avatar vol={v} size={19} /> {v.name}
    </span>
  );
}

export function SegControl({ options, value, onChange }) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button key={String(o.value)} className={value === o.value ? "on" : ""} onClick={() => onChange(o.value)} role="tab" aria-selected={value === o.value}>
          {o.label}{o.count != null ? <span style={{ opacity: 0.55, marginLeft: 5 }}>{o.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

/* ---------- toasts ---------- */
export function toast(msg) { window.dispatchEvent(new CustomEvent("sb-toast", { detail: msg })); }

export function ToastHost() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const on = (e) => {
      const id = Math.random().toString(36).slice(2);
      setItems((xs) => [...xs, { id, msg: e.detail }]);
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 3400);
    };
    window.addEventListener("sb-toast", on);
    return () => window.removeEventListener("sb-toast", on);
  }, []);
  return (
    <div className="toasts">
      {items.map((t) => (
        <div key={t.id} className="toast"><span className="tick"><Icon name="check" size={17} /></span>{t.msg}</div>
      ))}
    </div>
  );
}

/* ---------- modal ---------- */
export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const on = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={wide ? { width: "min(880px,100%)" } : null} role="dialog" aria-label={title}>
        <div className="modal-head">
          <h3 style={{ fontSize: 19 }}>{title}</h3>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

/* ---------- help banner (dismissible per screen) ---------- */
export function HelpBanner({ id, children }) {
  const db = useDb();
  if (db.helpDismissed && db.helpDismissed[id]) return null;
  return (
    <div className="help-banner rev">
      <span style={{ flex: "none", marginTop: 1 }}><Icon name="help" size={18} /></span>
      <div className="grow" style={{ lineHeight: 1.5 }}>{children}</div>
      <button className="btn btn-ghost btn-sm" style={{ flex: "none", color: "var(--green-800)" }}
        onClick={() => SBStore.update((d) => { d.helpDismissed = d.helpDismissed || {}; d.helpDismissed[id] = true; })}>
        Got it
      </button>
    </div>
  );
}

export function EmptyState({ icon = "inbox", title, children }) {
  return (
    <div className="card" style={{ padding: "44px 24px", textAlign: "center", color: "var(--ink-3)" }}>
      <div style={{ display: "inline-flex", padding: 14, borderRadius: 999, background: "var(--n-50)", marginBottom: 12 }}><Icon name={icon} size={26} /></div>
      <h3 style={{ fontSize: 17, color: "var(--ink-2)", marginBottom: 6 }}>{title}</h3>
      <div style={{ fontSize: 14, maxWidth: 420, margin: "0 auto" }}>{children}</div>
    </div>
  );
}

/* ---------- QR ---------- */
export function QRBox({ text, size = 120, label }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    QRCode.toCanvas(text, { width: size, margin: 1, color: { dark: "#16321f", light: "#ffffff" } }, (err, cv) => {
      if (!err && ref.current) { cv.style.borderRadius = "10px"; ref.current.appendChild(cv); }
    });
  }, [text, size]);
  return (
    <div className="col" style={{ alignItems: "center", gap: 6 }}>
      <div ref={ref} style={{ width: size, height: size, background: "#fff", borderRadius: 10, boxShadow: "var(--shadow-1)" }}></div>
      {label ? <span className="hint" style={{ textAlign: "center" }}>{label}</span> : null}
    </div>
  );
}

/* ---------- timeline ---------- */
export function Timeline({ items }) {
  return (
    <div className="tl">
      {items.map((t, i) => (
        <div className="tl-item" key={i}>
          <div className="tl-rail">
            <span className="tl-dot" style={i === items.length - 1 ? { background: "var(--green-700)", boxShadow: "0 0 0 4px var(--green-100)" } : null}></span>
            {i < items.length - 1 ? <span className="tl-line"></span> : null}
          </div>
          <div className="tl-body">
            <div style={{ fontWeight: 600, fontSize: 14 }}>{t.event}</div>
            <div className="hint">{t.actor} · {fmt.dt(t.at)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- form field ---------- */
export function Field({ label, required, error, hint, children }) {
  return (
    <div className="field">
      <label>{label} {required ? <span className="req">*</span> : null}</label>
      {children}
      {error ? <span className="err-msg">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

/* ---------- brand mark: two arcs meeting = a bridge of signals ---------- */
export function Logo({ size = 34, dark }) {
  const c1 = dark ? "#fff" : "var(--green-700)";
  const c2 = dark ? "oklch(0.8 0.1 150)" : "var(--amber-700)";
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path d="M5 36 A 22 22 0 0 1 43 36" fill="none" stroke={c1} strokeWidth="5" strokeLinecap="round" />
      <path d="M12 36 A 14 14 0 0 1 36 36" fill="none" stroke={c2} strokeWidth="5" strokeLinecap="round" />
      <circle cx="5" cy="36" r="3.4" fill={c1} />
      <circle cx="43" cy="36" r="3.4" fill={c1} />
    </svg>
  );
}

export function Brand({ dark, size = 30 }) {
  return (
    <span className="row" style={{ gap: 9 }}>
      <Logo size={size} dark={dark} />
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: size * 0.62, letterSpacing: "-0.01em", color: dark ? "#fff" : "var(--ink)" }}>
        Signaal<span style={{ color: dark ? "oklch(0.8 0.1 150)" : "var(--green-700)" }}>Brug</span>
      </span>
    </span>
  );
}
