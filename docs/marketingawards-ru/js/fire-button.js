/* Кнопка с огнём.
   Курсор ближе threshold px, но не на кнопке — локальное пламя у ближайшего края,
   тянется к курсору. Курсор на кнопке — мягкий огонь по всему периметру.
   У каждого режима свои настройки: config.flame и config.ring.
   Плавность: мягкое появление, затухающий след кадра и турбулентность частиц.
   Работает только на устройствах с мышью. */

(function () {
    'use strict';

    var MARGIN = 140;
    var TRAIL = 0.12;
    var FLAME_TRAIL = 0.32;
    var instances = [];
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    var DEFAULTS = {
        flame: {
            speed: 0.2,
            life: 0.55,
            density: 600,
            size: 1.75,
            sparks: 40,
            glow: 1.5,
            rise: 30,
            threshold: 500,
            fade: 0.6,
            max: 600,
            stretch: 3,
            alpha: 1.5
        },
        ring: {
            speed: 0.4,
            life: 2,
            density: 700,
            size: 1.1,
            sparks: 11,
            glow: 1.4,
            rise: 30,
            max: 460,
            alpha: 1.5,
            stretch: 1.3
        }
    };

    function makeSprite(core, mid) {
        var size = 64;
        var sprite = document.createElement('canvas');
        sprite.width = size;
        sprite.height = size;
        var g = sprite.getContext('2d');
        var grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        grad.addColorStop(0, core);
        grad.addColorStop(0.32, mid);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, size, size);
        return sprite;
    }

    var SPRITES = {
        hot: makeSprite('rgba(255, 252, 230, 1)', 'rgba(255, 186, 66, .85)'),
        warm: makeSprite('rgba(255, 214, 120, 1)', 'rgba(255, 94, 0, .8)'),
        cool: makeSprite('rgba(255, 120, 30, 1)', 'rgba(178, 18, 0, .7)')
    };

    var SPARK = makeSprite('rgba(255, 250, 225, 1)', 'rgba(255, 170, 60, .9)');

    function makeTongue() {
        var w = 128;
        var h = 256;
        var sprite = document.createElement('canvas');
        sprite.width = w;
        sprite.height = h;
        var g = sprite.getContext('2d');
        var baseY = h - 8;
        var cx = w / 2;

        var grad = g.createLinearGradient(0, baseY, 0, 8);
        grad.addColorStop(0, 'rgba(255, 232, 165, .72)');
        grad.addColorStop(0.3, 'rgba(255, 150, 40, .62)');
        grad.addColorStop(0.66, 'rgba(255, 80, 0, .34)');
        grad.addColorStop(1, 'rgba(255, 40, 0, 0)');

        g.fillStyle = grad;
        g.shadowColor = 'rgba(255, 120, 30, .75)';
        g.shadowBlur = 8;
        g.beginPath();
        g.moveTo(cx, 8);
        g.bezierCurveTo(cx + 40, h * 0.4, cx + 50, baseY - 10, cx, baseY);
        g.bezierCurveTo(cx - 50, baseY - 10, cx - 40, h * 0.4, cx, 8);
        g.closePath();
        g.fill();

        return sprite;
    }

    var TONGUE = makeTongue();

    function setup(root) {
        var canvas = root.querySelector('.fb-canvas');
        var button = root.querySelector('.shiny-btn');
        if (!canvas || !button) {
            return;
        }

        var ctx = canvas.getContext('2d');
        if (!ctx) {
            return;
        }

        var ringCanvas = document.createElement('canvas');
        ringCanvas.className = 'fb-canvas fb-canvas--ring';
        ringCanvas.setAttribute('aria-hidden', 'true');
        canvas.parentNode.insertBefore(ringCanvas, canvas.nextSibling);
        var ringCtx = ringCanvas.getContext('2d');
        if (!ringCtx) {
            ringCanvas.remove();
            return;
        }
        ringCanvas.width = 1;
        ringCanvas.height = 1;

        var config = {
            flame: Object.assign({}, DEFAULTS.flame),
            ring: Object.assign({}, DEFAULTS.ring)
        };

        var self = null;
        var flameParticles = [];
        var ringParticles = [];
        var mode = 'flame';
        var flameTarget = null;
        var flameSmooth = null;
        var target = 0;
        var ringTarget = 0;
        var power = 0;
        var ringPower = 0;
        var spawnAcc = 0;
        var ringSpawnAcc = 0;
        var flameWidth = 1;
        var flameWidthTarget = 1;
        var running = false;
        var rafId = 0;
        var lastTime = 0;
        var lastPointer = null;
        var touchActive = false;
        var touchRing = false;
        var touchUntil = 0;
        var width = 1;
        var height = 1;
        var rendered = false;
        var shape = { w: 1, h: 1, r: 0 };

        function isVisible(el) {
            if (el.closest('details:not([open])')) {
                return false;
            }
            if (el.checkVisibility) {
                return el.checkVisibility({ checkVisibilityCSS: true });
            }
            return !!el.offsetWidth && !!el.offsetHeight;
        }

        function resize() {
            var rect = canvas.getBoundingClientRect();
            rendered = rect.width > 2 && rect.height > 2 && isVisible(button);
            if (!rendered) {
                target = 0;
                mode = 'flame';
            }
            width = Math.max(1, rect.width);
            height = Math.max(1, rect.height);
            var dpr = Math.min(window.devicePixelRatio || 1, finePointer.matches ? 1.5 : 1.25);
            var w = Math.round(width * dpr);
            var h = Math.round(height * dpr);
            if (canvas.width !== w || canvas.height !== h) {
                canvas.width = w;
                canvas.height = h;
            }
            if (ringCanvas.width !== w || ringCanvas.height !== h) {
                ringCanvas.width = w;
                ringCanvas.height = h;
            }
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ringCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

            shape.w = Math.max(1, width - MARGIN * 2);
            shape.h = Math.max(1, height - MARGIN * 2);
            var radius = parseFloat(getComputedStyle(button).borderTopLeftRadius);
            shape.r = Math.min(Math.max(radius || 0, 0), Math.min(shape.w, shape.h) / 2);
        }

        /* Точка на периметре скруглённого прямоугольника */
        function perimeterLength() {
            var w = shape.w;
            var h = shape.h;
            var r = shape.r;
            var straightX = Math.max(0, w - 2 * r);
            var straightY = Math.max(0, h - 2 * r);
            var arc = (Math.PI / 2) * r;
            return 2 * straightX + 2 * straightY + 4 * arc;
        }

        function pointAtDistance(distance) {
            var x = MARGIN;
            var y = MARGIN;
            var w = shape.w;
            var h = shape.h;
            var r = shape.r;
            var straightX = Math.max(0, w - 2 * r);
            var straightY = Math.max(0, h - 2 * r);
            var arc = (Math.PI / 2) * r;
            var total = 2 * straightX + 2 * straightY + 4 * arc;
            var t = ((distance % total) + total) % total;
            var px;
            var py;
            var nx;
            var ny;
            var offset = 0;

            if (t < straightX) {
                px = x + r + t;
                py = y;
                nx = 0;
                ny = -1;
            } else {
                offset += straightX;
                if (t < offset + arc) {
                    var a1 = -Math.PI / 2 + (t - offset) / r;
                    px = x + w - r + r * Math.cos(a1);
                    py = y + r + r * Math.sin(a1);
                    nx = Math.cos(a1);
                    ny = Math.sin(a1);
                } else {
                    offset += arc;
                    if (t < offset + straightY) {
                        px = x + w;
                        py = y + r + (t - offset);
                        nx = 1;
                        ny = 0;
                    } else {
                        offset += straightY;
                        if (t < offset + arc) {
                            var a2 = (t - offset) / r;
                            px = x + w - r + r * Math.cos(a2);
                            py = y + h - r + r * Math.sin(a2);
                            nx = Math.cos(a2);
                            ny = Math.sin(a2);
                        } else {
                            offset += arc;
                            if (t < offset + straightX) {
                                px = x + w - r - (t - offset);
                                py = y + h;
                                nx = 0;
                                ny = 1;
                            } else {
                                offset += straightX;
                                if (t < offset + arc) {
                                    var a3 = Math.PI / 2 + (t - offset) / r;
                                    px = x + r + r * Math.cos(a3);
                                    py = y + h - r + r * Math.sin(a3);
                                    nx = Math.cos(a3);
                                    ny = Math.sin(a3);
                                } else {
                                    offset += arc;
                                    if (t < offset + straightY) {
                                        px = x;
                                        py = y + h - r - (t - offset);
                                        nx = -1;
                                        ny = 0;
                                    } else {
                                        offset += straightY;
                                        var a4 = Math.PI + (t - offset) / r;
                                        px = x + r + r * Math.cos(a4);
                                        py = y + r + r * Math.sin(a4);
                                        nx = Math.cos(a4);
                                        ny = Math.sin(a4);
                                    }
                                }
                            }
                        }
                    }
                }
            }

            return {
                x: px + nx * 1.5,
                y: py + ny * 1.5,
                nx: nx,
                ny: ny
            };
        }

        function perimeterAt(normalized) {
            return pointAtDistance(normalized * perimeterLength());
        }

        function perimeterPoint() {
            return pointAtDistance(Math.random() * perimeterLength());
        }

        /* Нормированный параметр ближайшей точки контура */
        function nearestParam(x, y) {
            var samples = 120;
            var bestT = 0;
            var bestD = Infinity;
            for (var i = 0; i < samples; i++) {
                var p = perimeterAt(i / samples);
                var dx = p.x - x;
                var dy = p.y - y;
                var d = dx * dx + dy * dy;
                if (d < bestD) {
                    bestD = d;
                    bestT = i / samples;
                }
            }
            var step = 1 / samples;
            for (var k = 0; k < 2; k++) {
                step *= 0.4;
                for (var j = -2; j <= 2; j++) {
                    var q = perimeterAt(bestT + j * step);
                    var qx = q.x - x;
                    var qy = q.y - y;
                    var qd = qx * qx + qy * qy;
                    if (qd < bestD) {
                        bestD = qd;
                        bestT += j * step;
                    }
                }
            }
            return ((bestT % 1) + 1) % 1;
        }

        /* Ближайшая точка периметра к курсору и расстояние до кнопки */
        function nearestPoint(clientX, clientY) {
            var box = button.getBoundingClientRect();
            var px = MARGIN + (clientX - box.left);
            var py = MARGIN + (clientY - box.top);
            var r = shape.r;
            var left = MARGIN + r;
            var right = MARGIN + shape.w - r;
            var top = MARGIN + r;
            var bottom = MARGIN + shape.h - r;
            var cx = Math.min(Math.max(px, left), right);
            var cy = Math.min(Math.max(py, top), bottom);
            var dx = px - cx;
            var dy = py - cy;
            var len = Math.sqrt(dx * dx + dy * dy);
            var nx = 0;
            var ny = -1;

            if (len > 0.001) {
                nx = dx / len;
                ny = dy / len;
            } else {
                var dl = px - MARGIN;
                var dr = MARGIN + shape.w - px;
                var dt = py - MARGIN;
                var db = MARGIN + shape.h - py;
                var min = Math.min(dl, dr, dt, db);
                if (min === dl) {
                    nx = -1;
                    ny = 0;
                } else if (min === dr) {
                    nx = 1;
                    ny = 0;
                } else if (min === dt) {
                    nx = 0;
                    ny = -1;
                } else {
                    nx = 0;
                    ny = 1;
                }
            }

            return {
                distance: len - r,
                x: cx + nx * r + nx * 1.5,
                y: cy + ny * r + ny * 1.5,
                nx: nx,
                ny: ny
            };
        }

        function locate(clientX, clientY) {
            lastPointer = { x: clientX, y: clientY };
            if (!rendered) {
                target = 0;
                ringTarget = 0;
                flameWidthTarget = 0.65;
                mode = 'flame';
                return;
            }
            var point = nearestPoint(clientX, clientY);

            if (self) {
                for (var i = 0; i < instances.length; i++) {
                    var other = instances[i];
                    if (other === self) {
                        continue;
                    }
                    if (other.distance(clientX, clientY) < point.distance) {
                        target = 0;
                        ringTarget = 0;
                        flameWidthTarget = 0.65;
                        mode = 'flame';
                        return;
                    }
                }
            }

            flameTarget = point;

            if (!flameSmooth) {
                flameSmooth = {
                    x: point.x,
                    y: point.y,
                    nx: point.nx,
                    ny: point.ny
                };
            }

            /* Снаружи — локальное пламя, на кнопке — кольцо.
               Цели переключаются на границе, но обе яркости плавно
               перетекают друг в друга, без мгновенной смены кадра. */
            var inside = point.distance <= 0;
            var outside = Math.max(0, point.distance);
            var proximity = Math.max(0, 1 - outside / config.flame.threshold);
            target = inside ? 0 : Math.pow(proximity, config.flame.fade);
            ringTarget = inside ? 1 : 0;
            mode = inside ? 'ring' : 'flame';

            /* Ширина языка меняется вместе с приближением курсора:
               далеко — узкий и с слабым ореолом, у кнопки — широкий,
               ореол сливается с телом. */
            var wp = Math.max(0, Math.min(1, proximity));
            wp = wp * wp * (3 - 2 * wp);
            flameWidthTarget = inside ? 1.2 : 0.65 + 0.55 * wp;

            if (target > 0 || ringTarget > 0) {
                start();
            }
        }

        function followPointer(dt) {
            if (!flameTarget || !flameSmooth) {
                return;
            }
            var k = Math.min(1, dt * 12);
            flameSmooth.x += (flameTarget.x - flameSmooth.x) * k;
            flameSmooth.y += (flameTarget.y - flameSmooth.y) * k;
            flameSmooth.nx += (flameTarget.nx - flameSmooth.nx) * k;
            flameSmooth.ny += (flameTarget.ny - flameSmooth.ny) * k;
            var len = Math.sqrt(flameSmooth.nx * flameSmooth.nx + flameSmooth.ny * flameSmooth.ny) || 1;
            flameSmooth.nx /= len;
            flameSmooth.ny /= len;
        }

        function spawnRing() {
            var group = config.ring;
            var point = perimeterPoint();
            var spark = Math.random() < group.sparks / 100;

            if (spark) {
                var sparkAngle = Math.atan2(point.ny, point.nx) + (Math.random() - 0.5) * 1.2;
                var sparkSpeed = (60 + Math.random() * 90) * group.speed;
                ringParticles.push({
                    x: point.x,
                    y: point.y,
                    vx: Math.cos(sparkAngle) * sparkSpeed,
                    vy: Math.sin(sparkAngle) * sparkSpeed,
                    angle: sparkAngle,
                    size: (0.5 + Math.random() * 1) * group.size,
                    alpha: 0.45 + Math.random() * 0.35,
                    phase: Math.random() * Math.PI * 2,
                    wobble: 0,
                    spark: true,
                    ring: true,
                    taper: 1,
                    rise: group.rise,
                    time: 0,
                    life: (0.22 + Math.random() * 0.26) * group.life
                });
                return;
            }

            var angle = Math.atan2(point.ny, point.nx) + (Math.random() - 0.5) * 0.45;
            var speed = (2 + Math.random() * 9) * group.speed;
            var offset = (Math.random() - 0.5) * 12;
            ringParticles.push({
                x: point.x - point.ny * offset + point.nx * Math.random() * 3,
                y: point.y + point.nx * offset + point.ny * Math.random() * 3,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                angle: angle,
                size: (5 + Math.random() * 5) * group.size,
                alpha: 0.14 + Math.random() * 0.12,
                phase: Math.random() * Math.PI * 2,
                wobble: 1.5 + Math.random() * 3,
                spark: false,
                ring: true,
                taper: 1,
                rise: group.rise,
                time: 0,
                life: (0.7 + Math.random() * 0.6) * group.life
            });
        }

        function spawnFlame() {
            var group = config.flame;
            if (Math.random() >= (group.sparks / 100) * 0.12) {
                return;
            }
            var spot = flameSmooth || flameTarget;
            if (!spot) {
                return;
            }
            var total = perimeterLength();
            var strip = Math.min(total * 0.44, 50 * (group.size / 1.75));
            var tx = -spot.ny;
            var ty = spot.nx;
            var along = (Math.random() - 0.5) * strip;
            var out = (18 + Math.random() * 52) * Math.max(0.45, group.stretch / 3);
            var angle = Math.atan2(spot.ny, spot.nx) + (Math.random() - 0.5) * 1.2;
            var speed = (40 + Math.random() * 70) * group.speed;
            flameParticles.push({
                x: spot.x + tx * along + spot.nx * out,
                y: spot.y + ty * along + spot.ny * out,
                vx: Math.cos(angle) * speed + tx * (Math.random() - 0.5) * 6,
                vy: Math.sin(angle) * speed + ty * (Math.random() - 0.5) * 6 - 4,
                angle: angle,
                size: (0.5 + Math.random() * 1) * group.size,
                alpha: 0.45 + Math.random() * 0.35,
                phase: Math.random() * Math.PI * 2,
                wobble: 0,
                spark: true,
                ring: false,
                taper: 1,
                rise: group.rise,
                time: 0,
                life: (0.22 + Math.random() * 0.26) * group.life
            });
        }

        function spawn() {
            if (mode === 'ring') {
                spawnRing();
            } else {
                spawnFlame();
            }
        }

        function updateList(list, dt, clock) {
            for (var i = list.length - 1; i >= 0; i--) {
                var p = list[i];
                p.time += dt;
                if (p.time >= p.life) {
                    list.splice(i, 1);
                    continue;
                }
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vx *= 1 - 2.0 * dt;
                p.vy = p.vy * (1 - 2.0 * dt) - p.rise * dt;

                if (p.wobble) {
                    var wave = Math.sin(clock * 1.6 + p.x * 0.012 + p.y * 0.008);
                    var cross = Math.cos(clock * 1.2 + p.y * 0.011);
                    p.vx += wave * p.wobble * dt;
                    p.vy += cross * p.wobble * dt * 0.7;
                }

                if (!p.ring && !p.spark) {
                    p.angle = Math.atan2(p.vy, p.vx);
                }
            }
        }

        function update(dt) {
            var clock = performance.now() * 0.001;
            updateList(flameParticles, dt, clock);
            updateList(ringParticles, dt, clock);
        }

        function drawRingGlow(target, dim) {
            var pulse = 0.94 + 0.06 * Math.sin(performance.now() * 0.0014);
            var fade = Math.pow(ringPower, 0.7) * config.ring.glow * pulse;
            if (dim != null) {
                fade *= Math.max(0, dim);
            }
            var x = MARGIN;
            var y = MARGIN;
            var w = shape.w;
            var h = shape.h;
            var r = shape.r;

            target.save();
            target.beginPath();
            target.moveTo(x + r, y);
            target.arcTo(x + w, y, x + w, y + h, r);
            target.arcTo(x + w, y + h, x, y + h, r);
            target.arcTo(x, y + h, x, y, r);
            target.arcTo(x, y, x + w, y, r);
            target.closePath();
            /* Без shadowBlur: несколько мягких обводок дешевле для canvas */
            target.lineJoin = 'round';
            target.lineCap = 'round';
            target.lineWidth = 26;
            target.strokeStyle = 'rgba(245, 95, 25, ' + (0.06 * fade) + ')';
            target.stroke();
            target.lineWidth = 16;
            target.strokeStyle = 'rgba(245, 100, 30, ' + (0.10 * fade) + ')';
            target.stroke();
            target.lineWidth = 8;
            target.strokeStyle = 'rgba(250, 120, 40, ' + (0.16 * fade) + ')';
            target.stroke();
            target.lineWidth = 3;
            target.strokeStyle = 'rgba(255, 150, 60, ' + (0.28 * fade) + ')';
            target.stroke();
            target.restore();
        }

        function drawFlameGlow(target) {
            var fade = power * config.flame.glow;
            if (fade <= 0.01 || !flameSmooth) {
                return;
            }
            var total = perimeterLength();
            if (total <= 0) {
                return;
            }
            var sizeScale = config.flame.size / 1.75;
            var half = Math.min(total * 0.22, (50 * sizeScale * flameWidth) / 2) / total;
            var t0 = nearestParam(flameSmooth.x, flameSmooth.y);
            var a = perimeterAt(t0 - half);
            var b = perimeterAt(t0 + half);
            var steps = 18;

            target.save();
            target.beginPath();
            for (var i = 0; i <= steps; i++) {
                var p = perimeterAt(t0 - half + (i / steps) * half * 2);
                if (i === 0) {
                    target.moveTo(p.x, p.y);
                } else {
                    target.lineTo(p.x, p.y);
                }
            }
            target.lineCap = 'round';
            target.lineJoin = 'round';

            var outer = target.createLinearGradient(a.x, a.y, b.x, b.y);
            outer.addColorStop(0, 'rgba(255, 100, 20, 0)');
            outer.addColorStop(0.3, 'rgba(255, 100, 20, ' + (0.075 * fade) + ')');
            outer.addColorStop(0.7, 'rgba(255, 110, 25, ' + (0.075 * fade) + ')');
            outer.addColorStop(1, 'rgba(255, 100, 20, 0)');
            target.lineWidth = 9;
            target.strokeStyle = outer;
            target.shadowColor = 'rgba(255, 80, 0, ' + (0.26 * fade) + ')';
            target.shadowBlur = 15;
            target.stroke();

            var inner = target.createLinearGradient(a.x, a.y, b.x, b.y);
            inner.addColorStop(0, 'rgba(255, 190, 90, 0)');
            inner.addColorStop(0.35, 'rgba(255, 190, 90, ' + (0.13 * fade) + ')');
            inner.addColorStop(0.65, 'rgba(255, 190, 90, ' + (0.13 * fade) + ')');
            inner.addColorStop(1, 'rgba(255, 190, 90, 0)');
            target.lineWidth = 2;
            target.strokeStyle = inner;
            target.shadowColor = 'rgba(255, 140, 30, ' + (0.22 * fade) + ')';
            target.shadowBlur = 6;
            target.stroke();
            target.restore();
        }

        function flameNoise(t, seed) {
            return 0.5
                + 0.24 * Math.sin(t * 1.15 + seed * 1.7)
                + 0.16 * Math.sin(t * 2.31 + seed * 3.1)
                + 0.1 * Math.sin(t * 4.07 + seed * 5.3);
        }

        function drawProceduralFlame(now) {
            var group = config.flame;
            var total = perimeterLength();
            if (total <= 0 || !flameSmooth) {
                return;
            }

            var sizeScale = group.size / 1.75;
            var stripPx = Math.min(total * 0.44, 50 * sizeScale);
            var t0 = nearestParam(flameSmooth.x, flameSmooth.y);
            var anchor = perimeterAt(t0);
            var time = now * 0.001 * (0.25 + group.speed * 0.9);
            var lengthScale = Math.pow(group.stretch / 3, 1.25) * (0.75 + 0.25 * sizeScale);
            var vertical = (1 - anchor.ny) * 0.5;
            var L = (96 + 18 * Math.sin(time * 1.05) + 10 * Math.sin(time * 2.05 + 1.7)) * lengthScale * (0.58 + 0.47 * vertical);
            var W = stripPx * (0.9 + 0.035 * Math.sin(time * 0.8 + 2.4)) * flameWidth;
            var sway = (Math.sin(time * 0.72 + 0.6) * 10 + Math.sin(time * 1.28 + 2.1) * 4.5) * flameWidth;
            var bend = (Math.sin(time * 0.6 + 1.2) * 6 + Math.sin(time * 1.0 + 2.7) * 3) * flameWidth;
            var alpha = Math.pow(power, 0.6) * Math.min(group.alpha, 1.5);
            var fullness = 0.8 + 0.2 * (group.density / 600);

            /* Тёплый шар у основания — плавно проявляется у скруглений.
               Считаем близость к центру угла, а не только наклон нормали:
               шар начинает расти ещё на плоской кромке рядом с углом и
               так же плавно уходит после него. */
            var cxl = MARGIN + shape.r;
            var cxr = MARGIN + shape.w - shape.r;
            var cyt = MARGIN + shape.r;
            var cyb = MARGIN + shape.h - shape.r;
            var dc = Math.min(
                Math.hypot(anchor.x - cxl, anchor.y - cyt),
                Math.hypot(anchor.x - cxr, anchor.y - cyt),
                Math.hypot(anchor.x - cxr, anchor.y - cyb),
                Math.hypot(anchor.x - cxl, anchor.y - cyb)
            );
            var cornerMix = Math.max(0, Math.min(1, (shape.r + 42 - dc) / 42));
            cornerMix = cornerMix * cornerMix * (3 - 2 * cornerMix);
            if (cornerMix > 0.005) {
                var baseR = Math.max(16, Math.min(28, stripPx * 0.5)) * (0.42 + 0.58 * cornerMix) * flameWidth;
                ctx.save();
                ctx.translate(anchor.x, anchor.y);
                ctx.rotate(Math.atan2(anchor.nx, -anchor.ny));
                ctx.scale(1.12, 0.9);
                var ball = ctx.createRadialGradient(0, 0, 1, 0, 0, baseR);
                ball.addColorStop(0, 'rgba(255, 240, 205, ' + (0.3 * alpha * cornerMix) + ')');
                ball.addColorStop(0.35, 'rgba(255, 190, 90, ' + (0.2 * alpha * cornerMix) + ')');
                ball.addColorStop(0.7, 'rgba(255, 120, 25, ' + (0.06 * alpha * cornerMix) + ')');
                ball.addColorStop(1, 'rgba(255, 60, 0, 0)');
                ctx.globalAlpha = 1;
                ctx.fillStyle = ball;
                ctx.beginPath();
                ctx.arc(0, 0, baseR, 0, Math.PI * 2);
                ctx.fill();

                var hot = ctx.createRadialGradient(0, 0, 1, 0, 0, baseR * 0.5);
                hot.addColorStop(0, 'rgba(255, 250, 230, ' + (0.28 * alpha * cornerMix) + ')');
                hot.addColorStop(0.55, 'rgba(255, 210, 120, ' + (0.14 * alpha * cornerMix) + ')');
                hot.addColorStop(1, 'rgba(255, 150, 40, 0)');
                ctx.fillStyle = hot;
                ctx.beginPath();
                ctx.arc(0, 0, baseR * 0.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            ctx.save();
            ctx.translate(anchor.x, anchor.y);
            ctx.rotate(Math.atan2(anchor.ny, anchor.nx) - Math.PI / 2);

            function flamePath(sx, sy) {
                var w = W * sx;
                var l = L * sy;
                var sw = sway * sx;
                var bd = bend * sx;
                ctx.beginPath();
                ctx.moveTo(-w / 2, 0);
                ctx.bezierCurveTo(-w * 0.44 + bd * 0.35, l * 0.22, -w * 0.32 + sw * 0.55 + bd * 0.7, l * 0.55, sw, l);
                ctx.bezierCurveTo(w * 0.32 + sw * 0.55 + bd * 0.7, l * 0.55, w * 0.44 + bd * 0.35, l * 0.22, w / 2, 0);
                ctx.closePath();
            }

            /* Мягкий ореол */
            ctx.filter = 'blur(4px)';
            for (var pass = 0; pass < 2; pass++) {
                flamePath(1.04 + pass * 0.045, 1.04 + pass * 0.03);
                ctx.globalAlpha = alpha * (0.09 - pass * 0.03);
                ctx.fillStyle = 'rgba(255, 120, 20, 0.8)';
                ctx.fill();
            }

            /* Один вытянутый язык: узкий кверху, с мягкими краями */
            ctx.filter = 'blur(3px)';
            flamePath(1, 1);
            var grad = ctx.createLinearGradient(0, 0, 0, L);
            grad.addColorStop(0, 'rgba(255, 185, 80, ' + (0.78 * fullness) + ')');
            grad.addColorStop(0.3, 'rgba(255, 145, 35, ' + (0.72 * fullness) + ')');
            grad.addColorStop(0.62, 'rgba(255, 95, 5, ' + (0.42 * fullness) + ')');
            grad.addColorStop(0.85, 'rgba(255, 55, 0, ' + (0.14 * fullness) + ')');
            grad.addColorStop(1, 'rgba(255, 40, 0, 0)');
            ctx.globalAlpha = alpha;
            ctx.fillStyle = grad;
            ctx.fill();

            /* Светящееся ядро внутри — тоже язык, но уже и короче */
            ctx.filter = 'blur(2px)';
            flamePath(0.52, 0.8);
            var core = ctx.createLinearGradient(0, 0, 0, L * 0.8);
            core.addColorStop(0, 'rgba(255, 235, 185, ' + (0.34 * alpha) + ')');
            core.addColorStop(0.28, 'rgba(255, 248, 220, ' + (0.68 * alpha) + ')');
            core.addColorStop(0.58, 'rgba(255, 205, 110, ' + (0.4 * alpha) + ')');
            core.addColorStop(0.86, 'rgba(255, 150, 40, ' + (0.08 * alpha) + ')');
            core.addColorStop(1, 'rgba(255, 120, 20, 0)');
            ctx.globalAlpha = 1;
            ctx.fillStyle = core;
            ctx.fill();

            ctx.restore();
        }

        function drawRingLayer() {
            ringCtx.globalCompositeOperation = 'destination-out';
            ringCtx.fillStyle = 'rgba(0, 0, 0, ' + TRAIL + ')';
            ringCtx.fillRect(0, 0, width, height);
            ringCtx.globalCompositeOperation = 'lighter';

            /* При уходе курсора кольцо не просто гаснет целиком,
               а стягивается к ближайшей кромке — туда, где остаётся язык. */
            var focus = Math.max(0, Math.min(1, (1 - ringPower) / 0.9));
            var dim = Math.max(0, 1 - focus * 0.55);
            var ax = flameSmooth ? flameSmooth.x : width / 2;
            var ay = flameSmooth ? flameSmooth.y : height / 2;
            var reach = 30 + 110 * Math.max(0, 1 - focus);
            if (ringPower > 0.01 && dim > 0.02) {
                drawRingGlow(ringCtx, dim);
            }

            /* Свечение кольца тоже сужается: маска-круг вокруг кромки,
               из которой уходит курсор. Широкий ореол не остаётся висеть. */
            if (focus > 0.03) {
                var maskR = 36 + 100 * Math.max(0, 1 - focus);
                var mask = ringCtx.createRadialGradient(ax, ay, maskR * 0.55, ax, ay, maskR);
                mask.addColorStop(0, 'rgba(0, 0, 0, 1)');
                mask.addColorStop(0.72, 'rgba(0, 0, 0, 1)');
                mask.addColorStop(1, 'rgba(0, 0, 0, 0)');
                ringCtx.globalCompositeOperation = 'destination-in';
                ringCtx.fillStyle = mask;
                ringCtx.fillRect(0, 0, width, height);
                ringCtx.globalCompositeOperation = 'lighter';
            }

            var alphaBase = Math.pow(ringPower, 0.6) * config.ring.alpha;

            for (var i = 0; i < ringParticles.length; i++) {
                var p = ringParticles[i];
                var k = p.time / p.life;
                var inK = Math.min(1, k / (p.spark ? 0.06 : 0.2));
                var fade = Math.pow(1 - k, 1.4) * inK * alphaBase;
                var keep = 1;

                if (focus > 0.01) {
                    var ddx = p.x - ax;
                    var ddy = p.y - ay;
                    var dd = Math.sqrt(ddx * ddx + ddy * ddy);
                    var t = Math.max(0, Math.min(1, (dd - 10) / Math.max(14, reach - 10)));
                    t = t * t * (3 - 2 * t);
                    keep = 1 - focus * t;
                }

                if (p.spark) {
                    var sparkSize = p.size * 3;
                    ringCtx.globalAlpha = p.alpha * fade * keep;
                    ringCtx.drawImage(SPARK, p.x - sparkSize / 2, p.y - sparkSize / 2, sparkSize, sparkSize);
                    continue;
                }

                var size = p.size * (1 + k * 0.4) * 2;
                var sprite = k < 0.32 ? SPRITES.hot : (k < 0.7 ? SPRITES.warm : SPRITES.cool);
                var sw = size * config.ring.stretch;
                ringCtx.globalAlpha = p.alpha * fade * keep;
                ringCtx.drawImage(sprite, p.x - sw / 2, p.y - size / 2, sw, size);
            }

            ringCtx.globalAlpha = 1;
            ringCtx.globalCompositeOperation = 'source-over';
        }

        function drawFlameLayer() {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'rgba(0, 0, 0, ' + FLAME_TRAIL + ')';
            ctx.fillRect(0, 0, width, height);
            ctx.globalCompositeOperation = 'lighter';

            if (power > 0.01) {
                drawFlameGlow(ctx);
                drawProceduralFlame(performance.now());
            }

            var alphaBase = Math.pow(power, 0.6) * config.flame.alpha;

            for (var i = 0; i < flameParticles.length; i++) {
                var p = flameParticles[i];
                var k = p.time / p.life;
                var inK = Math.min(1, k / (p.spark ? 0.06 : 0.2));
                var fade = Math.pow(1 - k, 1.4) * inK * alphaBase;

                if (p.spark) {
                    var sparkSize = p.size * 2.2;
                    ctx.globalAlpha = p.alpha * fade;
                    ctx.drawImage(SPARK, p.x - sparkSize / 2, p.y - sparkSize / 2, sparkSize, sparkSize);
                    continue;
                }

                var pWidth = p.size * 2.6 * (1 - k * 0.35) * (p.taper || 1);
                var pHeight = Math.min(pWidth * config.flame.stretch * (0.65 + k * 0.7), 130);
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.angle + Math.PI / 2);
                ctx.globalAlpha = p.alpha * fade;
                ctx.drawImage(TONGUE, -pWidth / 2, -pHeight, pWidth, pHeight);
                ctx.restore();
            }

            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
        }

        function draw() {
            drawRingLayer();
            drawFlameLayer();
        }

        function frame(now) {
            rafId = 0;
            var dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0.016;
            lastTime = now;

            followPointer(dt);

            if (touchActive) {
                if (now < touchUntil) {
                    target = touchRing ? 0 : 1;
                    ringTarget = touchRing ? 1 : 0;
                    flameWidthTarget = touchRing ? 1.2 : 1;
                    mode = touchRing ? 'ring' : 'flame';
                } else {
                    touchActive = false;
                    target = 0;
                    ringTarget = 0;
                    flameWidthTarget = 0.65;
                    mode = 'flame';
                    setLit(false);
                }
            }

            var ease = 2.5;
            power += (target - power) * Math.min(1, dt * ease);
            flameWidth += (flameWidthTarget - flameWidth) * Math.min(1, dt * 1.5);
            /* Кольцо гаснет медленнее, чем появляется: при уходе курсора
               широкое пламя не обрывается, а постепенно сужается в язык. */
            var ringEase = ringTarget > ringPower ? 4.0 : 1.3;
            ringPower += (ringTarget - ringPower) * Math.min(1, dt * ringEase);

            /* Быстрый хвост: не держим невидимые слои и частицы */
            if (ringTarget === 0 && ringPower < 0.035) {
                ringPower = 0;
                ringParticles.length = 0;
            }
            if (target === 0 && power < 0.01) {
                power = 0;
            }

            if (power < 0.004 && ringPower < 0.004 && flameParticles.length === 0 && ringParticles.length === 0) {
                running = false;
                ctx.clearRect(0, 0, width, height);
                ringCtx.clearRect(0, 0, width, height);
                return;
            }

            if (ringTarget > 0.02 && ringPower > 0.01) {
                ringSpawnAcc += config.ring.density * Math.max(0.35, ringPower) * dt;
                while (ringSpawnAcc >= 1) {
                    ringSpawnAcc -= 1;
                    if (ringParticles.length < config.ring.max) {
                        spawnRing();
                    }
                }
            }

            if (power > 0.01) {
                var rate = config.flame.density * Math.max(0.4, power);
                spawnAcc += rate * dt;
                while (spawnAcc >= 1) {
                    spawnAcc -= 1;
                    if (flameParticles.length < config.flame.max) {
                        spawnFlame();
                    }
                }
            }

            update(dt);
            draw();

            /* Неактивный слой не должен оставлять следов */
            if (power < 0.01) {
                ctx.clearRect(0, 0, width, height);
            }
            if (ringPower < 0.01) {
                ringCtx.clearRect(0, 0, width, height);
            }

            rafId = requestAnimationFrame(frame);
        }

        function start() {
            if (running || reduceMotion.matches) {
                return;
            }
            running = true;
            lastTime = 0;
            rafId = requestAnimationFrame(frame);
        }

        function clear() {
            target = 0;
            ringTarget = 0;
            flameWidthTarget = 0.65;
            mode = 'flame';
            touchActive = false;
            touchRing = false;
            setLit(false);
        }

        function onMove(event) {
            if (event.pointerType === 'touch') {
                return;
            }
            touchActive = false;
            setLit(false);
            locate(event.clientX, event.clientY);
        }

        function onScroll() {
            if (lastPointer) {
                locate(lastPointer.x, lastPointer.y);
            }
        }

        function setConfig(next) {
            if (!next) {
                return;
            }
            ['flame', 'ring'].forEach(function (group) {
                var values = next[group];
                if (!values) {
                    return;
                }
                Object.keys(values).forEach(function (key) {
                    var value = Number(values[key]);
                    if (key in config[group] && isFinite(value)) {
                        config[group][key] = value;
                    }
                });
            });
            if (lastPointer) {
                locate(lastPointer.x, lastPointer.y);
            }
        }

        function setLit(on) {
            button.classList.toggle('is-lit', !!on);
        }

        function isButtonVisible() {
            var rect = button.getBoundingClientRect();
            return rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
        }

        function onTouch(event) {
            if (reduceMotion.matches || !isButtonVisible()) {
                return;
            }
            var touch = event.touches && event.touches[0];
            if (!touch) {
                return;
            }
            var point = nearestPoint(touch.clientX, touch.clientY);

            if (self) {
                for (var i = 0; i < instances.length; i++) {
                    var other = instances[i];
                    if (other === self) {
                        continue;
                    }
                    if (other.distance(touch.clientX, touch.clientY) < point.distance) {
                        touchActive = false;
                        target = 0;
                        setLit(false);
                        return;
                    }
                }
            }

            flameTarget = point;
            if (!flameSmooth) {
                flameSmooth = {
                    x: point.x,
                    y: point.y,
                    nx: point.nx,
                    ny: point.ny
                };
            }
            touchRing = point.distance <= 0;
            mode = touchRing ? 'ring' : 'flame';
            ringTarget = touchRing ? 1 : 0;
            target = touchRing ? 0 : 1;
            flameWidthTarget = touchRing ? 1.2 : 1;
            setLit(touchRing);
            touchActive = true;
            touchUntil = performance.now() + 8000;
            start();
        }

        resize();
        window.addEventListener('pointermove', onMove, { passive: true });
        window.addEventListener('touchstart', onTouch, { passive: true });
        window.addEventListener('touchmove', onTouch, { passive: true });
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', function () {
            resize();
            if (lastPointer) {
                locate(lastPointer.x, lastPointer.y);
            }
        });
        window.addEventListener('blur', clear);
        document.addEventListener('pointerleave', function (event) {
            if (event.pointerType === 'touch') {
                return;
            }
            clear();
        });

        if (typeof ResizeObserver === 'function') {
            new ResizeObserver(resize).observe(canvas);
        }

        var details = button.closest('details');
        if (details) {
            details.addEventListener('toggle', resize);
        }

        self = {
            distance: function (clientX, clientY) {
                return rendered ? nearestPoint(clientX, clientY).distance : Infinity;
            },
            locate: locate
        };
        instances.push(self);

        root.fireButton = {
            getConfig: function () {
                return {
                    flame: Object.assign({}, config.flame),
                    ring: Object.assign({}, config.ring)
                };
            },
            setConfig: setConfig,
            getState: function () {
                return {
                    mode: mode,
                    touchActive: touchActive,
                    touchRing: touchRing,
                    power: power,
                    ringPower: ringPower,
                    particles: flameParticles.length + ringParticles.length,
                    flameParticles: flameParticles.length,
                    ringParticles: ringParticles.length
                };
            }
        };
    }

    function init() {
        if (reduceMotion.matches) {
            return;
        }

        /* Слабая машина: десять canvas с пламенем вокруг кнопок ей не по
           силам — кнопки остаются как есть, без огня. Решает замер
           скорости, сделанный заставкой, а не число ядер. */
        var device = window.SITE_DEVICE;
        if (device) {
            var weak = typeof device.isWeak === 'function'
                ? device.isWeak()
                : device.lowPower;
            if (weak) {
                return;
            }
        }

        var roots = document.querySelectorAll('[data-fire-button]');
        for (var i = 0; i < roots.length; i++) {
            setup(roots[i]);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
