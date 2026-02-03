import React, { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext();

let idCounter = 0;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback(
        ({ type = "info", message = "", ttl = 5000 }) => {
            const id = ++idCounter;
            setToasts((t) => [...t, { id, type, message }]);
            if (ttl > 0) {
                setTimeout(() => {
                    setToasts((t) => t.filter((x) => x.id !== id));
                }, ttl);
            }
            return id;
        },
        [],
    );

    const removeToast = useCallback((id) => {
        setToasts((t) => t.filter((x) => x.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
            <div
                aria-live="polite"
                className="fixed top-4 right-4 z-50 space-y-2"
            >
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`max-w-xs px-4 py-2 rounded shadow-md text-sm text-white flex items-start space-x-3 ${
                            t.type === "success"
                                ? "bg-green-600"
                                : t.type === "warning"
                                  ? "bg-yellow-600"
                                  : t.type === "error"
                                    ? "bg-red-600"
                                    : "bg-blue-600"
                        }`}
                    >
                        <div className="flex-1">{t.message}</div>
                        <button
                            onClick={() => removeToast(t.id)}
                            className="ml-2 opacity-80"
                            aria-label="Dismiss"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    return useContext(ToastContext);
}
