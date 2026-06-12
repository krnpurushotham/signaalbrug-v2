/* SignaalBrug v2 — root router. Hash-based for GitHub Pages; admin-only routes
   guard to a safe screen for volunteers. */
import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { SBStore, getSiteConfig } from "./lib/store";
import { initAnimations } from "./lib/anim";
import { useDb, useHashRoute, ToastHost } from "./components/index.jsx";
import { HomeScreen } from "./screens/Home.jsx";
import { PortalApp } from "./screens/Portal.jsx";
import { AddEntryScreen, InboxScreen } from "./screens/Staff.jsx";
import { TriageBoard, CaseDetail, QueueScreen } from "./screens/Triage.jsx";
import { StaffMapScreen, ContentInsights, AnalyticsScreen } from "./screens/Insights.jsx";
import { UserManagementScreen, SiteConfigScreen } from "./screens/Admin.jsx";
import "./styles.css";

function App() {
  const [route, nav] = useHashRoute();
  const db = useDb();
  const session = SBStore.session.get();

  useEffect(() => initAnimations(), []);

  if (route.startsWith("/portal") || route.startsWith("/receipt/")) {
    return <Frame><PortalApp route={route} nav={nav} /></Frame>;
  }

  if (route.startsWith("/staff")) {
    if (!session) return <Frame><HomeScreen nav={nav} /></Frame>;
    const isAdmin = session.role === "admin";
    let view;
    if (route === "/staff/add") view = <AddEntryScreen nav={nav} />;
    else if (route === "/staff/inbox") view = <InboxScreen nav={nav} />;
    else if (route === "/staff/board") view = <TriageBoard nav={nav} />;
    else if (route === "/staff/queue") view = <QueueScreen nav={nav} />;
    else if (route === "/staff/map") view = <StaffMapScreen nav={nav} />;
    else if (route === "/staff/insights") view = isAdmin ? <ContentInsights nav={nav} /> : <InboxScreen nav={nav} />;
    else if (route === "/staff/users") view = isAdmin ? <UserManagementScreen nav={nav} /> : <InboxScreen nav={nav} />;
    else if (route === "/staff/config") view = isAdmin ? <SiteConfigScreen nav={nav} /> : <InboxScreen nav={nav} />;
    else if (route === "/staff/analytics") view = (isAdmin || getSiteConfig(db).volunteerAnalytics) ? <AnalyticsScreen nav={nav} /> : <QueueScreen nav={nav} />;
    else if (route.startsWith("/staff/case/")) view = <CaseDetail nav={nav} caseId={route.split("/")[3]} />;
    else view = <InboxScreen nav={nav} />;
    return <Frame>{view}</Frame>;
  }

  return <Frame><HomeScreen nav={nav} /></Frame>;
}

function Frame({ children }) {
  return (
    <React.Fragment>
      {children}
      <ToastHost />
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
