/* SignaalBrug v2 — Triage board, skills-based assignment, case detail + resolution cycle, queues. */
import React, { useState, useEffect } from "react";
import { jsPDF } from "jspdf";
import {
  SBStore, AI, getSiteConfig, rankVolunteers, assignCase, moveCase, mergeCases,
  encryptCase, fmt,
} from "../lib/store";
import {
  useDb, useMedia, Icon, Avatar, Field, SegControl, Modal, ChannelBadge, UrgencyChip,
  AssigneeChip, HelpBanner, EmptyState, QRBox, Timeline, toast,
  SITUATIONS, LANGS, STATUS_META,
} from "../components/index.jsx";
import { StaffShell, myUser, visibleCasesFor } from "./Staff.jsx";

/* ---------- assignment modal (F4/M5) ---------- */
export function AssignModal({ kase, onClose, byName }) {
  useDb();
  const ranked = rankVolunteers(kase);
  const [sel, setSel] = useState(ranked.length ? ranked[0].volunteer.id : null);
  const confirm = () => {
    const r = ranked.find((x) => x.volunteer.id === sel);
    assignCase(kase.id, sel, r.score, byName);
    toast("Assigned to " + r.volunteer.name);
    onClose();
  };
  return (
    <Modal title={"Assign " + kase.code} onClose={onClose} wide>
      <div className="col" style={{ gap: 12 }}>
        <div className="help-banner" style={{ marginBottom: 2 }}>
          <Icon name="sparkle" size={17} />
          <span>Suggestions are <strong>ranked by skill match (×3) + language match (×2) − current load</strong>. The score advises — you decide.</span>
        </div>
        <div className="row-wrap" style={{ gap: 6 }}>
          <span className="hint">Case needs:</span>
          {(kase.tags || []).map((t) => <span key={t} className="chip chip-green">{t}</span>)}
          <span className="chip chip-blue">{(LANGS.find(([c]) => c === kase.language) || ["", kase.language])[1]}</span>
        </div>
        <div className="col" style={{ gap: 8 }}>
          {ranked.map((r, i) => {
            const v = r.volunteer;
            const on = sel === v.id;
            return (
              <button key={v.id} onClick={() => setSel(v.id)}
                className="card" style={{
                  display: "flex", gap: 12, alignItems: "center", padding: "13px 16px", textAlign: "left", width: "100%",
                  boxShadow: on ? "inset 0 0 0 2.5px var(--green-600), var(--shadow-2)" : "var(--shadow-1)",
                  opacity: v.available ? 1 : 0.6,
                }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-3)", width: 18 }}>{i + 1}</span>
                <Avatar vol={v} size={38} />
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="row-wrap" style={{ gap: 6 }}>
                    <strong style={{ fontSize: 15, whiteSpace: "nowrap" }}>{v.name}</strong>
                    {!v.available ? <span className="chip chip-amber">Unavailable</span> : null}
                    <span className="hint">{r.open} open case{r.open === 1 ? "" : "s"}</span>
                  </div>
                  <div className="row-wrap" style={{ gap: 5, marginTop: 4 }}>
                    {v.skills.map((s) => <span key={s} className={"chip" + ((kase.tags || []).includes(s) ? " chip-green" : "")} style={{ height: 22, fontSize: 11.5 }}>{s}</span>)}
                    {v.languages.map((l) => <span key={l} className={"chip" + (l === kase.language ? " chip-blue" : "")} style={{ height: 22, fontSize: 11.5 }}>{l.toUpperCase()}</span>)}
                  </div>
                </div>
                <div style={{ textAlign: "right", flex: "none" }}>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: r.score.total > 0 ? "var(--green-700)" : "var(--ink-3)" }}>{r.score.total}</div>
                  <div className="hint" style={{ fontSize: 11 }}>
                    skill {r.score.skill > 0 ? "+" + r.score.skill : "0"} · lang {r.score.language > 0 ? "+" + r.score.language : "0"} · load {r.score.load}{r.score.avail ? " · away " + r.score.avail : ""}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <button className="btn btn-primary btn-lg" disabled={!sel} onClick={confirm} style={{ position: "sticky", bottom: 0 }}>
          <Icon name="check" size={18} /> Confirm assignment
        </button>
      </div>
    </Modal>
  );
}

/* ---------- kanban card ---------- */
function CaseCard({ kase, db, nav, draggable, onDragStart }) {
  const v = db.volunteers.find((x) => x.id === kase.assignedTo);
  return (
    <div className="case-card" style={{ borderLeftColor: v ? v.color : "transparent" }}
      draggable={draggable} onDragStart={onDragStart}
      onClick={() => nav("/staff/case/" + kase.id)} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") nav("/staff/case/" + kase.id); }}>
      <div className="row-wrap" style={{ gap: 6 }}>
        <span className="code" style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{kase.code}</span>
        <ChannelBadge channel={kase.channel} />
        {kase.language !== "en" ? <span className="chip" style={{ height: 22, fontSize: 11 }}>{kase.language.toUpperCase()}</span> : null}
        <span style={{ marginLeft: "auto" }}><UrgencyChip urgency={kase.urgency} /></span>
      </div>
      <p style={{ fontSize: 13.5, color: "var(--ink-2)", margin: "8px 0", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {(kase.translatedText || kase.originalText)}
      </p>
      <div className="row-wrap" style={{ gap: 5 }}>
        {(kase.tags || []).slice(0, 2).map((t) => <span key={t} className="chip" style={{ height: 22, fontSize: 11.5 }}>{t}</span>)}
        {kase.duplicateOf ? <span className="chip chip-amber" style={{ height: 22, fontSize: 11.5 }}><Icon name="merge" size={12} /> dup?</span> : null}
        <span style={{ marginLeft: "auto" }}><AssigneeChip kase={kase} volunteers={db.volunteers} /></span>
      </div>
    </div>
  );
}

/* ---------- triage board (M4) ---------- */
export function TriageBoard({ nav }) {
  const db = useDb();
  const session = SBStore.session.get();
  const me = myUser(db, session);
  const isMobile = useMedia("(max-width: 880px)");
  const [mobileCol, setMobileCol] = useState("pending");
  const [assigneeFilter, setAssigneeFilter] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);

  const isVolunteer = session && session.role === "volunteer";
  const cases = visibleCasesFor(db, session).filter((c) => !assigneeFilter || (assigneeFilter === "none" ? !c.assignedTo : c.assignedTo === assigneeFilter));
  const cols = ["pending", "in_progress", "resolved"];
  const byStatus = (s) => cases.filter((c) => c.status === s)
    .sort((a, b) => (b.urgency ? b.urgency.score : 0) - (a.urgency ? a.urgency.score : 0));

  const drop = (status) => {
    if (!dragId) return;
    moveCase(dragId, status, me ? me.name : "Staff");
    toast("Moved to " + STATUS_META[status].label);
    setDragId(null); setOverCol(null);
  };
  const assignees = isVolunteer ? db.volunteers.filter((v) => v.id === (me && me.id)) : db.volunteers.filter((v) => v.role === "volunteer");

  return (
    <StaffShell route="/staff/board" nav={nav} title="Triage Board">
      <div className="col" style={{ gap: 14 }}>
        <HelpBanner id="board">{isVolunteer ? "You see your own cases plus everything unassigned — pick up what fits your skills. " : ""}Cards are ordered by AI urgency score inside each column. {isMobile ? "Use the tabs to switch columns." : "Drag cards between columns to change status."} Amber “Unassigned” chips show where action is needed.</HelpBanner>
        <div className="row-wrap">
          <span className="hint">Filter by assignee:</span>
          <button className={"chip chip-lg" + (assigneeFilter === "none" ? " chip-amber" : "")} onClick={() => setAssigneeFilter(assigneeFilter === "none" ? null : "none")}>Unassigned</button>
          {assignees.map((v) => (
            <button key={v.id} className="chip chip-lg" style={{ paddingLeft: 5, opacity: assigneeFilter && assigneeFilter !== v.id ? 0.45 : 1, boxShadow: assigneeFilter === v.id ? "inset 0 0 0 2px " + v.color : "none" }}
              onClick={() => setAssigneeFilter(assigneeFilter === v.id ? null : v.id)}>
              <Avatar vol={v} size={21} /> {v.name}
            </button>
          ))}
        </div>
        {isMobile ? (
          <SegControl value={mobileCol} onChange={setMobileCol}
            options={cols.map((c) => ({ value: c, label: STATUS_META[c].label.split(" ")[0], count: byStatus(c).length }))} />
        ) : null}
        <div className={"kanban" + (isMobile ? " seg-mode" : "")}>
          {cols.map((status) => (
            <div key={status} className={"kan-col" + (overCol === status ? " drop-ok" : "") + (mobileCol === status ? " active" : "")}
              onDragOver={(e) => { e.preventDefault(); setOverCol(status); }}
              onDragLeave={() => setOverCol(null)}
              onDrop={() => drop(status)}>
              <div className="kan-head">
                <span className="dot" style={{ width: 9, height: 9, borderRadius: 99, background: STATUS_META[status].color, display: "inline-block" }}></span>
                {STATUS_META[status].label}
                <span className="hint" style={{ marginLeft: "auto" }}>{byStatus(status).length}</span>
              </div>
              <div className="kan-cards">
                {byStatus(status).map((c) => (
                  <CaseCard key={c.id} kase={c} db={db} nav={nav} draggable={!isMobile}
                    onDragStart={(e) => { setDragId(c.id); e.dataTransfer.effectAllowed = "move"; }} />
                ))}
                {byStatus(status).length === 0 ? <div className="hint" style={{ padding: "18px 10px", textAlign: "center" }}>Nothing here</div> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </StaffShell>
  );
}

/* ---------- case detail + resolution (M6) ---------- */
function highlightKeywords(text, keywords) {
  if (!keywords || !keywords.length) return text;
  const parts = [];
  let rest = text;
  let guard = 0;
  while (rest && guard++ < 50) {
    let idx = -1, hit = null;
    keywords.forEach((k) => {
      const i = rest.toLowerCase().indexOf(k.toLowerCase());
      if (i >= 0 && (idx === -1 || i < idx)) { idx = i; hit = k; }
    });
    if (idx === -1) { parts.push(rest); break; }
    parts.push(rest.slice(0, idx));
    parts.push(<mark key={guard} style={{ background: "var(--amber-100)", color: "var(--amber-700)", fontWeight: 700, borderRadius: 4, padding: "0 3px" }}>{rest.slice(idx, idx + hit.length)}</mark>);
    rest = rest.slice(idx + hit.length);
  }
  return parts;
}

export function CaseDetail({ nav, caseId }) {
  const db = useDb();
  const session = SBStore.session.get();
  const me = myUser(db, session);
  const kase = db.cases.find((c) => c.id === caseId);
  const [assignOpen, setAssignOpen] = useState(false);
  const [draftPlan, setDraftPlan] = useState(null);
  const [editing, setEditing] = useState(false);
  const [statement, setStatement] = useState("");
  const [lockResult, setLockResult] = useState(null);

  useEffect(() => {
    if (kase && me && kase.assignedTo === me.id && kase.unread) {
      SBStore.update((d) => { const c = d.cases.find((x) => x.id === caseId); if (c) c.unread = false; });
    }
  }, [caseId]);

  if (!kase) {
    return <StaffShell route="/staff/board" nav={nav} title="Case not found"><EmptyState title="This case no longer exists">It may have been merged into another case.</EmptyState></StaffShell>;
  }
  const assignee = db.volunteers.find((v) => v.id === kase.assignedTo);
  const isVolunteer = session && session.role === "volunteer";
  const allowSelfAssign = getSiteConfig(db).allowSelfAssign;
  const selfAssign = () => {
    if (!me) return;
    const r = rankVolunteers(kase).find((x) => x.volunteer.id === me.id);
    assignCase(kase.id, me.id, r ? r.score : { skill: 0, language: 0, load: 0, total: 0 }, me.name + " (self-assigned)");
    SBStore.update((d) => { const c = d.cases.find((x) => x.id === caseId); if (c) c.unread = false; });
    toast("Added to your queue — " + kase.code);
  };
  const dupTarget = kase.duplicateOf ? db.cases.find((c) => c.id === kase.duplicateOf) : null;
  const actorName = me ? me.name : "Staff";
  const plan = kase.resolution.plan;

  const acceptPlan = (steps) => {
    SBStore.update((d) => {
      const c = d.cases.find((x) => x.id === caseId);
      c.resolution.plan = steps; c.resolution.done = steps.map(() => false);
      c.timeline.push({ event: "Action plan accepted (" + steps.length + " steps)", actor: actorName, at: new Date().toISOString() });
    });
    setDraftPlan(null); setEditing(false);
    toast("Plan accepted");
  };
  const lock = async () => {
    const { token, ciphertext } = await encryptCase(JSON.stringify(plan));
    SBStore.update((d) => {
      const c = d.cases.find((x) => x.id === caseId);
      c.resolution.encrypted = true; c.resolution.ciphertext = ciphertext; c.resolution.tokenHint = token.slice(0, 2);
      c.timeline.push({ event: "Plan encrypted & locked (AES-256, demo cryptography)", actor: actorName, at: new Date().toISOString() });
    });
    setLockResult(token);
  };
  const complete = () => {
    if (statement.trim()) {
      SBStore.update((d) => { const c = d.cases.find((x) => x.id === caseId); c.resolution.statement = statement.trim(); });
    }
    moveCase(caseId, "resolved", actorName);
    toast("Request completed — resolved counter +1");
  };
  const downloadPdf = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18); doc.text("SignaalBrug — hand-off " + kase.code, 14, 20);
      doc.setFontSize(11); doc.setTextColor(90);
      doc.text("Requester: " + kase.requester.name + "   Language: " + kase.language.toUpperCase() + "   Channel: " + kase.channel, 14, 30);
      doc.setTextColor(20); doc.setFontSize(13); doc.text("Action plan", 14, 44);
      doc.setFontSize(11);
      (plan || []).forEach((s, i) => doc.text((i + 1) + ". " + s, 16, 54 + i * 8, { maxWidth: 175 }));
      doc.setFontSize(9); doc.setTextColor(130);
      doc.text("Demo document — dual-language version generated in production. No real client data.", 14, 280);
      doc.save(kase.code + "-handoff.pdf");
    } catch { toast("Could not generate the PDF"); }
  };

  return (
    <StaffShell route={"/staff/case/" + caseId} nav={nav} title={"Case " + kase.code}>
      <div className="col" style={{ gap: 14 }}>
        <button className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={() => nav("/staff/board")}><Icon name="back" size={15} /> Triage Board</button>

        {/* header chips */}
        <div className="row-wrap rev">
          <ChannelBadge channel={kase.channel} lg />
          <span className="chip chip-lg" style={{ background: kase.status === "resolved" ? "var(--green-100)" : kase.status === "in_progress" ? "var(--blue-100)" : "var(--amber-100)", color: kase.status === "resolved" ? "var(--green-800)" : kase.status === "in_progress" ? "var(--blue-700)" : "var(--amber-700)" }}>{STATUS_META[kase.status].label}</span>
          <UrgencyChip urgency={kase.urgency} />
          {kase.situation ? <span className="chip chip-lg">{SITUATIONS[kase.situation].label}</span> : null}
          <span className="hint" style={{ marginLeft: "auto" }}>Created {fmt.dt(kase.timestamps.created)}</span>
        </div>

        {/* duplicate banner */}
        {dupTarget ? (
          <div className="help-banner rev" style={{ background: "var(--amber-100)", color: "var(--amber-700)" }}>
            <Icon name="merge" size={18} />
            <span className="grow">Possible duplicate of <strong>{dupTarget.code}</strong> — same contact details within 7 days ({dupTarget.requester.name}, {dupTarget.channel}).</span>
            <button className="btn btn-sm" style={{ background: "var(--amber-700)", color: "#fff" }} onClick={() => {
              mergeCases(kase.id, dupTarget.id, actorName);
              toast("Merged into " + dupTarget.code);
              nav("/staff/case/" + dupTarget.id);
            }}>Merge into {dupTarget.code}</button>
          </div>
        ) : null}

        {/* assignment banner (F4) */}
        {assignee ? (
          <div className="rev card" style={{ padding: "13px 16px", display: "flex", gap: 12, alignItems: "center", background: "var(--green-50)", boxShadow: "inset 0 0 0 2px " + assignee.color + ", var(--shadow-1)" }}>
            <Avatar vol={assignee} size={36} />
            <div className="grow">
              <strong>Assigned to {assignee.name}</strong>
              <span style={{ color: "var(--ink-2)" }}> — {assignee.skills.map(fmt.cap).join(", ")}, {assignee.languages.map((l) => l.toUpperCase()).join("/")}</span>
              <div className="hint">{fmt.dt(kase.assignment && kase.assignment.at)} by {kase.assignment && kase.assignment.by}{kase.assignment && kase.assignment.score ? " · score " + kase.assignment.score.total + " (skill " + kase.assignment.score.skill + ", lang " + kase.assignment.score.language + ", load " + kase.assignment.score.load + ")" : ""}</div>
            </div>
            {!isVolunteer ? <button className="btn btn-secondary btn-sm" onClick={() => setAssignOpen(true)}>Reassign</button> : null}
          </div>
        ) : (
          <div className="rev card" style={{ padding: "13px 16px", display: "flex", gap: 12, alignItems: "center", background: "var(--amber-100)" }}>
            <span className="chip chip-amber chip-lg"><span className="dot"></span>Unassigned</span>
            <span className="grow" style={{ color: "var(--amber-700)", fontWeight: 600 }}>This case is waiting for a volunteer.</span>
            {isVolunteer ? (
              allowSelfAssign ? (
                <button className="btn btn-primary" onClick={selfAssign}><Icon name="user" size={16} /> Assign to me</button>
              ) : null
            ) : (
              <button className="btn btn-primary" onClick={() => setAssignOpen(true)}><Icon name="user" size={16} /> Assign volunteer</button>
            )}
          </div>
        )}

        {/* requester + message */}
        <div className="rev rev-1" style={{ display: "grid", gridTemplateColumns: kase.translatedText ? "1fr 1fr" : "1fr", gap: 12 }}>
          <div className="card" style={{ padding: 18 }}>
            <div className="spread" style={{ marginBottom: 8 }}>
              <strong style={{ fontSize: 14, whiteSpace: "nowrap" }}>Original{kase.language !== "en" ? " — " + (((LANGS.find(([c]) => c === kase.language) || [])[1]) || kase.language) : ""}</strong>
              {kase.audioUrl ? <span className="chip chip-red"><Icon name="mic" size={13} /> voice</span> : null}
            </div>
            <p style={{ lineHeight: 1.65, fontSize: 15, direction: /[؀-ۿ]/.test(kase.originalText) ? "rtl" : "ltr" }}>{kase.originalText}</p>
          </div>
          {kase.translatedText ? (
            <div className="card" style={{ padding: 18, background: "var(--green-50)" }}>
              <div className="spread" style={{ marginBottom: 8 }}>
                <strong style={{ fontSize: 14, whiteSpace: "nowrap" }}>English translation</strong>
                <span className="chip chip-green"><Icon name="sparkle" size={13} /> {AI.label().split(" ")[0]} AI</span>
              </div>
              <p style={{ lineHeight: 1.65, fontSize: 15 }}>{highlightKeywords(kase.translatedText, kase.urgency && kase.urgency.keywords)}</p>
            </div>
          ) : null}
        </div>

        <div className="rev rev-2" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, alignItems: "start" }}>
          <div className="col" style={{ gap: 12 }}>
            {/* meta */}
            <div className="card" style={{ padding: 18 }}>
              <strong style={{ fontSize: 14 }}>Requester</strong>
              <div className="row-wrap" style={{ marginTop: 8, gap: 6 }}>
                <span className="chip chip-lg"><Icon name="user" size={14} /> {kase.requester.name}</span>
                {kase.requester.phone ? <span className="chip chip-lg"><Icon name="phone" size={14} /> {kase.requester.phone}</span> : null}
                {kase.requester.email ? <span className="chip chip-lg"><Icon name="mail" size={14} /> {kase.requester.email}</span> : null}
                {kase.requester.municipality ? <span className="chip chip-lg"><Icon name="map" size={14} /> {kase.requester.municipality}</span> : null}
                {kase.appointment ? <span className="chip chip-blue chip-lg"><Icon name="calendar" size={14} /> {kase.appointment.topic} · {kase.appointment.date} {kase.appointment.slot}</span> : null}
                {kase.callback ? <span className="chip chip-teal chip-lg"><Icon name="phone" size={14} /> Callback: {kase.callback.window}</span> : null}
                {(kase.tags || []).map((t) => <span key={t} className="chip chip-lg">{t}</span>)}
              </div>
            </div>

            {/* resolution cycle */}
            <div className="card col" style={{ padding: 18, gap: 14 }}>
              <div className="spread">
                <strong style={{ fontSize: 14 }}>Action plan</strong>
                {plan ? <span className="chip chip-green"><Icon name="check" size={13} /> accepted</span> : null}
              </div>
              {!plan && !draftPlan ? (
                <button className="btn btn-secondary" style={{ alignSelf: "flex-start" }} onClick={() => setDraftPlan(AI.draftPlan(kase))}>
                  <Icon name="sparkle" size={16} /> Draft action plan with AI
                </button>
              ) : null}
              {draftPlan ? (
                <div className="col" style={{ gap: 8 }}>
                  <span className="chip chip-green" style={{ alignSelf: "flex-start" }}><Icon name="sparkle" size={13} /> AI suggestion — review before accepting</span>
                  {draftPlan.map((s, i) => editing ? (
                    <input key={i} className="input" value={s} onChange={(e) => setDraftPlan(draftPlan.map((x, j) => j === i ? e.target.value : x))} />
                  ) : (
                    <div key={i} className="well" style={{ padding: "10px 13px", display: "flex", gap: 10, fontSize: 14.5 }}>
                      <span style={{ fontWeight: 700, color: "var(--green-700)" }}>{i + 1}</span>{s}
                    </div>
                  ))}
                  <div className="row-wrap">
                    <button className="btn btn-primary btn-sm" onClick={() => acceptPlan(draftPlan)}><Icon name="check" size={15} /> Accept plan</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditing(!editing)}>{editing ? "Done editing" : "Edit steps"}</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setDraftPlan([...AI.draftPlan(kase).slice(1), "Verify outcome with the requester in their own language"])}>Regenerate</button>
                  </div>
                </div>
              ) : null}
              {plan ? (
                <div className="col" style={{ gap: 8 }}>
                  {plan.map((s, i) => (
                    <label key={i} className="well row" style={{ padding: "10px 13px", gap: 10, cursor: "pointer", textDecoration: kase.resolution.done && kase.resolution.done[i] ? "line-through" : "none", color: kase.resolution.done && kase.resolution.done[i] ? "var(--ink-3)" : "inherit" }}>
                      <input type="checkbox" checked={!!(kase.resolution.done && kase.resolution.done[i])} style={{ width: 18, height: 18, accentColor: "var(--green-700)" }}
                        onChange={(e) => SBStore.update((d) => { const c = d.cases.find((x) => x.id === caseId); c.resolution.done = c.resolution.done || plan.map(() => false); c.resolution.done[i] = e.target.checked; })} />
                      <span style={{ fontSize: 14.5 }}>{s}</span>
                    </label>
                  ))}
                </div>
              ) : null}

              {plan && kase.status !== "resolved" ? (
                <div className="col" style={{ gap: 10, paddingTop: 4 }}>
                  <Field label="Resolution statement" hint="One or two lines on the outcome — shown to the requester in Track my case">
                    <textarea className="textarea" style={{ minHeight: 70 }} value={statement} onChange={(e) => setStatement(e.target.value)} />
                  </Field>
                  <div className="row-wrap">
                    {!kase.resolution.encrypted ? (
                      <button className="btn btn-secondary" onClick={lock}><Icon name="lock" size={16} /> Encrypt &amp; Lock hand-off</button>
                    ) : <span className="chip chip-green chip-lg"><Icon name="lock" size={14} /> Locked · token {kase.resolution.tokenHint}····</span>}
                    <button className="btn btn-secondary" onClick={downloadPdf}><Icon name="doc" size={16} /> PDF hand-off</button>
                    <button className="btn btn-primary" onClick={complete}><Icon name="check" size={16} /> Complete Request</button>
                  </div>
                  <p className="hint">Encrypt &amp; Lock uses AES-256 via WebCrypto — demo cryptography, not audited.</p>
                </div>
              ) : null}
              {kase.status === "resolved" ? (
                <div className="help-banner"><Icon name="check" size={17} /><span>Resolved {fmt.dt(kase.timestamps.resolved)}{kase.resolution.statement ? " — “" + kase.resolution.statement + "”" : ""}</span></div>
              ) : null}
            </div>
          </div>

          <div className="col" style={{ gap: 12 }}>
            {/* status mover */}
            <div className="card col" style={{ padding: 16, gap: 8 }}>
              <strong style={{ fontSize: 14 }}>Status</strong>
              {["pending", "in_progress", "resolved"].map((s) => (
                <button key={s} className={"btn btn-sm " + (kase.status === s ? "btn-primary" : "btn-secondary")} disabled={kase.status === s}
                  onClick={() => { moveCase(caseId, s, actorName); toast("Moved to " + STATUS_META[s].label); }}>
                  {STATUS_META[s].label}
                </button>
              ))}
            </div>
            <div className="card" style={{ padding: 16 }}>
              <strong style={{ fontSize: 14 }}>Activity</strong>
              <div style={{ marginTop: 12 }}><Timeline items={kase.timeline} /></div>
            </div>
          </div>
        </div>
      </div>

      {assignOpen ? <AssignModal kase={kase} byName={actorName} onClose={() => setAssignOpen(false)} /> : null}
      {lockResult ? (
        <Modal title="Hand-off locked" onClose={() => setLockResult(null)}>
          <div className="col" style={{ gap: 14, alignItems: "center", textAlign: "center", padding: "6px 0 10px" }}>
            <p style={{ color: "var(--ink-2)", maxWidth: 380 }}>Give the requester this token (or the QR). The plan decrypts only on their device.</p>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 38, fontWeight: 700, letterSpacing: ".25em", color: "var(--green-800)" }}>{lockResult}</div>
            <QRBox text={window.location.href.split("#")[0] + "#/receipt/" + kase.id} size={150} label={"Scan → enter token → localized plan (" + kase.code + ")"} />
            <p className="hint">Demo cryptography — AES-256-CBC via WebCrypto, key = SHA-256 of the token.</p>
          </div>
        </Modal>
      ) : null}
    </StaffShell>
  );
}

/* ---------- My Queue (volunteer) / Assignments (admin) ---------- */
export function QueueScreen({ nav }) {
  const db = useDb();
  const session = SBStore.session.get();
  const me = myUser(db, session);
  const isAdmin = session && session.role === "admin";
  const allowSelfAssign = getSiteConfig(db).allowSelfAssign;

  if (!isAdmin) {
    const mine = db.cases.filter((c) => c.assignedTo === (me && me.id));
    const open = mine.filter((c) => c.status !== "resolved");
    const closed = mine.filter((c) => c.status === "resolved");
    const pickup = db.cases.filter((c) => !c.assignedTo && c.status !== "resolved")
      .sort((a, b) => (b.urgency ? b.urgency.score : 0) - (a.urgency ? a.urgency.score : 0));
    const pickUp = (c) => {
      const r = rankVolunteers(c).find((x) => x.volunteer.id === me.id);
      assignCase(c.id, me.id, r ? r.score : { skill: 0, language: 0, load: 0, total: 0 }, me.name + " (self-assigned)");
      SBStore.update((d) => { const x = d.cases.find((y) => y.id === c.id); if (x) x.unread = false; });
      toast("Added to your queue — " + c.code);
    };
    return (
      <StaffShell route="/staff/queue" nav={nav} title="My Queue">
        <div className="col" style={{ gap: 14 }}>
          <HelpBanner id="queue">Cases assigned to you land here, ranked by urgency — a green dot means new since you last looked. Below, every unassigned case is open for pick-up: “Assign to me” puts it in your queue instantly.</HelpBanner>
          {open.length === 0 ? <EmptyState icon="queue" title="Your queue is clear">New assignments appear here the moment an admin confirms them.</EmptyState> : (
            <div className="col" style={{ gap: 8 }}>
              {open.sort((a, b) => (b.urgency.score - a.urgency.score)).map((c) => (
                <div key={c.id} className="list-row" onClick={() => nav("/staff/case/" + c.id)}>
                  {c.unread ? <span style={{ width: 9, height: 9, borderRadius: 99, background: "var(--green-600)", flex: "none", boxShadow: "0 0 0 4px var(--green-100)" }}></span> : null}
                  <span className="code" style={{ fontSize: 13, flex: "none" }}>{c.code}</span>
                  <ChannelBadge channel={c.channel} />
                  <span className="grow" style={{ fontWeight: 600, fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.requester.name} · <span style={{ fontWeight: 450, color: "var(--ink-3)" }}>{(c.translatedText || c.originalText).slice(0, 70)}…</span></span>
                  <UrgencyChip urgency={c.urgency} />
                </div>
              ))}
            </div>
          )}
          {pickup.length ? (
            <div className="col" style={{ gap: 8 }}>
              <h3 style={{ fontSize: 14, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".07em" }}>Available to pick up · {pickup.length}</h3>
              {pickup.map((c) => {
                const skillFit = me && (c.tags || []).some((t) => me.skills.includes(t));
                const langFit = me && me.languages.includes(c.language);
                return (
                  <div key={c.id} className="list-row" onClick={() => nav("/staff/case/" + c.id)}>
                    <span className="code" style={{ fontSize: 13, flex: "none" }}>{c.code}</span>
                    <ChannelBadge channel={c.channel} />
                    <span className="grow" style={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.requester.name} · <span style={{ color: "var(--ink-3)" }}>{(c.translatedText || c.originalText).slice(0, 56)}…</span></span>
                    {skillFit ? <span className="chip chip-green" style={{ height: 22, fontSize: 11.5 }}>skill fit</span> : null}
                    {langFit && c.language !== "en" ? <span className="chip chip-blue" style={{ height: 22, fontSize: 11.5 }}>{c.language.toUpperCase()}</span> : null}
                    <UrgencyChip urgency={c.urgency} />
                    {allowSelfAssign ? (
                      <button className="btn btn-secondary btn-sm" style={{ flex: "none" }} onClick={(e) => { e.stopPropagation(); pickUp(c); }}>Assign to me</button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : null}
          {closed.length ? (
            <div className="col" style={{ gap: 8 }}>
              <h3 style={{ fontSize: 14, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".07em" }}>Recently resolved by you</h3>
              {closed.map((c) => (
                <div key={c.id} className="list-row" style={{ opacity: 0.7 }} onClick={() => nav("/staff/case/" + c.id)}>
                  <span className="code" style={{ fontSize: 13 }}>{c.code}</span>
                  <span className="grow" style={{ fontSize: 14 }}>{c.requester.name}</span>
                  <span className="chip chip-green">Resolved</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </StaffShell>
    );
  }

  // Admin: assignments grouped by volunteer + availability toggles
  const vols = db.volunteers.filter((v) => v.role === "volunteer");
  const unassigned = db.cases.filter((c) => !c.assignedTo && c.status !== "resolved");
  return (
    <StaffShell route="/staff/queue" nav={nav} title="Assignments">
      <div className="col" style={{ gap: 14 }}>
        <HelpBanner id="assignments">Workload per volunteer at a glance. Toggle availability to take someone out of the suggestion ranking — it never blocks manual assignment.</HelpBanner>
        {unassigned.length ? (
          <div className="card" style={{ padding: 16 }}>
            <div className="row-wrap" style={{ marginBottom: 10 }}>
              <span className="chip chip-amber chip-lg"><span className="dot"></span>Unassigned · {unassigned.length}</span>
              <span className="hint">These need an owner — open one and hit Assign.</span>
            </div>
            <div className="col" style={{ gap: 8 }}>
              {unassigned.map((c) => (
                <div key={c.id} className="list-row" style={{ boxShadow: "var(--shadow-1)" }} onClick={() => nav("/staff/case/" + c.id)}>
                  <span className="code" style={{ fontSize: 13, flex: "none" }}>{c.code}</span>
                  <ChannelBadge channel={c.channel} />
                  <span className="grow" style={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.requester.name} · {(c.translatedText || c.originalText).slice(0, 60)}…</span>
                  <UrgencyChip urgency={c.urgency} />
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))", gap: 12 }}>
          {vols.map((v) => {
            const cs = db.cases.filter((c) => c.assignedTo === v.id && c.status !== "resolved");
            return (
              <div key={v.id} className="card col" style={{ padding: 16, gap: 10, borderTop: "4px solid " + v.color, borderRadius: "var(--r-lg)" }}>
                <div className="row" style={{ gap: 10 }}>
                  <Avatar vol={v} size={36} />
                  <div className="grow">
                    <strong>{v.name}</strong>
                    <div className="hint">{v.skills.join(" · ")} — {v.languages.map((l) => l.toUpperCase()).join("/")}</div>
                  </div>
                  <button className={"chip " + (v.available ? "chip-green" : "chip-amber")} title="Toggle availability"
                    onClick={() => { SBStore.update((d) => { const x = d.volunteers.find((y) => y.id === v.id); x.available = !x.available; }); toast(v.name + (v.available ? " set unavailable" : " set available")); }}>
                    <span className="dot"></span>{v.available ? "Available" : "Away"}
                  </button>
                </div>
                {cs.length === 0 ? <span className="hint">No open cases</span> : cs.map((c) => (
                  <div key={c.id} className="well row" style={{ padding: "9px 12px", gap: 8, cursor: "pointer" }} onClick={() => nav("/staff/case/" + c.id)}>
                    <span className="code" style={{ fontSize: 12 }}>{c.code}</span>
                    <span className="grow" style={{ fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{(c.translatedText || c.originalText).slice(0, 44)}…</span>
                    <UrgencyChip urgency={c.urgency} />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </StaffShell>
  );
}
