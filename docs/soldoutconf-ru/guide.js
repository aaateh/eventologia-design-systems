/* =========================================================
   SOLD OUT — дизайн-система · guide.js
   Без библиотек. Всё, что добавляет JS, деградирует до
   читаемого статичного состояния.
   1) активный раздел в меню
   2) мобильное меню разделов
   3) живая модалка: фокус, Escape, фон, возврат фокуса
   4) FAQ-аккордеон
   5) копирование кода и HEX
   6) мобильное меню в демо шапки
   ========================================================= */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var toast = document.getElementById("toast");
  var toastTimer = null;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 2400);
  }

  /* ---------- 1. Активный раздел ---------- */
  var sections = Array.prototype.slice.call(document.querySelectorAll("main section[id]"));
  var navLinks = Array.prototype.slice.call(document.querySelectorAll("[data-nav-link]"));

  function setActive(id) {
    navLinks.forEach(function (link) {
      var isActive = link.getAttribute("href") === "#" + id;
      link.classList.toggle("is-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  if (sections.length) {
    setActive(sections[0].id);

    if ("IntersectionObserver" in window) {
      var visible = new Set();
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              visible.add(entry.target.id);
            } else {
              visible.delete(entry.target.id);
            }
          });
          var inView = sections.filter(function (section) {
            return visible.has(section.id);
          });
          if (inView.length) setActive(inView[inView.length - 1].id);
        },
        { rootMargin: "-12% 0px -68% 0px", threshold: 0 }
      );

      sections.forEach(function (section) {
        observer.observe(section);
      });

      var ticking = false;
      window.addEventListener(
        "scroll",
        function () {
          if (ticking) return;
          ticking = true;
          window.requestAnimationFrame(function () {
            ticking = false;
            if (sections[0].getBoundingClientRect().top > window.innerHeight * 0.4) {
              setActive(sections[0].id);
            }
            if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 4) {
              setActive(sections[sections.length - 1].id);
            }
          });
        },
        { passive: true }
      );
    } else {
      var onScroll = function () {
        var offset = 140;
        var current = sections[0].id;
        sections.forEach(function (section) {
          if (section.getBoundingClientRect().top <= offset) current = section.id;
        });
        setActive(current);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    navLinks.forEach(function (link) {
      link.addEventListener("click", function () {
        var href = link.getAttribute("href") || "";
        if (href.indexOf("#") === 0) setActive(href.slice(1));
      });
    });
  }

  /* ---------- 2. Мобильное меню разделов ---------- */
  var mnavToggle = document.getElementById("mnavToggle");
  var mnavPanel = document.getElementById("mnavPanel");

  function setMnav(open, restoreFocus) {
    if (!mnavToggle || !mnavPanel) return;
    mnavToggle.setAttribute("aria-expanded", String(open));
    mnavPanel.hidden = !open;
    if (!open && restoreFocus) mnavToggle.focus({ preventScroll: true });
  }

  if (mnavToggle && mnavPanel) {
    // В HTML панель открыта — без JS все разделы доступны.
    setMnav(false, false);

    mnavToggle.addEventListener("click", function () {
      setMnav(mnavToggle.getAttribute("aria-expanded") !== "true", false);
    });

    mnavPanel.addEventListener("click", function (event) {
      if (event.target.closest("a")) setMnav(false, false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && mnavToggle.getAttribute("aria-expanded") === "true") {
        setMnav(false, true);
      }
    });
  }

  /* ---------- 3. Живая модалка ---------- */
  var modal = document.getElementById("partnerModal");
  var lastFocused = null;

  function focusable(container) {
    return Array.prototype.slice
      .call(
        container.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      )
      .filter(function (el) {
        return el.offsetParent !== null;
      });
  }

  function openModal() {
    if (!modal) return;
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.classList.add("is-locked");
    var dialog = modal.querySelector(".sd-modal__dialog");
    var items = focusable(modal);
    var firstInput = modal.querySelector("input");
    window.setTimeout(function () {
      if (firstInput) firstInput.focus({ preventScroll: true });
      else if (items.length) items[0].focus({ preventScroll: true });
      else if (dialog) {
        dialog.setAttribute("tabindex", "-1");
        dialog.focus({ preventScroll: true });
      }
    }, reduceMotion ? 0 : 40);
  }

  function closeModal(restoreFocus) {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove("is-locked");
    if (restoreFocus && lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus({ preventScroll: true });
    }
    lastFocused = null;
  }

  if (modal) {
    document.addEventListener("click", function (event) {
      var opener = event.target.closest("[data-modal-open]");
      if (opener && opener.getAttribute("data-modal-open") === "partnerModal") {
        event.preventDefault();
        openModal();
        return;
      }

      if (event.target.closest("[data-modal-close]")) {
        event.preventDefault();
        closeModal(true);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (modal.hidden) return;

      if (event.key === "Escape") {
        event.preventDefault();
        closeModal(true);
        return;
      }

      if (event.key !== "Tab") return;

      var items = focusable(modal);
      if (!items.length) {
        event.preventDefault();
        return;
      }

      var first = items[0];
      var last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  /* ---------- 4. FAQ ---------- */
  var faqButtons = Array.prototype.slice.call(document.querySelectorAll(".faq_head"));

  faqButtons.forEach(function (button) {
    var bodyId = button.getAttribute("aria-controls");
    var body = bodyId ? document.getElementById(bodyId) : null;
    if (!body) return;

    button.setAttribute("aria-expanded", "false");
    body.hidden = true;

    button.addEventListener("click", function () {
      var open = button.getAttribute("aria-expanded") !== "true";
      button.setAttribute("aria-expanded", String(open));
      body.hidden = !open;
    });
  });

  /* ---------- 5. Копирование ---------- */
  function legacyCopy(text) {
    return new Promise(function (resolve, reject) {
      var area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.top = "-1000px";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try {
        var ok = document.execCommand("copy");
        document.body.removeChild(area);
        ok ? resolve() : reject(new Error("copy failed"));
      } catch (error) {
        document.body.removeChild(area);
        reject(error);
      }
    });
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () {
        return legacyCopy(text);
      });
    }
    return legacyCopy(text);
  }

  document.addEventListener("click", function (event) {
    var codeButton = event.target.closest("[data-copy]");
    if (codeButton) {
      var source = document.getElementById(codeButton.getAttribute("data-copy"));
      if (!source) return;
      var original = codeButton.textContent;
      copyText(source.textContent)
        .then(function () {
          codeButton.textContent = "Скопировано";
          codeButton.classList.add("is-done");
          showToast("Код скопирован");
          window.setTimeout(function () {
            codeButton.textContent = original;
            codeButton.classList.remove("is-done");
          }, 1800);
        })
        .catch(function () {
          var range = document.createRange();
          range.selectNodeContents(source);
          var selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
          showToast("Код выделен — нажмите ⌘C или Ctrl+C");
        });
      return;
    }

    var hexButton = event.target.closest("[data-hex]");
    if (!hexButton) return;
    var hex = hexButton.getAttribute("data-hex");
    if (!hex) return;
    copyText(hex)
      .then(function () {
        showToast("Скопировано " + hex.toUpperCase());
      })
      .catch(function () {
        showToast("Не удалось скопировать — выделите HEX вручную");
      });
  });

  /* ---------- 6. Мобильное меню в демо шапки ---------- */
  var sdBurger = document.querySelector(".sd-burger");
  var sdMenu = document.getElementById("sdMobMenu");

  if (sdBurger && sdMenu) {
    sdBurger.addEventListener("click", function () {
      var open = sdBurger.getAttribute("aria-expanded") !== "true";
      sdBurger.setAttribute("aria-expanded", String(open));
      sdMenu.hidden = !open;
    });
  }

  /* ---------- 7. Демо-формы ---------- */
  Array.prototype.slice.call(document.querySelectorAll("[data-demo-form]")).forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      showToast("Демо: форма не отправляется");
    });
  });
})();
