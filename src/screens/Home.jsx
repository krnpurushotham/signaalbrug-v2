/* SignaalBrug v2 — Home / role picker (F1) with staff verification (PIN or Google). */
import React, { useState } from "react";
import { SBStore } from "../lib/store";
import { t, getLanguage, setLanguage } from "../lib/translations";
import { useDb, Icon, Avatar, QRBox, Brand, Modal, toast } from "../components/index.jsx";

const PREFS_KEY = "sb2.portal.prefs";

export function HomeScreen({ nav }) {
  const db = useDb();
  const [pickVol, setPickVol] = useState(false);
  const [lang, setLang] = useState(getLanguage());
  const [pendingLogin, setPendingLogin] = useState(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const baseUrl = window.location.href.split("#")[0];
  const vols = db.volunteers.filter((v) => v.role === "volunteer");
  const admin = db.volunteers.find((v) => v.role === "admin");

  const tr = (key) => t(key, lang);

  const loginAs = (role, userId) => {
    SBStore.session.set({ role, userId });
    toast(role === "admin" ? "Signed in as Admin" : "Signed in as Volunteer");
    nav(role === "admin" ? "/staff/add" : "/staff/queue");
  };

  // Staff clicks open a verification step (PIN or Google) before signing in.
  const requestLogin = (role, userId, name) => {
    setPendingLogin({ role, userId, name });
    setPin("");
    setPinError(false);
  };

  const verifyPin = () => {
    if (pin === "1234") {
      const p = pendingLogin;
      setPendingLogin(null);
      loginAs(p.role, p.userId);
    } else {
      setPinError(true);
    }
  };

  const verifyGoogle = () => {
    const p = pendingLogin;
    setPendingLogin(null);
    toast("Verified with Google (demo)");
    loginAs(p.role, p.userId);
  };

  const handleLanguageChange = (newLang) => {
    setLang(newLang);
    setLanguage(newLang);
  };

  // If a non-default language was chosen on the home page, pass it to the
  // portal so its language-selection step is skipped. Default (English)
  // keeps the portal's own language selector.
  const goToPortal = () => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      const prefs = raw ? JSON.parse(raw) : {};
      if (lang !== "en") prefs.lang = lang;
      else delete prefs.lang;
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch { /* private mode */ }
    nav("/portal");
  };

  return (
    <div className="login-wrap">
      {/* Language Selector — Top Right */}
      <div style={{ position: "absolute", top: 16, right: 16, zIndex: 10, display: "flex", gap: 8, alignItems: "center" }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}>
          {tr("lang.select")}:
        </label>
        <select
          value={lang}
          onChange={(e) => handleLanguageChange(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: "var(--r-sm)", border: "1px solid var(--n-200)", fontSize: 13, fontWeight: 500, background: "white", cursor: "pointer" }}
        >
          <option value="en">{tr("lang.english")}</option>
          <option value="nl">{tr("lang.dutch")}</option>
        </select>
      </div>

      <div className="login-brand">
        <div className="arcs" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", height: "100%", gap: 20 }}>
          <div>
            <Brand dark size={34} />
            <h1 className="login-headline rev">{tr("brand.headline")}</h1>
          </div>

          {/* QR codes — left panel, easy to scan */}
          <div className="card rev rev-1" style={{ padding: 14, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", background: "#fff", color: "var(--ink)", maxWidth: 440 }}>
            <QRBox text={baseUrl} size={92} label={tr("qr.staff")} />
            <QRBox text={baseUrl + "#/portal"} size={92} label={tr("qr.portal")} />
            <p className="hint grow" style={{ minWidth: 140 }}>
              {tr("qr.hint")}
            </p>
          </div>

          <div style={{ marginTop: "auto" }}>
            <p className="login-sub rev rev-2" style={{ marginBottom: 14 }}>
              {tr("brand.subtitle")}
            </p>
            <div className="login-stats rev rev-3">
              <div className="login-stat"><b>6</b><span>{tr("brand.channels")}</span></div>
              <div className="login-stat"><b>13</b><span>{tr("brand.languages")}</span></div>
              <div className="login-stat"><b>{db.counters.resolvedCases}</b><span>{tr("brand.resolved")}</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="login-side atmo">
        {/* Public Portal Section — kept near top so it's always visible */}
        <div className="rev">
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 2, color: "var(--ink)" }}>
            {tr("public.title")}
          </h2>
          <p style={{ color: "var(--ink-2)", fontSize: 14, marginBottom: 10 }}>
            {tr("public.subtitle")}
          </p>
          <button className="role-tile" style={{ background: "var(--green-50)" }} onClick={goToPortal}>
            <span className="role-glyph" style={{ background: "var(--amber-700)" }}><Icon name="globe" size={26} /></span>
            <span className="grow">
              <span style={{ display: "block", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17 }}>{tr("public.button")}</span>
              <span style={{ color: "var(--ink-2)", fontSize: 14 }}>{tr("public.button.desc")}</span>
            </span>
            <Icon name="next" />
          </button>
        </div>

        {/* Staff Login Section */}
        <div className="rev rev-2" style={{ borderTop: "1px solid var(--n-200)", paddingTop: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 2, color: "var(--ink)" }}>
            {tr("staff.title")}
          </h2>
          <p style={{ color: "var(--ink-2)", fontSize: 14, marginBottom: 10 }}>
            {tr("staff.subtitle")}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button className="role-tile" onClick={() => setPickVol(!pickVol)} aria-expanded={pickVol}>
              <span className="role-glyph" style={{ background: "var(--green-700)" }}><Icon name="user" size={26} /></span>
              <span className="grow">
                <span style={{ display: "block", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17 }}>{tr("staff.volunteer.title")}</span>
                <span style={{ color: "var(--ink-2)", fontSize: 14 }}>{tr("staff.volunteer.desc")}</span>
              </span>
              <Icon name={pickVol ? "down" : "next"} />
            </button>
            {pickVol ? (
              <div className="card" style={{ padding: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {vols.map((v) => (
                  <button key={v.id} className="row card-hover" style={{ gap: 10, padding: "10px 12px", borderRadius: "var(--r-md)", background: "var(--n-50)", textAlign: "left" }} onClick={() => requestLogin("volunteer", v.id, v.name)}>
                    <Avatar vol={v} size={32} />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontWeight: 700, fontSize: 14 }}>{v.name}</span>
                      <span className="hint" style={{ fontSize: 11.5 }}>{v.skills.join(" · ")}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            {admin ? (
              <button className="role-tile" onClick={() => requestLogin("admin", admin.id, admin.name)}>
                <span className="role-glyph" style={{ background: "var(--n-900)" }}><Icon name="board" size={26} /></span>
                <span className="grow">
                  <span style={{ display: "block", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17 }}>{tr("staff.admin.title")}</span>
                  <span style={{ color: "var(--ink-2)", fontSize: 14 }}>{tr("staff.admin.desc")}</span>
                </span>
                <Icon name="next" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="row-wrap rev rev-4" style={{ justifyContent: "center", gap: 14, paddingTop: 12, borderTop: "1px solid var(--n-200)" }}>
          <span className="hint">{tr("footer.credit")}</span>
          <button className="hint" style={{ textDecoration: "underline", cursor: "pointer" }} onClick={() => { SBStore.reset(); toast("Demo reset — fresh seed data loaded"); }}>{tr("footer.reset")}</button>
        </div>
      </div>

      {/* Staff verification modal — PIN or Google */}
      {pendingLogin ? (
        <Modal title={tr("verify.title")} onClose={() => setPendingLogin(null)}>
          <p style={{ color: "var(--ink-2)", fontSize: 14, marginBottom: 4 }}>
            {tr("verify.subtitle")}
          </p>
          <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>
            {pendingLogin.name} · {pendingLogin.role === "admin" ? tr("staff.admin.title") : tr("staff.volunteer.title")}
          </p>

          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--ink-2)", marginBottom: 6 }}>
            {tr("verify.pin.label")}
          </label>
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            maxLength={4}
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, "")); setPinError(false); }}
            onKeyDown={(e) => { if (e.key === "Enter" && pin.length === 4) verifyPin(); }}
            placeholder="••••"
            style={{
              width: "100%", padding: "12px 14px", fontSize: 22, letterSpacing: "0.5em",
              textAlign: "center", borderRadius: "var(--r-md)",
              border: pinError ? "2px solid var(--red-700)" : "1px solid var(--n-200)",
              fontFamily: "var(--font-mono)",
            }}
          />
          <p className="hint" style={{ marginTop: 6, color: pinError ? "var(--red-700)" : undefined }}>
            {pinError ? tr("verify.pin.error") : tr("verify.pin.hint")}
          </p>

          <button className="btn btn-primary" disabled={pin.length !== 4} style={{ width: "100%", marginTop: 12 }} onClick={verifyPin}>
            {tr("verify.button")}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "14px 0" }}>
            <span style={{ flex: 1, height: 1, background: "var(--n-200)" }}></span>
            <span className="hint">{tr("verify.or")}</span>
            <span style={{ flex: 1, height: 1, background: "var(--n-200)" }}></span>
          </div>

          <button
            onClick={verifyGoogle}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              padding: "11px 14px", borderRadius: "var(--r-md)", border: "1px solid var(--n-200)",
              background: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            </svg>
            {tr("verify.google")}
          </button>
        </Modal>
      ) : null}
    </div>
  );
}
