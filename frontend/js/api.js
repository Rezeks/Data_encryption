/**
 * CryptoLab — API Client
 * Handles all communication with the FastAPI backend.
 */

const API_BASE = "http://localhost:8000";

export async function fetchCiphers() {
  const res = await fetch(`${API_BASE}/api/ciphers`);
  if (!res.ok) throw new Error("Не удалось загрузить список шифров");
  return res.json();
}

export async function encrypt(cipher, text, params) {
  const res = await fetch(`${API_BASE}/api/encrypt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cipher, text, params }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Ошибка шифрования");
  return data.result;
}

export async function decrypt(cipher, text, params) {
  const res = await fetch(`${API_BASE}/api/decrypt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cipher, text, params }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Ошибка дешифрования");
  return data.result;
}
