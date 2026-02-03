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
import CompanySettingsPage from "./pages/CompanySettingsPage";
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
                                path="/supervisor"
                                element={
                                    <ProtectedRoute roles={["supervisor"]}>
                                        <SupervisorDashboard />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/hr"
                                element={
                                    <ProtectedRoute roles={["hr"]}>
                                        <HRDashboard />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/admin"
                                element={
                                    <ProtectedRoute roles={["admin"]}>
                                        <AdminDashboard />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/admin/api-keys"
                                element={
                                    <ProtectedRoute roles={["admin"]}>
                                        <ApiKeysPage />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/admin/users"
                                element={
                                    <ProtectedRoute roles={["admin"]}>
                                        <UsersPage />
                                    </ProtectedRoute>
                                }
                            />

                            <Route
                                path="/admin/settings"
                                element={
                                    <ProtectedRoute roles={["admin"]}>
                                        <CompanySettingsPage />
                                    </ProtectedRoute>
                                }
                            />
                        </Routes>
                    </Layout>
                </BrowserRouter>
            </AuthProvider>
        </ToastProvider>
    );
}

const root = createRoot(document.getElementById("app"));
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
