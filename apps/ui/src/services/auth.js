const API_BASE = "https://supportops-ai.onrender.com/api/v1/auth";

export async function login({ email, password }) {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
    });

    if (!res.ok) throw new Error("Login failed");

    return res.json();
}

export async function register({ email, password, name }) {
    const res = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, name }),
    });

    if (!res.ok) throw new Error("Register failed");

    return res.json();
}
