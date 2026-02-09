import axios from "axios";

/**
 * Fetch trusted current time from an external API
 * Returns an object with { date: 'YYYY-MM-DD', datetime: 'ISO_STRING' }
 */
export async function getTrustedTime() {
    // 1. Try public API first
    try {
        const response = await axios.get("https://worldtimeapi.org/api/ip", {
            timeout: 3000,
        });
        const { datetime } = response.data;
        return {
            date: datetime.slice(0, 10),
            datetime: datetime,
            success: true,
            source: "external",
        };
    } catch (error) {
        console.warn("External time API failed, falling back to server time");
    }

    // 2. Fallback to our own server time
    try {
        const response = await axios.get("/api/server-time", { timeout: 3000 });
        return {
            date: response.data.date,
            datetime: response.data.datetime,
            success: true,
            source: "server",
        };
    } catch (error) {
        console.warn(
            "Server time API failed, using local time:",
            error?.message || error,
        );
        const now = new Date();
        return {
            date: now.toISOString().slice(0, 10),
            datetime: now.toISOString(),
            success: false,
            fallback: true,
            source: "local",
        };
    }
}

/**
 * Checks if a given date string is in the past relative to trusted today
 */
export function isPastDate(targetDateStr, trustedDateStr) {
    if (!targetDateStr || !trustedDateStr) return false;
    return targetDateStr < trustedDateStr;
}
