(function () {
  // ===== SELECTORS =====
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  const timeDisplay = $("#time-display");
  const toggleBtn = $("#toggle-btn");
  const circle = document.querySelector(".progress-ring");
  const tabButtons = $$(".tab-button");
  const modalOverlay = $("#modalOverlay");
  const toggleSettings = $("#toggleSettings");
  const closeSettings = $("#closeSettings");
  const applySettings = $("#applySettings");
  const fontOptions = $$(".font-option");
  const colorThemes = $$(".theme-option");

  // Inputs
  const pomodoroInput = $("#pomodoroTime");
  const shortBreakInput = $("#shortBreakTime");
  const longBreakInput = $("#longBreakTime");

  // ===== STATE =====
  let mode = "pomodoro";
  let durations = {
    pomodoro: Number(pomodoroInput.value) * 60,
    shortBreak: Number(shortBreakInput.value) * 60,
    longBreak: Number(longBreakInput.value) * 60,
  };
  let remaining = durations[mode];
  let timer = null;
  let isRunning = false;

  // SVG ring setup
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  circle.style.strokeDasharray = circumference;
  circle.style.strokeDashoffset = circumference;

  // Accessibility init: set aria-pressed on tab buttons
  function refreshTabAria() {
    tabButtons.forEach((btn) => {
      btn.setAttribute(
        "aria-pressed",
        String(btn.classList.contains("active"))
      );
    });
  }
  refreshTabAria();

  // ====== TIMER LOGIC ======
  function updateDisplay() {
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    timeDisplay.textContent = `${String(minutes).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}`;

    const percent = ((durations[mode] - remaining) / durations[mode]) * 100;
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
  }

  function tick() {
    if (remaining > 0) {
      remaining -= 1;
      updateDisplay();
    } else {
      clearInterval(timer);
      timer = null;
      toggleBtn.textContent = "RESTART";
      toggleBtn.setAttribute("aria-pressed", "false");
      isRunning = false;
      // small, non-visual hint: set focus to toggle to help keyboard users
      toggleBtn.focus();
    }
  }

  function startTimer() {
    if (!isRunning) {
      timer = setInterval(tick, 1000);
      isRunning = true;
      toggleBtn.textContent = "PAUSE";
      toggleBtn.setAttribute("aria-pressed", "true");
    }
  }

  function pauseTimer() {
    clearInterval(timer);
    timer = null;
    isRunning = false;
    toggleBtn.textContent = "START";
    toggleBtn.setAttribute("aria-pressed", "false");
  }

  function resetTimer() {
    clearInterval(timer);
    remaining = durations[mode];
    updateDisplay();
    circle.style.strokeDashoffset = circumference;
    toggleBtn.textContent = "START";
    toggleBtn.setAttribute("aria-pressed", "false");
    isRunning = false;
  }

  // ====== TOGGLE BUTTON ======
  toggleBtn.addEventListener("click", () => {
    if (!isRunning && remaining > 0) {
      startTimer(); // Start or resume
    } else if (isRunning) {
      pauseTimer();
    } else {
      resetTimer(); // When finished (remaining = 0)
    }
  });

  // keyboard activation for toggle (Space/Enter)
  toggleBtn.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      toggleBtn.click();
    }
  });

  // ====== MODE SWITCHING ======
  // use event delegation on parent to minimize listeners
  document.querySelector(".timer-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".tab-button");
    if (!btn) return;

    tabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    mode = btn.dataset.mode;
    // update aria
    refreshTabAria();

    // keep visual fidelity — reset state only
    resetTimer();
  });

  // keyboard support for tabs (left/right)
  document.querySelector(".timer-tabs").addEventListener("keydown", (e) => {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const current = document.activeElement.closest(".tab-button");
    const list = tabButtons;
    let idx = list.indexOf(current);
    if (e.key === "ArrowLeft") idx = (idx - 1 + list.length) % list.length;
    if (e.key === "ArrowRight") idx = (idx + 1) % list.length;
    if (e.key === "Home") idx = 0;
    if (e.key === "End") idx = list.length - 1;
    list[idx].focus();
    list[idx].click();
  });

  // ====== SETTINGS MODAL ======
  // focus trap helpers
  let lastFocused = null;
  function trapFocus(modal) {
    const focusable = Array.from(
      modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute("disabled"));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    function onKey(e) {
      if (e.key === "Tab") {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
      if (e.key === "Escape") {
        closeSettings.click();
      }
    }
    modal.addEventListener("keydown", onKey);
    modal._onKey = onKey;
    first && first.focus();
  }
  function releaseFocus(modal) {
    if (!modal) return;
    modal.removeEventListener("keydown", modal._onKey);
    delete modal._onKey;
    lastFocused && lastFocused.focus();
  }

  toggleSettings.addEventListener("click", () => {
    lastFocused = document.activeElement;
    modalOverlay.classList.remove("hidden");
    modalOverlay.setAttribute("aria-hidden", "false");
    // set focus trap
    trapFocus(modalOverlay);
    // set aria-hidden on main content for AT — minimal and non-visual
    document.querySelector("main").setAttribute("aria-hidden", "true");
  });

  closeSettings.addEventListener("click", () => {
    modalOverlay.classList.add("hidden");
    modalOverlay.setAttribute("aria-hidden", "true");
    document.querySelector("main").removeAttribute("aria-hidden");
    releaseFocus(modalOverlay);
  });

  // close on overlay click (but not when clicking inside panel)
  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeSettings.click();
  });

  // close on Escape key globally when modal open
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modalOverlay.classList.contains("hidden")) {
      closeSettings.click();
    }
  });

  applySettings.addEventListener("click", () => {
    // update durations (preserve visual behavior)
    const p = Math.max(1, Math.min(60, Number(pomodoroInput.value) || 25));
    const s = Math.max(1, Math.min(30, Number(shortBreakInput.value) || 5));
    const l = Math.max(1, Math.min(60, Number(longBreakInput.value) || 15));

    durations = {
      pomodoro: p * 60,
      shortBreak: s * 60,
      longBreak: l * 60,
    };
    remaining = durations[mode];
    updateDisplay();

    // persist non-visual settings (durations, font, color)
    const selectedFont =
      fontOptions.find((f) => f.classList.contains("active"))?.dataset.font ||
      "Kumbh Sans";
    const selectedColor =
      colorThemes.find((c) => c.classList.contains("active"))?.dataset.color ||
      getComputedStyle(document.documentElement).getPropertyValue(
        "--accent-color"
      ) ||
      "#F87070";
    try {
      localStorage.setItem(
        "pomodoroSettings",
        JSON.stringify({ durations, selectedFont, selectedColor })
      );
    } catch (e) {
      // ignore write errors
    }

    modalOverlay.classList.add("hidden");
    modalOverlay.setAttribute("aria-hidden", "true");
    document.querySelector("main").removeAttribute("aria-hidden");
    releaseFocus(modalOverlay);
  });

  // ====== TIMING SELECTOR ======
  document.querySelectorAll(".setting-timer").forEach((timerBlock) => {
    const input = timerBlock.querySelector(".setting-input");
    const up = timerBlock.querySelector(".up");
    const down = timerBlock.querySelector(".down");

    const step = 1;

    up.addEventListener("click", () => {
      const max = parseInt(input.max) || 60;
      const current = parseInt(input.value) || 0;
      if (current < max) input.value = current + step;
    });

    down.addEventListener("click", () => {
      const min = parseInt(input.min) || 1;
      const current = parseInt(input.value) || 0;
      if (current > min) input.value = current - step;
    });

    // keyboard: allow up/down arrow to change values
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        up.click();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        down.click();
      }
    });
  });

  // ====== FONT SELECTOR ======
  const fontMap = {
    "Kumbh Sans": "1",
    "Roboto Slab": "2",
    "Space Mono": "3",
  };

  function applyFontToUI(fontName) {
    // keep the existing class tokens for visual fidelity — only swap numeric suffix
    const suffix = fontMap[fontName] || "1";
    const swap = (el) => {
      if (!el) return;
      el.className = el.className.replace(/tp\d-font\d/g, (match) =>
        match.replace(/\d$/, suffix)
      );
    };
    swap(timeDisplay);
    swap(toggleBtn);
    tabButtons.forEach(swap);
  }

  // restore saved preferences (non-visual)
  try {
    const saved = JSON.parse(localStorage.getItem("pomodoroSettings") || "{}");
    if (saved && saved.durations) {
      // update inputs & durations
      pomodoroInput.value =
        saved.durations.pomodoro / 60 || pomodoroInput.value;
      shortBreakInput.value =
        saved.durations.shortBreak / 60 || shortBreakInput.value;
      longBreakInput.value =
        saved.durations.longBreak / 60 || longBreakInput.value;
      durations = saved.durations;
      remaining = durations[mode];
      updateDisplay();
    }
    if (saved && saved.selectedFont) {
      fontOptions.forEach((o) => {
        o.classList.toggle("active", o.dataset.font === saved.selectedFont);
        o.setAttribute(
          "aria-selected",
          o.dataset.font === saved.selectedFont ? "true" : "false"
        );
      });
      applyFontToUI(saved.selectedFont);
    }
    if (saved && saved.selectedColor) {
      colorThemes.forEach((c) => {
        c.classList.toggle("active", c.dataset.color === saved.selectedColor);
        c.setAttribute(
          "aria-selected",
          c.dataset.color === saved.selectedColor ? "true" : "false"
        );
      });
      document.documentElement.style.setProperty(
        "--accent-color",
        saved.selectedColor
      );
      circle.style.stroke = saved.selectedColor;
    }
  } catch (e) {
    // ignore
  }

  fontOptions.forEach((option) => {
    option.addEventListener("click", () => {
      fontOptions.forEach((o) => o.classList.remove("active"));
      option.classList.add("active");
      const fontType = option.dataset.font;
      fontOptions.forEach((o) =>
        o.setAttribute("aria-selected", o === option ? "true" : "false")
      );
      applyFontToUI(fontType);
    });
  });

  // ====== COLOR THEME SELECTOR ======
  const root = document.documentElement;
  const progressRing = document.querySelector(".progress-ring");

  function applyTheme(color) {
    root.style.setProperty("--accent-color", color);
    if (progressRing) progressRing.style.stroke = color;

    // keep #toggle-btn hover color (non-visual UX) — inject minimal style if absent
    let styleTag = document.getElementById("dynamic-theme");
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = "dynamic-theme";
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = `#toggle-btn:hover { color: ${color}; }`;
  }

  colorThemes.forEach((option) => {
    option.addEventListener("click", () => {
      colorThemes.forEach((o) => o.classList.remove("active"));
      option.classList.add("active");
      colorThemes.forEach((o) =>
        o.setAttribute("aria-selected", o === option ? "true" : "false")
      );

      const color = option.getAttribute("data-color");
      applyTheme(color);
      try {
        const saved = JSON.parse(
          localStorage.getItem("pomodoroSettings") || "{}"
        );
        saved.selectedColor = color;
        localStorage.setItem("pomodoroSettings", JSON.stringify(saved));
      } catch (e) {}
    });
  });

  // preserve single-active class behavior already present in your markup
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      refreshTabAria();
    });
  });

  // ====== INIT ======
  updateDisplay();
})();
