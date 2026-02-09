import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [isDark, setIsDark] = useState(false);
    const [isReady, setIsReady] = useState(false);

    // Initialize theme from localStorage or system preference
    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");
        if (savedTheme) {
            setIsDark(savedTheme === "dark");
        } else {
            // Check system preference
            const prefersDark = window.matchMedia(
                "(prefers-color-scheme: dark)",
            ).matches;
            setIsDark(prefersDark);
        }
        setIsReady(true);
    }, []);

    // Update localStorage and DOM when theme changes
    useEffect(() => {
        if (!isReady) return;

        localStorage.setItem("theme", isDark ? "dark" : "light");
        if (isDark) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, [isDark, isReady]);

    function toggleTheme() {
        setIsDark((prev) => !prev);
    }

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme, isReady }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
