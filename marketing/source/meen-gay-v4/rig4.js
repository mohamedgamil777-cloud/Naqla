// ---------- character rig v4: alive (breathing, weight, crouch, hands, folds, follow-through) ----------
// origin = between the feet on the ground; faces +x (flip for -x); height ≈ 455 incl. head scale
const SVGNS = 'http://www.w3.org/2000/svg';
function mk(tag, attrs, parent) { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }

const PALETTE = {
  driver: { shirt: '#064E49', shirtShade: '#043A36', fold: '#032F2B', trim: '#FF6A00', pants: '#262C31', pantsShade: '#1A1E22', fold2: '#14181B', shoe: '#111111', skin: '#C68A62', skinShade: '#A9714D', hair: '#1B1512', cap: true, beard: true, sleeve: 'short' },
  customer: { shirt: '#FBFAF7', shirtShade: '#E2DBCF', fold: '#D3CABB', trim: '#E2DBCF', pants: '#3E4C5A', pantsShade: '#2F3A46', fold2: '#2A333D', shoe: '#5A3B28', skin: '#D59C74', skinShade: '#B9805A', hair: '#2A1E17', cap: false, beard: false, sleeve: 'rolled' },
};
const MOUTH4 = {
  neutral: 'M13 -360 Q19 -358.6 25 -360',
  press: 'M14 -359.5 L24 -359.5',
  smile: 'M11.5 -362 Q19 -356 26.5 -362',
  relief: 'M11 -362.5 Q19 -354 27 -362.5 Q19 -358.5 11 -362.5 Z',
  grin: 'M10 -363 Q19 -351.5 28 -363 Q19 -357.5 10 -363 Z',
  worried: 'M12.5 -357.5 Q19 -361.5 25.5 -357.5',
  open: 'M15 -361 Q19 -354 24 -361 Q19 -363 15 -361 Z',
  exhale: 'M16.5 -360 A2.6 3 0 1 0 21.5 -360 A2.6 3 0 1 0 16.5 -360 Z',
};
const BROW4 = {
  neutral: [[4, -397, 14, -397, -399], [20, -397, 31, -397, -399]],
  up: [[4, -402, 14, -402, -405], [20, -402, 31, -402, -405]],
  curious: [[4, -398, 14, -398, -400], [20, -403, 31, -402, -406]],
  worried: [[4, -396, 14, -402, -400], [20, -402, 31, -396, -400]],
  knit: [[4, -398, 14, -396, -399], [20, -396, 31, -398, -399]],
  happy: [[4, -399, 14, -399, -402.5], [20, -399, 31, -399, -402.5]],
};

function Person(parent, kind) {
  const P = PALETTE[kind];
  const root = mk('g', {}, parent);
  const shadow = mk('ellipse', { cx: 0, cy: 0, rx: 70, ry: 11, fill: '#111', opacity: 0.13 }, root);
  const body = mk('g', {}, root);
  const upperBehind = mk('g', {}, body);
  const legs = mk('g', { transform: 'translate(0 -205)' }, body);
  const upper = mk('g', {}, body);

  function seg(par, len, w, fill, shade) {
    mk('rect', { x: -w / 2, y: -w / 2, width: w, height: len + w / 2, rx: w / 2, fill }, par);
    if (shade) mk('rect', { x: -w / 2, y: -w / 2, width: w * 0.34, height: len + w / 2, rx: w * 0.17, fill: shade, opacity: 0.55 }, par);
  }
  function leg(par) {
    const hip = mk('g', {}, par); seg(hip, 100, 35, P.pants, P.pantsShade);
    mk('path', { d: 'M-2 76 Q6 82 2 90', fill: 'none', stroke: P.fold2, 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.5 }, hip);
    const knee = mk('g', {}, hip); seg(knee, 94, 29, P.pants, P.pantsShade);
    mk('path', { d: 'M-6 6 Q2 12 8 6', fill: 'none', stroke: P.fold2, 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.5 }, knee);
    mk('rect', { x: -15, y: 84, width: 30, height: 10, rx: 3, fill: P.pantsShade }, knee);
    const foot = mk('g', {}, knee);
    mk('path', { d: 'M-15 -6 L12 -6 Q36 -4 39 8 L39 13 L-15 13 Z', fill: P.shoe }, foot);
    mk('rect', { x: -15, y: 9, width: 54, height: 5, rx: 2, fill: '#000', opacity: 0.35 }, foot);
    return { hip, knee, foot };
  }
  function arm(par) {
    const sh = mk('g', {}, par);
    mk('rect', { x: -10, y: -8, width: 20, height: 84, rx: 10, fill: P.skin }, sh);
    if (P.sleeve === 'short') {
      mk('path', { d: 'M-15 -12 Q-16 20 -14 42 L14 42 Q16 20 14 -12 Q0 -20 -15 -12 Z', fill: P.shirt }, sh);
      mk('rect', { x: -15, y: 36, width: 30, height: 6, rx: 3, fill: P.trim }, sh);
      mk('path', { d: 'M-6 14 Q0 20 -3 28', fill: 'none', stroke: P.fold, 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.6 }, sh);
    } else {
      mk('path', { d: 'M-15 -12 Q-16 30 -14 70 L14 70 Q16 30 14 -12 Q0 -20 -15 -12 Z', fill: P.shirt }, sh);
      mk('path', { d: 'M-15 56 L15 56 L15 72 Q0 76 -15 72 Z', fill: P.shirtShade }, sh);
      mk('path', { d: 'M-6 48 Q2 53 8 47', fill: 'none', stroke: P.fold, 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.6 }, sh);
    }
    const el = mk('g', {}, sh);
    mk('rect', { x: -9, y: -6, width: 18, height: 68, rx: 9, fill: P.skin }, el);
    mk('rect', { x: -9, y: -6, width: 6, height: 68, rx: 3, fill: P.skinShade, opacity: 0.5 }, el);
    const hand = mk('g', {}, el);
    const prop = mk('g', {}, hand);
    const shapes = {
      relax: mk('g', {}, hand), open: mk('g', {}, hand), grip: mk('g', {}, hand),
    };
    mk('path', { d: 'M-10 -4 Q-12 14 -2 18 Q10 18 11 4 L10 -3 Z', fill: P.skin }, shapes.relax);
    mk('path', { d: 'M8 -1 Q15 4 12 11', fill: 'none', stroke: P.skin, 'stroke-width': 6, 'stroke-linecap': 'round' }, shapes.relax);
    mk('path', { d: 'M-4 6 L4 6', stroke: P.skinShade, 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: 0.8 }, shapes.relax);
    // open palm with fingers
    mk('path', { d: 'M-11 -4 L-11 12 Q-10 18 -4 18 L6 18 Q11 16 11 10 L11 -4 Z', fill: P.skin }, shapes.open);
    for (const [x, l] of [[-8, 14], [-3, 17], [2, 17], [7, 14]]) mk('rect', { x: x - 2.4, y: 12, width: 4.8, height: l, rx: 2.4, fill: P.skin }, shapes.open);
    mk('path', { d: 'M11 2 Q20 0 22 8', fill: 'none', stroke: P.skin, 'stroke-width': 6, 'stroke-linecap': 'round' }, shapes.open);
    // grip (curled fingers over an object edge)
    mk('path', { d: 'M-11 -4 Q-13 12 -4 17 L8 17 Q13 12 11 -4 Z', fill: P.skin }, shapes.grip);
    mk('path', { d: 'M-8 8 L8 8 M-8 13 L8 13', stroke: P.skinShade, 'stroke-width': 1.6, opacity: 0.7 }, shapes.grip);
    mk('path', { d: 'M10 -2 Q18 2 14 12', fill: 'none', stroke: P.skin, 'stroke-width': 6, 'stroke-linecap': 'round' }, shapes.grip);
    return { sh, el, hand, prop, shapes };
  }

  const farAnchor = mk('g', {}, upperBehind); const farArm = arm(farAnchor);
  const farLeg = leg(mk('g', { transform: 'translate(-12 0)' }, legs));
  const nearLeg = leg(mk('g', { transform: 'translate(12 0)' }, legs));
  // torso
  const torso = mk('g', {}, upper);
  mk('path', { d: 'M-34 -205 L-36 -228 L34 -228 L32 -205 Z', fill: P.pants }, torso);
  mk('path', { d: 'M-6 -228 Q-4 -216 -8 -206 M18 -228 Q20 -216 16 -206', fill: 'none', stroke: P.fold2, 'stroke-width': 2, opacity: 0.6 }, torso);
  const chest = mk('g', {}, torso);
  mk('path', { d: 'M-40 -318 Q-44 -334 -26 -340 L22 -340 Q42 -334 40 -316 L36 -270 Q34 -248 36 -230 L-36 -230 Q-34 -250 -38 -272 Z', fill: P.shirt }, chest);
  mk('path', { d: 'M-40 -318 Q-44 -334 -26 -340 L-14 -340 Q-22 -300 -20 -230 L-36 -230 Q-34 -250 -38 -272 Z', fill: P.shirtShade, opacity: 0.85 }, chest);
  mk('path', { d: 'M-18 -242 Q-8 -236 2 -240 M16 -244 Q24 -238 30 -243', fill: 'none', stroke: P.fold, 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.55 }, chest);
  mk('path', { d: 'M-12 -341 L4 -322 L18 -341 Z', fill: P.skinShade }, chest);
  if (kind === 'driver') {
    mk('path', { d: 'M-17 -343 L4 -319 L-5 -345 Z M23 -343 L4 -319 L13 -345 Z', fill: P.trim }, chest);
    mk('path', { d: 'M4 -319 L4 -292', stroke: P.fold, 'stroke-width': 3 }, chest);
    mk('circle', { cx: 4, cy: -306, r: 2.2, fill: P.fold }, chest);
    const b = mk('g', { transform: 'translate(22 -296) scale(0.12)' }, chest);
    mk('path', { d: 'M0 0 Q-60 -70 -60 -110 A60 60 0 1 1 60 -110 Q60 -70 0 0 Z', fill: P.trim }, b);
    mk('circle', { cx: 0, cy: -110, r: 24, fill: P.shirt }, b);
  } else {
    mk('path', { d: 'M-16 -343 L4 -320 L-5 -345 Z M22 -343 L4 -320 L12 -345 Z', fill: P.shirtShade }, chest);
    mk('path', { d: 'M4 -320 L4 -232', stroke: P.shirtShade, 'stroke-width': 2.5 }, chest);
    for (const y of [-300, -276, -252]) mk('circle', { cx: 8, cy: y, r: 2.4, fill: P.shirtShade }, chest);
    mk('path', { d: 'M14 -312 L30 -312 L30 -296 L14 -296 Z', fill: 'none', stroke: P.shirtShade, 'stroke-width': 2 }, chest);
  }
  // hem (secondary motion)
  const hem = mk('g', {}, torso);
  if (kind === 'driver') mk('path', { d: 'M-37 -238 L36 -238 L37 -222 Q0 -216 -37 -222 Z', fill: P.shirt }, hem), mk('path', { d: 'M-37 -238 L-20 -238 L-20 -219 L-37 -222 Z', fill: P.shirtShade }, hem);
  else { mk('rect', { x: -37, y: -233, width: 72, height: 9, rx: 3, fill: '#1A1A1A' }, hem); mk('rect', { x: 8, y: -233, width: 12, height: 9, rx: 2, fill: '#C9A45A' }, hem); }
  // head
  const headWrap = mk('g', {}, upper);
  const head = mk('g', {}, headWrap);
  mk('rect', { x: -9, y: -356, width: 22, height: 22, rx: 6, fill: P.skin }, head);
  mk('rect', { x: -9, y: -356, width: 9, height: 22, rx: 4, fill: P.skinShade, opacity: 0.6 }, head);
  mk('path', { d: 'M-22 -392 Q-24 -420 4 -423 Q32 -422 34 -394 L34 -372 Q33 -354 16 -347 Q4 -343 -8 -349 Q-22 -357 -22 -378 Z', fill: P.skin }, head);
  mk('path', { d: 'M-22 -392 Q-24 -420 -4 -422 Q-14 -396 -10 -350 Q-22 -358 -22 -378 Z', fill: P.skinShade, opacity: 0.45 }, head);
  const ear = mk('g', {}, head);
  mk('ellipse', { cx: -14, cy: -380, rx: 7, ry: 10, fill: P.skin }, ear);
  mk('path', { d: 'M-15 -385 Q-10 -380 -15 -374', fill: 'none', stroke: P.skinShade, 'stroke-width': 2.4, 'stroke-linecap': 'round' }, ear);
  const feat = mk('g', {}, head);
  if (P.beard) {
    mk('path', { d: 'M-6 -366 Q-4 -352 6 -348 Q20 -346 29 -355 Q24 -352 16 -352 Q4 -352 -6 -366 Z', fill: P.hair, opacity: 0.32 }, feat);
    mk('path', { d: 'M14 -365.5 Q19.5 -368 26 -365.5 Q20 -364 14 -365.5 Z', fill: P.hair, opacity: 0.7 }, feat);
  }
  mk('ellipse', { cx: 30, cy: -373, rx: 3.5, ry: 2.2, fill: P.skinShade, opacity: 0.5 }, feat);
  const eyeG = mk('g', {}, feat);
  const eyeA = mk('ellipse', { cx: 9, cy: -388, rx: 2.9, ry: 3.7, fill: '#1B1512' }, eyeG);
  const eyeB = mk('ellipse', { cx: 25, cy: -388, rx: 3.1, ry: 3.9, fill: '#1B1512' }, eyeG);
  const happyL = mk('path', { d: 'M5 -387 Q9 -392 13 -387 M21 -387 Q25 -392 29 -387', fill: 'none', stroke: '#1B1512', 'stroke-width': 2.6, 'stroke-linecap': 'round', opacity: 0 }, feat);
  const brows = mk('path', { fill: 'none', stroke: P.hair, 'stroke-width': 3.6, 'stroke-linecap': 'round' }, feat);
  mk('path', { d: 'M31 -390 Q37 -376 31 -371', fill: 'none', stroke: P.skinShade, 'stroke-width': 3, 'stroke-linecap': 'round' }, feat);
  const mouth = mk('path', { fill: 'none', stroke: '#6B3A2A', 'stroke-width': 2.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, feat);
  if (P.cap) {
    mk('path', { d: 'M-26 -394 Q-28 -432 6 -434 Q36 -432 37 -400 Z', fill: P.shirt }, head);
    mk('path', { d: 'M-26 -394 Q-28 -432 -2 -434 Q-14 -414 -14 -396 Z', fill: P.shirtShade }, head);
    mk('path', { d: 'M30 -402 Q52 -404 64 -396 Q50 -392 30 -394 Z', fill: P.shirtShade }, head);
    mk('path', { d: 'M-26 -397 L37 -401', stroke: P.trim, 'stroke-width': 4 }, head);
    mk('circle', { cx: 10, cy: -419, r: 5, fill: P.trim }, head);
    mk('path', { d: 'M-24 -394 Q-25 -380 -19 -374 L-15 -394 Z', fill: P.hair }, head);
  } else {
    mk('path', { d: 'M-25 -384 Q-30 -428 8 -431 Q40 -430 37 -398 Q30 -410 14 -410 Q0 -404 -12 -408 Q-16 -396 -16 -382 Z', fill: P.hair }, head);
  }
  const propLayer = mk('g', {}, upper);           // held objects sit between far and near arm
  const nearAnchor = mk('g', {}, upper); const nearArm = arm(nearAnchor);
  const phone = mk('g', { transform: 'translate(-4 2) rotate(-70)', opacity: 0 }, nearArm.prop);
  mk('rect', { x: -2, y: -14, width: 30, height: 56, rx: 6, fill: '#111' }, phone);
  mk('rect', { x: 1, y: -10, width: 24, height: 46, rx: 3, fill: '#CFE3DF' }, phone);

  const L1 = 72, L2 = 66;
  function fk(ax, ay, s, e, lean, lx) { // returns hand point in body space (deg, forward positive)
    const r = Math.PI / 180, a1 = s * r, a2 = (s + e) * r;
    const x = ax + L1 * Math.sin(a1) + L2 * Math.sin(a2), y = ay + L1 * Math.cos(a1) + L2 * Math.cos(a2);
    const lr = (lean || 0) * r, px = x - lx, py = y + 205; // rotate about hip (lx, -205)
    return [lx + px * Math.cos(lr) - py * Math.sin(lr), -205 + px * Math.sin(lr) + py * Math.cos(lr)];
  }
  return {
    root, propLayer, fk,
    set(s) {
      const f = s.face === 'left' ? -1 : 1;
      root.setAttribute('transform', `${s.base || ''} scale(${f} 1)`);
      const cr = (s.crouch || 0) * Math.PI / 180, drop = 196 * (1 - Math.cos(cr));
      const wx = (s.weight || 0) * 5;
      body.setAttribute('transform', `translate(${wx} ${(s.bob || 0) + drop})`);
      const lean = `rotate(${s.lean || 0} ${-wx * 0} -205)`;
      upper.setAttribute('transform', lean); upperBehind.setAttribute('transform', lean);
      const br = s.breath || 0, sy = -br * 1.8;
      chest.setAttribute('transform', `translate(0 -230) scale(${1 + br * 0.008} ${1 + br * 0.014}) translate(0 230)`);
      hem.setAttribute('transform', `rotate(${(s.hem || 0)} 0 -238)`);
      nearAnchor.setAttribute('transform', `translate(24 ${-330 + sy + (s.shrug || 0) * -6})`);
      farAnchor.setAttribute('transform', `translate(-22 ${-330 + sy + (s.shrug || 0) * -6})`);
      headWrap.setAttribute('transform', `translate(0 ${sy * 0.7 + (s.shrug || 0) * 2}) translate(0 -345) scale(1.1) translate(0 345)`);
      head.setAttribute('transform', `rotate(${s.tilt || 0} 0 -345) translate(0 ${s.nod || 0})`);
      const turn = s.turn || 0; feat.setAttribute('transform', `translate(${turn * 5} 0)`); ear.setAttribute('transform', `translate(${turn * 3} 0)`);
      const lk = s.look || [0, 0]; eyeG.setAttribute('transform', `translate(${lk[0] * 2.6} ${lk[1] * 2.6})`);
      const lid = clamp01(s.blink || 0), happy = s.eyes === 'happy';
      for (const e of [eyeA, eyeB]) { e.setAttribute('ry', (e === eyeA ? 3.7 : 3.9) * Math.max(0.08, 1 - lid)); e.setAttribute('opacity', happy ? 0 : 1); }
      happyL.setAttribute('opacity', happy ? 1 : 0);
      const B = BROW4[s.brow || 'neutral'];
      brows.setAttribute('d', B.map(([x1, y1, x2, y2, cy]) => `M${x1} ${y1} Q${(x1 + x2) / 2} ${cy} ${x2} ${y2}`).join(' '));
      const m = s.mouth || 'neutral'; mouth.setAttribute('d', MOUTH4[m]); mouth.setAttribute('fill', m === 'grin' || m === 'relief' ? '#fff' : m === 'open' || m === 'exhale' ? '#6B3A2A' : 'none');
      // legs (crouch keeps feet planted: thigh +a, shin -2a, foot +a)
      const L = s.legs || {}, a = s.crouch || 0, w = (s.weight || 0) * 1.4;
      nearLeg.hip.setAttribute('transform', `rotate(${-((L.nh || 0) + a - w)})`); nearLeg.knee.setAttribute('transform', `translate(0 100) rotate(${-((L.nk || 0) - 2 * a)})`); nearLeg.foot.setAttribute('transform', `translate(0 94) rotate(${-((L.nf || 0) + a)})`);
      farLeg.hip.setAttribute('transform', `rotate(${-((L.fh || 0) + a - w)})`); farLeg.knee.setAttribute('transform', `translate(0 100) rotate(${-((L.fk || 0) - 2 * a)})`); farLeg.foot.setAttribute('transform', `translate(0 94) rotate(${-((L.ff || 0) + a)})`);
      const A = s.arms || {};
      const ns = A.ns ?? 6, ne = A.ne ?? 10, fs = A.fs ?? -4, fe = A.fe ?? 10;
      nearArm.sh.setAttribute('transform', `rotate(${-ns})`); nearArm.el.setAttribute('transform', `translate(0 72) rotate(${-ne})`); nearArm.hand.setAttribute('transform', `translate(0 66) rotate(${-(A.nw || 0)})`);
      farArm.sh.setAttribute('transform', `rotate(${-fs})`); farArm.el.setAttribute('transform', `translate(0 72) rotate(${-fe})`); farArm.hand.setAttribute('transform', `translate(0 66) rotate(${-(A.fw || 0)})`);
      for (const [arm, shp] of [[nearArm, s.handN || 'relax'], [farArm, s.handF || 'relax']]) for (const k in arm.shapes) arm.shapes[k].setAttribute('opacity', k === shp ? 1 : 0);
      phone.setAttribute('opacity', s.prop === 'phone' ? 1 : 0);
      shadow.setAttribute('rx', 70 + a * 0.6);
      this._last = { ns, ne, fs, fe, sy, lean: s.lean || 0, shrug: s.shrug || 0 };
    },
    hands() { const l = this._last; return { near: fk(24, -330 + l.sy - l.shrug * 6, l.ns, l.ne, 0, 0), far: fk(-22, -330 + l.sy - l.shrug * 6, l.fs, l.fe, 0, 0) }; },
  };
}
function clamp01(x) { return Math.max(0, Math.min(1, x)); }

// ---- life helpers ----
function hash(n) { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); }
function blinkAmt(t, seed) {            // natural, irregular blinks (~every 2.5–4.5 s)
  let tb = seed * 1.7 % 3; let i = 0;
  while (tb < t + 1) { const d = t - tb; if (d >= 0 && d < 0.16) return Math.sin(d / 0.16 * Math.PI); tb += 2.4 + hash(i + seed * 13) * 2.2; i++; }
  return 0;
}
function alive(t, seed = 0) {            // breathing, weight shift, small head motion, hand adjustments
  const br = Math.sin(t * 1.55 + seed);
  return {
    breath: br, bob: br * 0.6,
    weight: Math.sin(t * 0.42 + seed * 2) * 0.9,
    tilt: Math.sin(t * 0.63 + seed) * 1.3, nod: Math.sin(t * 0.9 + seed * 3) * 0.7,
    blink: blinkAmt(t, seed + 1),
    arms: { ns: 5 + Math.sin(t * 0.7 + seed) * 1.6 + br * 0.6, ne: 11 + Math.sin(t * 0.55 + seed + 1) * 2.5, fs: -4 + Math.sin(t * 0.6 + seed + 2) * 1.2, fe: 11 + Math.sin(t * 0.5 + seed) * 2 },
  };
}
function walkCycle(p, v = 1) {         // v: 0..1 speed factor scales stride
  const s = Math.sin(p), a = 22 * v;
  return { legs: { nh: a * s, fh: -a * s, nk: -(6 + 34 * v * Math.max(0, Math.sin(p + 2.2))), fk: -(6 + 34 * v * Math.max(0, Math.sin(p + 2.2 + Math.PI))), nf: 6 * Math.sin(p - 0.6) * v, ff: -6 * Math.sin(p - 0.6) * v },
    arms: { ns: -15 * s * v + 3, fs: 15 * s * v - 3, ne: 14 + 6 * s * v, fe: 14 - 6 * s * v }, bob: (-Math.abs(Math.cos(p)) * 7 + 3.5) * v, tilt: Math.sin(p * 2) * 1.0 * v, hem: Math.sin(p * 2) * 1.5 * v };
}
function mix(a, b, k) {
  const o = {}; for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const va = a[key], vb = b[key];
    if (typeof va === 'number' || typeof vb === 'number') o[key] = (va || 0) + ((vb || 0) - (va || 0)) * k;
    else if (Array.isArray(va) || Array.isArray(vb)) { const A = va || [0, 0], Bv = vb || [0, 0]; o[key] = A.map((x, i) => x + (Bv[i] - x) * k); }
    else if (va && vb && typeof va === 'object') o[key] = mix(va, vb, k);
    else o[key] = k < 0.5 ? (va ?? vb) : (vb ?? va);
  } return o;
}
