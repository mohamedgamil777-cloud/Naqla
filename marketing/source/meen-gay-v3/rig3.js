// ---------- premium character rig (3/4 view, faces +x; flip for -x) ----------
// origin = between the feet on the ground; 1 unit ≈ 1px at scale 1; height ≈ 415
const SVGNS = 'http://www.w3.org/2000/svg';
function mk(tag, attrs, parent) { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
const R3 = Math.PI / 180;

const PALETTE = {
  driver: { shirt: '#064E49', shirtShade: '#043A36', trim: '#FF6A00', pants: '#23292E', pantsShade: '#181C20', shoe: '#111111', skin: '#C68A62', skinShade: '#A9714D', hair: '#1B1512', cap: true, beard: true, badge: true, sleeve: 'short' },
  customer: { shirt: '#FBFAF7', shirtShade: '#E4DED3', trim: '#E4DED3', pants: '#3E4C5A', pantsShade: '#2F3A46', shoe: '#5A3B28', skin: '#D59C74', skinShade: '#B9805A', hair: '#2A1E17', cap: false, beard: false, badge: false, sleeve: 'rolled' },
};

const MOUTH3 = {
  neutral: 'M13 -360 Q19 -358.5 25 -360',
  smile: 'M11 -362 Q19 -355 27 -362',
  grin: 'M10 -363 Q19 -352 28 -363 Q19 -358 10 -363 Z',
  worried: 'M12 -357 Q19 -362 26 -357',
  open: 'M15 -361 Q19 -353 24 -361 Q19 -363 15 -361 Z',
};

function Person(parent, kind) {
  const P = PALETTE[kind];
  const root = mk('g', {}, parent);
  const shadow = mk('ellipse', { cx: 0, cy: 0, rx: 70, ry: 11, fill: '#111', opacity: 0.13 }, root);
  const body = mk('g', {}, root);           // everything that bobs

  function limb(par, x, y, len, w, fill, shade) {
    const g = mk('g', { transform: `translate(${x} ${y})` }, par);
    mk('rect', { x: -w / 2, y: -w / 2, width: w, height: len + w / 2, rx: w / 2, fill }, g);
    if (shade) mk('rect', { x: -w / 2, y: -w / 2, width: w * 0.36, height: len + w / 2, rx: w * 0.18, fill: shade, opacity: 0.55 }, g);
    return g;
  }
  function leg(par) {
    const hip = limb(par, 0, 0, 100, 34, P.pants, P.pantsShade);
    const knee = limb(hip, 0, 100, 96, 29, P.pants, P.pantsShade);
    const foot = mk('g', { transform: 'translate(0 96)' }, knee);
    mk('path', { d: 'M-15 -6 L14 -6 Q36 -4 38 8 L38 14 L-15 14 Z', fill: P.shoe }, foot);
    mk('rect', { x: -15, y: 10, width: 53, height: 5, rx: 2, fill: '#000', opacity: 0.35 }, foot);
    return { hip, knee, foot };
  }
  function arm(par) {
    const sh = mk('g', {}, par);
    mk('rect', { x: -10, y: -8, width: 20, height: 84, rx: 10, fill: P.skin }, sh);
    if (P.sleeve === 'short') mk('rect', { x: -14, y: -12, width: 28, height: 52, rx: 13, fill: P.shirt }, sh), mk('rect', { x: -14, y: 34, width: 28, height: 6, rx: 3, fill: P.trim }, sh);
    else mk('rect', { x: -14, y: -12, width: 28, height: 84, rx: 13, fill: P.shirt }, sh), mk('rect', { x: -14, y: 60, width: 28, height: 12, rx: 6, fill: P.shirtShade }, sh);
    const el = mk('g', { transform: 'translate(0 72)' }, sh);
    mk('rect', { x: -9, y: -6, width: 18, height: 70, rx: 9, fill: P.skin }, el);
    mk('rect', { x: -9, y: -6, width: 6, height: 70, rx: 3, fill: P.skinShade, opacity: 0.5 }, el);
    const hand = mk('g', { transform: 'translate(0 66)' }, el);
    const prop = mk('g', {}, hand);
    mk('path', { d: 'M-10 -4 Q-12 14 0 17 Q12 15 11 -2 Z', fill: P.skin }, hand);
    mk('path', { d: 'M8 -2 Q16 2 13 10', fill: 'none', stroke: P.skinShade, 'stroke-width': 4, 'stroke-linecap': 'round' }, hand);
    return { sh, el, hand, prop };
  }

  // far side (behind torso)
  const farArm = arm(mk('g', { transform: 'translate(-22 -330)' }, body));
  const legs = mk('g', { transform: 'translate(0 -205)' }, body);
  const farLeg = leg(mk('g', { transform: 'translate(-12 0)' }, legs));
  const nearLeg = leg(mk('g', { transform: 'translate(12 0)' }, legs));
  // torso
  const torso = mk('g', {}, body);
  mk('path', { d: 'M-34 -205 L-36 -228 L34 -228 L32 -205 Z', fill: P.pants }, torso);
  mk('rect', { x: -36, y: -232, width: 70, height: 9, rx: 3, fill: '#1A1A1A' }, torso);
  mk('rect', { x: 8, y: -232, width: 12, height: 9, rx: 2, fill: '#C9A45A' }, torso);
  mk('path', { d: 'M-40 -318 Q-44 -334 -26 -340 L22 -340 Q42 -334 40 -316 L36 -270 Q34 -246 36 -228 L-36 -228 Q-34 -250 -38 -272 Z', fill: P.shirt }, torso);
  mk('path', { d: 'M-40 -318 Q-44 -334 -26 -340 L-14 -340 Q-22 -300 -20 -228 L-36 -228 Q-34 -250 -38 -272 Z', fill: P.shirtShade, opacity: 0.8 }, torso);
  // collar
  mk('path', { d: 'M-12 -341 L4 -322 L18 -341 Z', fill: P.skinShade }, torso);
  mk('path', { d: 'M-16 -343 L4 -320 L-4 -344 Z M22 -343 L4 -320 L12 -344 Z', fill: kind === 'driver' ? P.trim : P.shirtShade }, torso);
  if (kind === 'driver') {
    mk('path', { d: 'M4 -320 L4 -290', stroke: P.shirtShade, 'stroke-width': 3 }, torso);
    // small chest badge: orange pin
    const b = mk('g', { transform: 'translate(22 -296) scale(0.12)' }, torso);
    mk('path', { d: 'M0 0 Q-60 -70 -60 -110 A60 60 0 1 1 60 -110 Q60 -70 0 0 Z', fill: P.trim }, b);
    mk('circle', { cx: 0, cy: -110, r: 24, fill: P.shirt }, b);
  } else {
    mk('path', { d: 'M4 -320 L4 -232', stroke: P.shirtShade, 'stroke-width': 2.5 }, torso);
    for (const y of [-300, -276, -252]) mk('circle', { cx: 8, cy: y, r: 2.4, fill: P.shirtShade }, torso);
    mk('path', { d: 'M14 -312 L30 -312 L30 -296 L14 -296 Z', fill: 'none', stroke: P.shirtShade, 'stroke-width': 2 }, torso);
  }
  // head
  const headWrap = mk('g', { transform: 'translate(0 -345) scale(1.1) translate(0 345)' }, body);
  const head = mk('g', {}, headWrap);
  mk('rect', { x: -9, y: -356, width: 22, height: 22, rx: 6, fill: P.skin }, head);
  mk('rect', { x: -9, y: -356, width: 9, height: 22, rx: 4, fill: P.skinShade, opacity: 0.6 }, head);
  const face = mk('g', {}, head);
  mk('path', { d: 'M-22 -392 Q-24 -420 4 -423 Q32 -422 34 -394 L34 -372 Q33 -354 16 -347 Q4 -343 -8 -349 Q-22 -357 -22 -378 Z', fill: P.skin }, face);
  mk('path', { d: 'M-22 -392 Q-24 -420 -4 -422 Q-14 -396 -10 -350 Q-22 -358 -22 -378 Z', fill: P.skinShade, opacity: 0.45 }, face);
  mk('ellipse', { cx: -14, cy: -380, rx: 7, ry: 10, fill: P.skin }, face);
  mk('path', { d: 'M-15 -385 Q-10 -380 -15 -374', fill: 'none', stroke: P.skinShade, 'stroke-width': 2.4, 'stroke-linecap': 'round' }, face);
  if (P.beard) {
    mk('path', { d: 'M-6 -366 Q-4 -352 6 -348 Q20 -346 29 -355 Q24 -352 16 -352 Q4 -352 -6 -366 Z', fill: P.hair, opacity: 0.32 }, face);
    mk('path', { d: 'M14 -365.5 Q19.5 -368 26 -365.5 Q20 -364 14 -365.5 Z', fill: P.hair, opacity: 0.7 }, face);
  }
  // features
  const eyes = mk('g', {}, face);
  const eyeA = mk('ellipse', { cx: 9, cy: -388, rx: 2.8, ry: 3.6, fill: '#1B1512' }, eyes);
  const eyeB = mk('ellipse', { cx: 25, cy: -388, rx: 3.0, ry: 3.8, fill: '#1B1512' }, eyes);
  const lidA = mk('path', { d: 'M5 -388 Q9 -394 13 -388', fill: 'none', stroke: '#1B1512', 'stroke-width': 2.6, 'stroke-linecap': 'round', opacity: 0 }, face);
  const lidB = mk('path', { d: 'M21 -388 Q25 -394 29 -388', fill: 'none', stroke: '#1B1512', 'stroke-width': 2.6, 'stroke-linecap': 'round', opacity: 0 }, face);
  const brows = mk('path', { fill: 'none', stroke: P.hair, 'stroke-width': 3.6, 'stroke-linecap': 'round' }, face);
  mk('path', { d: 'M31 -390 Q37 -376 31 -371', fill: 'none', stroke: P.skinShade, 'stroke-width': 3, 'stroke-linecap': 'round' }, face);
  const mouth = mk('path', { fill: 'none', stroke: '#6B3A2A', 'stroke-width': 2.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, face);
  // hair / cap
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

  const nearArm = arm(mk('g', { transform: 'translate(24 -330)' }, body));
  const phone = mk('g', { transform: 'translate(-4 2) rotate(-70)', opacity: 0 }, nearArm.prop);
  mk('rect', { x: -2, y: -14, width: 30, height: 56, rx: 6, fill: '#111' }, phone);
  mk('rect', { x: 1, y: -10, width: 24, height: 46, rx: 3, fill: '#CFE3DF' }, phone);
  const BROW = {
    neutral: 'M4 -397 Q9 -399 14 -397 M20 -397 Q25 -399 31 -397',
    up: 'M4 -401 Q9 -404 14 -401 M20 -401 Q25 -404 31 -401',
    worried: 'M4 -396 Q9 -399 14 -402 M20 -402 Q25 -399 31 -396',
    happy: 'M4 -399 Q9 -402 14 -399 M20 -399 Q25 -402 31 -399',
  };
  return {
    root,
    set(s) {
      const f = s.face === 'left' ? -1 : 1;
      root.setAttribute('transform', `${s.base || ''} scale(${f} 1)`);
      body.setAttribute('transform', `translate(0 ${s.bob || 0}) rotate(${s.lean || 0} 0 -200)`);
      head.setAttribute('transform', `rotate(${s.tilt || 0} 0 -345) translate(${s.headX || 0} ${s.nod || 0})`);
      const lk = s.look || [0, 0];
      eyes.setAttribute('transform', `translate(${lk[0] * 3} ${lk[1] * 3})`);
      const closed = s.blink > 0.6 || s.eyes === 'happy';
      eyeA.setAttribute('opacity', closed ? 0 : 1); eyeB.setAttribute('opacity', closed ? 0 : 1);
      lidA.setAttribute('opacity', closed ? 1 : 0); lidB.setAttribute('opacity', closed ? 1 : 0);
      brows.setAttribute('d', BROW[s.brow || 'neutral']);
      const m = s.mouth || 'neutral'; mouth.setAttribute('d', MOUTH3[m]); mouth.setAttribute('fill', m === 'grin' ? '#fff' : m === 'open' ? '#6B3A2A' : 'none');
      // limbs: angles in degrees, positive = forward (toward the facing direction)
      const L = s.legs || {};
      nearLeg.hip.setAttribute('transform', `rotate(${-(L.nh || 0)})`); nearLeg.knee.setAttribute('transform', `translate(0 100) rotate(${-(L.nk || 0)})`);
      farLeg.hip.setAttribute('transform', `rotate(${-(L.fh || 0)})`); farLeg.knee.setAttribute('transform', `translate(0 100) rotate(${-(L.fk || 0)})`);
      nearLeg.foot.setAttribute('transform', `translate(0 96) rotate(${-(L.nf || 0)})`); farLeg.foot.setAttribute('transform', `translate(0 96) rotate(${-(L.ff || 0)})`);
      const A = s.arms || {};
      nearArm.sh.setAttribute('transform', `rotate(${-(A.ns ?? 6)})`); nearArm.el.setAttribute('transform', `translate(0 72) rotate(${-(A.ne ?? 10)})`);
      farArm.sh.setAttribute('transform', `rotate(${-(A.fs ?? -4)})`); farArm.el.setAttribute('transform', `translate(0 72) rotate(${-(A.fe ?? 10)})`);
      nearArm.hand.setAttribute('transform', `translate(0 66) rotate(${-(A.nw || 0)})`);
      phone.setAttribute('opacity', s.prop === 'phone' ? 1 : 0);
      shadow.setAttribute('rx', 70 + (s.shadowGrow || 0));
    },
  };
}
