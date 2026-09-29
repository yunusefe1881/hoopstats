/* ============================================================
   HoopStats · Açılış animasyonu
   Basketbolcu koşar, smaç basar, kollarını sıkıp poz verir.
   - Tüm hareket tek bir zaman çizelgesinden (t, ms) hesaplanır.
   - ?intro=1 ile her zaman gösterilir; normalde oturum başına bir kez.
   - prefers-reduced-motion açıksa hiç gösterilmez.
   ============================================================ */
(function () {
    'use strict';

    var rad = Math.PI / 180;
    function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
    function lerp(a, b, k) { return a + (b - a) * k; }
    function seg(t, a, b) { return clamp01((t - a) / (b - a)); }
    function easeIO(k) { return k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }
    function easeOut3(k) { return 1 - Math.pow(1 - k, 3); }
    function n(v) { return v.toFixed(1); }

    /* ---------- Sahne ölçüleri (dünya birimi) ---------- */
    var G = 380;                       // zemin
    var FOOT = 7;                      // ayak kalınlığı
    var TORSO = 64, T1 = 44, T2 = 44, U1 = 34, U2 = 32;
    var RIM = { x: 524, y: 112 };      // çember merkezi
    var BOARD_X = 560;
    var JUMPH = 72;

    var T = {
        RUN_END: 1400, CROUCH_END: 1650, DUNK: 2058, LAND: 2420,
        FLEX_READY: 3000, TITLE: 3250, END: 5100
    };
    var BEATS = [3050, 3650, 4250];

    /* ---------- Renkler (site paletiyle uyumlu) ---------- */
    var C = {
        skin: '#b9784a', skinD: '#9a6236', skinHi: '#d4925f', skinLine: '#7d4a27',
        jer: '#ff5a18', jerD: '#d94a0e', sho: '#f1f5f9', shoD: '#cbd5e1',
        hair: '#1c1613', ball: '#ff7a2f', ballLine: '#6b2205'
    };

    var DEFS = '<defs>' +
        '<linearGradient id="hiFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2640"/><stop offset=".22" stop-color="#111a2f"/><stop offset="1" stop-color="#0a0f1d"/></linearGradient>' +
        '<radialGradient id="hiGlow"><stop offset="0" stop-color="#ff5a18" stop-opacity=".42"/><stop offset="1" stop-color="#ff5a18" stop-opacity="0"/></radialGradient>' +
        '<linearGradient id="hiEdge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5a18" stop-opacity="0"/><stop offset="1" stop-color="#ff5a18" stop-opacity=".38"/></linearGradient>' +
        '</defs>';

    /* ---------- Pozlar (açılar: 0 = aşağı, + = öne/sağa) ---------- */
    var KEYS = ['lean', 'front', 'flex', 'la1', 'la2', 'ra1', 'ra2', 'll1', 'll2', 'rl1', 'rl2'];
    function mix(a, b, k) {
        var o = {};
        for (var i = 0; i < KEYS.length; i++) { var q = KEYS[i]; o[q] = lerp(a[q] || 0, b[q] || 0, k); }
        return o;
    }
    var CROUCH = { lean: 22, front: 0, flex: 0, la1: -30, la2: -15, ra1: -25, ra2: 12, ll1: 28, ll2: -32, rl1: 52, rl2: -10 };
    var RISE   = { lean: 8,  front: 0, flex: 0, la1: 115, la2: 140, ra1: 140, ra2: 165, ll1: -18, ll2: -62, rl1: 78, rl2: 15 };
    var PEAK   = { lean: 14, front: 0, flex: 0, la1: 95,  la2: 100, ra1: 158, ra2: 172, ll1: -35, ll2: -75, rl1: 60, rl2: 10 };
    var SLAM   = { lean: 18, front: 0, flex: 0, la1: 105, la2: 120, ra1: 128, ra2: 118, ll1: -30, ll2: -60, rl1: 50, rl2: 14 };
    var LAND0  = { lean: 10, front: 0, flex: 0, la1: 40,  la2: 70,  ra1: 60,  ra2: 90,  ll1: -6,  ll2: -6,  rl1: 18, rl2: 6 };
    var LANDSQ = { lean: 24, front: 0, flex: 0, la1: 20,  la2: 50,  ra1: 35,  ra2: 60,  ll1: 40,  ll2: -24, rl1: 52, rl2: -14 };
    var FLEXP  = { lean: 0,  front: 1, flex: .55, la1: -90, la2: 160, ra1: 90, ra2: 200, ll1: -12, ll2: -6, rl1: 12, rl2: 6 };

    function drop(a1, a2) { return T1 * Math.cos(a1 * rad) + T2 * Math.cos(a2 * rad); }
    function groundHy(p) {
        return G - FOOT - Math.max(drop(p.ll1, p.ll2), drop(p.rl1, p.rl2));
    }
    var HY_CROUCH = groundHy(CROUCH), HY_LAND0 = groundHy(LAND0);

    function ballD(u) { var s = u < .5 ? u / .5 : (1 - u) / .5; return s * s; }

    function runPose(t) {
        var ph = t / 600 * 2 * Math.PI, A = 50;
        function leg(q) { var s = Math.sin(q), c = Math.cos(q), a = A * s; return [a, a - (14 + 64 * Math.max(0, c))]; }
        var r = leg(ph), l = leg(ph + Math.PI);
        var d = ballD((t % 280) / 280);
        var p = { lean: 14, front: 0, flex: 0 };
        p.rl1 = r[0]; p.rl2 = r[1]; p.ll1 = l[0]; p.ll2 = l[1];
        p.la1 = 40 * Math.sin(ph) + 6; p.la2 = p.la1 + 70;
        p.ra1 = 24; p.ra2 = lerp(80, 40, clamp01(d * 3));
        return p;
    }

    function airPose(p) {
        if (p < .3) return mix(CROUCH, RISE, easeIO(p / .3));
        if (p < .5) return mix(RISE, PEAK, easeIO((p - .3) / .2));
        if (p < .62) return mix(PEAK, SLAM, easeIO((p - .5) / .12));
        return mix(SLAM, LAND0, easeIO((p - .62) / .38));
    }

    function flexAmount(t) {
        var f = .55;
        for (var i = 0; i < BEATS.length; i++) { var d = (t - BEATS[i]) / 150; f += .45 * Math.exp(-d * d); }
        return Math.min(1, f);
    }

    function stateAt(t) {
        var pose, x, hy, h = 0;
        if (t < T.RUN_END) {
            pose = runPose(t); x = -304 + .46 * t; hy = groundHy(pose);
        } else if (t < T.CROUCH_END) {
            var k = easeIO(seg(t, T.RUN_END, T.CROUCH_END));
            pose = mix(runPose(T.RUN_END), CROUCH, k); x = 340 + 25 * k; hy = groundHy(pose);
        } else if (t < T.LAND) {
            var p = seg(t, T.CROUCH_END, T.LAND);
            pose = airPose(p); x = 365 + 140 * easeOut3(p);
            h = JUMPH * 4 * p * (1 - p);
            hy = lerp(HY_CROUCH, HY_LAND0, p) - h;
        } else {
            if (t < 2560) {
                pose = mix(LAND0, LANDSQ, easeIO(seg(t, T.LAND, 2560)));
            } else if (t < T.FLEX_READY) {
                pose = mix(LANDSQ, FLEXP, easeIO(seg(t, 2560, T.FLEX_READY)));
            } else {
                pose = mix(FLEXP, FLEXP, 0);
                var f = flexAmount(t);
                pose.flex = f; pose.la2 = 172 - 22 * f; pose.ra2 = 188 + 22 * f;
            }
            x = 505 - 35 * easeIO(seg(t, 2560, T.FLEX_READY));
            hy = groundHy(pose);
        }
        return { pose: pose, x: x, hy: hy, h: h };
    }

    /* ---------- İskelet (ileri kinematik) ---------- */
    function fk(p, x, hy) {
        var th = p.lean * rad, f = p.front;
        var up = { x: Math.sin(th), y: -Math.cos(th) }, pp = { x: Math.cos(th), y: Math.sin(th) };
        var sw = lerp(12, 30, f) * (1 + .08 * p.flex), hw = lerp(11, 17, f);
        var H = { x: x, y: hy }, S = { x: x + up.x * TORSO, y: hy + up.y * TORSO };
        var ao = .9 * f * sw, lo = .5 * f * hw;
        function chain(o, a1, l1, a2, l2) {
            var e = { x: o.x + Math.sin(a1 * rad) * l1, y: o.y + Math.cos(a1 * rad) * l1 };
            var w = { x: e.x + Math.sin(a2 * rad) * l2, y: e.y + Math.cos(a2 * rad) * l2 };
            return { o: o, e: e, w: w, a1: a1, a2: a2 };
        }
        return {
            H: H, S: S, up: up, pp: pp, sw: sw, hw: hw, f: f, th: th,
            armL: chain({ x: S.x - pp.x * ao, y: S.y - pp.y * ao }, p.la1, U1, p.la2, U2),
            armR: chain({ x: S.x + pp.x * ao, y: S.y + pp.y * ao }, p.ra1, U1, p.ra2, U2),
            legL: chain({ x: H.x - lo, y: H.y }, p.ll1, T1, p.ll2, T2),
            legR: chain({ x: H.x + lo, y: H.y }, p.rl1, T1, p.rl2, T2),
            head: { x: S.x + Math.sin(th * .6) * 26, y: S.y - Math.cos(th * .6) * 26 }
        };
    }

    /* ---------- Çizim yardımcıları ---------- */
    function line(a, b, w, col) {
        return '<line x1="' + n(a.x) + '" y1="' + n(a.y) + '" x2="' + n(b.x) + '" y2="' + n(b.y) +
            '" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round"/>';
    }
    function poly(pts, fill, extra) {
        var s = '';
        for (var i = 0; i < pts.length; i++) s += n(pts[i].x) + ',' + n(pts[i].y) + ' ';
        return '<polygon points="' + s + '" fill="' + fill + '" ' + (extra || '') + '/>';
    }
    function vadd(a, b, k) { return { x: a.x + b.x * k, y: a.y + b.y * k }; }

    function drawLeg(ch, skin, sho, side, f) {
        var m = { x: lerp(ch.o.x, ch.e.x, .7), y: lerp(ch.o.y, ch.e.y, .7) };
        var sx = ch.w.x + lerp(9, side * 3, f), sy = ch.w.y + 3;
        return line(ch.o, ch.e, 19, skin) + line(ch.e, ch.w, 15, skin) +
            line(ch.o, m, 24, sho) +
            '<ellipse cx="' + n(sx) + '" cy="' + n(sy) + '" rx="' + n(lerp(13, 9.5, f)) + '" ry="6.2" fill="#f8fafc" stroke="' + C.jer + '" stroke-width="2" transform="rotate(' + n(ch.a2 * .25) + ' ' + n(sx) + ' ' + n(sy) + ')"/>';
    }
    function drawArm(ch, skin) {
        return line(ch.o, ch.e, 15, skin) + line(ch.e, ch.w, 13, skin) +
            '<circle cx="' + n(ch.w.x) + '" cy="' + n(ch.w.y) + '" r="7" fill="' + skin + '"/>';
    }
    function bulge(ch, flex, opacity) {
        var dx = ch.e.x - ch.o.x, dy = ch.e.y - ch.o.y;
        var ang = Math.atan2(dy, dx) / rad;
        var fx = ch.w.x - ch.e.x, fy = ch.w.y - ch.e.y, fl = Math.sqrt(fx * fx + fy * fy) || 1;
        fx /= fl; fy /= fl;
        var cx = lerp(ch.o.x, ch.e.x, .5) + fx * (4 + 3 * flex);
        var cy = lerp(ch.o.y, ch.e.y, .5) + fy * (4 + 3 * flex);
        var rx = 11.5 + 4 * flex, ry = 7.5 + 5 * flex;
        return '<g opacity="' + n(opacity) + '" transform="translate(' + n(cx) + ' ' + n(cy) + ') rotate(' + n(ang) + ')">' +
            '<ellipse rx="' + n(rx) + '" ry="' + n(ry) + '" fill="' + C.skin + '" stroke="' + C.skinLine + '" stroke-width="1.5" stroke-opacity=".55"/>' +
            '<path d="M' + n(-rx * .55) + ' ' + n(ry * .15) + ' Q0 ' + n(-ry * .95) + ' ' + n(rx * .55) + ' ' + n(ry * .15) + '" fill="none" stroke="' + C.skinLine + '" stroke-width="1.6" stroke-linecap="round" opacity=".55"/>' +
            '<ellipse cx="' + n(-rx * .15) + '" cy="' + n(ry * .3) + '" rx="' + n(rx * .5) + '" ry="' + n(ry * .3) + '" fill="' + C.skinHi + '" opacity=".55"/></g>';
    }
    function star(x, y, r, op) {
        if (op < .02) return '';
        return '<path d="M' + n(x) + ' ' + n(y - r) + ' Q' + n(x) + ' ' + n(y) + ' ' + n(x + r) + ' ' + n(y) + ' Q' + n(x) + ' ' + n(y) + ' ' + n(x) + ' ' + n(y + r) +
            ' Q' + n(x) + ' ' + n(y) + ' ' + n(x - r) + ' ' + n(y) + ' Q' + n(x) + ' ' + n(y) + ' ' + n(x) + ' ' + n(y - r) + 'Z" fill="#fff" opacity="' + n(op) + '"/>';
    }

    function drawHead(K, p) {
        var f = p.front, hx = K.head.x + lerp(2, 0, f), hy = K.head.y;
        var rot = K.th * 40;
        return '<g transform="translate(' + n(hx) + ' ' + n(hy) + ') rotate(' + n(rot) + ')">' +
            '<line x1="-13" y1="-5" x2="-25" y2="-1" stroke="' + C.jer + '" stroke-width="3" stroke-linecap="round" opacity="' + n(1 - f) + '"/>' +
            '<circle r="14" fill="' + C.skin + '"/>' +
            '<path d="M-13 -6 Q-13 -18 0 -18 Q13 -18 13 -6Z" fill="' + C.hair + '"/>' +
            '<rect x="-14.5" y="-7.5" width="29" height="4.6" rx="2" fill="' + C.jer + '"/>' +
            '<g transform="translate(' + n(lerp(3, 0, f)) + ' 0)"><path d="M-13 1 Q-14 17 0 19.5 Q14 17 13 1 Q9 9 0 9 Q-9 9 -13 1Z" fill="' + C.hair + '"/></g>' +
            '<g opacity="' + n(f) + '"><circle cx="-5.2" cy="-.8" r="2.4" fill="#fff"/><circle cx="5.2" cy="-.8" r="2.4" fill="#fff"/>' +
            '<circle cx="-5.2" cy="-.8" r="1.2" fill="#1c1613"/><circle cx="5.2" cy="-.8" r="1.2" fill="#1c1613"/>' +
            '<path d="M-5.5 5.6 Q0 11.5 5.5 5.6 Q0 8.2 -5.5 5.6Z" fill="#fff"/></g>' +
            '<g opacity="' + n(1 - f) + '"><circle cx="7.2" cy="-.8" r="2.5" fill="#fff"/><circle cx="8" cy="-.8" r="1.3" fill="#1c1613"/></g>' +
            '</g>';
    }

    function drawFigure(p, x, hy, t) {
        var K = fk(p, x, hy), f = K.f, s = '';
        var H = K.H, S = K.S, up = K.up, pp = K.pp;
        var down = { x: -up.x, y: -up.y };
        // uzak bacak & kol
        s += drawLeg(K.legL, C.skinD, C.shoD, -1, f);
        s += drawArm(K.armL, C.skinD);
        // gövde (forma)
        var hwT = K.hw;
        var HL = vadd(H, pp, -hwT), HR = vadd(H, pp, hwT);
        var WL = vadd(vadd(H, up, 30), pp, -hwT * .86), WR = vadd(vadd(H, up, 30), pp, hwT * .86);
        var SL = vadd(S, pp, -K.sw), SR = vadd(S, pp, K.sw);
        s += poly([HL, WL, SL, SR, WR, HR], C.jer, 'stroke="' + C.jer + '" stroke-width="5" stroke-linejoin="round"');
        // V yaka + boyun
        s += poly([vadd(vadd(S, up, 2), pp, -7.5), vadd(vadd(S, up, 2), pp, 7.5), vadd(S, up, -9)], C.skin);
        s += line(vadd(S, up, 2), K.head, 12, C.skin);
        // forma numarası
        var M = vadd(H, up, 40);
        s += '<text x="' + n(M.x) + '" y="' + n(M.y + 6) + '" text-anchor="middle" font-family="Space Grotesk,Inter,sans-serif" font-weight="700" font-size="17" fill="#fff" opacity="' + n(clamp01(f * 1.4 - .2)) + '" transform="rotate(' + n(p.lean) + ' ' + n(M.x) + ' ' + n(M.y) + ')">07</text>';
        // şort (pelvis)
        var hw2 = hwT + 1.5, a1 = vadd(vadd(H, up, 10), pp, -hw2), a2 = vadd(vadd(H, up, 10), pp, hw2);
        var b1 = vadd(vadd(H, down, 10), pp, hw2), b2 = vadd(vadd(H, down, 10), pp, -hw2);
        s += poly([a1, a2, b1, b2], C.sho, 'stroke="' + C.sho + '" stroke-width="3" stroke-linejoin="round"');
        // omuzlar
        var dr = lerp(8, 12.5, f);
        s += '<circle cx="' + n(K.armL.o.x) + '" cy="' + n(K.armL.o.y) + '" r="' + n(dr) + '" fill="' + C.skinD + '"/>';
        s += '<circle cx="' + n(K.armR.o.x) + '" cy="' + n(K.armR.o.y) + '" r="' + n(dr) + '" fill="' + C.skin + '"/>';
        // baş
        s += drawHead(K, p);
        // yakın bacak & kol
        s += drawLeg(K.legR, C.skin, C.sho, 1, f);
        s += drawArm(K.armR, C.skin);
        // pazı / pazu şişkinliği
        var bo = clamp01((f - .3) / .5) * clamp01((p.flex - .2) / .3);
        if (bo > .02) { s += bulge(K.armL, p.flex, bo) + bulge(K.armR, p.flex, bo); }
        return { svg: s, K: K };
    }

    /* ---------- Top ---------- */
    function heldPos(K) {
        var a = K.armR;
        return { x: a.w.x + Math.sin(a.a2 * rad) * 10, y: a.w.y + Math.cos(a.a2 * rad) * 10 };
    }
    var _sim = null;
    function sim() {
        if (_sim) return _sim;
        var st = stateAt(T.DUNK), B0 = heldPos(fk(st.pose, st.x, st.hy));
        var a = [], x = B0.x, y = B0.y, vx = .015, vy = .06, g = .0019, dt = 4, ang = 0, hit = false;
        for (var t = 0; t <= 3600; t += dt) {
            a.push({ x: x, y: y, a: ang });
            vy += g * dt; x += vx * dt; y += vy * dt; ang += vx * dt * 7;
            if (y > G - 11) {
                y = G - 11;
                if (!hit) { hit = true; vx = .02; }
                vy = vy > .06 ? -vy * .58 : 0;
            }
            if (y >= G - 11 && vy === 0) vx *= .996;
        }
        _sim = a; return a;
    }
    function drawBall(x, y, ang) {
        return '<g transform="translate(' + n(x) + ' ' + n(y) + ') rotate(' + n(ang) + ')">' +
            '<circle r="11" fill="' + C.ball + '" stroke="' + C.ballLine + '" stroke-width="1.4"/>' +
            '<path d="M-11 0 H11 M0 -11 V11 M-7.8 -7.8 Q-3.2 0 -7.8 7.8 M7.8 -7.8 Q3.2 0 7.8 7.8" fill="none" stroke="' + C.ballLine + '" stroke-width="1.2"/>' +
            '<ellipse cx="-4" cy="-5" rx="3" ry="1.8" fill="#fff" opacity=".28" transform="rotate(-30 -4 -5)"/></g>';
    }
    function ballAt(t, K) {
        if (t >= T.DUNK) {
            var s = sim(), i = Math.min(s.length - 1, Math.round((t - T.DUNK) / 4));
            return s[i];
        }
        var h = heldPos(K);
        if (t < T.RUN_END) {
            var d = ballD((t % 280) / 280);
            return { x: h.x, y: lerp(h.y, G - 11, d), a: (h.x * 4) % 360 };
        }
        return { x: h.x, y: h.y, a: (h.x * 4) % 360 };
    }

    /* ---------- Pota ---------- */
    function drawHoopBack() {
        return '<circle cx="' + RIM.x + '" cy="' + RIM.y + '" r="130" fill="url(#hiGlow)"/>' +
            '<path d="M' + (BOARD_X + 6) + ' 84 L618 84 L618 ' + G + '" fill="none" stroke="#334155" stroke-width="9" stroke-linejoin="round"/>' +
            '<rect x="' + BOARD_X + '" y="36" width="8" height="96" rx="2" fill="#e2e8f0" opacity=".92"/>' +
            '<rect x="' + (BOARD_X - 1) + '" y="88" width="3" height="34" fill="' + C.jer + '"/>';
    }
    function drawHoopFront(t, ballY, ballX) {
        var dt = t - T.DUNK, rot = 0, bump = 0, ring = '';
        if (dt >= 0) {
            rot = 8 * Math.sin(dt / 40) * Math.exp(-dt / 240);
            if (ballX > RIM.x - 40 && ballX < RIM.x + 40) bump = Math.max(0, 1 - Math.abs(ballY - (RIM.y + 30)) / 40) * .3;
            if (dt < 420) {
                ring = '<circle cx="' + (RIM.x + 4) + '" cy="' + RIM.y + '" r="' + n(12 + dt * .14) + '" fill="none" stroke="#fff" stroke-width="' + n(4 - dt / 120) + '" opacity="' + n(.85 * (1 - dt / 420)) + '"/>';
            }
        }
        var sway = rot * 1.6;
        var net = '<g transform="translate(' + RIM.x + ' ' + RIM.y + ') skewX(' + n(sway) + ') scale(1 ' + n(1 + bump) + ')" stroke="#fff" stroke-opacity=".75" stroke-width="1.5" fill="none">' +
            '<path d="M-28 2 L-16 50 M-14 2 L-8 52 M0 2 L0 54 M14 2 L8 52 M28 2 L16 50"/>' +
            '<path d="M-24 18 Q0 24 24 18 M-20 34 Q0 40 20 34 M-17 48 Q0 54 17 48"/></g>';
        var rim = '<line x1="' + (BOARD_X - 4) + '" y1="' + RIM.y + '" x2="' + (RIM.x - 32) + '" y2="' + RIM.y + '" stroke="' + C.jer + '" stroke-width="5" stroke-linecap="round" transform="rotate(' + n(rot) + ' ' + (BOARD_X - 4) + ' ' + RIM.y + ')"/>';
        return net + rim + ring;
    }

    /* ---------- Kare hesabı ---------- */
    function computeFrame(t, W, H) {
        var st = stateAt(t);
        var fig = drawFigure(st.pose, st.x, st.hy, t), K = fig.K;
        var portrait = H > W * 1.05;
        var s0 = Math.min(W / 640, H / 440);
        var kz = easeIO(seg(t, 2350, 3250));
        var zF = portrait ? 2.2 : 1.42;
        var z = lerp(portrait ? 1.7 : 1, zF, kz);
        var camX0 = Math.min(st.x + (portrait ? 110 : 170), portrait ? 400 : 330);
        var vhF = H / (s0 * zF);
        var cyF = 283 + .08 * vhF;           // figür ekranın üst ~%44'ünde dursun, altta başlık yeri kalsın
        var cx = lerp(camX0, st.x, kz), cy = lerp(215, cyF, kz);
        var dd = t - T.DUNK, shakeX = 0, shakeY = 0;
        if (dd >= 0 && dd < 420) { var e = Math.exp(-dd / 150); shakeX = Math.sin(dd * .09) * 4 * e; shakeY = Math.cos(dd * .11) * 3 * e; }
        var sc = s0 * z, vw = W / sc, vh = H / sc;
        var vx0 = cx - vw / 2 + shakeX, vy0 = cy - vh / 2 + shakeY;

        var s = '';
        // zemin
        s += '<rect x="-4000" y="' + G + '" width="8000" height="3000" fill="url(#hiFloor)"/>';
        s += '<rect x="-4000" y="' + (G - 34) + '" width="8000" height="34" fill="url(#hiEdge)"/>';
        s += '<rect x="-4000" y="' + (G - 1) + '" width="8000" height="2" fill="' + C.jer + '" opacity=".6"/>';
        var i0 = Math.floor(vx0 / 90) - 1, i1 = Math.ceil((vx0 + vw) / 90) + 1;
        for (var i = i0; i <= i1; i++) {
            s += '<line x1="' + (i * 90) + '" y1="' + G + '" x2="' + (i * 90 - 46) + '" y2="' + (G + 700) + '" stroke="#94a3b8" stroke-opacity=".07" stroke-width="2"/>';
        }
        s += '<ellipse cx="' + (BOARD_X - 10) + '" cy="' + (G + 26) + '" rx="330" ry="20" fill="none" stroke="' + C.jer + '" stroke-opacity=".32" stroke-width="2"/>';
        s += drawHoopBack();

        // ışın patlaması (poz anı)
        var kb = seg(t, 2750, 3350);
        if (kb > 0) {
            var bx = st.x, by = st.hy - 34, rot = t * .012, rays = '';
            for (var r = 0; r < 20; r++) {
                var a1 = (r * 18 + rot) * rad, a2 = (r * 18 + 8.5 + rot) * rad, R = 1400;
                rays += '<polygon points="' + n(bx) + ',' + n(by) + ' ' + n(bx + R * Math.cos(a1)) + ',' + n(by + R * Math.sin(a1)) + ' ' + n(bx + R * Math.cos(a2)) + ',' + n(by + R * Math.sin(a2)) + '" fill="#ff7a35" opacity="' + n(.13 * kb) + '"/>';
            }
            s += rays;
            s += '<circle cx="' + n(bx) + '" cy="' + n(by) + '" r="190" fill="url(#hiGlow)" opacity="' + n(kb) + '"/>';
        }

        // hız çizgileri
        var ks = 1 - seg(t, 1250, 1500);
        if (ks > 0.02 && t < T.CROUCH_END) {
            for (var q = 0; q < 4; q++) {
                var lx = st.x - 80 - ((t * .9 + q * 37) % 70), ly = st.hy - 70 + q * 36;
                s += '<line x1="' + n(lx) + '" y1="' + n(ly) + '" x2="' + n(lx + 46) + '" y2="' + n(ly) + '" stroke="#fff" stroke-opacity="' + n(.22 * ks) + '" stroke-width="2" stroke-linecap="round"/>';
            }
        }
        // gölge
        s += '<ellipse cx="' + n(st.x + 4) + '" cy="' + (G + 5) + '" rx="' + n(lerp(32, 18, clamp01(st.h / JUMPH))) + '" ry="5" fill="#000" opacity="' + n(lerp(.4, .16, clamp01(st.h / JUMPH))) + '"/>';

        s += fig.svg;
        var b = ballAt(t, K);
        s += drawBall(b.x, b.y, b.a);
        s += drawHoopFront(t, b.y, b.x);

        // pırıltılar
        for (var k = 0; k < BEATS.length; k++) {
            var d = (t - BEATS[k]) / 220, op = Math.exp(-d * d) * (t > 2900 ? 1 : 0);
            if (op > .03) {
                s += star(K.armL.e.x - 12, K.armL.e.y - 26, 15 * op + 4, op) + star(K.armR.e.x + 12, K.armR.e.y - 26, 15 * op + 4, op) +
                     star(K.head.x + 40, K.head.y - 18, 9 * op + 3, op * .8) + star(K.head.x - 42, K.head.y - 6, 8 * op + 3, op * .7);
            }
        }
        return { viewBox: [vx0, vy0, vw, vh], inner: s };
    }

    var api = { computeFrame: computeFrame, DEFS: DEFS, T: T };
    if (typeof module !== 'undefined' && module.exports) { module.exports = api; return; }

    /* ============================================================
       Tarayıcı: oynatıcı
       ============================================================ */
    var splash = document.getElementById('introSplash');
    if (!splash) return;
    var docEl = document.documentElement;
    if (docEl.classList.contains('no-intro')) { splash.parentNode.removeChild(splash); return; }

    var svg = document.getElementById('hiSvg');
    svg.innerHTML = DEFS + '<g id="hiStage"></g>';
    var stage = document.getElementById('hiStage');
    var smac = splash.querySelector('.hi-smac'), title = splash.querySelector('.hi-title');
    var t0 = null, raf = 0, done = false, smacOn = false, titleOn = false;

    try { sessionStorage.setItem('hoopIntroSeen', '1'); } catch (e) {}

    function finish() {
        if (done) return; done = true;
        cancelAnimationFrame(raf);
        splash.classList.add('hi-out');
        docEl.classList.remove('intro-on');
        setTimeout(function () { if (splash.parentNode) splash.parentNode.removeChild(splash); }, 650);
    }

    function frame(now) {
        if (done) return;
        if (t0 === null) t0 = now;
        var t = now - t0;
        var f = computeFrame(t, splash.clientWidth || innerWidth, splash.clientHeight || innerHeight);
        svg.setAttribute('viewBox', f.viewBox.map(n).join(' '));
        stage.innerHTML = f.inner;
        if (!smacOn && t >= T.DUNK) { smacOn = true; smac.classList.add('pop'); }
        if (!titleOn && t >= T.TITLE) { titleOn = true; title.classList.add('show'); }
        if (t >= T.END) { finish(); return; }
        raf = requestAnimationFrame(frame);
    }

    splash.addEventListener('click', finish);
    document.addEventListener('keydown', function (e) {
        if (done) return;
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); finish(); }
    });

    raf = requestAnimationFrame(frame);
})();
