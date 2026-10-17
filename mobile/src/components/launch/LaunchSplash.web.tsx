import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { formatMoney } from '@/domain/money';
import { colors, fonts } from '@/theme/tokens';

import { symbolUri, useLaunchContent } from './launchContent';

/**
 * The launch animation (web app), in the spirit of Netflix's intro: the ITER mark appears with the
 * traveller's city photo inside it, a light sweeps across, then the camera dives into the mark until
 * the photo fills the screen. Today's safe-to-spend amount counts up over it, and the whole scene
 * fades into Home, whose card shows the same photo. About 3.6 seconds; a tap skips it. Not played
 * when the phone is set to reduce motion.
 *
 * Built with the browser's own animation engine (Web Animations) on plain elements, because it
 * needs CSS masks, which React Native's styles do not have. Phone apps use LaunchSplash.tsx.
 */

/** The ITER symbol image is 309 × 384. The dive aims at this point, inside the solid swoosh, so the photo fills the screen. */
const SYMBOL = { width: 309, height: 384, diveX: 150, diveY: 186 };
const DIVE_SCALE = 70;

const ms = { reveal: 150, push: 700, dive: 1350, diveEnd: 2050, amount: 2150, exit: 3150, end: 3600 } as const;

const easeOut = 'cubic-bezier(0.22, 1, 0.36, 1)';
const diveEase = 'cubic-bezier(0.7, 0, 0.84, 0)';

function loadImage(uri: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new window.Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = uri;
  });
}

export function LaunchSplash({ onDone }: { onDone: () => void }) {
  const content = useLaunchContent();
  const root = useRef<HTMLDivElement>(null);
  const masked = useRef<HTMLDivElement>(null);
  const shine = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLDivElement>(null);
  const full = useRef<HTMLDivElement>(null);
  const scrim = useRef<HTMLDivElement>(null);
  const finale = useRef<HTMLDivElement>(null);
  const ring = useRef<SVGCircleElement>(null);
  const [amountText, setAmountText] = useState(content.amountSen === null ? '' : formatMoney(0, 'MYR', { trimZeros: true }));
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      done.current();
      return;
    }
    const animations: Animation[] = [];
    let frame = 0;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      done.current();
    };
    // Safety net: whatever happens (a browser that does not run the animation, a page opened in the
    // background), the launch screen never stays over the app for more than a few seconds.
    const safety = setTimeout(finish, ms.end + 2500);
    const play = (element: Element | null, keyframes: Keyframe[], options: KeyframeAnimationOptions) => {
      if (!element) return;
      // 'forwards': each step holds its end state, and a later step takes over only once it starts.
      animations.push(element.animate(keyframes, { fill: 'forwards', ...options }));
    };

    // Tapping skips: a quick fade into the app.
    const skip = () => {
      if (finished) return;
      animations.forEach((a) => a.pause());
      const fade = root.current?.animate([{ opacity: Number(getComputedStyle(root.current).opacity) }, { opacity: 0 }], { duration: 220, fill: 'forwards' });
      if (fade) fade.onfinish = finish;
      setTimeout(finish, 400);
    };
    const scene = root.current;
    scene?.addEventListener('pointerdown', skip);

    let cancelled = false;
    // Wait (briefly) for the images, so the animation never starts on an empty mark.
    const timeout = new Promise<boolean[]>((resolve) => setTimeout(() => resolve([false, false]), 1500));
    void Promise.race([Promise.all([loadImage(symbolUri()), content.photoUri ? loadImage(content.photoUri) : Promise.resolve(true)]), timeout]).then(
      ([symbolLoaded]) => {
        if (cancelled) return;
        if (!symbolLoaded || !root.current) {
          finish();
          return;
        }
        const { width, height } = root.current.getBoundingClientRect();
        // The mark: about a third of the screen's height, a little above the middle.
        const markHeight = Math.min(height * 0.3, 230);
        const markWidth = (markHeight * SYMBOL.width) / SYMBOL.height;
        const left = (width - markWidth) / 2;
        const top = height * 0.42 - markHeight / 2;
        // Mask size and position for a given zoom, keeping the dive point fixed on screen.
        const at = (scale: number): Keyframe => {
          const w = markWidth * scale;
          const h = markHeight * scale;
          const pointX = left + (SYMBOL.diveX / SYMBOL.width) * markWidth;
          const pointY = top + (SYMBOL.diveY / SYMBOL.height) * markHeight;
          const x = pointX - (SYMBOL.diveX / SYMBOL.width) * w;
          const y = pointY - (SYMBOL.diveY / SYMBOL.height) * h;
          const size = `${w}px ${h}px`;
          const position = `${x}px ${y}px`;
          return { maskSize: size, maskPosition: position, webkitMaskSize: size, webkitMaskPosition: position } as Keyframe;
        };
        if (word.current) word.current.style.top = `${top + markHeight + 20}px`;

        // 1. The mark appears with the photo inside, settling from slightly small.
        play(masked.current, [{ opacity: 0, ...at(0.86) }, { opacity: 1, ...at(1) }], { duration: ms.push - ms.reveal, delay: ms.reveal, easing: easeOut });
        play(shine.current, [{ opacity: 0, ...at(0.86) }, { opacity: 1, ...at(1) }], { duration: ms.push - ms.reveal, delay: ms.reveal, easing: easeOut });
        play(word.current, [{ opacity: 0, transform: 'translateY(12px)', letterSpacing: '0.5em' }, { opacity: 1, transform: 'none', letterSpacing: '0.28em' }], {
          duration: 500,
          delay: 350,
          easing: easeOut,
        });
        // 2. A light sweeps across the mark, while it slowly pushes in.
        play(shine.current, [{ backgroundPosition: '120% 0' }, { backgroundPosition: '-20% 0' }], { duration: 750, delay: 600, easing: 'ease-in-out' });
        play(shine.current, [{ opacity: 1 }, { opacity: 0 }], { duration: 150, delay: ms.dive - 100 });
        play(word.current, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: ms.dive - 200 });
        // 3. The dive: the mark grows until the photo fills the screen.
        play(masked.current, [at(1), at(1.08)], { duration: ms.dive - ms.push, delay: ms.push, easing: 'linear' });
        play(masked.current, [at(1.08), at(DIVE_SCALE)], { duration: ms.diveEnd - ms.dive, delay: ms.dive, easing: diveEase });
        play(full.current, [{ opacity: 0, transform: 'scale(1.08)' }, { opacity: 1, transform: 'scale(1.06)', offset: 0.12 }, { opacity: 1, transform: 'scale(1)' }], {
          duration: ms.end - ms.diveEnd + 150,
          delay: ms.diveEnd - 150,
          easing: 'ease-out',
        });
        // 4. Today's amount counts up over the photo.
        play(scrim.current, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: ms.amount - 100 });
        play(finale.current, [{ opacity: 0, transform: 'translateY(-50%) scale(0.92)' }, { opacity: 1, transform: 'translateY(-50%)' }], { duration: 450, delay: ms.amount, easing: easeOut });
        play(ring.current, [{ strokeDashoffset: 314 }, { strokeDashoffset: 0 }], { duration: 850, delay: ms.amount + 50, easing: easeOut });
        // The number follows the ring's own progress, so the two always move together.
        const ringAnimation = animations[animations.length - 1];
        if (content.amountSen !== null && ringAnimation) {
          const target = content.amountSen;
          const tick = () => {
            const local = Number(ringAnimation.currentTime ?? 0) - (ms.amount + 50);
            const t = Math.min(1, Math.max(0, local / 850));
            // Whole ringgit while counting (no flickering sen), the exact amount at the end.
            const shown = t < 1 ? Math.round((target * (1 - (1 - t) ** 3)) / 100) * 100 : target;
            setAmountText(formatMoney(shown, 'MYR', { trimZeros: true }));
            if (t < 1) frame = requestAnimationFrame(tick);
          };
          frame = requestAnimationFrame(tick);
        }
        // 5. Into the app: the scene lifts away, showing Home underneath.
        play(root.current, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(1.06)' }], {
          duration: ms.end - ms.exit,
          delay: ms.exit,
          easing: 'cubic-bezier(0.4, 0, 1, 1)',
        });
        const last = animations[animations.length - 1];
        if (last) last.onfinish = finish;
      },
    );

    return () => {
      cancelled = true;
      clearTimeout(safety);
      cancelAnimationFrame(frame);
      scene?.removeEventListener('pointerdown', skip);
      animations.forEach((a) => a.cancel());
    };
    // The animation runs once, from what the app knew when it opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const photo: CSSProperties = content.photoUri
    ? { backgroundImage: `url("${content.photoUri}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundImage: `linear-gradient(160deg, ${colors.navy}, ${colors.teal} 55%, ${colors.accent})` };
  const mask: CSSProperties = {
    maskImage: `url("${symbolUri()}")`,
    WebkitMaskImage: `url("${symbolUri()}")`,
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    opacity: 0,
  };

  return (
    <div ref={root} style={styles.root} role="img" aria-label={content.label}>
      <div ref={masked} style={{ ...styles.layer, ...photo, ...mask }} />
      <div ref={shine} style={{ ...styles.layer, ...styles.shine, ...mask }} />
      <div ref={word} style={styles.word} aria-hidden>
        ITER
      </div>
      <div ref={full} style={{ ...styles.layer, ...photo, opacity: 0 }} />
      <div ref={scrim} style={{ ...styles.layer, ...styles.scrim, opacity: 0 }} />
      <div ref={finale} style={{ ...styles.finale, opacity: 0 }} aria-hidden>
        {content.amountSen !== null ? (
          <div style={styles.ringBox}>
            <svg width="200" height="200" viewBox="0 0 120 120" style={styles.ring}>
              <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="5" />
              <circle
                ref={ring}
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke={colors.accent}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="314"
                strokeDashoffset="314"
                transform="rotate(-90 60 60)"
              />
            </svg>
            <div style={styles.amount}>{amountText}</div>
          </div>
        ) : (
          <div style={{ ...styles.amount, letterSpacing: '0.28em' }}>ITER</div>
        )}
        <div style={styles.caption}>{content.caption}</div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    position: 'absolute',
    inset: 0,
    zIndex: 50,
    overflow: 'hidden',
    backgroundColor: colors.navy,
    cursor: 'pointer',
    transformOrigin: '50% 42%',
    // The same system font as the app's body text (plain elements do not inherit React Native's).
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  layer: { position: 'absolute', inset: 0, willChange: 'transform, opacity' },
  shine: {
    backgroundImage: 'linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.55) 50%, transparent 62%)',
    backgroundSize: '300% 100%',
    backgroundPosition: '120% 0',
    backgroundRepeat: 'no-repeat',
    mixBlendMode: 'screen',
  },
  word: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    color: colors.white,
    fontFamily: fonts.displayBold,
    fontSize: 30,
    letterSpacing: '0.28em',
    paddingLeft: '0.28em',
    opacity: 0,
  },
  scrim: { background: 'linear-gradient(180deg, rgba(5,59,80,0.15), rgba(5,59,80,0.55) 45%, rgba(5,59,80,0.75))' },
  finale: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: '42%',
    transform: 'translateY(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
  },
  ringBox: { position: 'relative', width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', inset: 0 },
  amount: { color: colors.white, fontFamily: fonts.displaySemiBold, fontSize: 40, letterSpacing: -1, textShadow: '0 2px 16px rgba(5,59,80,0.6)' },
  caption: { color: 'rgba(255,255,255,0.9)', fontSize: 16, textAlign: 'center', textShadow: '0 1px 10px rgba(5,59,80,0.7)' },
};
