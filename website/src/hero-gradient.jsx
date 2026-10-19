// ITER hero background: ShaderGradient mounted as a small React island.
// The rest of the site stays vanilla; this file is bundled to one IIFE.
import React, { useEffect, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { useThree } from '@react-three/fiber';
import { ShaderGradientCanvas, ShaderGradient } from '@shadergradient/react';

const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Tiny external store so the page (and the tuning panel) can change settings live.
const state = {
  uSpeed: 0.22,       // 'Drift': chosen with the team
  uStrength: 2.4,     // wave height: low = calm folds
  uDensity: 1.1,
  uFrequency: 5.5,
  brightness: 1.1,
  grainBlending: 0.08,
  grain: 'off',          // fine grain is a CSS overlay instead (lighter, controllable)
  c1: '#053B50', c2: '#3f9fb0', c3: '#176B87',
  rz: -40, cd: 4.6,
  running: true,
};
const subs = new Set();
let snap = { ...state };
const store = {
  get: () => snap,
  sub: (fn) => (subs.add(fn), () => subs.delete(fn)),
  set: (patch) => { snap = { ...snap, ...patch }; subs.forEach((f) => f()); },
};

// Lives inside the R3F canvas: renders on demand at ~30fps (a slow gradient looks identical
// to 60fps and costs half the GPU time), and stops completely when the hero is offscreen.
function LoopControl({ running }) {
  const setFrameloop = useThree((s) => s.setFrameloop);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    setFrameloop('demand');
    invalidate();
    if (!running) return;
    let raf, last = 0;
    const tick = (t) => {
      raf = requestAnimationFrame(tick);
      if (t - last >= 32) { last = t; invalidate(); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, setFrameloop, invalidate]);
  return null;
}

function HeroGradient() {
  const s = useSyncExternalStore(store.sub, store.get);
  return (
    <ShaderGradientCanvas
      style={{ position: 'absolute', inset: 0 }}
      pixelDensity={0.5}
      fov={45}
      lazyLoad={false}
      pointerEvents="none"
      powerPreference="low-power"
    >
      <LoopControl running={s.running && !reduce} />
      <ShaderGradient
        control="props"
        type="plane"
        animate={reduce ? 'off' : 'on'}
        uTime={0}
        uSpeed={s.uSpeed}
        uStrength={s.uStrength}
        uDensity={s.uDensity}
        uFrequency={s.uFrequency}
        uAmplitude={1}
        positionX={-1.4}
        positionY={0}
        positionZ={0}
        rotationX={0}
        rotationY={10}
        rotationZ={s.rz}
        color1={s.c1}
        color2={s.c2}
        color3={s.c3}
        reflection={0.1}
        wireframe={false}
        shader="defaults"
        cAzimuthAngle={180}
        cPolarAngle={90}
        cDistance={s.cd}
        cameraZoom={1}
        lightType="3d"
        brightness={s.brightness}
        grain={s.grain}
        grainBlending={s.grainBlending}
        zoomOut={false}
        enableTransition={false}
      />
    </ShaderGradientCanvas>
  );
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (e) { return false; }
}

function mount() {
  const el = document.getElementById('heroGrad');
  if (!el || !hasWebGL()) { document.documentElement.classList.add('no-sg'); return; }
  createRoot(el).render(<HeroGradient />);
  // ShaderGradient ignores some initial props (colours, brightness, grain) until they change,
  // so nudge every value once after mount and then restore it exactly.
  const kick = () => {
    const real = { ...store.get() };
    const nudged = {};
    for (const k in real) {
      const v = real[k];
      if (typeof v === 'number') nudged[k] = v + 0.0001;
      else if (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)) {
        const last = parseInt(v.slice(-1), 16);
        nudged[k] = v.slice(0, -1) + ((last + 1) % 16).toString(16);
      }
    }
    store.set(nudged);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const cur = store.get();
      store.set({ ...real, running: cur.running, uSpeed: cur.uSpeed === nudged.uSpeed ? real.uSpeed : cur.uSpeed });
    }));
  };
  setTimeout(kick, 120);
  setTimeout(kick, 900);
  // Fade the canvas in once the first frame has had time to draw.
  setTimeout(() => el.classList.add('on'), 350);
  // Pause rendering entirely when the hero is scrolled away.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((es) => {
      es.forEach((e) => store.set({ running: e.isIntersecting }));
    }, { rootMargin: '120px 0px' }).observe(el);
  }
}

window.__sg = { set: store.set, get: store.get };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
else mount();
