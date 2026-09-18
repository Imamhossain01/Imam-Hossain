/* ══════════════════════════════════════════════════════════════
   Imam Hossain — Stark HUD portfolio (Enhanced Circuit Audio & Fixed Drums)
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  const $  = (s, r) => (r ? r : document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r ? r : document).querySelectorAll(s));
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp  = (a, b, t) => a + (b - a) * t;
  const rand  = (a, b) => a + Math.random() * (b - a);
  const pad2  = n => String(n).padStart(2, '0');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const COLORS = { arc: '0,242,254', crimson: '157,78,221', gold: '255,183,3' };

  const store = {
    get(k, fb) { try { const v = localStorage.getItem(k); return v === null ? fb : v; } catch (e) { return fb; } },
    set(k, v)  { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  function toast(msg) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function measure(points) {
    const cum = [0];
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
      cum.push(total);
    }
    return { cum, total };
  }
  function pointAt(points, cum, total, t) {
    const d = clamp(t, 0, 1) * total;
    for (let i = 1; i < cum.length; i++) {
      if (d <= cum[i]) {
        const seg = cum[i] - cum[i - 1] ? cum[i] - cum[i - 1] : 1;
        const k = (d - cum[i - 1]) / seg;
        return [lerp(points[i - 1][0], points[i][0], k), lerp(points[i - 1][1], points[i][1], k)];
      }
    }
    return points[points.length - 1];
  }
  function strokePath(ctx, points) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.stroke();
  }

  let globalAudioCtx = null;
  let globalMasterGain = null;

  function playZap() {
    if (!globalAudioCtx) return;
    if (globalAudioCtx.state !== 'running') return;
    try {
      const ac = globalAudioCtx;
      const now = ac.currentTime;
      
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const filter = ac.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);

      filter.type = 'bandpass';
      filter.frequency.value = 2400;
      filter.Q.value = 4;

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(globalMasterGain);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch (e) {}
  }

  /* ── 1. Boot ───────────────────────────────────────────────── */
  (function boot() {
    const wrap = $('#boot'), log = $('#boot-log'), fill = $('#boot-fill');
    if (!wrap) return;
    const lines = [
      'arc reactor ....... <b>spinning up</b>',
      'lattice mesh ...... <b>ok</b>',
      'bus scan .......... <b>8 devices</b>',
      'skill matrix ...... <b>rail nominal</b>',
      'cipher module ..... <b>armed</b>'
    ];
    const finish = () => { wrap.classList.add('done'); setTimeout(() => wrap.remove(), 700); };
    if (reduceMotion) { log.innerHTML = lines.join('\n'); fill.style.width = '100%'; setTimeout(finish, 300); return; }
    let i = 0;
    const step = () => {
      log.innerHTML += (i ? '\n' : '') + lines[i];
      fill.style.width = Math.round(((i + 1) / lines.length) * 100) + '%';
      i++;
      if (i < lines.length) setTimeout(step, 180 + Math.random() * 130);
      else setTimeout(finish, 460);
    };
    setTimeout(step, 170);
  })();

  /* ── 2. Touch / Click Sparks ─────────────────────────────────── */
  document.addEventListener('pointerdown', e => {
    if(e.target.closest('.drum-stage')) {
        if(!e.target.closest('button')) return;
    }
    
    const numSparks = 8;
    for(let i = 0; i < numSparks; i++) {
      const spark = document.createElement('div');
      spark.className = 'click-spark';
      spark.style.left = e.clientX + 'px';
      spark.style.top = e.clientY + 'px';
      
      const angle = Math.random() * Math.PI * 2;
      const velocity = 20 + Math.random() * 70;
      const tx = Math.cos(angle) * velocity + 'px';
      const ty = Math.sin(angle) * velocity + 'px';
      
      spark.style.setProperty('--tx', `calc(-50% + ${tx})`);
      spark.style.setProperty('--ty', `calc(-50% + ${ty})`);
      
      document.body.appendChild(spark);
      setTimeout(() => spark.remove(), 600);
    }
  });

  /* ── 3. Reactor lattice background ─────────────────────────── */
  const reactor = (function reactor() {
    const cv = $('#reactor');
    if (!cv) return { burst() {} };
    const ctx = cv.getContext('2d');

    let W = 0, H = 0, dpr = 1;
    let nodes = [], conduits = [], pulses = [], sparks = [];
    let statik = null, sctx = null;
    let t = 0, running = true, fps = 60, last = performance.now();

    function buildLattice() {
      dpr = Math.min(devicePixelRatio ? devicePixelRatio : 1, 2);
      W = innerWidth; H = innerHeight;
      cv.width = Math.floor(W * dpr); cv.height = Math.floor(H * dpr);
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const gap = W < 700 ? 130 : 108;
      const cols = Math.ceil(W / gap) + 1, rows = Math.ceil(H / gap) + 1;

      nodes = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          nodes.push({
            x: c * gap + rand(-gap * 0.18, gap * 0.18),
            y: r * gap + rand(-gap * 0.18, gap * 0.18),
            r, c,
            ph: rand(0, 6.28),
            big: Math.random() < 0.14
          });
        }
      }
      const at = (r, c) => (r >= 0 && r < rows && c >= 0 && c < cols) ? nodes[r * cols + c] : null;

      conduits = [];
      const link = (a, b, horizFirst) => {
        if (!a) return;
        if (!b) return;
        const corner = horizFirst ? [b.x, a.y] : [a.x, b.y];
        const pts = [[a.x, a.y], corner, [b.x, b.y]];
        const m = measure(pts);
        conduits.push({ pts, cum: m.cum, total: m.total });
      };
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const a = at(r, c);
          if (Math.random() < 0.78) link(a, at(r, c + 1), Math.random() < 0.5);
          if (Math.random() < 0.55) link(a, at(r + 1, c), Math.random() < 0.5);
        }
      }

      statik = document.createElement('canvas');
      statik.width = cv.width; statik.height = cv.height;
      sctx = statik.getContext('2d');
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      sctx.lineWidth = 1;
      sctx.strokeStyle = `rgba(${COLORS.arc},.07)`;
      conduits.forEach(k => strokePath(sctx, k.pts));
      nodes.forEach(n => {
        sctx.fillStyle = `rgba(${COLORS.arc},${n.big ? .16 : .1})`;
        const s = n.big ? 3.4 : 2;
        sctx.fillRect(n.x - s / 2, n.y - s / 2, s, s);
      });

      const want = clamp(Math.round((W * H) / 34000), 14, 54);
      pulses = [];
      for (let i = 0; i < want; i++) pulses.push(newPulse(Math.random()));
    }

    function newPulse(t0) {
      const k = conduits[(Math.random() * conduits.length) | 0];
      const roll = Math.random();
      return {
        k,
        t: t0 ? t0 : 0,
        sp: rand(0.16, 0.42),
        col: roll < 0.72 ? COLORS.arc : roll < 0.92 ? COLORS.gold : COLORS.crimson
      };
    }

    function emitSparks(n, x, y, power) {
      for (let i = 0; i < n; i++) {
        const a = rand(0, 6.28);
        const s = rand(0.4, 1.5) * (power ? power : 1);
        sparks.push({
          x, y,
          vx: Math.cos(a) * s * 26,
          vy: Math.sin(a) * s * 26,
          life: 1,
          decay: rand(1.4, 2.8),
          col: Math.random() < 0.82 ? COLORS.arc : COLORS.crimson
        });
      }
      if (sparks.length > 420) sparks.splice(0, sparks.length - 420);
    }

    function drawReactorCore() {
      const cx = W * 0.5, cy = H * 0.46;
      const R = Math.min(W, H) * 0.3;
      const breathe = 0.5 + 0.5 * Math.sin(t * 0.7);

      ctx.save();
      ctx.translate(cx, cy);

      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, R * (0.5 + i * 0.26), 0, 6.2832);
        ctx.strokeStyle = `rgba(${COLORS.arc},${0.05 + breathe * 0.03})`;
        ctx.lineWidth = i === 1 ? 1.6 : 1;
        ctx.stroke();
      }

      const coils = 10;
      ctx.rotate(t * 0.07);
      for (let i = 0; i < coils; i++) {
        const a0 = (i / coils) * 6.2832, a1 = a0 + 0.36;
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.63, a0, a1);
        ctx.arc(0, 0, R * 0.78, a1, a0, true);
        ctx.closePath();
        ctx.fillStyle = `rgba(${COLORS.arc},${0.022 + breathe * 0.02})`;
        ctx.fill();
      }
      ctx.rotate(-t * 0.07);

      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.5);
      g.addColorStop(0, `rgba(${COLORS.arc},${0.07 + breathe * 0.05})`);
      g.addColorStop(1, 'rgba(0,242,254,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, R * 0.5, 0, 6.2832); ctx.fill();

      ctx.restore();
    }

    function frame(now) {
      requestAnimationFrame(frame);
      if (!running) { last = now; return; }
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      fps = lerp(fps, 1 / (dt > 0 ? dt : 0.016), 0.06);
      t += dt;

      ctx.clearRect(0, 0, W, H);
      drawReactorCore();
      if (statik) ctx.drawImage(statik, 0, 0, W, H);

      for (let i = 0; i < pulses.length; i++) {
        const p = pulses[i];
        p.t += p.sp * dt;
        if (p.t > 1) { pulses[i] = newPulse(0); continue; }
        const head = pointAt(p.k.pts, p.k.cum, p.k.total, p.t);
        const tail = pointAt(p.k.pts, p.k.cum, p.k.total, Math.max(0, p.t - 0.12));
        const grad = ctx.createLinearGradient(tail[0], tail[1], head[0], head[1]);
        grad.addColorStop(0, `rgba(${p.col},0)`);
        grad.addColorStop(1, `rgba(${p.col},.85)`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(tail[0], tail[1]); ctx.lineTo(head[0], head[1]); ctx.stroke();

        ctx.beginPath(); ctx.arc(head[0], head[1], 1.7, 0, 6.2832);
        ctx.fillStyle = `rgba(${p.col},.95)`;
        ctx.shadowColor = `rgba(${p.col},1)`; ctx.shadowBlur = 9;
        ctx.fill(); ctx.shadowBlur = 0;
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        const nx = s.x + s.vx * dt, ny = s.y + s.vy * dt;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(nx, ny);
        ctx.strokeStyle = `rgba(${s.col},${s.life * 0.8})`;
        ctx.lineWidth = s.life * 1.7;
        ctx.stroke();
        s.x = nx; s.y = ny;
        s.vx *= 0.94; s.vy *= 0.94;
        s.life -= s.decay * dt;
        if (s.life <= 0) sparks.splice(i, 1);
      }
    }

    buildLattice();
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(buildLattice, 200); });
    document.addEventListener('visibilitychange', () => { running = !document.hidden; last = performance.now(); });
    requestAnimationFrame(f => { last = f; frame(f); });

    return { burst(x, y) { emitSparks(26, x, y, 2.4); } };
  })();

  /* ── 4. Nav, rail, reveal ──────────────────────────────────── */
  (function nav() {
    const bar = $('#nav'), links = $$('.nav-links a'), burger = $('#burger'),
          menu = $('#nav-links'), prog = $('#nav-progress'),
          railFill = $('#rail-fill'), pads = $$('.rail-pads li'),
          sections = $$('[data-section]');

    const onScroll = () => {
      bar.classList.toggle('stuck', scrollY > 24);
      const max = document.documentElement.scrollHeight - innerHeight;
      const pGlobal = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
      prog.style.width = (pGlobal * 100) + '%';
      
      if (railFill && pads.length > 1) {
        let activeIdx = 0;
        let sectionP = 0;
        const viewCenter = innerHeight / 2;
        
        for (let i = 0; i < sections.length; i++) {
          const rect = sections[i].getBoundingClientRect();
          // সেকশনের অবস্থান অনুযায়ী বর্তমান ইনডেক্স বের করা
          if (rect.top <= viewCenter) {
            activeIdx = i;
            const h = rect.height || 1;
            sectionP = clamp((viewCenter - rect.top) / h, 0, 1);
          }
        }
        
        // লাইনটিকে ডটের দূরত্বের সাথে সমানভাবে ম্যাচ করা
        const step = 1 / (pads.length - 1);
        let railP = (activeIdx + sectionP) * step;
        
        // পেজের একদম নিচে চলে গেলে লাইনটি ১০০% এ নিয়ে যাওয়া
        if (pGlobal >= 0.99) railP = 1; 
        
        railFill.style.height = (clamp(railP, 0, 1) * 100) + '%';
      }
    };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    burger.addEventListener('click', () => {
      const open = menu.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    links.forEach(a => a.addEventListener('click', () => {
      menu.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    }));

    const spy = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        const id = en.target.dataset.section;
        links.forEach(a => a.classList.toggle('active', a.dataset.nav === id));
        pads.forEach(p => p.classList.toggle('lit', p.dataset.pad === id));
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(s => spy.observe(s));
  })();

  /* ── 5. Trace board engine ─────────────────────────────────── */
  function TraceBoard(boardEl, canvasEl, opts) {
    const ctx = canvasEl.getContext('2d');
    let dpr = 1, W = 0, H = 0;
    let routes = new Map();
    const live = new Map();
    let running = false, last = performance.now(), t = 0;

    function layout() {
      const br = boardEl.getBoundingClientRect();
      if (!br.width) return;
      if (!br.height) return;
      dpr = Math.min(devicePixelRatio ? devicePixelRatio : 1, 2);
      W = br.width; H = br.height;
      canvasEl.width = Math.floor(W * dpr); canvasEl.height = Math.floor(H * dpr);
      canvasEl.style.width = W + 'px'; canvasEl.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      routes = new Map();
      opts.items().forEach(item => {
        const pts = opts.route(item, br);
        if (!pts) return;
        if (pts.length < 2) return;
        const m = measure(pts);
        routes.set(opts.id(item), { pts, cum: m.cum, total: m.total, color: opts.color(item) });
      });
    }

    function energise(id, color) {
      const r = routes.get(id);
      if (!r) return;
      live.set(id, { color: color ? color : r.color, packets: [], spawn: 0 });
      playZap();
    }
    function release(id) { live.delete(id); }
    function releaseAll() { live.clear(); }

    function frame(now) {
      if (!running) return;
      requestAnimationFrame(frame);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now; t += dt;

      ctx.clearRect(0, 0, W, H);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      routes.forEach((r, id) => {
        if (live.has(id)) return;
        ctx.strokeStyle = `rgba(${r.color},.13)`;
        ctx.lineWidth = 1.1;
        strokePath(ctx, r.pts);
      });

      live.forEach((state, id) => {
        const r = routes.get(id);
        if (!r) return;
        const col = state.color;

        ctx.save();
        ctx.strokeStyle = `rgba(${col},.30)`;
        ctx.lineWidth = 3.4;
        ctx.shadowColor = `rgba(${col},.85)`;
        ctx.shadowBlur = 14;
        strokePath(ctx, r.pts);
        ctx.restore();

        ctx.strokeStyle = `rgba(${col},.9)`;
        ctx.lineWidth = 1.3;
        strokePath(ctx, r.pts);

        ctx.save();
        ctx.setLineDash([12, 16]);
        ctx.lineDashOffset = -((t * 130) % 28);
        ctx.strokeStyle = `rgba(255,255,255,.55)`;
        ctx.lineWidth = 1.6;
        strokePath(ctx, r.pts);
        ctx.restore();

        state.spawn -= dt;
        if (state.spawn <= 0) {
          state.spawn = opts.packetEvery ? opts.packetEvery : 0.34;
          state.packets.push({ t: 0, sp: rand(0.55, 0.95), size: rand(2.2, 3.6) });
        }
        for (let i = state.packets.length - 1; i >= 0; i--) {
          const pk = state.packets[i];
          pk.t += pk.sp * dt;
          if (pk.t > 1) { state.packets.splice(i, 1); if(opts.onArrive) opts.onArrive(id); continue; }
          const head = pointAt(r.pts, r.cum, r.total, pk.t);
          const tail = pointAt(r.pts, r.cum, r.total, Math.max(0, pk.t - 0.07));
          const g = ctx.createLinearGradient(tail[0], tail[1], head[0], head[1]);
          g.addColorStop(0, `rgba(${col},0)`);
          g.addColorStop(1, `rgba(${col},1)`);
          ctx.strokeStyle = g; ctx.lineWidth = 2.4;
          ctx.beginPath(); ctx.moveTo(tail[0], tail[1]); ctx.lineTo(head[0], head[1]); ctx.stroke();

          ctx.beginPath();
          ctx.arc(head[0], head[1], pk.size, 0, 6.2832);
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = `rgba(${col},1)`; ctx.shadowBlur = 12;
          ctx.fill(); ctx.shadowBlur = 0;
        }
      });
    }

    function start() { if (running) return; running = true; last = performance.now(); requestAnimationFrame(frame); }
    function stop() { running = false; }

    layout();
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 200); });
    new IntersectionObserver(es => { if(es[0].isIntersecting) start(); else stop(); }, { threshold: 0.02 }).observe(boardEl);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });

    return { layout, energise, release, releaseAll, start, stop };
  }

  function routeToHub(chipRect, hubRect, boardRect) {
    const cx = chipRect.left + chipRect.width / 2 - boardRect.left;
    const cy = chipRect.top + chipRect.height / 2 - boardRect.top;
    const hx = hubRect.left + hubRect.width / 2 - boardRect.left;
    const hy = hubRect.top + hubRect.height / 2 - boardRect.top;
    const dx = hx - cx, dy = hy - cy;
    const a = Math.min(Math.abs(dx), Math.abs(dy)) * 0.65;
    const sgx = Math.sign(dx) === 0 ? 1 : Math.sign(dx);
    const sgy = Math.sign(dy) === 0 ? 1 : Math.sign(dy);
    const stop = Math.min(hubRect.width, hubRect.height) / 2 - 2;
    const endY = hy - sgy * stop;
    return [
      [cx + sgx * (chipRect.width / 2 - 8), cy],
      [hx - sgx * a, cy],
      [hx, cy + sgy * a],
      [hx, Math.abs(endY - cy) < Math.abs(dy) ? endY : hy]
    ];
  }

  /* ── 6. Hardware & IoT lab ─────────────────────────────────── */
  (function lab() {
    const board = $('#lab-board'), canvas = $('#lab-canvas'), hub = $('#lab-hub'),           chips = $$('.chip'), mon = $('#mon-body'), state = $('#mon-state'),
          activeEl = $('#mon-active'), clearBtn = $('#mon-clear');
    if (!board) return;
    if (!canvas) return;

    const meters = { thru: $('#m-thru'), loss: $('#m-loss'), load: $('#m-load') };

    const tb = TraceBoard(board, canvas, {
      items: () => chips,
      id: c => c.dataset.id,
      color: () => COLORS.arc,
      packetEvery: 0.3,
      route: (chip, br) => routeToHub(chip.getBoundingClientRect(), hub.getBoundingClientRect(), br)
    });

    const gens = {
      esp32:  () => `wifi rssi <v>${Math.round(rand(-72, -41))}</v> dBm  heap <v>${Math.round(rand(182, 214))}</v>KB  core1 <v>${rand(18, 46).toFixed(1)}</v>%`,
      uno:    () => `A0 <v>${Math.round(rand(0, 1023))}</v>  vcc <v>${rand(4.86, 5.08).toFixed(2)}</v>V  loop <v>${rand(0.4, 2.1).toFixed(2)}</v>ms`,
      dht:    () => `temp <v>${rand(28.4, 34.7).toFixed(1)}</v>°C  humidity <v>${rand(62, 88).toFixed(1)}</v>%  dew <v>${rand(23, 29).toFixed(1)}</v>°C`,
      sonar:  () => { const d = rand(4, 312); return `echo <v>${(d * 58).toFixed(0)}</v>µs  distance <v>${d.toFixed(1)}</v>cm${d < 12 ? '  <w>[obstacle]</w>' : ''}`; },
      oled:   () => `frame <v>${Math.round(rand(1, 9999))}</v>  i2c ack <v>ok</v>  refresh <v>${rand(28, 62).toFixed(0)}</v>Hz`,
      lora:   () => `tx <v>${Math.round(rand(11, 48))}</v>B  snr <v>${rand(-4, 11).toFixed(1)}</v>dB  airtime <v>${rand(48, 210).toFixed(0)}</v>ms`,
      servo:  () => { const a = Math.round(rand(0, 180)); return `target <v>${a}</v>°  pulse <v>${(500 + a * 11.1).toFixed(0)}</v>µs  load <v>${rand(4, 38).toFixed(0)}</v>%`; },
      relay:  () => { const s = Math.random() < 0.5 ? 'closed' : 'open'; return `coil <v>${s}</v>  current <v>${rand(0.2, 6.4).toFixed(2)}</v>A  isolation <v>ok</v>`; }
    };

    let current = null, timer = null, lines = 0;

    function write(html) {
      const d = new Date();
      const stamp = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
      const row = document.createElement('span');
      row.innerHTML = `<span class="t">[${stamp}]</span> ` +
        html.replace(/<v>/g, '<span class="v">').replace(/<\/v>/g, '</span>')
            .replace(/<w>/g, '<span class="w">').replace(/<\/w>/g, '</span>')
            .replace(/<k>/g, '<span class="k">').replace(/<\/k>/g, '</span>') + '\n';
      mon.appendChild(row);
      lines++;
      if (lines > 70) { mon.removeChild(mon.firstChild); lines--; }
      mon.scrollTop = mon.scrollHeight;
    }

    function setMeters(on) {
      meters.thru.style.width = on ? clamp(rand(42, 92), 0, 100) + '%' : '0%';
      meters.loss.style.width = on ? clamp(rand(1, 14), 0, 100) + '%' : '0%';
      meters.load.style.width = on ? clamp(rand(30, 78), 0, 100) + '%' : '0%';
    }

    function select(chip) {
      const id = chip.dataset.id;
      if (current === id) { stop(); return; }
      stop();
      current = id;
      chips.forEach(c => c.classList.toggle('active', c === chip));
      hub.classList.add('busy');
      state.textContent = 'streaming'; state.classList.add('live');
      activeEl.textContent = `${chip.querySelector('b').textContent} · ${chip.dataset.pin}`;
      tb.energise(id, COLORS.arc);
      setMeters(true);

      const nm = chip.querySelector('b').textContent;
      write(`<k>bus</k> enumerating <v>${nm}</v> on <v>${chip.dataset.pin}</v>`);
      setTimeout(() => write(`<k>link</k> ${chip.dataset.proto} — handshake <v>ok</v>`), 240);
      setTimeout(() => write(`<k>spec</k> ${chip.dataset.spec}`), 480);

      timer = setInterval(() => { write(gens[id]()); setMeters(true); }, 900);
    }

    function stop() {
      clearInterval(timer); timer = null;
      if (current) write(`<k>bus</k> released <v>${current}</v>`);
      tb.releaseAll();
      current = null;
      chips.forEach(c => c.classList.remove('active'));
      hub.classList.remove('busy');
      state.textContent = 'idle'; state.classList.remove('live');
      activeEl.textContent = 'no device selected';
      setMeters(false);
    }

    chips.forEach(c => {
      c.addEventListener('click', () => select(c));
      c.addEventListener('pointerenter', () => { if (current !== c.dataset.id) tb.energise(c.dataset.id, COLORS.gold); });
      c.addEventListener('pointerleave', () => { if (current !== c.dataset.id) tb.release(c.dataset.id); });
    });

    clearBtn.addEventListener('click', () => { mon.innerHTML = ''; lines = 0; write('<k>monitor</k> cleared'); });
    write('<k>monitor</k> ready — select a module from the board');
    setMeters(false);
  })();

  /* ── Arc Reactor Skill Matrix Trace Board ───────── */
  (function arcReactorSkills() {
    const board = $('#reactor-lab-board'), canvas = $('#skills-trace-canvas');
    const skillNodes = $$('.reactor-skill-node');     const coils = $$('.core-coil');
    const coreNode = $('#reactor-core-node');
    const powerPercentEl = $('#power-percent');
    if (!board) return;
    if (!canvas) return;
    if (!skillNodes.length) return;

    let activeCount = 0;
    const totalSkills = skillNodes.length;

    let reactorAudioCtx = null;
    let reactorOsc = null;
    let reactorGain = null;
    let audioInitialized = false;

    function initReactorAudio() {
      if (audioInitialized) return;
      try {
        const AC = window.AudioContext ? window.AudioContext : window.webkitAudioContext;
        reactorAudioCtx = new AC();
        
        reactorOsc = reactorAudioCtx.createOscillator();
        reactorGain = reactorAudioCtx.createGain();
        
        reactorOsc.type = 'sawtooth';
        reactorOsc.frequency.setValueAtTime(60, reactorAudioCtx.currentTime);
        reactorGain.gain.setValueAtTime(0, reactorAudioCtx.currentTime);
        
        reactorOsc.connect(reactorGain);
        reactorGain.connect(reactorAudioCtx.destination);
        reactorOsc.start();
        
        audioInitialized = true;
      } catch (e) {}
    }

    function updateAudioLevel() {
      if (!audioInitialized) return;
      if (!reactorAudioCtx) return;
      if (reactorAudioCtx.state === 'suspended') {
        reactorAudioCtx.resume();
      }

      const ratio = activeCount / totalSkills;
      const now = reactorAudioCtx.currentTime;

      if (activeCount === 0) {
        reactorGain.gain.setTargetAtTime(0, now, 0.1);
      } else {
        const targetFreq = 60 + (ratio * 180);
        const targetGain = 0.02 + (ratio * 0.08);

        reactorOsc.frequency.setTargetAtTime(targetFreq, now, 0.1);
        reactorGain.gain.setTargetAtTime(targetGain, now, 0.1);
      }
    }

    function updateReactorState() {
      const percent = Math.round((activeCount / totalSkills) * 100);
      powerPercentEl.textContent = percent + '%';

      if (activeCount === totalSkills) {
        coreNode.classList.add('fully-charged');
        toast('Arc Reactor Core at 100% — Full Integration Unlocked!');
      } else {
        coreNode.classList.remove('fully-charged');
      }
    }

    function routeSkillToCore(nodeEl, hubRect, boardRect) {
      const nr = nodeEl.getBoundingClientRect();
      const isLeft = nr.left + nr.width / 2 < hubRect.left + hubRect.width / 2;
      
      const cx = isLeft ? (nr.right - boardRect.left) : (nr.left - boardRect.left);
      const cy = nr.top + nr.height / 2 - boardRect.top;
      
      const hx = hubRect.left + hubRect.width / 2 - boardRect.left;
      const hy = hubRect.top + hubRect.height / 2 - boardRect.top;
      
      const dx = hx - cx;
      const midX = cx + dx * 0.5;

      return [
        [cx, cy],
        [midX, cy],
        [midX, hy],
        [hx, hy]
      ];
    }

    const tb = TraceBoard(board, canvas, {
      items: () => skillNodes,
      id: node => node.dataset.id,
      color: () => COLORS.arc,
      packetEvery: 0.25,
      route: (node, br) => routeSkillToCore(node, coreNode.getBoundingClientRect(), br)
    });

    skillNodes.forEach(node => {
      node.addEventListener('click', () => {
        initReactorAudio();
        const idx = parseInt(node.dataset.index, 10);
        const id = node.dataset.id;
        const isActive = node.classList.toggle('active');
        
        if (coils[idx]) {
          coils[idx].classList.toggle('active', isActive);
        }

        if (isActive) {
          tb.energise(id, COLORS.arc);
        } else {
          tb.release(id);
        }

        activeCount += isActive ? 1 : -1;
        updateReactorState();
        updateAudioLevel();
      });
    });
  })();

  /* ── 8. Cipher sandbox ───────────────── */
  (function cipher() {
    const inp = $('#crypt-in'), key = $('#crypt-key'), reveal = $('#key-reveal'),
          s1 = $('#st-1'), s2 = $('#st-2'), s3 = $('#st-3'),
          meta = $('#crypt-meta'), copy = $('#crypt-copy');
    if (!inp) return;

    const enc = new TextEncoder();
    const dec = new TextDecoder();
    const rotl = (b, n) => ((b << n) | (b >>> (8 - n))) & 255;

    function pipeline(msg, k) {
      const m = Array.from(enc.encode(msg));
      const kb = Array.from(enc.encode(k.length ? k : '·'));
      const keyed = m.map((b, i) => ((b ^ kb[i % kb.length]) + ((i * 31 + kb.length * 7) % 256)) & 255);
      let prev = 0x5a;
      const diff = keyed.map((b, i) => {
        const v = (b ^ prev ^ rotl(kb[i % kb.length], i % 8)) & 255;
        prev = v;
        return v;
      }).reverse();
      return { keyed, diff };
    }

    function reversePipeline(b64Cipher, k) {
      try {
        let rawStr;
        try { rawStr = atob(b64Cipher.trim()); } catch(e) { return '[Invalid Base64 Ciphertext]'; }
        const diff = [];
        for (let i = 0; i < rawStr.length; i++) diff.push(rawStr.charCodeAt(i));
        
        const rev = diff.slice().reverse();
        const kb = Array.from(enc.encode(k.length ? k : '·'));
        
        let prev = 0x5a;
        const keyed = [];
        for (let i = 0; i < rev.length; i++) {
          const b = rev[i];
          const v = b ^ prev ^ rotl(kb[i % kb.length], i % 8);
          prev = b;
          keyed.push(v & 255);
        }

        const originalBytes = keyed.map((b, i) => {
          let val = (b - ((i * 31 + kb.length * 7) % 256)) & 255;
          return (val ^ kb[i % kb.length]) & 255;
        });

        return dec.decode(new Uint8Array(originalBytes));
      } catch (err) {
        return '[Decryption failed: check key or ciphertext]';
      }
    }

    const printable = a => a.map(b => String.fromCharCode(33 + (b % 94))).join('');
    const hex = a => a.map(b => b.toString(16).padStart(2, '0')).join(' ');
    const b64 = a => {
      let s = '';
      a.forEach(b => { s += String.fromCharCode(b); });
      try { return btoa(s).replace(/(.{4})/g, '$1 ').trim(); } catch (e) { return hex(a); }
    };
    const cut = (s, n) => (s.length > n ? s.slice(0, n) + ' …' : s);

    function bitsDiff(a, b) {
      const n = Math.min(a.length, b.length);
      let d = 0;
      for (let i = 0; i < n; i++) { let x = a[i] ^ b[i]; while (x) { d += x & 1; x >>= 1; } }
      return n ? (d / (n * 8)) * 100 : 0;
    }

    let scrambleT = null;
    function run() {
      const msg = inp.value, k = key.value;
      if (!msg) {
        s1.textContent = s2.textContent = s3.textContent = '—';
        s3.dataset.full = '';
        meta.textContent = '0 bytes · avalanche —';
        return;
      }
      const { keyed, diff } = pipeline(msg, k);
      s1.textContent = cut(printable(keyed), 150);
      s2.textContent = cut(hex(diff), 170);

      const out = b64(diff);
      s3.dataset.full = out;
      const shown = cut(out, 190);

      const decOut = $('#st-decrypted');
      const decIn = $('#decrypt-in');
      if (decIn) {
        if (!decIn.dataset.userEdited) {
          if (decIn.value.trim() === '') {
            decIn.value = out;
          }
        }
      }
      
      if (decOut) {
          if (decIn) {
            decOut.textContent = reversePipeline(decIn.value, k);
          }
      }

      clearInterval(scrambleT);
      if (reduceMotion) s3.textContent = shown;
      else {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let step = 0;
        scrambleT = setInterval(() => {
          step++;
          s3.textContent = shown.split('').map((c, i) =>
            (c === ' ' || i < step * 6) ? c : chars[(Math.random() * chars.length) | 0]
          ).join('');
          if (step * 6 >= shown.length) { clearInterval(scrambleT); s3.textContent = shown; }
        }, 26);
      }

      const kb = k.length ? k : '·';
      const altKey = kb.slice(0, -1) + String.fromCharCode(kb.charCodeAt(kb.length - 1) ^ 1);
      const alt = pipeline(msg, altKey).diff;
      meta.textContent = `${diff.length} bytes · avalanche ${bitsDiff(diff, alt).toFixed(1)}% of bits flipped`;
    }

    inp.addEventListener('input', () => { 
      const decIn = $('#decrypt-in');
      if(decIn) decIn.dataset.userEdited = ''; 
      run(); 
    });
    key.addEventListener('input', run);

    const decInEl = $('#decrypt-in');
    if (decInEl) {
      decInEl.addEventListener('input', () => {
        decInEl.dataset.userEdited = 'true';
        const decOut = $('#st-decrypted');         if (decOut) decOut.textContent = reversePipeline(decInEl.value, key.value);       });     }      reveal.addEventListener('click', () => {       const shown = key.type === 'text';       key.type = shown ? 'password' : 'text';       reveal.textContent = shown ? 'Show' : 'Hide';       reveal.setAttribute('aria-pressed', String(!shown));     });      copy.addEventListener('click', () => {       const v = s3.dataset.full ? s3.dataset.full : '';       if (!v) { toast('Nothing to copy yet'); return; }       if (navigator.clipboard) {         navigator.clipboard.writeText(v)           .then(() => toast('Ciphertext copied'))           .catch(() => toast('Copy blocked by the browser'));       } else toast('Copy is unavailable here');     });      run();   })();   


/* ── 9. Certificates Gallery & Lightbox ──────────────────────── */
  (function initCertGallery() {
    const thumbs = document.querySelectorAll('.cert-thumb');
    const lightbox = document.getElementById('cert-lightbox');
    const lightboxImg = document.getElementById('cert-lightbox-img');
    const lightboxClose = document.getElementById('cert-lightbox-close');

    if (!thumbs.length || !lightbox) return;

    // Thumbnail click opens Lightbox directly
    thumbs.forEach(thumb => {
      thumb.addEventListener('click', () => {
        const src = thumb.getAttribute('data-src');
        lightboxImg.src = src;
        lightbox.classList.add('show');
      });
    });

    // Close Lightbox functions
    const closeLightbox = () => lightbox.classList.remove('show');

    if(lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('show')) {
        closeLightbox();
      }
    });
  })();

  /* ── 10. Contact terminal ──────────────────────────────────── */
  (function contact() {
    const form = $('#contact-form'), err = $('#f-error'), send = $('#f-send');
    if (!form) return;
    const name = $('#f-name'), mail = $('#f-email'), msg = $('#f-msg');
    const mark = (el, bad) => el.closest('.tline').classList.toggle('err', bad);

    form.addEventListener('submit', e => {
      e.preventDefault();
      err.textContent = '';

      const checks = [
        [name, name.value.trim().length >= 2, 'Name needs at least 2 characters.'],
        [mail, /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail.value.trim()), 'That address will not route. Check the domain.'],         [msg,  msg.value.trim().length >= 10, 'Message needs at least 10 characters — tell me what you are building.']       ];       checks.forEach(c => mark(c[0], !c[1]));       const fail = checks.find(c => !c[1]);       if (fail) { err.textContent = fail[2]; fail[0].focus(); return; }        send.disabled = true;       const original = send.textContent;       const steps = ['opening socket…', 'signing payload…', 'transmitting…'];       let i = 0;       const run = setInterval(() => {         send.textContent = steps[i++];         if (i >= steps.length) {           clearInterval(run);           setTimeout(() => {             send.textContent = 'Sent';             const r = send.getBoundingClientRect();             reactor.burst(r.left + r.width / 2, r.top + r.height / 2);             toast('Transmission received — reply usually within a day');             form.reset();             setTimeout(() => { send.textContent = original; send.disabled = false; }, 1800);           }, 500);         }       }, 460);     });      [name, mail, msg].forEach(el => el.addEventListener('input', () => {       mark(el, false);       err.textContent = '';     }));   })();    /* ── 11. Image fallbacks ───────────────────────────────────── */   (function images() {     $$('[data-fallback] img').forEach(img => {
      const host = img.closest('[data-fallback]');
      const fail = () => host.classList.add('missing');
      img.addEventListener('error', fail);
      if (img.complete && img.naturalWidth === 0) fail();
    });
  })();

  /* ── 12. Plate tilt ────────────────────────────────────────── */
  (function tilt() {
    const plate = $('#plate');
    if (!plate) return;
    if (reduceMotion) return;
    if (!window.matchMedia('(pointer:fine)').matches) return;
    const frame = $('.plate-frame', plate);
    plate.addEventListener('pointermove', e => {
      const r = plate.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      frame.style.transform = `rotateY(${px * 10}deg) rotateX(${-py * 10}deg) translateZ(14px)`;
    });
    plate.addEventListener('pointerleave', () => { frame.style.transform = ''; });
  })();

  /* ── 13. Reactor hum ──────────────────────── */
  (function audio() {
    const wrap = $('#vol'), btn = $('#sound-btn'), fill = $('#vol-fill'), readout = $('#vol-readout');
    if (!wrap) return;
    const CIRC = 2 * Math.PI * 18;

    let volume = clamp(parseFloat(store.get('ih_vol', '0.28')), 0, 1);
    let actx = null, master = null, on = false;

    function paint() {
      fill.style.strokeDashoffset = String(CIRC * (1 - volume));
      readout.textContent = Math.round(volume * 100) + '%';
      if (master) {
          if (actx) master.gain.setTargetAtTime(on ? volume * 0.4 : 0, actx.currentTime, 0.15);
      }
    }
    fill.style.strokeDasharray = String(CIRC);
    paint();

    function build() {
      const AC = window.AudioContext ? window.AudioContext : window.webkitAudioContext;
      if (!AC) return false;
      actx = new AC();
      globalAudioCtx = actx;

      master = actx.createGain(); master.gain.value = 0; master.connect(actx.destination);
      globalMasterGain = master;

      const lp = actx.createBiquadFilter(); 
      lp.type = 'lowpass'; lp.frequency.value = 1000; lp.Q.value = 2.5; 
      
      const rotorGain = actx.createGain();
      rotorGain.gain.value = 0.85; 
      const rotorLfo = actx.createOscillator();
      rotorLfo.type = 'sine';
      rotorLfo.frequency.value = 18;
      const rotorAmt = actx.createGain();
      rotorAmt.gain.value = 0.25; 
      rotorLfo.connect(rotorAmt).connect(rotorGain.gain);
      rotorLfo.start();

      lp.connect(rotorGain).connect(master);

      [55, 55.4].forEach((f, i) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = i === 0 ? 'sawtooth' : 'square';
        o.frequency.value = f;
        g.gain.value = i === 0 ? 0.12 : 0.06;
        o.connect(g).connect(lp); o.start();
      });

      const turbine = actx.createOscillator(), turbGain = actx.createGain();
      turbine.type = 'triangle'; turbine.frequency.value = 950;
      turbGain.gain.value = 0.008;
      turbine.connect(turbGain).connect(master);
      turbine.start();

      const breathe = actx.createOscillator(); breathe.type = 'sine'; breathe.frequency.value = 0.1;
      const bAmt = actx.createGain(); bAmt.gain.value = 50;
      breathe.connect(bAmt).connect(lp.frequency); breathe.start();

      return true;
    }

    btn.addEventListener('click', () => {
      if (!actx) {
          if (!build()) { toast('Audio is unavailable in this browser'); return; }
      }
      on = !on;
      if (on) {
          if (actx.state === 'suspended') actx.resume();
      }
      wrap.classList.toggle('on', on);
      btn.setAttribute('aria-pressed', String(on));
      paint();
      toast(on ? 'Reactor hum on — scroll the ring to set level' : 'Reactor hum off');
    });

    wrap.addEventListener('wheel', e => {
      e.preventDefault();
      volume = clamp(volume - (Math.sign(e.deltaY) === 0 ? 1 : Math.sign(e.deltaY)) * 0.05, 0, 1);
      store.set('ih_vol', String(volume));
      wrap.classList.add('tweaking');
      clearTimeout(wrap._t);
      wrap._t = setTimeout(() => wrap.classList.remove('tweaking'), 900);
      paint();
    }, { passive: false });

    btn.addEventListener('keydown', e => {
      if (e.key !== 'ArrowUp') {
          if(e.key !== 'ArrowDown') return;
      }
      e.preventDefault();
      volume = clamp(volume + (e.key === 'ArrowUp' ? 0.05 : -0.05), 0, 1);
      store.set('ih_vol', String(volume));
      paint();
    });
  })();

})();

/* ── 14. Life Uptime Counter ────────────────────────────────────────── */
(function lifeUptime() {
  const uptimeEl = document.querySelector('#plate-uptime');
  if (!uptimeEl) return;

  const birthDate = new Date('2004-01-13T00:00:00').getTime();

  function updateUptime() {
    const now = new Date().getTime();
    const diff = now - birthDate;

    if (diff < 0) return;

    const years = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    const days = Math.floor((diff % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const h = String(hours).padStart(2, '0');
    const m = String(minutes).padStart(2, '0');
    const s = String(seconds).padStart(2, '0');

    uptimeEl.textContent = `${years}Y ${days}D ${h}:${m}:${s}`;
  }

  updateUptime();
  setInterval(updateUptime, 1000);
})();


/* ── 15. Local Time Display ────────────────────────────────── */
(function localTime() {
  const timeEl = document.getElementById('loc-time');
  if (!timeEl) return;

  function updateTime() {
    const now = new Date();
    const options = { 
      timeZone: 'Asia/Dhaka', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit', 
      hour12: true 
    };
    timeEl.textContent = now.toLocaleTimeString('en-US', options);
  }

  updateTime();
  setInterval(updateTime, 1000);
})();


/* ── 16. Accurate Time-Gap & Live-Synced Viewers Counter ──── */
(function initTelemetryCounters() {
  const usersEl = document.getElementById('stat-users');
  const viewsEl = document.getElementById('stat-views');
  if (!usersEl || !viewsEl) return;

  const launchDate = new Date('2026-09-01T00:00:00').getTime();
  const nowTime = new Date().getTime();
  
  const hoursPassed = Math.max(1, (nowTime - launchDate) / (1000 * 60 * 60));
  
  let calculatedViews = Math.floor(1000 + (hoursPassed * 2.5));

  let savedViews = parseInt(localStorage.getItem('ih_total_views'), 10);
  if (!savedViews || savedViews < calculatedViews) {
    savedViews = calculatedViews;
    localStorage.setItem('ih_total_views', savedViews);
  }

  let currentViewers = Math.floor(Math.random() * 5) + 1;

  usersEl.textContent = currentViewers;
  viewsEl.textContent = savedViews.toLocaleString();

  setInterval(() => {

    currentViewers = Math.floor(Math.random() * 5) + 1;

    usersEl.classList.add('updating');
    setTimeout(() => {
      usersEl.textContent = currentViewers;
      usersEl.classList.remove('updating');
    }, 300);

    savedViews += currentViewers;
    localStorage.setItem('ih_total_views', savedViews);
    viewsEl.textContent = savedViews.toLocaleString();

  }, 10000); 
})();
