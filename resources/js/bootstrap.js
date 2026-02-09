import axios from "axios";
window.axios = axios;

window.axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";
// Allow sending Sanctum cookies for SPA authentication
window.axios.defaults.withCredentials = true;
// Ensure axios reads the Laravel CSRF cookie and sends X-XSRF-TOKEN header
window.axios.defaults.xsrfCookieName = "XSRF-TOKEN";
window.axios.defaults.xsrfHeaderName = "X-XSRF-TOKEN";
// Add request interceptor to always include bearer token if available
window.axios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("auth_token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    },
);
