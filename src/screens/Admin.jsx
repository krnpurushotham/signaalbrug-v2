/* SignaalBrug v2 — Admin screens: User Management & Site Config (+ CSV export). */
import React, { useState } from "react";
import { SBStore, getSiteConfig, patchSiteConfig, openCount } from "../lib/store";
import {
  useDb, Icon, Avatar, Field, SegControl, Modal, HelpBanner, toast, LANGS,
} from "../components/index.jsx";
import { StaffShell } from "./Staff.jsx";

const ADMIN_SKILLS = ["housing", "legal", "medical", "finance", "education", "safety", "family", "work", "return"];
const ADMIN_USER_COLORS = ["oklch(0.55 0.12 150)", "oklch(0.55 0.11 240)", "oklch(0.55 0.12 70)", "oklch(0.55 0.11 300)", "oklch(0.55 0.10 195)", "oklch(0.50 0.13 25)"];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const initialsOf = (name) => name.trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

/* ---------- small shared controls ---------- */
/* Toggle — same SegControl pattern as the "Emergency?" toggle on Add New Entry. */
function CfgToggle({ on, onChange, label, hint, onLabel = "Enabled", offLabel = "Disabled" }) {
  return (
    <div className="col" style={{ gap: 6 }}>
      <strong style={{ fontSize: 14 }}>{label}</strong>
      <div>
        <SegControl value={!!on} onChange={(v) => onChange(v)}
          options={[{ value: false, label: offLabel }, { value: true, label: onLabel }]} />
      </div>
      {hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}

function ChipPick({ options, value, onChange, render }) {
  const toggle = (v) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className="row-wrap" style={{ gap: 6 }}>
      {options.map((o) => {
        const v = Array.isArray(o) ? o[0] : o;
        const on = value.includes(v);
        return (
          <button key={v} className="chip" onClick={() => toggle(v)}
            style={{
              background: on ? "var(--green-100)" : "var(--n-100)",
              color: on ? "var(--green-800)" : "var(--ink-2)",
              border: on ? "1px solid var(--green-700)" : "1px solid transparent",
              fontWeight: 600,
            }}>
            {render ? render(o) : v}
          </button>
        );
      })}
    </div>
  );
}

/* ---------- add / edit user modal ---------- */
function UserModal({ user, onClose }) {
  const isEdit = !!user;
  const [f, setF] = useState(user
    ? { name: user.name, role: user.role, skills: [...user.skills], languages: [...user.languages], available: user.available }
    : { name: "", role: "volunteer", skills: [], languages: ["en"], available: true });
  const [errs, setErrs] = useState({});

  const save = () => {
    const e = {};
    if (!f.name.trim()) e.name = "Name is required";
    if (!f.skills.length) e.skills = "Pick at least one skill";
    if (!f.languages.length) e.languages = "Pick at least one language";
    setErrs(e);
    if (Object.keys(e).length) return;

    if (isEdit) {
      SBStore.update((d) => {
        const u = d.volunteers.find((v) => v.id === user.id);
        if (!u) return;
        u.name = f.name.trim(); u.role = f.role; u.skills = f.skills;
        u.languages = f.languages; u.available = f.available;
        u.initials = initialsOf(f.name);
      });
      toast("User updated");
    } else {
      const name = f.name.trim();
      SBStore.update((d) => {
        d.volunteers.push({
          id: "v" + Math.random().toString(36).slice(2, 8),
          name,
          initials: initialsOf(name),
          color: ADMIN_USER_COLORS[d.volunteers.length % ADMIN_USER_COLORS.length],
          role: f.role, skills: f.skills, languages: f.languages, available: f.available,
        });
      });
      toast("User created");
    }
    onClose();
  };

  return (
    <Modal title={isEdit ? "Edit user" : "Create new user"} onClose={onClose}>
      <div className="col" style={{ gap: 14 }}>
        <Field label="Full name" required error={errs.name}>
          <input className={"input" + (errs.name ? " invalid" : "")} value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Amira S." />
        </Field>
        <Field label="Role" required>
          <SegControl value={f.role} onChange={(v) => setF({ ...f, role: v })}
            options={[{ value: "volunteer", label: "Volunteer" }, { value: "admin", label: "Admin" }]} />
        </Field>
        <Field label="Skills" required error={errs.skills} hint={!errs.skills ? "Used to match cases to the right person." : null}>
          <ChipPick options={ADMIN_SKILLS} value={f.skills}
            onChange={(v) => setF({ ...f, skills: v })}
            render={(s) => cap(s)} />
        </Field>
        <Field label="Languages" required error={errs.languages}>
          <ChipPick options={LANGS} value={f.languages}
            onChange={(v) => setF({ ...f, languages: v })}
            render={([, label]) => label} />
        </Field>
        <CfgToggle on={f.available} onChange={(v) => setF({ ...f, available: v })}
          label="Availability" onLabel="Available" offLabel="Away" />
        <div className="row" style={{ justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>{isEdit ? "Save changes" : "Create user"}</button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- User Management (admin) ---------- */
export function UserManagementScreen({ nav }) {
  const db = useDb();
  const [modal, setModal] = useState(null); // null | "new" | user object
  const users = db.volunteers;
  const availableNow = users.filter((u) => u.available).length;
  const totalOpen = db.cases.filter((c) => c.assignedTo && c.status !== "resolved").length;
  const maxOpen = Math.max(1, ...users.map((u) => openCount(u.id)));

  const resolvedBy = (id) => db.cases.filter((c) => c.assignedTo === id && c.status === "resolved").length;

  const setAvail = (u, v) => {
    SBStore.update((d) => {
      const x = d.volunteers.find((vv) => vv.id === u.id);
      if (x) x.available = v;
    });
  };

  const removeUser = (u) => {
    if (openCount(u.id) > 0) return;
    if (!window.confirm("Remove " + u.name + "? Their resolved case history is kept.")) return;
    SBStore.update((d) => {
      d.volunteers = d.volunteers.filter((v) => v.id !== u.id);
    });
    toast("User removed");
  };

  return (
    <StaffShell route="/staff/users" nav={nav} title="User Management"
      actions={<button className="btn btn-secondary" onClick={() => setModal("new")}><Icon name="plus" size={16} /> New user</button>}>
      <div className="col" style={{ gap: 14 }}>
        <HelpBanner id="users">Manage the staff pool: create users, set skills and languages, flip availability, and keep an eye on workload. Matching uses skills + language + current load.</HelpBanner>

        <div className="row-wrap" style={{ gap: 10 }}>
          <div className="card" style={{ padding: "12px 18px" }}><b style={{ fontSize: 20, fontFamily: "var(--font-display)" }}>{users.length}</b><div className="hint">staff members</div></div>
          <div className="card" style={{ padding: "12px 18px" }}><b style={{ fontSize: 20, fontFamily: "var(--font-display)" }}>{availableNow}</b><div className="hint">available now</div></div>
          <div className="card" style={{ padding: "12px 18px" }}><b style={{ fontSize: 20, fontFamily: "var(--font-display)" }}>{totalOpen}</b><div className="hint">open assigned cases</div></div>
        </div>

        <div className="col" style={{ gap: 8 }}>
          {users.map((u) => {
            const open = openCount(u.id);
            return (
              <div key={u.id} className="card" style={{ padding: 14, display: "grid", gridTemplateColumns: "minmax(150px, 1.2fr) 1.4fr 1fr 185px auto", gap: 14, alignItems: "center" }}>
                <div className="row" style={{ gap: 10, minWidth: 0 }}>
                  <Avatar vol={u} size={36} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5 }}>{u.name}</div>
                    <div className="hint" style={{ fontSize: 12 }}>{u.role === "admin" ? "Admin" : "Volunteer"}</div>
                  </div>
                </div>

                <div className="row-wrap" style={{ gap: 4 }}>
                  {u.skills.map((s) => <span key={s} className="chip" style={{ height: 22, fontSize: 11.5 }}>{cap(s)}</span>)}
                  {u.languages.map((l) => <span key={l} className="chip chip-blue" style={{ height: 22, fontSize: 11.5 }}>{l.toUpperCase()}</span>)}
                </div>

                <div>
                  <div className="hint" style={{ fontSize: 11.5, marginBottom: 3 }}>{open} open · {resolvedBy(u.id)} resolved</div>
                  <div style={{ height: 6, borderRadius: 3, background: "var(--n-100)", overflow: "hidden" }}>
                    <div style={{ width: (open / maxOpen) * 100 + "%", height: "100%", background: open >= maxOpen && open > 2 ? "var(--amber-700)" : "var(--green-700)" }}></div>
                  </div>
                </div>

                <div>
                  <SegControl value={!!u.available} onChange={(v) => setAvail(u, v)}
                    options={[{ value: false, label: "Away" }, { value: true, label: "Available" }]} />
                </div>

                <div className="row" style={{ gap: 4 }}>
                  <button className="btn btn-ghost btn-sm" title="Edit user" onClick={() => setModal(u)}><Icon name="settings" size={15} /></button>
                  <button className="btn btn-ghost btn-sm" title={open > 0 ? "Reassign their open cases first" : "Remove user"}
                    disabled={open > 0} style={{ opacity: open > 0 ? 0.4 : 1 }}
                    onClick={() => removeUser(u)}><Icon name="close" size={15} /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modal ? <UserModal user={modal === "new" ? null : modal} onClose={() => setModal(null)} /> : null}
    </StaffShell>
  );
}

/* ---------- CSV export (Excel-compatible: UTF-8 BOM, CRLF, quoted) ---------- */
function caseFilter(f) {
  const inRange = (iso) => {
    const t = new Date(iso).getTime();
    if (f.from && t < new Date(f.from).getTime()) return false;
    if (f.to && t > new Date(f.to).getTime() + 86399999) return false;
    return true;
  };
  return (c) =>
    (f.status === "all" || c.status === f.status) &&
    (f.user === "all" || c.assignedTo === f.user) &&
    inRange(c.timestamps.created);
}

function exportCasesCsv(db, f) {
  const volName = (id) => (db.volunteers.find((v) => v.id === id) || { name: "" }).name;
  const rows = db.cases.filter(caseFilter(f));
  const esc = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
  const header = ["Code", "Created", "Channel", "Status", "Urgency", "Category", "Tags", "Language", "Situation", "Requester", "Assigned to", "Assigned at", "Resolved at"];
  const lines = rows.map((c) => [
    c.code, c.timestamps.created, c.channel, c.status,
    c.urgency ? c.urgency.level : "", c.category, (c.tags || []).join("; "),
    c.language, c.situation || "", (c.requester && c.requester.name) || "",
    volName(c.assignedTo), c.timestamps.assigned || "", c.timestamps.resolved || "",
  ].map(esc).join(","));
  const csv = [header.map(esc).join(","), ...lines].join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "signaalbrug-cases-" + new Date().toISOString().slice(0, 10) + ".csv";
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(a.href);
  return rows.length;
}

/* ---------- Site Config (admin) ---------- */
export function SiteConfigScreen({ nav }) {
  const db = useDb();
  const cfg = getSiteConfig(db);
  const [filters, setFilters] = useState({ status: "all", user: "all", from: "", to: "" });

  const toggleLang = (code) => {
    if (code === "en") return; // English is the fallback and stays on
    const next = cfg.enabledLangs.includes(code)
      ? cfg.enabledLangs.filter((c) => c !== code)
      : [...cfg.enabledLangs, code];
    patchSiteConfig({ enabledLangs: next });
  };

  const matchCount = db.cases.filter(caseFilter(filters)).length;

  return (
    <StaffShell route="/staff/config" nav={nav} title="Site Config">
      <div className="col" style={{ gap: 14, maxWidth: 760 }}>
        <HelpBanner id="config">Site-wide switches: which portal languages are offered, what volunteers can do and see, and historic data export.</HelpBanner>

        {/* Portal languages */}
        <div className="card" style={{ padding: 18 }}>
          <h3 style={{ fontSize: 16, marginBottom: 4 }}>Portal languages</h3>
          <p className="hint" style={{ marginBottom: 12 }}>Languages offered on the refugee portal. English is the fallback and cannot be disabled.</p>
          <div className="row-wrap" style={{ gap: 6 }}>
            {LANGS.map(([code, label]) => {
              const on = cfg.enabledLangs.includes(code);
              const locked = code === "en";
              return (
                <button key={code} className="chip" onClick={() => toggleLang(code)}
                  style={{
                    background: on ? "var(--green-100)" : "var(--n-100)",
                    color: on ? "var(--green-800)" : "var(--ink-2)",
                    border: on ? "1px solid var(--green-700)" : "1px solid transparent",
                    fontWeight: 600, opacity: locked ? 0.7 : 1, cursor: locked ? "default" : "pointer",
                  }}>
                  {label}{locked ? " · always on" : ""}
                </button>
              );
            })}
          </div>
          <p className="hint" style={{ marginTop: 10 }}>{cfg.enabledLangs.length} of {LANGS.length} languages enabled.</p>
        </div>

        {/* Volunteer permissions */}
        <div className="card col" style={{ padding: 18, gap: 16 }}>
          <h3 style={{ fontSize: 16 }}>Volunteer permissions</h3>
          <CfgToggle on={cfg.allowSelfAssign}
            onChange={(v) => patchSiteConfig({ allowSelfAssign: v })}
            label="Allow 'Assign to me'"
            hint="When off, volunteers cannot pick up unassigned cases themselves — only admins assign work." />
          <CfgToggle on={cfg.volunteerAnalytics}
            onChange={(v) => patchSiteConfig({ volunteerAnalytics: v })}
            label="Show Analytics to volunteers"
            hint="When off, the Analytics screen is admin-only and disappears from the volunteer sidebar." />
        </div>

        {/* Data export */}
        <div className="card col" style={{ padding: 18, gap: 12 }}>
          <h3 style={{ fontSize: 16 }}>Export historic data</h3>
          <p className="hint">Download cases as a CSV file that opens directly in Excel. Filter before exporting.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Case state">
              <select className="select" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                <option value="all">All states</option>
                <option value="pending">Pending review</option>
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </Field>
            <Field label="User">
              <select className="select" value={filters.user} onChange={(e) => setFilters({ ...filters, user: e.target.value })}>
                <option value="all">All users</option>
                {db.volunteers.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </Field>
            <Field label="From date">
              <input type="date" className="input" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
            </Field>
            <Field label="To date">
              <input type="date" className="input" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
            </Field>
          </div>
          <div className="row" style={{ gap: 12 }}>
            <button className="btn btn-primary" disabled={matchCount === 0}
              onClick={() => { const n = exportCasesCsv(db, filters); toast("Exported " + n + " cases to CSV"); }}>
              <Icon name="next" size={15} /> Export {matchCount} case{matchCount === 1 ? "" : "s"} (.csv)
            </button>
            <span className="hint">{matchCount} case{matchCount === 1 ? "" : "s"} match the current filter.</span>
          </div>
        </div>
      </div>
    </StaffShell>
  );
}
