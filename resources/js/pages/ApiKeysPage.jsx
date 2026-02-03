import React, { useEffect, useState } from "react";
import axios from "axios";

export default function ApiKeysPage() {
    const [keys, setKeys] = useState([]);

    useEffect(() => {
        axios.get("/api/api-keys").then((r) => setKeys(r.data));
    }, []);

    return (
        <div>
            <h2 className="text-2xl font-semibold mb-4">API Keys</h2>
            <div className="bg-white shadow rounded p-4">
                <p className="text-sm text-gray-600">
                    Manage API keys for LLM providers (Gemini, OpenAI, Groq, HF,
                    DeepSeek, Local)
                </p>
                <ul className="mt-4">
                    {keys.map((k) => (
                        <li key={k.id} className="py-2 border-b">
                            <div className="flex justify-between items-center">
                                <div>
                                    <div className="font-medium">
                                        {k.name} ({k.provider})
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        Priority: {k.priority} — Status:{" "}
                                        {k.status}
                                    </div>
                                </div>
                                <div>
                                    <button className="text-sm text-blue-600 mr-2">
                                        Edit
                                    </button>
                                    <button className="text-sm text-red-600">
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
