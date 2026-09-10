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
const $blockExtras = document.getElementById("block-extras");
const $inputText = document.getElementById("input-text");
const $outputText = document.getElementById("output-text");
const $toastContainer = document.getElementById("toast-container");

// ── Icons per cipher (fallback: 🔑) ──────────────────────────────────────
const CIPHER_ICONS = {
  caesar: "🏛️",
  caesarnospaces: "🏛️",
  caesarspaces: "🌌",
  caesarwithspaces: "🌌",
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
//  BLOCK TRANSPOSITION HELPERS & CHEATSHEET
// ═══════════════════════════════════════════════════════════════════════════

const RU_ALPHABET = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ";
const EN_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
let currentCheatsheetLang = "ru";

function getCharRank(ch) {
  const upper = ch.toUpperCase();
  const ruIdx = RU_ALPHABET.indexOf(upper);
  if (ruIdx !== -1) return ruIdx + 1;
  const enIdx = EN_ALPHABET.indexOf(upper);
  if (enIdx !== -1) return enIdx + 1 + 100;
  return upper.charCodeAt(0) + 1000;
}

function getCharAlphabetNumber(ch) {
  const upper = ch.toUpperCase();
  const ruIdx = RU_ALPHABET.indexOf(upper);
  if (ruIdx !== -1) return ruIdx + 1;
  const enIdx = EN_ALPHABET.indexOf(upper);
  if (enIdx !== -1) return enIdx + 1;
  return "—";
}

function keywordToPermutation(keyword) {
  const cleaned = keyword.replace(/\s+/g, "");
  if (!cleaned) return null;

  const items = Array.from(cleaned).map((ch, idx) => ({
    char: ch.toUpperCase(),
    origIdx: idx,
    rank: getCharRank(ch),
    num: getCharAlphabetNumber(ch),
  }));

  const indexed = [...items].sort((a, b) => {
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.origIdx - b.origIdx;
  });

  const perm0 = indexed.map((item) => item.origIdx);
  const perm1 = perm0.map((p) => p + 1);

  return {
    cleaned,
    items,
    perm1,
  };
}

function renderBlockTranspositionExtras() {
  if (!$blockExtras) return;
  $blockExtras.innerHTML = `
    <!-- Live Key Preview -->
    <div class="key-preview" id="key-preview-box">
      <div class="key-preview__header">
        <span class="key-preview__title">⚡ Преобразование слова в ключ перестановки</span>
      </div>
      <div id="key-preview-content"></div>
    </div>

    <!-- Cheatsheet table -->
    <div class="cheatsheet-card">
      <div class="cheatsheet-header">
        <div class="cheatsheet-title">
          <span>📖 Таблица 1 — Алфавит и порядковые номера</span>
          <span class="cheatsheet-badge">Шпаргалка</span>
        </div>
        <div class="cheatsheet-tabs">
          <button type="button" class="cheatsheet-tab-btn ${currentCheatsheetLang === "ru" ? "active" : ""}" data-lang="ru">Русский (1–33)</button>
          <button type="button" class="cheatsheet-tab-btn ${currentCheatsheetLang === "en" ? "active" : ""}" data-lang="en">English (1–26)</button>
        </div>
      </div>
      <p class="cheatsheet-desc">
        Каждой букве соответствует порядковый номер в алфавите. Буквы слова ранжируются по возрастанию номеров, формируя порядок перестановки символов в блоке. Нажмите на любую букву, чтобы вставить её в поле ключа.
      </p>
      <div class="cheatsheet-table-wrapper" id="cheatsheet-table-container"></div>
    </div>
  `;

  renderCheatsheetTable();

  // Tab buttons switching
  $blockExtras.querySelectorAll(".cheatsheet-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentCheatsheetLang = btn.dataset.lang;
      $blockExtras.querySelectorAll(".cheatsheet-tab-btn").forEach((b) => {
        b.classList.toggle("active", b.dataset.lang === currentCheatsheetLang);
      });
      renderCheatsheetTable();
      const kwInput = document.getElementById("param-keyword");
      if (kwInput) updateHighlights(kwInput.value);
    });
  });

  // Attach live updates to the keyword input
  const keywordInput = document.getElementById("param-keyword");
  if (keywordInput) {
    updateKeyPreview(keywordInput.value);
    updateHighlights(keywordInput.value);

    keywordInput.addEventListener("input", () => {
      updateKeyPreview(keywordInput.value);
      updateHighlights(keywordInput.value);
    });
  }
}

function renderCheatsheetTable() {
  const container = document.getElementById("cheatsheet-table-container");
  if (!container) return;

  const alphabet = currentCheatsheetLang === "ru" ? RU_ALPHABET : EN_ALPHABET;

  let ths = `<th class="cheatsheet-row-label">Буква</th>`;
  let tds = `<td class="cheatsheet-row-label">Номер</td>`;

  for (let i = 0; i < alphabet.length; i++) {
    const ch = alphabet[i];
    const num = i + 1;
    ths += `<th class="cheatsheet-char-cell" data-char="${ch}" title="Добавить букву '${ch}'">${ch}</th>`;
    tds += `<td class="cheatsheet-num-cell" data-char="${ch}" title="Буква '${ch}', номер ${num}">${num}</td>`;
  }

  container.innerHTML = `
    <table class="cheatsheet-table">
      <thead><tr>${ths}</tr></thead>
      <tbody><tr>${tds}</tr></tbody>
    </table>
  `;

  // Click on cells to insert into the keyword input
  container.querySelectorAll("[data-char]").forEach((cell) => {
    cell.addEventListener("click", () => {
      const ch = cell.dataset.char;
      const kwInput = document.getElementById("param-keyword");
      if (kwInput) {
        kwInput.value += ch;
        kwInput.dispatchEvent(new Event("input"));
        kwInput.focus();
      }
    });
  });
}

function updateHighlights(keyword) {
  const chars = new Set(Array.from(keyword.toUpperCase().replace(/\s+/g, "")));
  document.querySelectorAll(".cheatsheet-char-cell").forEach((cell) => {
    cell.classList.toggle("active-char", chars.has(cell.dataset.char));
  });
  document.querySelectorAll(".cheatsheet-num-cell").forEach((cell) => {
    cell.classList.toggle("active-num", chars.has(cell.dataset.char));
  });
}

function updateKeyPreview(keyword) {
  const content = document.getElementById("key-preview-content");
  if (!content) return;

  const result = keywordToPermutation(keyword);
  if (!result || result.items.length === 0) {
    content.innerHTML = `
      <span style="color:var(--text-muted);font-size:0.8rem;">
        Введите ключевое слово выше для генерации числового ключа перестановки.
      </span>
    `;
    return;
  }

  const chipsHtml = result.items
    .map(
      (item) => `
      <div class="key-preview__chip" title="Буква: ${item.char}, номер в алфавите: ${item.num}">
        <span class="key-preview__chip-char">${item.char}</span>
        <span class="key-preview__chip-num">№ ${item.num}</span>
      </div>
    `
    )
    .join("");

  content.innerHTML = `
    <div class="key-preview__steps">
      <div style="font-size:0.75rem;color:var(--text-muted);margin-right:4px;">Буквы и номера:</div>
      ${chipsHtml}
    </div>
    <div class="key-preview__result">
      <div class="key-preview__badge">
        <span class="key-preview__badge-label">Ключ перестановки:</span>
        <strong>[ ${result.perm1.join(", ")} ]</strong>
      </div>
      <div class="key-preview__badge key-preview__badge--cyan">
        <span class="key-preview__badge-label">Размер блока:</span>
        <strong>${result.perm1.length} ${result.perm1.length === 1 ? "символ" : (result.perm1.length < 5 ? "символа" : "символов")}</strong>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════
//  CAESAR CIPHER HELPERS & CHEATSHEET
// ═══════════════════════════════════════════════════════════════════════════

function renderCaesarExtras(withSpaces) {
  if (!$blockExtras) return;

  const currentShift = () => {
    const el = document.getElementById("param-shift");
    const val = el ? parseInt(el.value, 10) : 3;
    return isNaN(val) ? 3 : val;
  };

  const titleText = withSpaces
    ? "📖 Таблица алфавита со сдвигом (34 символа: буквы + пробел)"
    : "📖 Таблица классического алфавита (33 буквы)";
  const badgeText = withSpaces ? "34 символа (пробел № 34)" : "33 буквы (А–Я)";
  const descText = withSpaces
    ? "В этой версии алфавит расширен до 34 символов: 33 русские буквы и пробел на 34-й позиции. Буквы и пробелы сдвигаются циклически. Нажмите на любой символ, чтобы добавить его в текст."
    : "В классической версии сдвигаются только буквы алфавита (33 символа). Пробелы между словами и знаки препинания сохраняются на своих местах. Нажмите на букву, чтобы вставить её в текст.";

  $blockExtras.innerHTML = `
    <div class="cheatsheet-card">
      <div class="cheatsheet-header">
        <div class="cheatsheet-title">
          <span>${titleText}</span>
          <span class="cheatsheet-badge">${badgeText}</span>
        </div>
      </div>
      <p class="cheatsheet-desc">${descText}</p>
      <div class="cheatsheet-table-wrapper" id="caesar-table-container"></div>
    </div>
  `;

  function updateCaesarTable() {
    const container = document.getElementById("caesar-table-container");
    if (!container) return;

    const shift = currentShift();
    const chars = withSpaces
      ? [...RU_ALPHABET, " "]
      : [...RU_ALPHABET];
    const n = chars.length;

    let thsOrig = `<th class="cheatsheet-row-label">Исходный</th>`;
    let tdsNum = `<td class="cheatsheet-row-label">Номер</td>`;
    let tdsShifted = `<td class="cheatsheet-row-label">Сдвиг (+${shift})</td>`;

    chars.forEach((ch, idx) => {
      const num = idx + 1;
      const shiftedIdx = (idx + shift) % n;
      const normalizedShiftedIdx = (shiftedIdx + n) % n;
      const shiftedChar = chars[normalizedShiftedIdx];

      const displayOrig = ch === " " ? "␣" : ch;
      const displayShifted = shiftedChar === " " ? "␣" : shiftedChar;

      thsOrig += `<th class="cheatsheet-char-cell" data-char="${ch}" title="Символ '${displayOrig}', номер ${num}">${displayOrig}</th>`;
      tdsNum += `<td class="cheatsheet-num-cell" data-char="${ch}">${num}</td>`;
      tdsShifted += `<td class="cheatsheet-char-cell ${shiftedChar === " " ? "active-char" : ""}" data-char="${ch}" style="color:var(--cyan);font-weight:700;">${displayShifted}</td>`;
    });

    container.innerHTML = `
      <table class="cheatsheet-table">
        <thead><tr>${thsOrig}</tr></thead>
        <tbody>
          <tr>${tdsNum}</tr>
          <tr>${tdsShifted}</tr>
        </tbody>
      </table>
    `;

    // Click on cell to append char to input
    container.querySelectorAll("[data-char]").forEach((cell) => {
      cell.addEventListener("click", () => {
        const ch = cell.dataset.char;
        if ($inputText) {
          $inputText.value += ch;
          $inputText.focus();
        }
      });
    });
  }

  updateCaesarTable();

  const shiftInput = document.getElementById("param-shift");
  if (shiftInput) {
    shiftInput.addEventListener("input", updateCaesarTable);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  RENDER PARAMETERS
// ═══════════════════════════════════════════════════════════════════════════

function renderParams(params) {
  $paramsContainer.innerHTML = "";
  if ($blockExtras) {
    $blockExtras.innerHTML = "";
  }

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

  // If active cipher is block transposition or caesar, render cheatsheet & preview
  if (activeCipherId === "blocktransposition") {
    renderBlockTranspositionExtras();
  } else if (activeCipherId === "caesarspaces" || activeCipherId === "caesarwithspaces") {
    renderCaesarExtras(true);
  } else if (activeCipherId === "caesar" || activeCipherId === "caesarnospaces") {
    renderCaesarExtras(false);
  }
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
