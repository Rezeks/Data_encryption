/**
 * CryptoLab — Main Application Logic
 * SPA routing, dynamic form generation, matrix background effect.
 */

import { fetchCiphers, encrypt, decrypt } from "./api.js";

// ── State ─────────────────────────────────────────────────────────────────
let ciphers = [];
let activeCipherId = null;

// ── DOM refs ──────────────────────────────────────────────────────────────
const $cipherList = document.getElementById("cipher-list");
const $welcomeScreen = document.getElementById("welcome-screen");
const $workspace = document.getElementById("cipher-workspace");
const $title = document.getElementById("cipher-title");
const $desc = document.getElementById("cipher-desc");
const $paramsContainer = document.getElementById("params-container");
const $inputText = document.getElementById("input-text");
const $outputText = document.getElementById("output-text");
const $toastContainer = document.getElementById("toast-container");

// ── Icons per cipher (fallback: 🔑) ──────────────────────────────────────
const CIPHER_ICONS = {
  caesar: "🏛️",
  simpletransposition: "🔀",
  blocktransposition: "🧩",
};

// ═══════════════════════════════════════════════════════════════════════════
//  INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

async function init() {
  setupMatrixBackground();
  setupMobileToggle();
  setupActionButtons();

  try {
    ciphers = await fetchCiphers();
    renderCipherList();
    toast("Загружено шифров: " + ciphers.length, "success");
  } catch (err) {
    console.error(err);
    toast("Не удалось подключиться к серверу. Убедитесь что бэкенд запущен.", "error");
    $cipherList.innerHTML = `
      <li class="cipher-list__item">
        <button class="cipher-list__btn" disabled>
          <span class="icon">⚠️</span>
          <span>Сервер недоступен</span>
        </button>
      </li>`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  RENDER CIPHER LIST (sidebar)
// ═══════════════════════════════════════════════════════════════════════════

function renderCipherList() {
  $cipherList.innerHTML = "";

  ciphers.forEach((c) => {
    const li = document.createElement("li");
    li.className = "cipher-list__item";

    const btn = document.createElement("button");
    btn.className = "cipher-list__btn";
    btn.dataset.id = c.id;
    btn.innerHTML = `
      <span class="icon">${CIPHER_ICONS[c.id] || "🔑"}</span>
      <span>${c.name}</span>
    `;
    btn.addEventListener("click", () => selectCipher(c.id));

    li.appendChild(btn);
    $cipherList.appendChild(li);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  SELECT CIPHER
// ═══════════════════════════════════════════════════════════════════════════

function selectCipher(id) {
  activeCipherId = id;
  const cipher = ciphers.find((c) => c.id === id);
  if (!cipher) return;

  // Update sidebar active state
  document.querySelectorAll(".cipher-list__btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.id === id);
  });

  // Show workspace, hide welcome
  $welcomeScreen.style.display = "none";
  $workspace.style.display = "";

  // Fill header
  $title.textContent = cipher.name;
  $desc.textContent = cipher.description;

  // Build parameter form
  renderParams(cipher.params);

  // Clear text areas
  $inputText.value = "";
  $outputText.value = "";

  // Close sidebar on mobile
  document.getElementById("sidebar").classList.remove("open");
}

// ═══════════════════════════════════════════════════════════════════════════
//  RENDER PARAMETERS
// ═══════════════════════════════════════════════════════════════════════════

function renderParams(params) {
  $paramsContainer.innerHTML = "";

  if (!params || params.length === 0) {
    $paramsContainer.innerHTML =
      '<span style="color:var(--text-muted);font-size:0.85rem;">Без параметров</span>';
    return;
  }

  params.forEach((p) => {
    const group = document.createElement("div");
    group.className = "param-group";

    const label = document.createElement("label");
    label.className = "param-group__label";
    label.textContent = p.label;
    label.setAttribute("for", `param-${p.id}`);

    const input = document.createElement("input");
    input.className = "param-group__input";
    input.id = `param-${p.id}`;
    input.dataset.paramId = p.id;
    input.type = p.type === "number" ? "number" : "text";
    input.value = p.default ?? "";
    if (p.min !== undefined) input.min = p.min;
    if (p.max !== undefined) input.max = p.max;
    input.placeholder = p.hint || "";

    group.appendChild(label);
    group.appendChild(input);

    if (p.hint) {
      const hint = document.createElement("span");
      hint.className = "param-group__hint";
      hint.textContent = p.hint;
      group.appendChild(hint);
    }

    $paramsContainer.appendChild(group);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  COLLECT PARAMETERS FROM FORM
// ═══════════════════════════════════════════════════════════════════════════

function collectParams() {
  const params = {};
  document.querySelectorAll("[data-param-id]").forEach((input) => {
    const key = input.dataset.paramId;
    params[key] = input.type === "number" ? Number(input.value) : input.value;
  });
  return params;
}

// ═══════════════════════════════════════════════════════════════════════════
//  ACTION BUTTONS
// ═══════════════════════════════════════════════════════════════════════════

function setupActionButtons() {
  // Encrypt
  document.getElementById("btn-encrypt").addEventListener("click", async () => {
    if (!activeCipherId) return;
    const text = $inputText.value;
    if (!text.trim()) {
      toast("Введите текст для шифрования", "error");
      return;
    }
    try {
      const result = await encrypt(activeCipherId, text, collectParams());
      await typewriterEffect($outputText, result);
      toast("Текст зашифрован ✓", "success");
    } catch (err) {
      toast(err.message, "error");
    }
  });

  // Decrypt
  document.getElementById("btn-decrypt").addEventListener("click", async () => {
    if (!activeCipherId) return;
    const text = $inputText.value;
    if (!text.trim()) {
      toast("Введите текст для дешифрования", "error");
      return;
    }
    try {
      const result = await decrypt(activeCipherId, text, collectParams());
      await typewriterEffect($outputText, result);
      toast("Текст расшифрован ✓", "success");
    } catch (err) {
      toast(err.message, "error");
    }
  });

  // Swap
  document.getElementById("btn-swap").addEventListener("click", () => {
    const tmp = $inputText.value;
    $inputText.value = $outputText.value;
    $outputText.value = tmp;
  });

  // Copy
  document.getElementById("btn-copy").addEventListener("click", async () => {
    const text = $outputText.value;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast("Скопировано в буфер обмена", "success");
    } catch {
      // Fallback
      $outputText.select();
      document.execCommand("copy");
      toast("Скопировано", "success");
    }
  });

  // Clear
  document.getElementById("btn-clear-input").addEventListener("click", () => {
    $inputText.value = "";
    $inputText.focus();
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  TYPEWRITER EFFECT
// ═══════════════════════════════════════════════════════════════════════════

function typewriterEffect(textarea, text) {
  return new Promise((resolve) => {
    textarea.value = "";
    textarea.classList.add("typing-cursor");
    let i = 0;
    const chunkSize = Math.max(1, Math.floor(text.length / 60)); // finish in ~60 frames
    const interval = setInterval(() => {
      const end = Math.min(i + chunkSize, text.length);
      textarea.value += text.slice(i, end);
      i = end;
      if (i >= text.length) {
        clearInterval(interval);
        textarea.classList.remove("typing-cursor");
        resolve();
      }
    }, 16);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  TOAST NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════

function toast(message, type = "success") {
  const el = document.createElement("div");
  el.className = `toast toast--${type}`;
  el.textContent = message;
  $toastContainer.appendChild(el);

  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateX(30px)";
    el.style.transition = "all 0.3s ease";
    setTimeout(() => el.remove(), 300);
  }, 3500);
}

// ═══════════════════════════════════════════════════════════════════════════
//  MOBILE SIDEBAR TOGGLE
// ═══════════════════════════════════════════════════════════════════════════

function setupMobileToggle() {
  const btn = document.getElementById("mobile-toggle");
  const sidebar = document.getElementById("sidebar");
  btn.addEventListener("click", () => {
    sidebar.classList.toggle("open");
  });
}

// ═══════════════════════════════════════════════════════════════════════════
//  MATRIX RAIN BACKGROUND
// ═══════════════════════════════════════════════════════════════════════════

function setupMatrixBackground() {
  const canvas = document.getElementById("matrix-bg");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  const chars = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ0123456789@#$%^&*";
  const fontSize = 14;
  let columns = Math.floor(canvas.width / fontSize);
  let drops = Array.from({ length: columns }, () => Math.random() * -100);

  window.addEventListener("resize", () => {
    columns = Math.floor(canvas.width / fontSize);
    drops = Array.from({ length: columns }, () => Math.random() * -100);
  });

  function draw() {
    ctx.fillStyle = "rgba(6, 8, 15, 0.05)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#00e5ff";
    ctx.font = `${fontSize}px ${getComputedStyle(document.documentElement).getPropertyValue("--font-mono")}`;

    for (let i = 0; i < drops.length; i++) {
      const char = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(char, i * fontSize, drops[i] * fontSize);

      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }

    requestAnimationFrame(draw);
  }

  draw();
}

// ── Boot ──────────────────────────────────────────────────────────────────
init();
