import "./bootstrap";
import React from "react";
import ReactDOM from "react-dom/client";

import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import SupervisorDashboard from "./pages/SupervisorDashboard";
import HRDashboard from "./pages/HRDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ApiKeysPage from "./pages/ApiKeysPage";
import UsersPage from "./pages/UsersPage";

function App() {
    return (
        <BrowserRouter>
            <Layout>
                <Routes>
                    <Route path="/" element={<EmployeeDashboard />} />
                    <Route
                        path="/supervisor"
                        element={<SupervisorDashboard />}
                    />
                    <Route path="/hr" element={<HRDashboard />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/api-keys" element={<ApiKeysPage />} />
                    <Route path="/admin/users" element={<UsersPage />} />
                </Routes>
            </Layout>
        </BrowserRouter>
    );
}

const root = createRoot(document.getElementById("app"));
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
