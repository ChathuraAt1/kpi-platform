import "./bootstrap";
import React from "react";
import ReactDOM from "react-dom/client";

function App() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <h1 className="text-4xl font-bold text-blue-600">
                Hello, React with Vite and Tailwind CSS!
            </h1>
        </div>
    );
}

const root = ReactDOM.createRoot(document.getElementById("app"));
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
