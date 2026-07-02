import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./pages/dashboard";
import { ProjectsList } from "./pages/projects/ProjectsList";
import { ProjectDetail } from "./pages/projects/ProjectDetail";
import { ReleasesList } from "./pages/releases/ReleasesList";
import { ReleasePlanDetail } from "./pages/releases/ReleasePlanDetail";
import { BuildsList } from "./pages/builds/BuildsList";
import { BuildDetail } from "./pages/builds/BuildDetail";
import { AuditLogs } from "./pages/audit-logs/AuditLogs";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<ProjectsList />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/releases" element={<ReleasesList />} />
        <Route path="/releases/:id" element={<ReleasePlanDetail />} />
        <Route path="/builds" element={<BuildsList />} />
        <Route path="/builds/:id" element={<BuildDetail />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
      </Routes>
    </Layout>
  );
}
