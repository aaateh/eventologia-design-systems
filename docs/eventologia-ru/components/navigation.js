/* =========================================================
   eventologia.ru — шапка и навигация
   navigation.js · без библиотек
   Отвечает только за мобильное меню: aria-expanded, класс
   is-open, Esc, клик по overlay, возврат фокуса на триггер.
   ========================================================= */
(function () {
  "use strict";

  var FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  var mobileQuery =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(max-width: 750px)")
      : null;

  function visibleFocusable(scope) {
    return Array.prototype.filter.call(
      scope.querySelectorAll(FOCUSABLE),
      function (el) {
        return !!(
          el.offsetWidth ||
          el.offsetHeight ||
          el.getClientRects().length
        );
      }
    );
  }

  function init(root) {
    var panel = root.querySelector("[data-ev-nav-panel]");
    if (!panel) return;

    var overlay = root.querySelector("[data-ev-nav-overlay]");
    var closeButton = root.querySelector("[data-ev-nav-close]");
    var burger = root.querySelector(".ev-burger");
    var panelId = panel.id;

    // Кнопки внутри компонента + внешние кнопки, ссылающиеся на эту панель
    // через aria-controls (например, демо-кнопка на странице компонента).
    var toggles = Array.prototype.filter.call(
      document.querySelectorAll("[data-ev-nav-toggle]"),
      function (button) {
        return (
          root.contains(button) ||
          (panelId && button.getAttribute("aria-controls") === panelId)
        );
      }
    );
    if (!toggles.length) return;

    var lastFocused = null;

    function isOpen() {
      return root.classList.contains("is-open");
    }

    function syncScrollLock() {
      var anyOpen = !!document.querySelector(".ev-site-nav.is-open");
      document.body.classList.toggle("ev-nav-locked", anyOpen);
    }

    function setOpen(open, returnFocus) {
      root.classList.toggle("is-open", open);

      toggles.forEach(function (button) {
        button.setAttribute("aria-expanded", open ? "true" : "false");
      });
      if (burger) {
        burger.setAttribute(
          "aria-label",
          open ? "Закрыть меню" : "Открыть меню"
        );
      }
      syncScrollLock();

      if (open) {
        lastFocused = document.activeElement;
        var firstLink = panel.querySelector(".ev-panel__list a[href]");
        var target = firstLink || panel.querySelector(FOCUSABLE);
        if (target) {
          window.requestAnimationFrame(function () {
            target.focus();
          });
        }
      } else {
        if (
          returnFocus &&
          lastFocused &&
          document.contains(lastFocused) &&
          typeof lastFocused.focus === "function"
        ) {
          lastFocused.focus();
        }
        lastFocused = null;
      }
    }

    toggles.forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.preventDefault();
        setOpen(!isOpen(), true);
      });
    });

    if (overlay) {
      overlay.addEventListener("click", function () {
        if (!isOpen()) return;
        setOpen(false, true);
      });
    }

    if (closeButton) {
      closeButton.addEventListener("click", function () {
        setOpen(false, true);
      });
    }

    // Переход по пункту меню закрывает панель, но не перехватывает фокус.
    panel.addEventListener("click", function (event) {
      var link = event.target;
      while (link && link !== panel) {
        if (link.tagName === "A") {
          setOpen(false, false);
          return;
        }
        link = link.parentNode;
      }
    });

    document.addEventListener("keydown", function (event) {
      if (!isOpen()) return;

      if (event.key === "Escape" || event.key === "Esc") {
        event.preventDefault();
        setOpen(false, true);
        return;
      }

      if (event.key !== "Tab") return;

      var items = visibleFocusable(panel);
      if (!items.length) return;

      var first = items[0];
      var last = items[items.length - 1];
      var active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !panel.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !panel.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    });

    // При смене ширины (поворот телефона, ресайз) закрываем панель.
    if (mobileQuery) {
      var onViewportChange = function () {
        if (isOpen()) setOpen(false, false);
      };
      if (typeof mobileQuery.addEventListener === "function") {
        mobileQuery.addEventListener("change", onViewportChange);
      } else if (typeof mobileQuery.addListener === "function") {
        mobileQuery.addListener(onViewportChange);
      }
    }
  }

  var roots = document.querySelectorAll("[data-ev-nav]");
  Array.prototype.forEach.call(roots, init);
})();
