import axios from "axios";
window.axios = axios;

window.axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";
// Allow sending Sanctum cookies for SPA authentication
window.axios.defaults.withCredentials = true;
