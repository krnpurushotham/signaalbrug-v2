/* SignaalBrug v2 — Staff map, Content Insights, Analytics (last nav item). */
import React, { useState } from "react";
import { SBStore, AI, fmt } from "../lib/store";
import {
  useDb, Icon, Field, Modal, HelpBanner, EmptyState, toast,
  CHANNELS, SITUATIONS, CATEGORIES,
} from "../components/index.jsx";
import { MapView } from "../components/MapView.jsx";
import { StaffShell } from "./Staff.jsx";

/* ---------- staff map (M8) ---------- */
export function StaffMapScreen({ nav }) {
  const db = useDb();
  const [sit, setSit] = useState(null);
  const locs = sit ? db.locations.filter((l) => l.situations.includes(sit)) : db.locations;
  return (
    <StaffShell route="/staff/map" nav={nav} title="Map — help locations">
      <div className="col" style={{ gap: 14 }}>
        <HelpBanner id="map">Application centres, COA reception, municipal reception and VWN consultation points. The refugee portal shows the same map filtered to the visitor's situation.</HelpBanner>
        <div className="row-wrap">
          <button className={"chip chip-lg" + (!sit ? " chip-green" : "")} onClick={() => setSit(null)}>All situations</button>
          {Object.entries(SITUATIONS).map(([k, s]) => (
            <button key={k} className={"chip chip-lg" + (sit === k ? " chip-green" : "")} onClick={() => setSit(sit === k ? null : k)}>{s.label}</button>
          ))}
        </div>
        <MapView locations={locs} height={520} fly />
      </div>
    </StaffShell>
  );
}

/* ---------- content insights (M7) ---------- */
export function ContentInsights({ nav }) {
  const db = useDb();
  const [draft, setDraft] = useState(null); // {insightId, q, a, category, situations}
  const open = db.insights.filter((i) => i.status === "open");
  const recent = db.searchLog.slice(0, 8);

  const startDraft = (insight) => {
    const query = insight.type === "zero_result" ? insight.payload.query : insight.payload.category + " questions";
    const d = AI.draftFaq(query, insight.payload.situations);
    setDraft({
      insightId: insight.id, q: d.q, a: d.a,
      category: insight.type === "category_gap" ? insight.payload.category : "documents",
      situations: insight.payload.situations && insight.payload.situations.length ? insight.payload.situations : ["asylum_seeker", "ukraine"],
    });
  };
  const approve = () => {
    SBStore.update((d) => {
      d.faq.push({
        id: "f" + Math.random().toString(36).slice(2, 8), category: draft.category, situations: draft.situations,
        translations: { en: { q: draft.q, a: draft.a } }, resourceIds: [], source: "insight",
      });
      const ins = d.insights.find((i) => i.id === draft.insightId);
      if (ins) ins.status = "approved";
    });
    toast("FAQ published — live on the refugee portal now");
    setDraft(null);
  };
  const reject = (id) => {
    SBStore.update((d) => { const ins = d.insights.find((i) => i.id === id); if (ins) ins.status = "rejected"; });
    toast("Insight dismissed");
  };
  const toggleSit = (k) => setDraft((x) => ({ ...x, situations: x.situations.includes(k) ? x.situations.filter((s) => s !== k) : [...x.situations, k] }));

  return (
    <StaffShell route="/staff/insights" nav={nav} title="Content Insights">
      <div className="col" style={{ gap: 14 }}>
        <HelpBanner id="insights">Recurring questions that the portal could not answer become content suggestions. Approving a draft publishes it to the refugee portal instantly — the feedback loop the site never had.</HelpBanner>

        {open.length === 0 ? <EmptyState icon="bulb" title="No open insights">Zero-result searches and category gaps will appear here as visitors use the portal.</EmptyState> : (
          <div className="col" style={{ gap: 10 }}>
            {open.map((ins, i) => (
              <div key={ins.id} className={"card rev rev-" + Math.min(i + 1, 6)} style={{ padding: "16px 18px", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                <span className={"chip chip-lg " + (ins.type === "zero_result" ? "chip-amber" : "chip-violet")}>
                  <span className="dot"></span>{ins.type === "zero_result" ? "Zero results" : "Category gap"}
                </span>
                <div className="grow" style={{ minWidth: 220 }}>
                  {ins.type === "zero_result" ? (
                    <span><strong>“{ins.payload.query}”</strong> searched <strong>{ins.payload.count}×</strong> with no answer
                      {ins.payload.situations && ins.payload.situations.length ? <span className="hint"> · by {ins.payload.situations.map((s) => SITUATIONS[s] ? SITUATIONS[s].short : s).join(", ")}</span> : null}</span>
                  ) : (
                    <span><strong>{fmt.cap(ins.payload.category)}</strong> — {ins.payload.note}</span>
                  )}
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => startDraft(ins)}><Icon name="sparkle" size={15} /> Draft FAQ suggestion</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => reject(ins.id)}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="card" style={{ padding: 18 }}>
          <strong style={{ fontSize: 14 }}>Recent portal searches</strong>
          <div className="col" style={{ gap: 6, marginTop: 10 }}>
            {recent.map((s) => (
              <div key={s.id} className="row" style={{ gap: 10, fontSize: 14 }}>
                <Icon name="search" size={14} />
                <span className="grow">“{s.query}”</span>
                <span className="hint">{s.situation && SITUATIONS[s.situation] ? SITUATIONS[s.situation].short : "—"}</span>
                <span className={"chip" + (s.hits === 0 ? " chip-amber" : "")} style={{ height: 22, fontSize: 11.5 }}>{s.hits} hit{s.hits === 1 ? "" : "s"}</span>
                <span className="hint" style={{ width: 60, textAlign: "right" }}>{fmt.timeAgo(s.ts)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {draft ? (
        <Modal title="Draft FAQ — review & publish" onClose={() => setDraft(null)} wide>
          <div className="col" style={{ gap: 14 }}>
            <span className="chip chip-green" style={{ alignSelf: "flex-start" }}><Icon name="sparkle" size={13} /> Drafted by {AI.label()}</span>
            <Field label="Question">
              <input className="input" value={draft.q} onChange={(e) => setDraft({ ...draft, q: e.target.value })} />
            </Field>
            <Field label="Answer">
              <textarea className="textarea" style={{ minHeight: 130 }} value={draft.a} onChange={(e) => setDraft({ ...draft, a: e.target.value })} />
            </Field>
            <div className="row-wrap" style={{ gap: 14 }}>
              <Field label="Category">
                <select className="select" style={{ minWidth: 160 }} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                  {CATEGORIES.filter((c) => c !== "general").map((c) => <option key={c} value={c}>{fmt.cap(c)}</option>)}
                </select>
              </Field>
              <Field label="Show to (situations)">
                <div className="row-wrap">
                  {Object.entries(SITUATIONS).map(([k, s]) => (
                    <button key={k} className={"chip chip-lg" + (draft.situations.includes(k) ? " chip-green" : "")} onClick={() => toggleSit(k)}>{s.short}</button>
                  ))}
                </div>
              </Field>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <button className="btn btn-primary" onClick={approve} disabled={!draft.situations.length}><Icon name="check" size={16} /> Approve — publish to portal</button>
              <button className="btn btn-ghost" onClick={() => setDraft(null)}>Cancel</button>
            </div>
          </div>
        </Modal>
      ) : null}
    </StaffShell>
  );
}

/* ---------- tiny SVG charts ---------- */
function LineChart({ points, height = 150 }) {
  const w = 560, h = height, pad = 8;
  const max = Math.max(...points.map((p) => p.v), 1);
  const xy = points.map((p, i) => [pad + (i * (w - 2 * pad)) / (points.length - 1), h - pad - ((p.v / max) * (h - 2 * pad))]);
  const path = xy.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  return (
    <svg viewBox={"0 0 " + w + " " + (h + 22)} style={{ width: "100%", display: "block" }}>
      <path d={path + " L" + xy[xy.length - 1][0] + "," + (h - pad) + " L" + xy[0][0] + "," + (h - pad) + " Z"} fill="var(--green-100)" opacity="0.7" />
      <path d={path} fill="none" stroke="var(--green-700)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {xy.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="4" fill="var(--green-700)" stroke="#fff" strokeWidth="2" />)}
      {points.map((p, i) => (
        <text key={i} x={xy[i][0]} y={h + 14} textAnchor="middle" fontSize="11" fill="var(--n-500)" fontFamily="var(--font-body)">{p.label}</text>
      ))}
    </svg>
  );
}

function Donut({ data, size = 170 }) {
  const total = data.reduce((s, d) => s + d.v, 0) || 1;
  const R = 56, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <svg viewBox="0 0 140 140" style={{ width: size, height: size }}>
      {data.map((d, i) => {
        const frac = d.v / total;
        const dash = frac * C;
        const el = (
          <circle key={i} cx="70" cy="70" r={R} fill="none" stroke={d.color} strokeWidth="20"
            strokeDasharray={dash + " " + (C - dash)} strokeDashoffset={-acc * C + C / 4}
            style={{ transition: "stroke-dasharray .5s var(--ease-out)" }} />
        );
        acc += frac;
        return el;
      })}
      <text x="70" y="66" textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--n-900)" fontFamily="var(--font-display)">{total}</text>
      <text x="70" y="84" textAnchor="middle" fontSize="10" fill="var(--n-500)">cases</text>
    </svg>
  );
}

function HBars({ data }) {
  const max = Math.max(...data.map((d) => d.v), 1);
  return (
    <div className="col" style={{ gap: 9 }}>
      {data.map((d) => (
        <div key={d.label} className="row" style={{ gap: 10 }}>
          <span style={{ width: 100, fontSize: 13, fontWeight: 600, color: "var(--ink-2)", flex: "none" }}>{d.label}</span>
          <div className="grow" style={{ background: "var(--n-100)", borderRadius: 6, height: 22, overflow: "hidden" }}>
            <div style={{ width: Math.max(4, (d.v / max) * 100) + "%", height: "100%", background: d.color, borderRadius: 6, transition: "width .6s var(--ease-out)" }}></div>
          </div>
          <span style={{ width: 28, fontSize: 13, fontWeight: 700, textAlign: "right", flex: "none" }}>{d.v}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- analytics (M7, last nav item) ---------- */
export function AnalyticsScreen({ nav }) {
  const db = useDb();
  const resolved = db.cases.filter((c) => c.status === "resolved");
  const openHigh = db.cases.filter((c) => c.status !== "resolved" && c.urgency && c.urgency.level === "high").length;
  const openMed = db.cases.filter((c) => c.status !== "resolved" && c.urgency && c.urgency.level === "medium").length;
  const openLow = db.cases.filter((c) => c.status !== "resolved" && c.urgency && c.urgency.level === "low").length;
  const avgMs = resolved.length ? resolved.reduce((s, c) => s + (new Date(c.timestamps.resolved) - new Date(c.timestamps.created)), 0) / resolved.length : 0;
  const avgH = Math.round(avgMs / 36e5);

  const last7 = db.volume30.slice(-7).map((d) => ({
    label: new Date(d.date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short" }),
    v: d.web + d.walkin + d.email + d.callback + d.appointment + d.voice,
  }));
  // live: today's seeded volume + cases created today in this session
  const todayCount = db.cases.filter((c) => new Date(c.timestamps.created).toDateString() === new Date().toDateString()).length;
  last7[last7.length - 1] = { label: "Today", v: last7[last7.length - 1].v + todayCount };

  const catColors = ["oklch(0.5 0.12 150)", "oklch(0.55 0.12 70)", "oklch(0.5 0.10 240)", "oklch(0.5 0.10 300)", "oklch(0.5 0.09 195)", "oklch(0.5 0.14 25)", "oklch(0.65 0.08 150)", "oklch(0.6 0.05 235)"];
  const catCount = {};
  db.cases.forEach((c) => { const k = c.category || "general"; catCount[k] = (catCount[k] || 0) + 1; });
  const catData = Object.entries(catCount).sort((a, b) => b[1] - a[1]).map(([k, v], i) => ({ label: fmt.cap(k), v, color: catColors[i % catColors.length] }));

  const chanData = Object.entries(CHANNELS).map(([k, m]) => ({
    label: m.label, color: m.dot,
    v: db.cases.filter((c) => c.channel === k).length + db.volume30.slice(-7).reduce((s, d) => s + d[k], 0),
  }));

  return (
    <StaffShell route="/staff/analytics" nav={nav} title="Analytics">
      <div className="col" style={{ gap: 14 }}>
        <HelpBanner id="analytics">The consolidation story in numbers: six channels, one dataset. The channel chart is the slide the team asked for — proof that nothing lives in a silo.</HelpBanner>

        <div className="rev" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <div className="card kpi"><span className="v">{db.counters.totalCases}</span><span className="l">Total cases (all time)</span></div>
          <div className="card kpi"><span className="v" style={{ color: "var(--green-700)" }}>{db.counters.resolvedCases}</span><span className="l">Resolved</span></div>
          <div className="card kpi"><span className="v">{avgH > 48 ? Math.round(avgH / 24) + "d" : avgH + "h"}</span><span className="l">Avg. resolution time</span></div>
          <div className="card kpi">
            <span className="v">{openHigh + openMed + openLow}</span>
            <span className="l">Open by urgency</span>
            <div className="row-wrap" style={{ gap: 5, marginTop: 4 }}>
              <span className="chip chip-red" style={{ height: 22, fontSize: 11.5 }}>{openHigh} high</span>
              <span className="chip chip-amber" style={{ height: 22, fontSize: 11.5 }}>{openMed} med</span>
              <span className="chip" style={{ height: 22, fontSize: 11.5 }}>{openLow} low</span>
            </div>
          </div>
        </div>

        <div className="rev rev-1" style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 12 }}>
          <div className="card" style={{ padding: 20 }}>
            <strong style={{ fontSize: 14 }}>Intake volume — last 7 days</strong>
            <div style={{ marginTop: 14 }}><LineChart points={last7} /></div>
          </div>
          <div className="card" style={{ padding: 20 }}>
            <strong style={{ fontSize: 14 }}>Cases by category</strong>
            <div className="row" style={{ gap: 16, marginTop: 10, flexWrap: "wrap" }}>
              <Donut data={catData} />
              <div className="col" style={{ gap: 5 }}>
                {catData.slice(0, 6).map((d) => (
                  <span key={d.label} className="row" style={{ gap: 7, fontSize: 13 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flex: "none" }}></span>{d.label} <strong>{d.v}</strong>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="card rev rev-2" style={{ padding: 20 }}>
          <div className="spread" style={{ marginBottom: 14 }}>
            <strong style={{ fontSize: 14 }}>Channel breakdown — the consolidation chart</strong>
            <span className="chip chip-green">6 channels → 1 inbox</span>
          </div>
          <HBars data={chanData} />
          <p className="hint" style={{ marginTop: 10 }}>Current cases + 7 days of intake history per channel.</p>
        </div>
      </div>
    </StaffShell>
  );
}
