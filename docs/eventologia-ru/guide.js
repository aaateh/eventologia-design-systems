/* =========================================================
   eventologia.ru — гайд дизайн-системы
   guide.js · без библиотек
   1) активный пункт меню (IntersectionObserver)
   2) копирование HEX в буфер
   3) мобильное меню в демо
   4) переключатель тёмной темы
   ========================================================= */
(function () {
  "use strict";

  /* ---------- 0. Общее ---------- */
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
    }, 2200);
  }

  /* ---------- 1. Активный пункт в навигации ---------- */
  var sections = Array.prototype.slice.call(document.querySelectorAll("main section[id]"));
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll("[data-nav-link]")
  );
  var mobileNav = document.querySelector(".mobile-nav");

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

    // На мобиле подтягиваем активную пилюлю в видимую часть полосы.
    if (mobileNav && mobileNav.offsetParent !== null) {
      var activeLink = mobileNav.querySelector(".is-active");
      if (activeLink) {
        var linkRect = activeLink.getBoundingClientRect();
        var navRect = mobileNav.getBoundingClientRect();
        if (linkRect.left < navRect.left + 8 || linkRect.right > navRect.right - 8) {
          mobileNav.scrollTo({
            left: mobileNav.scrollLeft + linkRect.left - navRect.left - 16,
            behavior: reduceMotion ? "auto" : "smooth"
          });
        }
      }
    }
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
        { rootMargin: "-10% 0px -70% 0px", threshold: 0 }
      );

      sections.forEach(function (section) {
        observer.observe(section);
      });

      // У последнего раздела маленькая высота видимой зоны — фиксируем вручную.
      // И возвращаем первый пункт, когда прокрутили выше первого раздела.
      var ticking = false;
      window.addEventListener(
        "scroll",
        function () {
          if (ticking) return;
          ticking = true;
          window.requestAnimationFrame(function () {
            ticking = false;
            if (sections[0].getBoundingClientRect().top > window.innerHeight * 0.35) {
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
        var offset = 120;
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

  /* ---------- 2. Копирование HEX ---------- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
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

  document.addEventListener("click", function (event) {
    var target = event.target.closest("[data-hex]");
    if (!target) return;

    var hex = target.getAttribute("data-hex");
    if (!hex) return;

    copyText(hex)
      .then(function () {
        showToast("Скопировано " + hex.toUpperCase());
      })
      .catch(function () {
        showToast("Не удалось скопировать — выделите код вручную");
      });
  });

  /* ---------- 3. Мобильное меню в демо ---------- */
  var phone = document.getElementById("phoneDemo");
  var menuToggle = document.getElementById("menuToggle");
  var burger = document.getElementById("burgerToggle");

  function setMenu(open) {
    if (!phone) return;
    phone.classList.toggle("is-open", open);

    if (menuToggle) menuToggle.setAttribute("aria-expanded", String(open));
    if (burger) burger.setAttribute("aria-expanded", String(open));

    if (open) {
      var firstLink = phone.querySelector(".phone__panel a");
      if (firstLink) {
        window.setTimeout(function () {
          firstLink.focus({ preventScroll: true });
        }, reduceMotion ? 0 : 300);
      }
    }
  }

  if (phone) {
    if (menuToggle) {
      menuToggle.addEventListener("click", function () {
        setMenu(!phone.classList.contains("is-open"));
      });
    }
    if (burger) {
      burger.addEventListener("click", function () {
        var willOpen = !phone.classList.contains("is-open");
        setMenu(willOpen);
        if (!willOpen) burger.focus({ preventScroll: true });
      });
    }
    var overlay = phone.querySelector(".phone__overlay");
    if (overlay) {
      overlay.addEventListener("click", function () {
        setMenu(false);
        if (burger) burger.focus({ preventScroll: true });
      });
    }
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && phone.classList.contains("is-open")) {
        setMenu(false);
        if (burger) burger.focus({ preventScroll: true });
      }
    });

    // Открытое состояние по умолчанию — как в спеке.
    if (menuToggle) menuToggle.setAttribute("aria-expanded", "true");
    if (burger) burger.setAttribute("aria-expanded", "true");
  }

  /* ---------- 4. Тёмная тема демо ---------- */
  var themeDemo = document.getElementById("themeDemo");
  var themeToggle = document.getElementById("themeToggle");
  var themeStatus = document.getElementById("themeStatus");

  function syncThemeLabel() {
    if (!themeDemo) return;
    var dark = themeDemo.classList.contains("theme-dark");
    if (themeToggle) {
      themeToggle.setAttribute("aria-pressed", String(dark));
      themeToggle.textContent = "Переключить тему";
    }
    if (themeStatus) {
      themeStatus.textContent = dark
        ? "Сейчас: тёмная · .theme-dark"
        : "Сейчас: светлая · без класса";
    }
  }

  if (themeDemo && themeToggle) {
    syncThemeLabel();
    themeToggle.addEventListener("click", function () {
      themeDemo.classList.toggle("theme-dark");
      syncThemeLabel();
      showToast(
        themeDemo.classList.contains("theme-dark")
          ? "Тёмная тема включена"
          : "Светлая тема включена"
      );
    });
  }
})();
