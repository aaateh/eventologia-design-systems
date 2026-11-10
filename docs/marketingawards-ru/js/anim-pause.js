/* Пауза CSS-анимаций, когда элемент вне экрана или вкладка не активна.
   Наблюдаем и секции, и сами анимированные блоки: если секция видна,
   но её анимация (перо, огонь, машинка и т. п.) уже ушла за кадр —
   она всё равно останавливается. Скрытая вкладка — html.is-page-hidden. */
(function () {
  var root = document.documentElement;

  function syncTab() {
    root.classList.toggle("is-page-hidden", document.hidden);
  }

  syncTab();
  document.addEventListener("visibilitychange", syncTab);

  if (!window.IntersectionObserver) return;

  var blocks = document.querySelectorAll(
    ".site > header, .site > main > section, .site > footer, " +
      ".typewriter, .bike, .fire-slot, .dates-art, .quill, .torch, .pocket-watch, .faq-book, .pricing-camera, .key-art, .lamp, "
      + ".poster-tape, #mission h2, .awards"
  );
  if (!blocks.length) return;

  // До первого срабатывания наблюдателя анимации не запускаем.
  for (var i = 0; i < blocks.length; i++) {
    blocks[i].classList.add("anim-paused");
  }

  /* Паузу считаем одной пачкой: сначала все замеры, потом все классы.
     Если мешать getBoundingClientRect и classList.toggle, браузер
     пересчитывает вёрстку между ними — по кругу, на каждом элементе. */
  var pausedState = [];
  var measured = [];

  function syncPaused() {
    var viewport = window.innerHeight;
    var k;

    // проход только на чтение — вёрстка считается один раз
    for (k = 0; k < blocks.length; k++) {
      var r = blocks[k].getBoundingClientRect();
      measured[k] = !(r.bottom > 0 && r.top < viewport);
    }

    // проход только на запись, и только там, где состояние изменилось
    for (k = 0; k < blocks.length; k++) {
      if (pausedState[k] === measured[k]) continue;
      pausedState[k] = measured[k];
      blocks[k].classList.toggle("anim-paused", measured[k]);
    }
  }

  // Сразу снимаем паузу с того, что уже в кадре: не ждём колбэка наблюдателя.
  syncPaused();

  var indexOf = new WeakMap();
  for (var n = 0; n < blocks.length; n++) indexOf.set(blocks[n], n);

  var io = new IntersectionObserver(
    function (entries) {
      for (var j = 0; j < entries.length; j++) {
        var el = entries[j].target;
        var paused = !entries[j].isIntersecting;
        var idx = indexOf.get(el);
        if (idx !== undefined) pausedState[idx] = paused;
        el.classList.toggle("anim-paused", paused);
      }
    },
    { rootMargin: "0px" }
  );

  for (var m = 0; m < blocks.length; m++) io.observe(blocks[m]);

  // Страховка на случай, если IntersectionObserver отдаёт колбэки с задержкой:
  // обновляем паузы на скролле и ресайзе одним rAF-кадром.
  var ticking = false;

  function refresh() {
    ticking = false;
    syncPaused();
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(refresh);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
})();
