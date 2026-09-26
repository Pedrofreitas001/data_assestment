import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/auth";
import { OrgProvider } from "./context/org";
import Layout from "./components/Layout";
import { LoadingPage } from "./components/ui";
import Login from "./pages/Login";

const Overview = lazy(() => import("./pages/Overview"));
const Assessments = lazy(() => import("./pages/Assessments"));
const Wizard = lazy(() => import("./pages/Wizard"));
const Result = lazy(() => import("./pages/Result"));
const Glossary = lazy(() => import("./pages/Glossary"));
const Framework = lazy(() => import("./pages/Framework"));
const Admin = lazy(() => import("./pages/Admin"));
const Account = lazy(() => import("./pages/Account"));

export default function App() {
  const { loading, profile, isStaff } = useAuth();
  if (loading) return <LoadingPage />;
  if (!profile)
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );

  return (
    <OrgProvider>
      <Layout>
        <Suspense fallback={<LoadingPage />}>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/assessments" element={<Assessments />} />
            <Route path="/assessments/:id" element={<Wizard />} />
            <Route path="/assessments/:id/resultado" element={<Result />} />
            <Route path="/glossario" element={<Glossary />} />
            <Route path="/framework" element={<Framework />} />
            <Route path="/conta" element={<Account />} />
            {isStaff && <Route path="/admin" element={<Admin />} />}
            {isStaff && <Route path="/admin/usuarios" element={<Navigate to="/admin?tab=usuarios" replace />} />}
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Layout>
    </OrgProvider>
  );
}
