/**
 * CurveFlowCarousel — автономная лента медиа с изгибом «ribbon».
 *
 * Переписанная с нуля (читаемая) реализация WebGL1-карусели
 * curveflowcarousel.framer.website. Без зависимостей.
 *
 * Математика и поведение сохранены: изгиб по косинусу, бесконечная лента,
 * drag/inertia/wheel/клавиши/autoplay, reveal-lift, fallback без WebGL.
 *
 * Использование:
 *   import CurveFlowCarousel from './curveflow-carousel.js';
 *   const carousel = new CurveFlowCarousel(host, { slides, frame, curve, ... });
 */

const VERSION = '1.0.0';

/* ------------------------------------------------------------------ */
/* Значения по умолчанию                                               */
/* ------------------------------------------------------------------ */

const DEFAULTS = {
  frame: {
    heightPct: 40,
    heightCap: 560,
    fit: 'fixed', // 'fixed' | 'natural'
    ratio: 1.25,
    spacing: 18,
    corner: 0,
    anchor: 21,
    offset: 3,
    centreSmall: true,
  },
  curve: {
    flatPct: 50,
    edgeScale: 1.93,
    speedFlare: 1,
    fringe: 0,
    split: 1,
    fringeOuter: 'rgb(160, 197, 246)',
    fringeInner: 'rgb(244, 199, 146)',
  },
  drive: {
    autoplay: 60,
    drag: 1,
    glide: 0.38,
    holdOnHover: false,
    keys: true,
    wheel: 'any', // 'none' | 'sideways' | 'any'
    wheelGain: 1,
  },
  reveal: {
    mode: 'lift', // 'lift' | 'slide' | 'dissolve' | 'off'
    time: 1,
    gap: 0.07,
    wait: 0.15,
    repeat: false,
  },
  press: {
    behaviour: 'focus', // 'focus' | 'follow'
    newTab: false,
  },
  backdrop: {
    fill: 'rgb(236, 236, 236)',
    grid: false,
    gridTint: 'rgba(0, 0, 0, 0.08)',
  },
  performance: {
    maxDpr: 2,
    pauseOffscreen: true,
    pauseHidden: true,
    lazyMedia: true,
    lazyVideo: true,
    pauseVideosOffscreen: true,
    rootMargin: '60px 0px',
    imageTimeout: 12000,
  },
  reducedMotion: 'auto', // 'auto' | 'reduce' | 'no-preference'
  forceFallback: false,
  ariaLabel: 'Media carousel',
  labels: {
    slides: 'Slides',
    slide: 'Slide',
    of: 'of',
    playVideo: 'Play video',
    pauseVideo: 'Pause video',
    canvas: 'Drag or use the arrow keys to browse',
    instructions:
      'Use the left and right arrow keys to browse, Home and End to jump to the ends, and Enter to open the link of the centred slide.',
    scrollHint: 'use arrow keys to scroll',
    newTab: 'opens in a new tab',
    roleDescription: 'media strip',
  },
  debug: false,
};

/* ------------------------------------------------------------------ */
/* Шейдеры (из оригинального компонента)                               */
/* ------------------------------------------------------------------ */

const PRECISION = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif`;

const VERTEX_SHADER = `
attribute vec2 aCorner;
uniform vec4 uBox;
uniform vec2 uView;
varying vec2 vPx;

void main() {
  vPx = mix(uBox.xy, uBox.zw, aCorner);
  vec2 c = vPx / uView * 2.0 - 1.0;
  gl_Position = vec4(c.x, -c.y, 0.0, 1.0);
}`;

// Карточка: форма считается во фрагментном шейдере по bbox искажённой карточки.
const CARD_SHADER = `${PRECISION}
varying vec2 vPx;
uniform vec2 uView;
uniform float uDpr;
uniform vec4 uCard;
uniform float uMid;
uniform float uFlat;
uniform float uFlare;
uniform float uCorner;
uniform float uAlpha;
uniform float uShift;
uniform float uFringe;
uniform vec4 uRimOut;
uniform vec4 uRimIn;
uniform sampler2D uImg;
uniform vec2 uImgSize;

void main() {
  float hw = uView.x * 0.5;
  float span = max(1.0 - uFlat, 0.001);
  float t = clamp((abs(vPx.x - hw) / hw - uFlat) / span, 0.0, 2.0);
  float k = 1.0 + uFlare * (1.0 - cos(t * 1.5707963));
  float live = step(0.0001, t) * step(t, 1.9999);
  float dk = uFlare * 1.5707963 * sin(t * 1.5707963) * live / (hw * span);
  float slope = uCard.w * 0.5 * dk;
  float squash = k / sqrt(1.0 + slope * slope);

  vec2 local = vec2(vPx.x - uCard.x, uMid + (vPx.y - uMid) / k - uCard.y);
  vec2 hs = uCard.zw * 0.5;
  float r = min(uCorner, min(hs.x, hs.y));
  vec2 past = abs(local - hs) - hs + r;
  float outsideD = length(max(past, vec2(0.0)));
  float insideD = min(max(past.x, past.y), 0.0);
  float edgeDist = outsideD + insideD - r;
  float onScreen = edgeDist * (past.y > past.x ? squash : 1.0);
  float a = clamp(0.5 - onScreen * uDpr, 0.0, 1.0) * uAlpha;
  if (a < 0.003) discard;

  vec2 st = local / uCard.zw;
  float boxR = uCard.z / uCard.w;
  float imgR = uImgSize.x / max(uImgSize.y, 1.0);
  vec2 crop = boxR > imgR ? vec2(1.0, imgR / boxR) : vec2(boxR / imgR, 1.0);
  vec2 uv = clamp((st - 0.5) * crop + 0.5, 0.001, 0.999);
  vec3 col = texture2D(uImg, uv).rgb;

  if (uShift > 0.0002) {
    vec2 nudge = vec2(uShift, 0.0);
    vec4 ahead = texture2D(uImg, clamp(uv + nudge, 0.001, 0.999));
    vec4 behind = texture2D(uImg, clamp(uv - nudge, 0.001, 0.999));
    col = vec3(ahead.r, col.g, behind.b);
  }

  float rim = min(local.y, uCard.w - local.y) * squash;
  float weight = smoothstep(0.0, 0.4, t) * uFringe;
  float outer = 1.0 - smoothstep(2.4, 3.6, rim);
  float inner = smoothstep(2.6, 3.8, rim) * (1.0 - smoothstep(5.0, 6.4, rim));
  col = mix(col, uRimIn.rgb, clamp(inner * weight * uRimIn.a, 0.0, 1.0));
  col = mix(col, uRimOut.rgb, clamp(outer * weight * uRimOut.a, 0.0, 1.0));

  gl_FragColor = vec4(col * a, a);
}`;

// Опциональный «пол» — перспективная сетка под карточками.
const GRID_SHADER = `${PRECISION}
varying vec2 vPx;
uniform vec2 uView;
uniform float uHorizon;
uniform float uDrift;
uniform float uAlpha;
uniform vec4 uTint;

void main() {
  float below = vPx.y - uHorizon;
  if (below <= 1.0) discard;
  float reach = uView.y * 0.7 / below;
  float gx = (vPx.x - uView.x * 0.5) * reach / uView.y * 6.0 + uDrift;
  float gz = reach;
  float pxX = min(fract(gx), 1.0 - fract(gx)) / max(reach / uView.y * 6.0, 0.00001);
  float pxZ = min(fract(gz), 1.0 - fract(gz)) / max(uView.y * 0.7 / (below * below), 0.00001);
  float line = max(1.0 - smoothstep(0.3, 1.0, pxX), 1.0 - smoothstep(0.3, 1.0, pxZ));
  float edge = abs(vPx.x / uView.x * 2.0 - 1.0);
  float fade = smoothstep(4.0, uView.y * 0.1, below) * (1.0 - smoothstep(0.55, 1.0, edge));
  float a = uTint.a * line * fade * uAlpha;
  gl_FragColor = vec4(uTint.rgb * a, a);
}`;

/* ------------------------------------------------------------------ */
/* Утилиты                                                             */
/* ------------------------------------------------------------------ */

const PI_2 = Math.PI / 2;
const MAX_IMAGE_DIM = 2048;

const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);
const mod = (v, m) => ((v % m) + m) % m;

/**
 * Пропускает только безопасные ссылки: http(s), mailto, tel и относительные URL.
 * `javascript:`, `data:`, `vbscript:`, `file:`, `blob:` и любые неизвестные схемы
 * отклоняются (возвращается пустая строка). Проверка идёт по «спрессованной»
 * строке, потому что браузеры игнорируют пробелы и управляющие символы внутри
 * схемы (`java\tscript:` и т.п.), а возвращается исходное значение.
 */
const SAFE_HREF_SCHEMES = new Set(['http', 'https', 'mailto', 'tel']);

function safeHref(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const probe = raw.replace(/[\u0000-\u0020\u007F\\]+/g, '');
  const match = probe.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (match && !SAFE_HREF_SCHEMES.has(match[1].toLowerCase())) return '';
  return raw;
}


const easeInOutCubic = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * Вертикальный масштаб ленты в точке x (та же формула, что в шейдере).
 */
function curveScale(x, viewW, flat, flare) {
  const hw = viewW * 0.5;
  const dist = Math.abs(x - hw) / hw;
  const t = clamp((dist - flat) / Math.max(1 - flat, 0.001), 0, 2);
  return 1 + flare * (1 - Math.cos(t * PI_2));
}

/*
 * Кэш разбора CSS-цветов. Canvas 2d понимает hex/rgb/rgba/hsl/hsla и
 * `var(--token, fallback)`. `currentColor`, `inherit` и `var(--token)` без
 * fallback canvas не разрешает — для них возвращается прозрачный цвет
 * (безопасный дефолт), а не чёрный. Вложенные var() не поддерживаются.
 * Значение, буквально совпавшее с цветом-маркером #010203, тоже станет
 * прозрачным — это осознанный компромисс ради отлова невалидных строк.
 */
const colorCache = new Map();
let colorProbe = null;
const COLOR_SENTINEL = '#010203';

function parseColor(input) {
  if (!input) return [0, 0, 0, 0];
  const key = String(input);
  if (colorCache.has(key)) return colorCache.get(key);

  let value = key.trim();
  const varMatch = value.match(/var\([^,]+,\s*(.+)\)\s*$/);
  if (varMatch) value = varMatch[1];

  let rgba = [0, 0, 0, 0];
  try {
    if (!colorProbe) colorProbe = document.createElement('canvas').getContext('2d');
    if (colorProbe) {
      // Некорректное значение canvas молча игнорирует, поэтому ставим
      // заведомо нестандартный цвет-маркер и смотрим, изменился ли fillStyle.
      colorProbe.fillStyle = COLOR_SENTINEL;
      colorProbe.fillStyle = value;
      const resolved = String(colorProbe.fillStyle);
      const unresolved =
        resolved === COLOR_SENTINEL && value.trim().toLowerCase() !== COLOR_SENTINEL;

      if (!unresolved) {
        if (resolved[0] === '#') {
          if (resolved.length === 7) {
            rgba = [
              parseInt(resolved.slice(1, 3), 16) / 255,
              parseInt(resolved.slice(3, 5), 16) / 255,
              parseInt(resolved.slice(5, 7), 16) / 255,
              1,
            ];
          } else if (resolved.length === 4) {
            rgba = [
              parseInt(resolved[1] + resolved[1], 16) / 255,
              parseInt(resolved[2] + resolved[2], 16) / 255,
              parseInt(resolved[3] + resolved[3], 16) / 255,
              1,
            ];
          }
        } else {
          const nums = resolved.match(/[\d.]+/g);
          if (nums && nums.length >= 3) {
            rgba = [
              Number(nums[0]) / 255,
              Number(nums[1]) / 255,
              Number(nums[2]) / 255,
              nums.length > 3 ? Number(nums[3]) : 1,
            ];
          }
        }
      }
    }
  } catch {
    /* некорректный цвет — прозрачный */
  }

  colorCache.set(key, rgba);
  return rgba;
}

function parseRootMargin(input, viewportWidth, viewportHeight) {
  const parts = String(input || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { top: 0, right: 0, bottom: 0, left: 0 };
  const px = (value, base) => {
    const number = parseFloat(value);
    if (!Number.isFinite(number)) return 0;
    return value.endsWith('%') ? (number / 100) * base : number;
  };
  const top = px(parts[0], viewportHeight);
  const right = px(parts[1] ?? parts[0], viewportWidth);
  const bottom = px(parts[2] ?? parts[0], viewportHeight);
  const left = px(parts[3] ?? parts[1] ?? parts[0], viewportWidth);
  return { top, right, bottom, left };
}

function normalizeOptions(input = {}) {  const out = {
    slides: Array.isArray(input.slides) ? input.slides.slice() : [],
    reducedMotion: input.reducedMotion ?? DEFAULTS.reducedMotion,
    forceFallback: !!input.forceFallback,
    ariaLabel: input.ariaLabel || DEFAULTS.ariaLabel,
    debug: !!input.debug,
    className: input.className || '',
  };
  for (const group of ['frame', 'curve', 'drive', 'reveal', 'press', 'backdrop', 'performance', 'labels']) {
    out[group] = { ...DEFAULTS[group], ...(input[group] || {}) };
  }
  return out;
}

function normalizeSlide(slide, index) {
  if (!slide || typeof slide !== 'object') {
    return { type: 'image', src: '', poster: '', alt: '', href: '', hrefInvalid: false };
  }
  const type = slide.type === 'video' ? 'video' : 'image';
  const rawHref = String(slide.href ?? '').trim();
  const href = safeHref(rawHref);
  return {
    type,
    src: String(slide.src || '').trim(),
    poster: String(slide.poster || '').trim(),
    alt: String(slide.alt || ''),
    href,
    hrefInvalid: !!rawHref && !href,
  };
}

/* ------------------------------------------------------------------ */
/* WebGL-хелперы                                                       */
/* ------------------------------------------------------------------ */

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('CurveFlowCarousel: cannot create shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`CurveFlowCarousel shader: ${log || 'compile error'}`);
  }
  return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    throw new Error('CurveFlowCarousel: cannot create program');
  }
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`CurveFlowCarousel program: ${log || 'link error'}`);
  }

  const uniforms = new Map();
  return {
    program,
    corner: gl.getAttribLocation(program, 'aCorner'),
    spot(name) {
      if (!uniforms.has(name)) uniforms.set(name, gl.getUniformLocation(program, name));
      return uniforms.get(name);
    },
  };
}

/**
 * Загружает картинку и всегда завершается: `onload`/`onerror` или таймаут.
 * Возвращает `{ media, reason }`, где `media` — `{ source, width, height }`
 * либо `null`. `reason`: `loaded` | `empty` | `error` | `timeout`.
 * Зависший сервер не должен держать `ready` и весь rAF — по таймауту
 * запрос отменяется через `img.src = ''`.
 */
function loadImageElement(src, timeoutMs = 12000) {
  return new Promise((resolve) => {
    if (!src) {
      resolve({ media: null, reason: 'empty' });
      return;
    }
    const img = new Image();
    let done = false;
    let timer = 0;
    const finish = (media, reason) => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      timer = 0;
      img.onload = null;
      img.onerror = null;
      resolve({ media, reason });
    };

    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      if (!img.naturalWidth || !img.naturalHeight) {
        finish(null, 'error');
        return;
      }
      finish({ source: img, width: img.naturalWidth, height: img.naturalHeight }, 'loaded');
    };
    img.onerror = () => finish(null, 'error');

    const wait = Number(timeoutMs);
    if (Number.isFinite(wait) && wait > 0) {
      timer = window.setTimeout(() => {
        if (done) return;
        done = true;
        timer = 0;
        img.onload = null;
        img.onerror = null;
        try {
          img.src = '';
        } catch {
          /* ignore */
        }
        resolve({ media: null, reason: 'timeout' });
      }, wait);
    }

    img.src = src;
  });
}

/** Уменьшает большие изображения до MAX_IMAGE_DIM (как оригинал, 2048). */
function shrinkSource(source, width, height, limit = MAX_IMAGE_DIM) {
  const maxSide = Math.max(width, height);
  if (maxSide <= limit) return { source, width, height };

  const scale = limit / maxSide;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return { source, width, height };
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return { source: canvas, width: canvas.width, height: canvas.height };
}

/* ------------------------------------------------------------------ */
/* Класс                                                               */
/* ------------------------------------------------------------------ */

let instanceCounter = 0;

export class CurveFlowCarousel {
  constructor(host, options = {}) {
    if (!(host instanceof HTMLElement)) {
      throw new TypeError('CurveFlowCarousel: host must be an HTMLElement');
    }

    this.version = VERSION;
    this.host = host;
    this.options = normalizeOptions(options);
    const invalidHrefs = [];
    this.items = this.options.slides.map((slide, index) => {
      const item = normalizeSlide(slide, index);
      if (item.hrefInvalid) invalidHrefs.push(index);
      return item;
    });

    this.mode = 'webgl';
    this.alive = true;
    this.ready = false;
    this.userPaused = false;
    this.inView = typeof IntersectionObserver === 'undefined';
    this.tabOn = !document.hidden;
    this.seen = !this.options.performance.lazyMedia || typeof IntersectionObserver === 'undefined';
    this.calm = false;
    this.hovering = false;

    // Геометрия / физика
    this.viewW = 1;
    this.viewH = 1;
    this.dpr = 1;
    this.cardH = 1;
    this.widths = [];
    this.starts = [];
    this.setLen = 1;
    this.loopLen = 1;
    this.margin = 0;
    this.pos = 0;
    this.vel = 0;
    this.glideTo = null;
    this.held = false;
    this.pressX = 0;
    this.pressPos = 0;
    this.travelled = 0;
    this.trail = [];
    this.lastShown = 0;
    this.flex = 0;
    this.clock = 0;
    this.revealAt = -1;
    this.ranks = new Map();
    this.rankCount = 0;
    this.cursor = { x: 0, y: 0, over: false };

    // Цикл
    this.raf = 0;
    this.lastNow = 0;
    this._resizeRaf = 0;
    this._frameCount = 0;
    this._fps = 0;
    this._lastSeats = [];
    this._lastDrawn = 0;
    this._lastCentered = null;
    this._announceNow = false;

    // Медиа / GL
    this.gl = null;
    this.canvas = null;
    this.corners = null;
    this.cardShader = null;
    this.floorShader = null;
    this._textures = [];
    this._texSize = [];
    this._natural = [];
    this._clips = [];
    this._mediaSink = null;
    this._videoSrcState = [];
    this._videoPromises = [];
    this._videoBusyUntil = [];
    this._videoLoadTimers = [];
    this._mediaActivated = false;
    this._placed = false;
    this._maxImageDim = MAX_IMAGE_DIM;

    // DOM / наблюдатели
    this._list = null;
    this._live = null;
    this._desc = null;
    this._watch = null;
    this._sizer = null;
    this._fallback = null;
    this._fallbackCards = [];
    this._fallbackVideos = [];
    this._fallbackImgs = [];
    this._fallbackVideoIO = null;
    this._fallbackActivated = false;
    this._fallbackScrollNudge = 0;

    // Слушатели
    this._offs = [];
    this._canvasOffs = [];
    this._fallbackOffs = [];
    this._motionQuery = null;

    // События
    this._events = new Map();

    // Состояние хоста до инициализации (восстанавливается в destroy)
    this._prevHost = {
      role: host.getAttribute('role'),
      roledescription: host.getAttribute('aria-roledescription'),
      label: host.getAttribute('aria-label'),
      background: host.style.backgroundColor,
      position: host.style.position,
      overflow: host.style.overflow,
    };

    this._instanceId = ++instanceCounter;
    this._frameLoop = this._frameLoop.bind(this);
    this._onPointerDown = this._onPointerDown.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerUp = this._onPointerUp.bind(this);
    this._onPointerLeave = this._onPointerLeave.bind(this);
    this._onWheel = this._onWheel.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onContextLost = this._onContextLost.bind(this);
    this._onVisibility = this._onVisibility.bind(this);
    this._onWindowResize = this._onWindowResize.bind(this);
    this._onFallbackScroll = this._onFallbackScroll.bind(this);
    this._onClipReady = this._onClipReady.bind(this);

    this._setupHost();
    this._measureInitialVisibility();
    this._bindGlobal();

    if (invalidHrefs.length) {
      queueMicrotask(() => {
        if (!this.alive) return;
        for (const index of invalidHrefs) {
          this._emit('error', {
            code: 'invalid-href',
            reason: 'invalid-href',
            index,
            fatal: false,
          });
        }
      });
    }

    // reduced-motion
    if (window.matchMedia) this._motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this._applyMotionPreference();
    if (this._motionQuery && this._motionQuery.addEventListener && this.options.reducedMotion === 'auto') {
      const onChange = () => {
        this._applyMotionPreference();
        this._emit('visibilitychange', this._visibilityPayload());
        this._recheck();
      };
      this._motionQuery.addEventListener('change', onChange);
      this._offs.push(() => this._motionQuery.removeEventListener('change', onChange));
    }

    this._setupObservers();

    if (this.options.forceFallback) {
      this._startFallback('forceFallback', false);
      return;
    }

    try {
      this._initWebGL();
    } catch (error) {
      if (this.options.debug) console.error('[CurveFlowCarousel] WebGL init failed', error);
      const message = error?.message || '';
      const code = /shader|program|compile|link/i.test(message)
        ? 'shader-compile'
        : 'webgl-unavailable';
      this._startFallback(code, true, true);
      return;
    }

    if (!this.options.performance.lazyMedia) this._activateMedia();
  }

  /* ---------------------------- публичное API --------------------------- */

  on(type, fn) {
    if (typeof fn !== 'function') return this;
    if (!this._events.has(type)) this._events.set(type, new Set());
    this._events.get(type).add(fn);
    return this;
  }

  off(type, fn) {
    const set = this._events.get(type);
    if (set) set.delete(fn);
    return this;
  }

  pause() {
    if (!this.alive) return this;
    this.userPaused = true;
    this._park();
    this._emit('visibilitychange', this._visibilityPayload());
    return this;
  }

  resume() {
    if (!this.alive) return this;
    this.userPaused = false;
    this._emit('visibilitychange', this._visibilityPayload());
    this._recheck();
    return this;
  }

  next() {
    return this._step(-1);
  }

  prev() {
    return this._step(1);
  }

  goTo(index) {
    const target = Math.trunc(Number(index));
    if (!Number.isFinite(target) || target < 0 || target >= this.items.length) return this;

    if (this.mode === 'fallback') {
      this._centerFallbackCard(target, true);
      return this;
    }
    if (!this.ready) return this;

    const seats = this._seats(this.pos + this._sweepShift());
    let delta = null;

    for (const seat of seats) {
      if (seat.slot === target) {
        delta = this.viewW / 2 - (seat.left + seat.width / 2);
        break;
      }
    }

    if (delta === null && this.widths.length) {
      const rawLeft = this._leftOf(this.starts[target], this.pos);
      delta = this.viewW / 2 - (rawLeft + this.widths[target] / 2);
      // ближайшая копия слайда (кольцо)
      delta = mod(delta + this.loopLen / 2, this.loopLen) - this.loopLen / 2;
    }

    if (delta === null) return this;
    this._aim(this.pos + delta, true);
    return this;
  }

  refresh() {
    if (!this.alive) return this;
    if (this.mode === 'fallback') {
      this._resize();
      this._layoutFallback();
      return this;
    }
    this._resize();
    this._schedule();
    return this;
  }

  getStats() {
    let videoPlaying = 0;
    let videosWithSrc = 0;
    if (this.mode === 'fallback') {
      for (const video of this._fallbackVideos) {
        if (!video.paused && video.readyState >= 2) videoPlaying += 1;
        if (video.getAttribute('src')) videosWithSrc += 1;
      }
    } else {
      for (const clip of this._clips) {
        if (!clip) continue;
        if (!clip.paused && clip.readyState >= 2) videoPlaying += 1;
        if (clip.getAttribute('src')) videosWithSrc += 1;
      }
    }
    let loadedTextures = 0;
    let loadedPosters = 0;
    for (const state of this._textures) {
      if (!state || state.kind === 'blank' || !state.allocW || !state.allocH) continue;
      loadedTextures += 1;
      if (state.kind === 'poster') loadedPosters += 1;
    }
    return {
      // обязательные поля
      mode: this.mode,
      ready: this.ready,
      running: !!this.raf,
      visible: this._isVisible(),
      tabOn: this.tabOn,
      calm: this.calm,
      position: this.mode === 'fallback' && this._fallback ? this._fallback.scrollLeft : this.pos,
      velocity: this.vel,
      flex: this.flex,
      dpr: this.dpr,
      viewW: this.viewW,
      viewH: this.viewH,
      cardH: this.cardH,
      frames: this._frameCount,
      fps: this._fps,
      videoPlaying,
      // диагностика
      slides: this.items.length,
      slideCount: this.items.length,
      textures: this._textures.length,
      loadedTextures,
      loadedPosters,
      // Диагностика: размеры фактически загруженных текстур (1×1 у пустых).
      textureSizes: this._texSize.map((size) => ({ w: size.w, h: size.h })),
      cards: this._lastDrawn,
      centered: this._lastCentered,
      revealing: this._revealing(),
      paused: this.userPaused,
      inView: this.inView,
      loopLen: this.loopLen,
      videosWithSrc,
      version: this.version,
    };
  }

  destroy() {
    if (!this.alive && this.mode === 'destroyed') return;

    this.alive = false;
    this._park();
    this.ready = false;

    if (this._resizeRaf) cancelAnimationFrame(this._resizeRaf);
    this._resizeRaf = 0;

    for (const off of this._offs) {
      try { off(); } catch { /* ignore */ }
    }
    for (const off of this._canvasOffs) {
      try { off(); } catch { /* ignore */ }
    }
    for (const off of this._fallbackOffs) {
      try { off(); } catch { /* ignore */ }
    }
    this._offs = [];
    this._canvasOffs = [];
    this._fallbackOffs = [];

    if (this._watch) this._watch.disconnect();
    if (this._sizer) this._sizer.disconnect();
    if (this._fallbackVideoIO) this._fallbackVideoIO.disconnect();
    this._watch = null;
    this._sizer = null;
    this._fallbackVideoIO = null;

    for (const clip of this._clips) {
      if (!clip) continue;
      try { clip.pause(); } catch { /* ignore */ }
      clip.removeAttribute('src');
      clip.removeAttribute('poster');
      try { clip.load(); } catch { /* ignore */ }
      clip.remove();
    }
    for (const video of this._fallbackVideos) {
      if (!video) continue;
      try { video.pause(); } catch { /* ignore */ }
      video.removeAttribute('src');
      video.removeAttribute('poster');
      try { video.load(); } catch { /* ignore */ }
    }
    for (const img of this._fallbackImgs) {
      if (img) img.removeAttribute('src');
    }
    this._clips = [];
    this._fallbackCards = [];
    this._fallbackVideos = [];
    this._fallbackImgs = [];
    this._fallbackActivated = false;
    this._videoPromises = [];
    this._videoSrcState = [];
    this._videoBusyUntil = [];
    for (const timer of this._videoLoadTimers) {
      if (timer) clearTimeout(timer);
    }
    this._videoLoadTimers = [];
    if (this._mediaSink) {
      this._mediaSink.remove();
      this._mediaSink = null;
    }
    if (this._fallbackScrollNudge) cancelAnimationFrame(this._fallbackScrollNudge);
    this._fallbackScrollNudge = 0;

    this._disposeGL();

    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
    }
    if (this._fallback) {
      this._fallback.remove();
      this._fallback = null;
    }
    if (this._list) {
      this._list.remove();
      this._list = null;
    }
    if (this._live) {
      this._live.remove();
      this._live = null;
    }
    if (this._desc) {
      this._desc.remove();
      this._desc = null;
    }

    this.host.classList.remove('cfc-host');
    if (this.options.className) {
      for (const name of String(this.options.className).split(/\s+/)) {
        if (name) this.host.classList.remove(name);
      }
    }
    this._restoreHost();

    this.mode = 'destroyed';
    this.raf = 0;
    this._lastSeats = [];
    this._lastDrawn = 0;
    this._lastCentered = null;
    this._announceNow = false;
    this._events.clear();
  }

  /* ------------------------------ настройка ----------------------------- */

  _setupHost() {
    const host = this.host;
    host.classList.add('cfc-host');
    if (this.options.className) {
      for (const name of String(this.options.className).split(/\s+/)) {
        if (name) host.classList.add(name);
      }
    }

    host.setAttribute('role', 'region');
    host.setAttribute('aria-roledescription', this.options.labels.roleDescription);
    host.setAttribute('aria-label', this.options.ariaLabel);
    host.style.backgroundColor = this.options.backdrop.fill;

    const computed = window.getComputedStyle(host);
    if (computed.position === 'static') host.style.position = 'relative';
    if (computed.overflow === 'visible') host.style.overflow = 'hidden';

    // Инструкция для canvas (aria-describedby) — вне визуального потока.
    const desc = document.createElement('p');
    desc.className = 'cfc-desc cfc-sr';
    desc.id = `cfc-desc-${this._instanceId}`;
    desc.textContent = this.options.labels.instructions || this.options.labels.canvas;
    host.appendChild(desc);
    this._desc = desc;

    // Скрытый список слайдов для скринридеров.
    const list = document.createElement('ol');
    list.className = 'cfc-list cfc-sr';
    list.setAttribute('aria-label', this.options.labels.slides);
    for (let i = 0; i < this.items.length; i += 1) {
      const item = this.items[i];
      const li = document.createElement('li');
      const label = item.alt || `${this.options.labels.slide} ${i + 1}`;
      if (item.href) {
        const link = document.createElement('a');
        link.href = item.href;
        link.textContent = label;
        link.tabIndex = -1;
        if (this.options.press.newTab) {
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
        }
        li.appendChild(link);
      } else {
        li.textContent = label;
      }
      list.appendChild(li);
    }
    host.appendChild(list);
    this._list = list;

    const live = document.createElement('div');
    live.className = 'cfc-live cfc-sr';
    live.id = `cfc-live-${this._instanceId}`;
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    host.appendChild(live);
    this._live = live;
  }

  _restoreHost() {
    const host = this.host;
    const prev = this._prevHost;
    const restore = (name, value) => {
      if (value === null) host.removeAttribute(name);
      else host.setAttribute(name, value);
    };
    restore('role', prev.role);
    restore('aria-roledescription', prev.roledescription);
    restore('aria-label', prev.label);
    host.style.backgroundColor = prev.background;
    host.style.position = prev.position;
    host.style.overflow = prev.overflow;
  }

  _bindGlobal() {
    document.addEventListener('visibilitychange', this._onVisibility);    this._offs.push(() => document.removeEventListener('visibilitychange', this._onVisibility));

    window.addEventListener('resize', this._onWindowResize, { passive: true });
    this._offs.push(() => window.removeEventListener('resize', this._onWindowResize));
  }

  _measureInitialVisibility() {
    if (typeof IntersectionObserver === 'undefined') {
      this.inView = true;
      this.seen = true;
      return;
    }
    const rect = this.host.getBoundingClientRect();
    const vw = window.innerWidth || document.documentElement.clientWidth || 0;
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    const margin = parseRootMargin(this.options.performance.rootMargin, vw, vh);
    this.inView =
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom >= -margin.bottom &&
      rect.top <= vh + margin.top &&
      rect.right >= -margin.right &&
      rect.left <= vw + margin.left;
    if (this.inView) this.seen = true;
  }

  _setupObservers() {
    const perf = this.options.performance;

    if (typeof IntersectionObserver !== 'undefined') {
      this._watch = new IntersectionObserver(
        (entries) => {
          if (!this.alive) return;
          const wasInView = this.inView;
          this.inView = entries.some((entry) => entry.isIntersecting);

          if (this.inView && !wasInView && this.seen && this.ready && this.options.reveal.repeat && this.mode === 'webgl') {
            this._beginReveal();
          }
          if (this.inView) this.seen = true;

          if (this.inView && this.mode === 'webgl' && !this._mediaActivated) {
            this._activateMedia();
          }
          if (this.inView && this.mode === 'fallback') this._activateFallbackMedia();
          if (!this.inView) this._pauseFallbackVideos();

          if (wasInView !== this.inView) {
            this._emit('visibilitychange', this._visibilityPayload());
          }
          this._recheck();
        },
        { rootMargin: perf.rootMargin }
      );
      this._watch.observe(this.host);
    }

    if (typeof ResizeObserver !== 'undefined') {
      this._sizer = new ResizeObserver(() => this._queueResize());
      this._sizer.observe(this.host);
    }
  }

  _applyMotionPreference() {
    const pref = this.options.reducedMotion;
    if (pref === 'reduce') this.calm = true;
    else if (pref === 'no-preference') this.calm = false;
    else this.calm = !!(this._motionQuery && this._motionQuery.matches);
    if (this.calm) {
      this.revealAt = -1;
      this.vel = 0;
      this.glideTo = null;
    }
  }

  /* -------------------------------- WebGL ------------------------------- */

  _initWebGL() {
    const canvas = document.createElement('canvas');
    canvas.className = 'cfc-canvas';
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'application');
    canvas.setAttribute('aria-roledescription', this.options.labels.roleDescription);
    canvas.setAttribute('aria-label', this.options.labels.canvas);
    if (this._desc) canvas.setAttribute('aria-describedby', this._desc.id);
    this.host.insertBefore(canvas, this.host.firstChild);
    this.canvas = canvas;

    const gl =
      canvas.getContext('webgl', {
        alpha: true,
        antialias: false,
        premultipliedAlpha: true,
        depth: false,
      }) || canvas.getContext('experimental-webgl');

    if (!gl) throw new Error('WebGL is not available');
    this.gl = gl;
    this._maxImageDim = Math.min(MAX_IMAGE_DIM, gl.getParameter(gl.MAX_TEXTURE_SIZE) || MAX_IMAGE_DIM);

    this.cardShader = createProgram(gl, VERTEX_SHADER, CARD_SHADER);
    try {
      this.floorShader = createProgram(gl, VERTEX_SHADER, GRID_SHADER);
    } catch (error) {
      this.floorShader = null;
      if (this.options.debug) console.warn('[CurveFlowCarousel] grid shader unavailable', error);
    }

    const buffer = gl.createBuffer();
    if (!buffer) throw new Error('Cannot create WebGL buffer');
    this.corners = buffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);

    // Отсоединённые <video> в некоторых движках лениво грузят metadata.
    // Держим их в невидимом контейнере: размер 1×1, вне потока и a11y-дерева.
      const sink = document.createElement('div');
    sink.className = 'cfc-media-sink';
    sink.setAttribute('aria-hidden', 'true');
    sink.style.cssText =
      'position:absolute;top:0;left:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;clip-path:inset(50%)';
    this.host.appendChild(sink);
    this._mediaSink = sink;

    for (const item of this.items) {
      this._textures.push(this._blankTexture());
      this._texSize.push({ w: 1, h: 1 });
      this._natural.push(item.type === 'video' ? 0.5625 : 1.25);
      this._clips.push(null);
      this._videoSrcState.push('idle');
      this._videoPromises.push(null);
      this._videoBusyUntil.push(0);
      this._videoLoadTimers.push(0);
    }

    this._bindCanvas();

    this.inView = this.inView || typeof IntersectionObserver === 'undefined';
    this._resize();

    if (!this.options.performance.lazyMedia || this.inView) {
      this._activateMedia();
    }
  }

  _blankTexture() {
    const gl = this.gl;
    const texture = gl.createTexture();
    if (!texture) throw new Error('Cannot create WebGL texture');
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([214, 214, 214, 255])
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return { tex: texture, w: 1, h: 1, allocW: 0, allocH: 0, kind: 'blank' };
  }

  _bindCanvas() {
    const canvas = this.canvas;
    const add = (target, type, handler, opts) => {
      target.addEventListener(type, handler, opts);
      this._canvasOffs.push(() => target.removeEventListener(type, handler, opts));
    };

    add(canvas, 'pointerdown', this._onPointerDown);
    add(canvas, 'pointermove', this._onPointerMove);
    add(canvas, 'pointerup', this._onPointerUp);
    add(canvas, 'pointercancel', this._onPointerUp);
    add(canvas, 'pointerleave', this._onPointerLeave);
    add(canvas, 'wheel', this._onWheel, { passive: false });
    add(canvas, 'keydown', this._onKeyDown);
    add(canvas, 'webglcontextlost', this._onContextLost, false);
  }

  _activateMedia() {
    if (this._mediaActivated || !this.alive || this.mode !== 'webgl') return;
    this._mediaActivated = true;

    const tasks = this.items.map((item, index) => {
      if (!item.src) {
        // Подписка после конструктора должна успеть: событие уходит в микрозадачу,
        // как и invalid-href.
        queueMicrotask(() => {
          if (!this.alive || this.mode !== 'webgl') return;
          this._emit('error', { code: 'media-load', reason: 'missing-src', index, src: '', fatal: false });
        });
        return Promise.resolve(false);
      }
      return item.type === 'video' ? this._prepareVideo(item, index) : this._prepareImage(item, index);
    });

    Promise.all(tasks)
      .then(() => {
        if (!this.alive || this.mode !== 'webgl') return;
        if (!this.items.length) {
          this.ready = true;
          this._emit('ready', { mode: 'webgl', slides: 0, textures: 0 });
          this._recheck();
          return;
        }
        this.layout();
        if (!this._placed) {
          this._placeFirst();
          this._placed = true;
        }
        this.ready = true;
        this._beginReveal();
        this._emit('ready', { mode: 'webgl', slides: this.items.length, textures: this._textures.length });
        if (!this.alive) return;
        this._updateCentered(this._seats(this.pos));
        this._recheck();
      })
      .catch((error) => {
        if (!this.alive) return;
        if (this.options.debug) console.error('[CurveFlowCarousel] media load failed', error);
        this._startFallback('media-load', true, false);
      });
  }

  async _prepareImage(item, index) {
    const loaded = await loadImageElement(item.src, this.options.performance.imageTimeout);
    if (!this.alive || this.mode !== 'webgl') return false;
    if (!loaded.media) {
      this._emit('error', {
        code: 'media-load',
        reason: loaded.reason === 'timeout' ? 'timeout' : 'image',
        index,
        src: item.src,
        fatal: false,
      });
      return false;
    }

    const media = loaded.media;
    const fitted = shrinkSource(media.source, media.width, media.height, this._maxImageDim);
    const ok = this._uploadImage(index, fitted);
    if (!ok) {
      this._emit('error', { code: 'media-load', reason: 'image-upload', index, src: item.src, fatal: false });
      return false;
    }
    this._natural[index] = clamp(fitted.width / fitted.height, 0.3, 3.2);
    return true;
  }

  async _prepareVideo(item, index) {
    const clip = document.createElement('video');
    clip.muted = true;
    clip.defaultMuted = true;
    clip.loop = true;
    clip.playsInline = true;
    clip.preload = 'metadata';
    clip.crossOrigin = 'anonymous';
    clip.setAttribute('muted', '');
    clip.setAttribute('playsinline', '');
    clip.setAttribute('webkit-playsinline', '');
    clip.setAttribute('aria-hidden', 'true');
    if (item.poster) clip.poster = item.poster;
    clip.addEventListener('loadeddata', this._onClipReady);
    clip.addEventListener('canplay', this._onClipReady);
    clip.addEventListener('playing', this._onClipReady);
    if (this._mediaSink) this._mediaSink.appendChild(clip);

    this._clips[index] = clip;
    if (item.poster) this._loadPoster(index, item.poster);

    if (!this.options.performance.lazyVideo) {
      return this._loadVideoSource(index);
    }
    // src подключится, когда карточка впервые станет видимой.
    return true;
  }

  _loadPoster(index, poster) {
    loadImageElement(poster, this.options.performance.imageTimeout).then((loaded) => {
      if (!this.alive || this.mode !== 'webgl') return;
      if (!loaded.media) {
        if (loaded.reason === 'timeout') {
          this._emit('error', { code: 'media-load', reason: 'timeout', index, src: poster, fatal: false });
        }
        return;
      }
      const media = loaded.media;
      const state = this._textures[index];
      if (!state || state.kind === 'video') return;
      const fitted = shrinkSource(media.source, media.width, media.height, this._maxImageDim);
      if (this._uploadImage(index, fitted, 'poster')) {
        if (this._videoSrcState[index] !== 'ready') {
          this._natural[index] = clamp(fitted.width / fitted.height, 0.3, 3.2);
        }
        if (this.ready && this.options.frame.fit === 'natural') {
          this._relayoutKeepingCenter(index);
        } else {
          this._schedule();
        }
      }
    });
  }

  _loadVideoSource(index) {
    if (this._videoPromises[index]) return this._videoPromises[index];

    const clip = this._clips[index];
    const item = this.items[index];
    if (!clip || !item || item.type !== 'video' || !item.src) return Promise.resolve(false);
    if (this._videoSrcState[index] === 'ready') return Promise.resolve(true);
    if (this._videoSrcState[index] === 'error') return Promise.resolve(false);

    this._videoSrcState[index] = 'loading';
    // Короткое окно, в течение которого цикл ещё крутится ради запуска видео.
    // Дольше — не ждём: битый источник не должен держать rAF вечно.
    this._videoBusyUntil[index] = performance.now() + 1500;

    const promise = new Promise((resolve) => {
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        clip.removeEventListener('loadedmetadata', onMeta);
        clip.removeEventListener('loadeddata', onData);
        clip.removeEventListener('error', onError);
        this._videoSrcState[index] = ok ? 'ready' : 'error';
        this._videoBusyUntil[index] = 0;
        const timer = this._videoLoadTimers[index];
        if (timer) {
          clearTimeout(timer);
          this._videoLoadTimers[index] = 0;
        }
        if (ok) {
          const w = clip.videoWidth;
          const h = clip.videoHeight;
          if (w && h) {
            // `_natural` — из metadata видео; размер текстуры (`_texSize`)
            // обновится только когда кадр реально уйдёт в GPU в
            // `_uploadVideoFrame`. До этого в текстуре лежит постер.
            this._natural[index] = clamp(w / h, 0.3, 3.2);
          }
          if (this.ready && this.options.frame.fit === 'natural') {
            this._relayoutKeepingCenter(index);
          }
        } else {
          if (this.alive && this.mode === 'webgl') {
            this._emit('error', {
              code: 'media-load',
              reason: 'video',
              index,
              src: item.src,
              fatal: false,
            });
          }
        }
        this._schedule();
        resolve(ok);
      };
      const onMeta = () => {
        if (clip.videoWidth && clip.videoHeight) finish(true);
      };
      const onData = () => {
        if (clip.videoWidth && clip.videoHeight) finish(true);
      };
      const onError = () => finish(false);

      clip.addEventListener('loadedmetadata', onMeta);
      clip.addEventListener('loadeddata', onData);
      clip.addEventListener('error', onError);
      clip.preload = 'metadata';
      try {
        clip.src = item.src;
      } catch {
        finish(false);
        return;
      }
      if (clip.readyState >= 1 && clip.videoWidth && clip.videoHeight) finish(true);

      // Защита от «зависшего» источника: таймер снимается в finish/destroy.
      this._videoLoadTimers[index] = window.setTimeout(() => {
        this._videoLoadTimers[index] = 0;
        if (!settled && this.alive) {
          finish(clip.readyState >= 1 && !!clip.videoWidth && !!clip.videoHeight);
        }
      }, 10000);
    });

    this._videoPromises[index] = promise;
    return promise;
  }

  _uploadImage(index, media, kind = 'image') {
    const gl = this.gl;
    const state = this._textures[index];
    if (!gl || !state) return false;
    gl.bindTexture(gl.TEXTURE_2D, state.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, media.source);
    } catch {
      return false;
    }
    state.w = media.width;
    state.h = media.height;
    state.allocW = media.width;
    state.allocH = media.height;
    state.kind = kind;
    // Публичная геометрия текстуры всегда отражает то, что реально лежит в GPU:
    // постер, картинку или видео-кадр.
    this._texSize[index] = { w: media.width, h: media.height };
    return true;
  }

  /** Первая аллокация — texImage2D, дальше только texSubImage2D. */
  _uploadVideoFrame(index) {
    const clip = this._clips[index];
    const state = this._textures[index];
    if (!clip || !state || clip.readyState < 2) return;
    const width = clip.videoWidth;
    const height = clip.videoHeight;
    if (!width || !height) return;

    const gl = this.gl;
    const reallocate = state.kind !== 'video' || state.allocW !== width || state.allocH !== height;

    gl.bindTexture(gl.TEXTURE_2D, state.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    try {
      if (reallocate) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, clip);
        state.allocW = width;
        state.allocH = height;
        state.kind = 'video';
      } else {
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, clip);
      }
      state.w = width;
      state.h = height;
      this._texSize[index] = { w: width, h: height };
    } catch {
      /* кадр не готов — пропускаем */
    }
  }

  /* ----------------------------- геометрия ------------------------------ */

  layout() {
    const frame = this.options.frame;
    this.cardH = Math.max(40, Math.min((frame.heightPct / 100) * this.viewH, frame.heightCap));
    const ratio = clamp(frame.ratio, 0.3, 3.2);

    this.widths = this.items.map((_, index) =>
      (frame.fit === 'natural' ? this._natural[index] || ratio : ratio) * this.cardH
    );

    this.starts = [];
    let cursor = 0;
    for (const width of this.widths) {
      this.starts.push(cursor);
      cursor += width + Math.max(0, frame.spacing);
    }
    this.setLen = Math.max(1, cursor);

    const maxWidth = Math.max(1, ...this.widths);
    const copies = Math.max(2, Math.ceil(((this.viewW * 2) + (maxWidth * 2)) / this.setLen));
    this.loopLen = copies * this.setLen;
    this.margin = (this.loopLen - this.viewW) / 2;
  }

  /**
   * Пересчитывает раскладку, удерживая карточку `slot` на прежнем месте экрана.
   * Нужен, когда `fit:'natural'` узнаёт настоящие размеры видео после metadata.
   */
  _relayoutKeepingCenter(slot) {
    if (!this.alive || this.mode !== 'webgl' || !this.ready || !this.widths.length) return false;
    if (!this.starts.length || this.starts[slot] === undefined) return false;

    const shifted = this.pos + this._sweepShift();
    const seats = this._seats(shifted);
    let target = seats.find((seat) => seat.slot === slot);
    if (!target) {
      target = this._pick(this.viewW / 2, this._mid(), seats) || seats[0];
    }
    if (!target) return false;

    const anchorSlot = target.slot;
    const centerX = target.left + target.width / 2;
    const oldPos = this.pos;
    this.layout();
    const left = this._leftOf(this.starts[anchorSlot], shifted);
    let delta = centerX - (left + this.widths[anchorSlot] / 2);
    delta = mod(delta + this.loopLen / 2, this.loopLen) - this.loopLen / 2;
    this.pos = oldPos + delta;
    this.pressPos = this.pos;
    this.lastShown = this.pos + this._sweepShift();
    if (this.glideTo) {
      this.glideTo.from += delta;
      this.glideTo.to += delta;
    }
    this._schedule();
    return true;
  }

  _leftOf(x, pos) {
    return mod(x + pos + this.margin, this.loopLen) - this.margin;
  }

  _placeFirst() {
    const frame = this.options.frame;
    const anchor = frame.centreSmall && this.viewW < 700 ? 0.5 : clamp(frame.anchor, 0, 100) / 100;
    this.pos = anchor * this.viewW - (this.starts[0] + this.widths[0] / 2);
    this.vel = 0;
    this.glideTo = null;
    this.lastShown = this.pos;
  }

  _seats(posValue) {
    if (!this.widths.length) return [];
    const seats = [];
    const copies = Math.max(1, Math.round(this.loopLen / this.setLen));
    const count = this.items.length;
    for (let copy = 0; copy < copies; copy += 1) {
      for (let slot = 0; slot < count; slot += 1) {
        const left = this._leftOf(copy * this.setLen + this.starts[slot], posValue);
        const width = this.widths[slot];
        if (left > this.viewW + 40 || left + width < -40) continue;
        seats.push({ key: copy * count + slot, slot, left, width });
      }
    }
    return seats;
  }

  _mid() {
    return this.viewH * 0.5 + (this.options.frame.offset / 100) * this.viewH;
  }

  _shape() {
    const curve = this.options.curve;
    return {
      flat: clamp(curve.flatPct / 100, 0, 0.95) * (1 - 0.2 * this.flex),
      flare: Math.max(0, curve.edgeScale - 1) * (1 + 0.7 * this.flex),
    };
  }

  _pick(x, y, seats) {
    const { flat, flare } = this._shape();
    const k = curveScale(x, this.viewW, flat, flare);
    const mid = this._mid();
    const localY = mid + (y - mid) / k;
    if (Math.abs(localY - mid) > this.cardH / 2) return null;
    for (const seat of seats) {
      if (x >= seat.left && x <= seat.left + seat.width) return seat;
    }
    return null;
  }

  /* ------------------------------- reveal ------------------------------- */

  _beginReveal() {
    const reveal = this.options.reveal;
    if (!this.items.length) {
      this.revealAt = -1;
      return;
    }
    this.revealAt = this.clock;
    const seats = this._seats(this.pos).sort((a, b) => a.left - b.left);
    this.ranks.clear();
    seats.forEach((seat, index) => this.ranks.set(seat.key, index));
    this.rankCount = seats.length;
    if (this.calm || reveal.mode === 'off') this.revealAt = -1;
    this.lastShown = this.pos + this._sweepShift();
  }

  _revealSpan() {
    const reveal = this.options.reveal;
    return reveal.wait + this.rankCount * reveal.gap + reveal.time;
  }

  _revealing() {
    const reveal = this.options.reveal;
    return (
      !this.userPaused &&
      this.revealAt >= 0 &&
      !!this.ready &&
      reveal.mode !== 'off' &&
      !this.calm &&
      this.clock - this.revealAt < this._revealSpan()
    );
  }

  _revealProgress(rank) {
    const reveal = this.options.reveal;
    if (!this._revealing()) return 1;
    const shift = reveal.mode === 'slide' ? 0 : rank * reveal.gap;
    return clamp((this.clock - this.revealAt - reveal.wait - shift) / Math.max(0.05, reveal.time), 0, 1);
  }

  _sweepShift() {
    if (!this._revealing() || this.options.reveal.mode !== 'slide') return 0;
    const progress = this._revealProgress(0);
    return this.viewW * 0.85 * (1 - easeOutExpo(progress));
  }

  /* -------------------------------- кадр -------------------------------- */

  _queueResize() {
    if (this._resizeRaf || !this.alive) return;
    this._resizeRaf = requestAnimationFrame(() => {
      this._resizeRaf = 0;
      if (this.alive) this._resize();
    });
  }

  _onWindowResize() {
    this._queueResize();
  }

  _resize() {
    if (!this.alive) return;
    const rect = this.host.getBoundingClientRect();
    const previousRatio =
      this.mode === 'webgl' && this.ready && this.widths.length
        ? (this._leftOf(this.starts[0], this.pos) + this.widths[0] / 2) / this.viewW
        : null;

    this.viewW = Math.max(1, rect.width);
    this.viewH = Math.max(1, rect.height);
    this.dpr = Math.max(1, Math.min(this.options.performance.maxDpr, window.devicePixelRatio || 1));

    if (this.mode === 'fallback') {
      this._layoutFallback();
      return;
    }

    if (!this.canvas) return;
    const pixelWidth = Math.round(this.viewW * this.dpr);
    const pixelHeight = Math.round(this.viewH * this.dpr);
    if (this.canvas.width !== pixelWidth || this.canvas.height !== pixelHeight) {
      this.canvas.width = pixelWidth;
      this.canvas.height = pixelHeight;
    }
    // CSS-размеры задаёт stylesheet; страховка — на случай его отсутствия.
    if (!this.canvas.style.width) this.canvas.style.width = '100%';
    if (!this.canvas.style.height) this.canvas.style.height = '100%';

    if (!this.items.length) return;
    this.layout();
    if (previousRatio !== null && this.widths.length) {
      this.pos = previousRatio * this.viewW - this.widths[0] / 2 - this.starts[0];
      this.vel = 0;
      this.glideTo = null;
      this.lastShown = this.pos + this._sweepShift();
    }
    this._schedule();
  }

  _schedule(force = false) {
    if (this.raf || !this.alive || this.mode !== 'webgl' || !this._permitted()) return;
    if (this.userPaused && !force) return;
    this.lastNow = 0;
    this.raf = requestAnimationFrame(this._frameLoop);
  }

  _park() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.lastNow = 0;
    this.held = false;
    this.vel = 0;
    this.glideTo = null;
    this._announceNow = false;
    this.cursor.over = false;
    this.trail = [];
    this._pauseAllVideos();
    if (this.mode === 'fallback') this._pauseFallbackVideos();
    if (this.canvas) this.canvas.style.cursor = 'grab';
  }

  _permitted() {
    return this.alive && this.mode === 'webgl' && !!this.gl && this._isVisible();
  }

  _isVisible() {
    if (!this.alive) return false;
    const perf = this.options.performance;
    if (perf.pauseHidden && !this.tabOn) return false;
    if (perf.pauseOffscreen && !this.inView) return false;
    return true;
  }

  _visibilityPayload() {
    return {
      visible: this._isVisible(),
      inView: this.inView,
      tabOn: this.tabOn,
      paused: this.userPaused,
      mode: this.mode,
    };
  }

  _frameLoop(now) {
    this.raf = 0;
    if (!this._permitted()) {
      this._park();
      return;
    }

    const dt = this.lastNow ? clamp((now - this.lastNow) / 1000, 0.001, 0.05) : 1 / 60;
    this.lastNow = now;
    this.clock += dt;
    this._frameCount += 1;
    if (dt > 0.0005) this._fps = this._fps ? this._fps * 0.9 + (1 / dt) * 0.1 : 1 / dt;

    const drive = this.options.drive;
    let busy = false;

    // ---- физика прокрутки ----
    if (this.held) {
      busy = true;
    } else if (this.glideTo) {
      const glide = this.glideTo;
      const progress = clamp((now - glide.begin) / (glide.length * 1000), 0, 1);
      const eased = easeInOutCubic(progress);
      this.pos = glide.from + (glide.to - glide.from) * eased;
      if (progress >= 1) this.glideTo = null;
      busy = true;
    } else if (this.vel !== 0) {
      this.pos += this.vel * dt;
      this.vel *= Math.exp(-dt / Math.max(0.05, drive.glide));
      if (Math.abs(this.vel) < 4) this.vel = 0;
      busy = true;
    }

    if (
      this.ready &&
      this.widths.length > 0 &&
      !this.calm &&
      !this.userPaused &&
      drive.autoplay !== 0 &&
      !this.held &&
      !this.glideTo &&
      !(drive.holdOnHover && this.hovering)
    ) {
      this.pos -= drive.autoplay * dt;
      busy = true;
    }

    if (!this.userPaused && this._revealing()) busy = true;

    // Держим pos в разумных пределах, чтобы не терять точность.
    if (Math.abs(this.pos) > this.loopLen * 4) {
      const shift = this.pos - mod(this.pos, this.loopLen);
      this.pos -= shift;
      this.pressPos -= shift;
      this.lastShown -= shift;
      if (this.glideTo) {
        this.glideTo.from -= shift;
        this.glideTo.to -= shift;
      }
    }

    const shifted = this.pos + this._sweepShift();
    const speed = (shifted - this.lastShown) / dt;
    this.lastShown = shifted;

    // ---- сглаживание flex (сила изгиба от скорости) ----
    const targetFlex = this.calm
      ? 0
      : clamp(Math.abs(speed) / 2400, 0, 1) * this.options.curve.speedFlare;
    this.flex += (targetFlex - this.flex) * (1 - Math.exp(-dt * 8));
    if (Math.abs(this.flex - targetFlex) < 0.002) this.flex = targetFlex;
    else busy = true;

    const seats = this.ready ? this._seats(shifted) : [];
    this._lastSeats = seats;

    const hovered = this.cursor.over && !this.held ? this._pick(this.cursor.x, this.cursor.y, seats) : null;
    this.hovering = !!hovered;
    if (!this.held && this.canvas) this.canvas.style.cursor = hovered ? 'pointer' : 'grab';

    this.paint(seats, shifted);

    const videosBusy = this._syncVideoPlayback(seats);
    if (videosBusy) busy = true;

    if (busy && this.alive) {
      this.raf = requestAnimationFrame(this._frameLoop);
    } else {
      this.lastNow = 0;
    }
  }

  /* ------------------------------ отрисовка ----------------------------- */

  paint(seats, shifted) {
    const gl = this.gl;
    if (!gl) return;

    const opts = this.options;
    const backdrop = parseColor(opts.backdrop.fill);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(backdrop[0] * backdrop[3], backdrop[1] * backdrop[3], backdrop[2] * backdrop[3], backdrop[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (!this.ready) {
      this._lastDrawn = 0;
      return;
    }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.corners);

    const mid = this._mid();
    const shape = this._shape();
    const reveal = opts.reveal;
    const revealAlpha = this._revealing()
      ? clamp((this.clock - this.revealAt - reveal.wait) / Math.max(0.05, reveal.time), 0, 1)
      : 1;

    // фоновая сетка
    if (opts.backdrop.grid && this.floorShader) {
      const shader = this.floorShader;
      gl.useProgram(shader.program);
      gl.enableVertexAttribArray(shader.corner);
      gl.vertexAttribPointer(shader.corner, 2, gl.FLOAT, false, 0, 0);
      gl.uniform4f(shader.spot('uBox'), 0, 0, this.viewW, this.viewH);
      gl.uniform2f(shader.spot('uView'), this.viewW, this.viewH);
      gl.uniform1f(shader.spot('uHorizon'), mid + this.cardH / 2 + this.viewH * 0.03);
      gl.uniform1f(shader.spot('uDrift'), -shifted * 0.004);
      gl.uniform1f(shader.spot('uAlpha'), revealAlpha);
      gl.uniform4fv(shader.spot('uTint'), parseColor(opts.backdrop.gridTint));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    // свежие кадры видео
    for (let i = 0; i < this._clips.length; i += 1) {
      const clip = this._clips[i];
      if (clip && !clip.paused && clip.readyState >= 2) this._uploadVideoFrame(i);
    }

    const shader = this.cardShader;
    if (!shader) return;
    gl.useProgram(shader.program);
    gl.enableVertexAttribArray(shader.corner);
    gl.vertexAttribPointer(shader.corner, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(shader.spot('uView'), this.viewW, this.viewH);
    gl.uniform1f(shader.spot('uDpr'), this.dpr);
    gl.uniform1f(shader.spot('uMid'), mid);
    gl.uniform1f(shader.spot('uFlat'), shape.flat);
    gl.uniform1f(shader.spot('uFlare'), shape.flare);
    gl.uniform1f(shader.spot('uCorner'), Math.max(0, opts.frame.corner));
    gl.uniform1f(shader.spot('uShift'), this.calm ? 0 : this.flex * 0.006 * Math.max(0, opts.curve.split));
    gl.uniform1f(shader.spot('uFringe'), clamp(opts.curve.fringe, 0, 1));
    gl.uniform4fv(shader.spot('uRimOut'), parseColor(opts.curve.fringeOuter));
    gl.uniform4fv(shader.spot('uRimIn'), parseColor(opts.curve.fringeInner));
    gl.uniform1i(shader.spot('uImg'), 0);
    gl.activeTexture(gl.TEXTURE0);

    const mode = reveal.mode;
    let drawn = 0;

    for (const seat of seats) {
      const rank = this.ranks.has(seat.key) ? this.ranks.get(seat.key) : this.rankCount;
      const progress = mode === 'slide' ? this._revealProgress(0) : this._revealProgress(rank);

      let alpha = 1;
      let offsetY = 0;
      let scale = 1;

      if (progress < 1) {
        if (mode === 'lift') {
          const eased = 1 - Math.pow(1 - progress, 3);
          offsetY = (1 - eased) * this.cardH * 0.55;
          scale = 0.9 + 0.1 * eased;
          alpha = clamp(progress * 2.4, 0, 1);
        } else if (mode === 'dissolve') {
          alpha = progress * progress * (3 - 2 * progress);
        } else if (mode === 'slide') {
          alpha = clamp(progress * 3, 0, 1);
        }
      }

      if (alpha <= 0.002) continue;

      const width = seat.width * scale;
      const height = this.cardH * scale;
      const left = seat.left + seat.width / 2 - width / 2;
      const top = mid + offsetY - height / 2;

      const kLeft = curveScale(left, this.viewW, shape.flat, shape.flare);
      const kRight = curveScale(left + width, this.viewW, shape.flat, shape.flare);
      const topOffset = top - mid;
      const bottomOffset = top + height - mid;
      const maxK = Math.max(kLeft, kRight);

      gl.uniform4f(
        shader.spot('uBox'),
        left - 2,
        mid + Math.min(topOffset, topOffset * maxK) - 3,
        left + width + 2,
        mid + Math.max(bottomOffset, bottomOffset * maxK) + 3
      );
      gl.uniform4f(shader.spot('uCard'), left, top, width, height);
      gl.uniform1f(shader.spot('uAlpha'), alpha);

      const size = this._texSize[seat.slot] || { w: 1, h: 1 };
      gl.uniform2f(shader.spot('uImgSize'), size.w, size.h);
      gl.bindTexture(gl.TEXTURE_2D, this._textures[seat.slot].tex);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      drawn += 1;
    }

    this._lastDrawn = drawn;
    this._updateCentered(seats);
  }

  _updateCentered(seats) {
    if (!this.ready || !seats.length) return;
    // Во время глайда не «перелистываем» live-регион через все карточки:
    // объявляем только итоговый слайд.
    if (this.glideTo || this.held) return;
    let best = null;
    let bestDistance = Infinity;
    for (const seat of seats) {
      if (seat.left > this.viewW || seat.left + seat.width < 0) continue;
      const distance = Math.abs(seat.left + seat.width / 2 - this.viewW / 2);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = seat;
      }
    }
    const index = best ? best.slot : null;
    const announce = this._announceNow;
    this._announceNow = false;
    if (index === this._lastCentered) return;
    this._lastCentered = index;
    // Live-region обновляем только по действию пользователя (next/prev/goTo/клик/клавиши),
    // иначе скринридер прерывается на каждом кадре автопрокрутки.
    if (announce) this._updateLive(index);
    if (index !== null) {
      this._emit('slidechange', {
        index,
        slide: this.items[index],
        caption: this.items[index]?.alt || `${this.options.labels.slide} ${index + 1}`,
      });
    }
  }

  _updateLive(index) {
    if (!this._live) return;
    if (index === null) {
      this._live.textContent = '';
      return;
    }
    const item = this.items[index];
    const label = item?.alt || `${this.options.labels.slide} ${index + 1}`;
    const labels = this.options.labels;
    this._live.textContent = `${labels.slide} ${index + 1} ${labels.of} ${this.items.length}: ${label}`;
  }

  /* -------------------------------- видео ------------------------------- */

  _onClipReady() {
    if (!this.alive || this.mode !== 'webgl') return;
    this._schedule();
  }

  _syncVideoPlayback(seats) {
    if (this.mode !== 'webgl') return false;
    const allowed = this._permitted() && !this.userPaused && !this.calm && this.ready;
    const visible = new Set();
    if (allowed && seats) {
      for (const seat of seats) {
        if (seat.left < this.viewW && seat.left + seat.width > 0) visible.add(seat.slot);
      }
    }
    const restrictToVisible = this.options.performance.pauseVideosOffscreen !== false;
    const now = performance.now();

    let busy = false;
    for (let i = 0; i < this.items.length; i += 1) {
      if (this.items[i].type !== 'video') continue;
      const clip = this._clips[i];
      if (!clip) continue;
      const want = allowed && (!restrictToVisible || visible.has(i));
      const state = this._videoSrcState[i];

      if (state === 'error') {
        if (!clip.paused) {
          try { clip.pause(); } catch { /* ignore */ }
        }
        continue;
      }

      if (want && this.options.performance.lazyVideo && state === 'idle') {
        this._loadVideoSource(i);
        busy = true;
      }

      if (state === 'loading') {
        if (!clip.paused) {
          try { clip.pause(); } catch { /* ignore */ }
        }
        if (now < (this._videoBusyUntil[i] || 0)) busy = true;
        continue;
      }

      if (clip.readyState === 0) {
        if (!clip.paused) {
          try { clip.pause(); } catch { /* ignore */ }
        }
        continue;
      }

      if (want) {
        if (clip.paused) {
          if (!this._videoBusyUntil[i]) this._videoBusyUntil[i] = now + 1500;
          const promise = clip.play();
          if (promise && typeof promise.catch === 'function') promise.catch(() => {});
        }
        // busy только при реальном воспроизведении, а не при «зависшем» play().
        if (!clip.paused && clip.readyState >= 2) busy = true;
        else if (!clip.paused && now < (this._videoBusyUntil[i] || 0)) busy = true;
      } else if (!clip.paused) {
        try { clip.pause(); } catch { /* ignore */ }
      }
    }
    return busy;
  }

  _pauseAllVideos() {
    for (const clip of this._clips) {
      if (clip && !clip.paused) {
        try { clip.pause(); } catch { /* ignore */ }
      }
    }
  }

  /* ------------------------------ управление ---------------------------- */

  _aim(target, announce = false) {
    if (announce) this._announceNow = true;
    if (this.calm) {
      this.pos = target;
      this.glideTo = null;
    } else {
      this.glideTo = {
        from: this.pos,
        to: target,
        begin: performance.now(),
        length: 0.7,
      };
    }
    this.vel = 0;
    this._schedule(true);
  }

  _step(direction) {
    if (!this.alive) return this;
    if (this.mode === 'fallback') {
      const current = this._fallbackCenteredIndex();
      const offset = direction < 0 ? 1 : -1;
      this._centerFallbackCard(clamp(current + offset, 0, this.items.length - 1), true);
      return this;
    }
    if (!this.ready || !this.widths.length) return this;
    const step =
      this.widths.reduce((sum, width) => sum + width, 0) / this.widths.length +
      Math.max(0, this.options.frame.spacing);
    const base = this.glideTo ? this.glideTo.to : this.pos;
    this._aim(base + direction * step, true);
    return this;
  }

  _follow(href) {
    const safe = safeHref(href);
    if (!safe) {
      if (String(href ?? '').trim()) {
        this._emit('error', { code: 'invalid-href', reason: 'invalid-href', fatal: false });
      }
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = safe;
    if (this.options.press.newTab) {
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
    }
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }

  /* ------------------------------- события ------------------------------ */

  _local(event) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  _onPointerDown(event) {
    if (!this._permitted() || !this.ready) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const point = this._local(event);
    this.held = true;
    this.glideTo = null;
    this.vel = 0;
    this._announceNow = false;
    this.pressX = point.x;
    this.pressPos = this.pos;
    this.travelled = 0;
    this.trail = [{ t: performance.now(), x: point.x }];
    this.cursor = { x: point.x, y: point.y, over: true };

    try { this.canvas.setPointerCapture(event.pointerId); } catch { /* ignore */ }
    this.canvas.style.cursor = 'grabbing';
    this._schedule(true);
  }

  _onPointerMove(event) {
    if (!this.canvas) return;
    const point = this._local(event);
    this.cursor = { x: point.x, y: point.y, over: true };

    if (this.held) {
      const delta = point.x - this.pressX;
      this.travelled = Math.max(this.travelled, Math.abs(delta));
      this.pos = this.pressPos + delta * this.options.drive.drag;

      const now = performance.now();
      this.trail.push({ t: now, x: point.x });
      while (this.trail.length > 2 && now - this.trail[0].t > 100) this.trail.shift();
    }
    this._schedule(true);
  }

  _onPointerUp(event) {
    if (!this.held) return;
    this.held = false;
    try { this.canvas.releasePointerCapture(event.pointerId); } catch { /* ignore */ }

    const drive = this.options.drive;
    if (this.travelled > 6) {
      const first = this.trail[0];
      const last = this.trail[this.trail.length - 1];
      const stale = performance.now() - last.t > 80;
      const span = (last.t - first.t) / 1000;
      this.vel =
        this.calm || stale || span <= 0
          ? 0
          : clamp(((last.x - first.x) / span) * drive.drag, -5000, 5000);
    } else if (event.type !== 'pointercancel') {
      const point = this._local(event);
      const seat = this._pick(point.x, point.y, this._seats(this.lastShown));
      if (seat) {
        const item = this.items[seat.slot];
        const delta = this.viewW / 2 - (seat.left + seat.width / 2);
        const followMode = this.options.press.behaviour === 'follow';
        if (item.href && (followMode || Math.abs(delta) < 8)) this._follow(item.href);
        else this._aim(this.pos + delta, true);
      }
    }

    this.trail = [];
    this._schedule(true);
  }

  _onPointerLeave() {
    if (!this.canvas) return;
    this.cursor.over = false;
    if (!this.held) this.canvas.style.cursor = 'grab';
    this._schedule();
  }

  _onWheel(event) {
    if (!this._permitted() || !this.ready) return;
    const drive = this.options.drive;
    if (drive.wheel === 'none') return;
    // Ctrl/Cmd + wheel — это зум страницы (и pinch на трекпаде): не перехватываем.
    if (event.ctrlKey || event.metaKey) return;

    const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
    if (drive.wheel === 'sideways' && !horizontal) return;

    this._announceNow = false;
    event.preventDefault();
    const scale = event.deltaMode === 1 ? 32 : event.deltaMode === 2 ? this.viewH : 1;
    const delta = (horizontal ? event.deltaX : event.deltaY) * scale * drive.wheelGain;

    this.glideTo = null;
    if (this.calm) this.pos -= delta;
    else this.vel = clamp(this.vel - delta * 8, -4200, 4200);
    this._schedule(true);
  }

  _onKeyDown(event) {
    if (!this.options.drive.keys || !this.ready) return;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.prev();
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next();
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      this.goTo(0);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      this.goTo(this.items.length - 1);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      if (this._lastCentered === null) return;
      const item = this.items[this._lastCentered];
      if (!item?.href) return;
      event.preventDefault();
      this._follow(item.href);
    }
  }

  _onVisibility() {
    if (!this.alive) return;
    this.tabOn = !document.hidden;
    if (!this.tabOn) {
      this._pauseAllVideos();
      this._pauseFallbackVideos();
    }
    this._emit('visibilitychange', this._visibilityPayload());
    this._recheck();
  }

  _onContextLost(event) {
    event.preventDefault();
    if (!this.alive) return;
    this._park();
    this._startFallback('webgl-context-lost', true, true);
  }

  _recheck() {
    if (!this.alive) return;
    if (this.mode === 'fallback') {
      if (!this._isVisible()) this._pauseFallbackVideos();
      return;
    }
    if (this._permitted()) {
      this._syncVideoPlayback(this._lastSeats);
      this._schedule();
    } else {
      this._park();
    }
  }

  _emit(type, payload) {
    const listeners = this._events.get(type);
    if (listeners) {
      for (const fn of Array.from(listeners)) {
        try {
          fn(payload, this);
        } catch (error) {
          if (this.options.debug) console.error(`[CurveFlowCarousel] "${type}" listener failed`, error);
        }
      }
    }
  }

  /* ------------------------------- fallback ----------------------------- */

  _startFallback(code = 'webgl-unavailable', emitError = false, fatal = false) {
    if (!this.alive || this.mode === 'fallback') return;

    const wasWebGL = this.mode === 'webgl';
    this.mode = 'fallback';
    this.ready = false;
    this._park();
    this._announceNow = false;
    for (const timer of this._videoLoadTimers) {
      if (timer) clearTimeout(timer);
    }
    this._videoLoadTimers = [];
    this._videoBusyUntil = [];

    if (wasWebGL) {
      for (const off of this._canvasOffs) {
        try { off(); } catch { /* ignore */ }
      }
      this._canvasOffs = [];
      if (this.canvas) {
        this.canvas.remove();
        this.canvas = null;
      }
      if (this._mediaSink) {
        this._mediaSink.remove();
        this._mediaSink = null;
      }
      for (const clip of this._clips) {
        if (!clip) continue;
        try { clip.pause(); } catch { /* ignore */ }
        clip.removeAttribute('src');
        try { clip.load(); } catch { /* ignore */ }
      }
      this._disposeGL();
    }

    // В fallback слайды уже представлены карточками: скрытый список
    // дублировал бы их в дереве доступности.
    if (this._list) this._list.setAttribute('aria-hidden', 'true');

    this._buildFallback();
    this._resize();
    this.ready = true;
    this._lastCentered = this.items.length ? 0 : null;
    this._lastDrawn = this.items.length;
    if (!this.options.performance.lazyMedia || this.inView) this._activateFallbackMedia();

    if (emitError) {
      queueMicrotask(() => {
        if (!this.alive || this.mode !== 'fallback') return;
        this._emit('error', { code, reason: code, fatal });
      });
    }
    queueMicrotask(() => {
      if (!this.alive || this.mode !== 'fallback') return;
      this._emit('ready', { mode: 'fallback', slides: this.items.length, reason: code });
    });
    this._emit('visibilitychange', this._visibilityPayload());
  }

  _buildFallback() {
    const wrap = document.createElement('div');
    wrap.className = 'cfc-fallback';
    wrap.tabIndex = 0;
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', `${this.options.ariaLabel} — ${this.options.labels.scrollHint}`);

    this._fallbackCards = [];
    this._fallbackVideos = [];
    this._fallbackImgs = [];
    this._fallbackActivated = false;

    const count = this.items.length;
    this.items.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = 'cfc-card';
      card.dataset.index = String(index);
      card.setAttribute('role', 'group');
      const labels = this.options.labels;
      card.setAttribute('aria-roledescription', labels.slide);
      card.setAttribute('aria-label', `${labels.slide} ${index + 1} ${labels.of} ${count}${item.alt ? `: ${item.alt}` : ''}`);

      const isVideo = item.type === 'video' && item.src;
      let media;

      if (isVideo) {
        const video = document.createElement('video');
        video.className = 'cfc-card__media cfc-card__video';
        video.muted = true;
        video.defaultMuted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = 'metadata';
        video.tabIndex = 0;
        video.setAttribute('muted', '');
        video.setAttribute('playsinline', '');
        video.setAttribute('role', 'button');
        video.setAttribute('aria-pressed', 'false');
        const videoLabel = (playing) =>
          `${playing ? labels.pauseVideo : labels.playVideo}${item.alt ? `: ${item.alt}` : ''}`;
        video.setAttribute('aria-label', videoLabel(false));
        if (item.poster) video.poster = item.poster;
        if (this.options.performance.lazyMedia) video.dataset.src = item.src;
        else video.src = item.src;
        card.dataset.video = '';

        const badge = document.createElement('span');
        badge.className = 'cfc-card__play';
        badge.setAttribute('aria-hidden', 'true');
        card.appendChild(badge);

        const toggle = (event) => {
          event.preventDefault();
          event.stopPropagation();
          this._toggleFallbackVideo(video, card);
        };
        video.addEventListener('click', toggle);
        video.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') toggle(event);
        });
        const setVideoState = (playing) => {
          card.classList.toggle('is-playing', playing);
          video.setAttribute('aria-pressed', String(playing));
          video.setAttribute('aria-label', videoLabel(playing));
        };
        video.addEventListener('play', () => setVideoState(true));
        video.addEventListener('pause', () => setVideoState(false));
        video.addEventListener('ended', () => setVideoState(false));

        media = video;
        this._fallbackVideos.push(video);
      } else {
        const img = document.createElement('img');
        img.className = 'cfc-card__media';
        img.alt = item.alt || '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.draggable = false;
        if (this.options.performance.lazyMedia) img.dataset.src = item.src;
        else img.src = item.src;
        media = img;
        this._fallbackImgs.push(img);
      }

      card.appendChild(media);
      card.style.height = 'var(--cfc-card-h)';
      card.style.width = 'var(--cfc-card-w)';
      card.style.borderRadius = 'var(--cfc-corner)';

      if (!isVideo && item.href) {
        card.tabIndex = 0;
        card.setAttribute('role', 'link');
        card.setAttribute(
          'aria-label',
          `${labels.slide} ${index + 1} ${labels.of} ${count}${item.alt ? `: ${item.alt}` : ''}${
            this.options.press.newTab ? ` (${labels.newTab})` : ''
          }`
        );
      }

      const onCardClick = (event) => {
        if (isVideo) return;
        if (item.href) {
          const centered = this._fallbackCenteredIndex() === index;
          if (this.options.press.behaviour === 'follow' || centered) {
            event.preventDefault();
            this._follow(item.href);
            return;
          }
        }
        this._centerFallbackCard(index, true);
      };

      card.addEventListener('click', onCardClick);
      card.addEventListener('keydown', (event) => {
        if (isVideo) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onCardClick(event);
        }
      });

      wrap.appendChild(card);
      this._fallbackCards.push(card);
    });

    this.host.appendChild(wrap);
    this._fallback = wrap;

    this._fallbackOffs.push(() => {
      wrap.removeEventListener('scroll', this._onFallbackScroll);
    });
    wrap.addEventListener('scroll', this._onFallbackScroll, { passive: true });

    if (typeof IntersectionObserver !== 'undefined') {
      this._fallbackVideoIO = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) {
              const video = entry.target;
              try { video.pause(); } catch { /* ignore */ }
            }
          }
        },
        { root: wrap, rootMargin: '0px', threshold: 0.01 }
      );
      for (const video of this._fallbackVideos) this._fallbackVideoIO.observe(video);
    }
  }

  _layoutFallback() {
    if (!this._fallback) return;
    const frame = this.options.frame;
    const ratio = clamp(frame.ratio, 0.3, 3.2);
    this.cardH = Math.max(40, Math.min((frame.heightPct / 100) * this.viewH, frame.heightCap));
    const shift = (frame.offset / 100) * this.viewH;

    this._fallback.style.setProperty('--cfc-card-h', `${this.cardH}px`);
    this._fallback.style.setProperty('--cfc-card-w', `${this.cardH * ratio}px`);
    this._fallback.style.setProperty('--cfc-gap', `${Math.max(0, frame.spacing)}px`);
    this._fallback.style.setProperty('--cfc-corner', `${Math.max(0, frame.corner)}px`);
    this._fallback.style.setProperty('--cfc-shift', `${shift}px`);
  }

  _activateFallbackMedia() {
    if (!this._fallback || this._fallbackActivated) return;
    this._fallbackActivated = true;
    for (const img of this._fallbackImgs) {
      if (!img.getAttribute('src') && img.dataset.src) img.src = img.dataset.src;
    }
    for (const video of this._fallbackVideos) {
      if (!video.getAttribute('src') && video.dataset.src) video.src = video.dataset.src;
    }
  }

  _toggleFallbackVideo(video, card) {
    if (video.paused) {
      video.play().then(() => card.classList.add('is-playing')).catch(() => {});
    } else {
      video.pause();
      card.classList.remove('is-playing');
    }
  }

  _pauseFallbackVideos() {
    for (const video of this._fallbackVideos) {
      if (video && !video.paused) {
        try { video.pause(); } catch { /* ignore */ }
      }
    }
  }

  _centerFallbackCard(index, smooth) {
    const wrap = this._fallback;
    const card = this._fallbackCards[index];
    if (!wrap || !card) return;
    const target = card.offsetLeft + card.offsetWidth / 2 - wrap.clientWidth / 2;
    try {
      wrap.scrollTo({
        left: Math.max(0, target),
        behavior: smooth && !this.calm ? 'smooth' : 'auto',
      });
    } catch {
      wrap.scrollLeft = Math.max(0, target);
    }
  }

  _fallbackCenteredIndex() {
    const wrap = this._fallback;
    if (!wrap || !this._fallbackCards.length) return 0;
    const center = wrap.scrollLeft + wrap.clientWidth / 2;
    let best = 0;
    let bestDistance = Infinity;
    this._fallbackCards.forEach((card, index) => {
      const distance = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    });
    return best;
  }

  _onFallbackScroll() {
    if (this._fallbackScrollNudge) cancelAnimationFrame(this._fallbackScrollNudge);
    this._fallbackScrollNudge = requestAnimationFrame(() => {
      this._fallbackScrollNudge = 0;
      if (!this.alive || this.mode !== 'fallback') return;
      if (!this.items.length) {
        this._lastCentered = null;
        if (this._live) this._live.textContent = '';
        return;
      }
      const index = this._fallbackCenteredIndex();
      if (index === this._lastCentered) return;
      this._lastCentered = index;
      this._updateLive(index);
      this._emit('slidechange', {
        index,
        slide: this.items[index],
        caption: this.items[index]?.alt || `${this.options.labels.slide} ${index + 1}`,
      });
    });
  }

  /* -------------------------------- GL off ------------------------------ */

  _disposeGL() {
    const gl = this.gl;
    if (gl) {
      for (const state of this._textures) {
        if (state?.tex) gl.deleteTexture(state.tex);
      }
      if (this.corners) gl.deleteBuffer(this.corners);
      if (this.cardShader) gl.deleteProgram(this.cardShader.program);
      if (this.floorShader) gl.deleteProgram(this.floorShader.program);
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) {
        try { lose.loseContext(); } catch { /* ignore */ }
      }
    }
    this.gl = null;
    this.corners = null;
    this.cardShader = null;
    this.floorShader = null;
    this._textures = [];
    this._texSize = [];
  }
}

export { safeHref };
export default CurveFlowCarousel;
