import "./bootstrap";
import "../css/app.css";
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
import Login from "./pages/Login";
import TodosPage from "./pages/TodosPage";
import ProfilePage from "./pages/ProfilePage";
import MyPerformance from "./pages/MyPerformance";
import CompanySettingsPage from "./pages/CompanySettingsPage";
import JobRoleManagement from "./pages/JobRoleManagement";
import SubordinateDetails from "./pages/SubordinateDetails";
import EvaluationCenter from "./pages/EvaluationCenter";
import SystemDashboard from "./pages/SystemDashboard";
import TaskLogExplorer from "./pages/TaskLogExplorer";
import HierarchyManagement from "./pages/HierarchyManagement";
import { ToastProvider } from "./contexts/ToastContext";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
    return (
        <ToastProvider>
            <AuthProvider>
                <BrowserRouter>
                    <Layout>
                        <Routes>
                            <Route path="/login" element={<Login />} />

                            <Route
                                path="/"
                                element={
                                    <ProtectedRoute>
                                        <EmployeeDashboard />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/todos"
                                element={
                                    <ProtectedRoute>
                                        <TodosPage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/profile"
                                element={
                                    <ProtectedRoute>
                                        <ProfilePage />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/performance"
                                element={
                                    <ProtectedRoute>
                                        <MyPerformance />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/supervisor"
                                element={
                                    <ProtectedRoute roles={["supervisor"]}>
                                        <SupervisorDashboard />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/supervisor/subordinate/:id"
                                element={
                                    <ProtectedRoute roles={["supervisor"]}>
                                        <SubordinateDetails />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/supervisor/logs"
                                element={
                                    <ProtectedRoute roles={["supervisor"]}>
                                        <TaskLogExplorer />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/hr/logs"
                                element={
                                    <ProtectedRoute roles={["hr"]}>
                                        <TaskLogExplorer />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/admin/logs"
                                element={
                                    <ProtectedRoute roles={["it_admin", "admin"]}>
                                        <TaskLogExplorer />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/hr"
                                element={
                                    <ProtectedRoute roles={["hr"]}>
                                        <EvaluationCenter />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/admin"
                                element={
                                    <ProtectedRoute roles={["admin", "it_admin"]}>
                                        <SystemDashboard />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/admin/api-keys"
                                element={
                                    <ProtectedRoute roles={["admin", "it_admin"]}>
                                        <ApiKeysPage />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/admin/users"
                                element={
                                    <ProtectedRoute roles={["admin", "it_admin"]}>
                                        <UsersPage />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/admin/settings"
                                element={
                                    <ProtectedRoute roles={["admin", "it_admin"]}>
                                        <CompanySettingsPage />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/hr/roles"
                                element={
                                    <ProtectedRoute roles={["hr", "admin"]}>
                                        <JobRoleManagement />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/admin/hierarchy"
                                element={
                                    <ProtectedRoute roles={["hr", "admin", "it_admin"]}>
                                        <HierarchyManagement />
                                    </ProtectedRoute>
                                }
                            />
                        </Routes>
                    </Layout>
                </BrowserRouter>
            </AuthProvider>
        </ToastProvider >
    );
}

const root = createRoot(document.getElementById("app"));
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
