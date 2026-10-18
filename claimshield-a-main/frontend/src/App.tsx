import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { UploadsProvider } from "./state/uploads";
import Landing from "./pages/Landing";
import NewAudit from "./pages/NewAudit";
import CaseView from "./pages/CaseView";
import CaseHistory from "./pages/CaseHistory";
import DisputeLetters from "./pages/DisputeLetters";
import DocumentCheck from "./pages/tools/DocumentCheck";
import PreAuthorization from "./pages/tools/PreAuthorization";
import PolicyExplainer from "./pages/tools/PolicyExplainer";
import Rejection from "./pages/tools/Rejection";
import Preclaim from "./pages/tools/Preclaim";
import WhatIf from "./pages/tools/WhatIf";
import PolicyHistory from "./pages/tools/PolicyHistory";
import Reviewer from "./pages/pro/Reviewer";
import Regulatory from "./pages/pro/Regulatory";

// Hash routing: FastAPI serves a single static index.html, so every view lives under #/.
export default function App() {
  return (
    <HashRouter>
      <UploadsProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/audit/new" element={<NewAudit />} />
            <Route path="/cases/:caseId" element={<CaseView />} />
            <Route path="/history" element={<CaseHistory />} />
            <Route path="/letters" element={<DisputeLetters />} />
            <Route path="/tools/documents" element={<DocumentCheck />} />
            <Route path="/tools/preauth" element={<PreAuthorization />} />
            <Route path="/tools/policy-explainer" element={<PolicyExplainer />} />
            <Route path="/tools/rejection" element={<Rejection />} />
            <Route path="/tools/preclaim" element={<Preclaim />} />
            <Route path="/tools/what-if" element={<WhatIf />} />
            <Route path="/tools/policy-history" element={<PolicyHistory />} />
            <Route path="/pro/reviewer" element={<Reviewer />} />
            <Route path="/pro/regulatory" element={<Regulatory />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </UploadsProvider>
    </HashRouter>
  );
}
