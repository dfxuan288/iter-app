import { useEffect, useRef, type CSSProperties } from 'react';

import { colors, fonts, radius } from '@/theme/tokens';

import { LAUNCH_CARD_ID, symbolUri, useLaunchContent } from './launchContent';

/**
 * The launch animation (web app), in the spirit of Netflix's intro: the ITER mark appears with the
 * traveller's city photo inside it, a light sweeps across, then the camera dives into the mark until
 * the photo fills the screen. The photo then shrinks into Home's safe-to-spend card, which shows the
 * same photo, so the launch and the app read as one continuous shot. About 2.9 seconds; a tap skips
 * it. Not played when the phone is set to reduce motion.
 *
 * When Home's photo card is not on screen (the app opened on another page, or safe to spend is
 * locked), the scene fades into the app instead.
 *
 * Built with the browser's own animation engine (Web Animations) on plain elements, because it
 * needs CSS masks, which React Native's styles do not have. Phone apps use LaunchSplash.tsx.
 */

/** The ITER symbol image is 309 × 384. The dive aims at this point, inside the solid swoosh, so the photo fills the screen. */
const SYMBOL = { width: 309, height: 384, diveX: 150, diveY: 186 };
const DIVE_SCALE = 70;

const ms = { reveal: 150, push: 700, dive: 1350, diveEnd: 2000, shrink: 650, settle: 220 } as const;

const easeOut = 'cubic-bezier(0.22, 1, 0.36, 1)';
const diveEase = 'cubic-bezier(0.7, 0, 0.84, 0)';
const shrinkEase = 'cubic-bezier(0.65, 0, 0.35, 1)';

/** The same shading as Home's photo card (PhotoCard, scrim "full"), so the photo lands looking identical. */
const CARD_SCRIM = 'linear-gradient(180deg, rgba(5,59,80,0) 12%, rgba(5,59,80,0.42) 52%, rgba(5,59,80,0.9) 100%)';

function loadImage(uri: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new window.Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = uri;
  });
}

export function LaunchSplash({ onDone, canLand = () => true }: { onDone: () => void; canLand?: () => boolean }) {
  const content = useLaunchContent();
  const root = useRef<HTMLDivElement>(null);
  const masked = useRef<HTMLDivElement>(null);
  const shine = useRef<HTMLDivElement>(null);
  const word = useRef<HTMLDivElement>(null);
  const fly = useRef<HTMLDivElement>(null);
  const flyScrim = useRef<HTMLDivElement>(null);
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
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      done.current();
    };
    // Safety net: whatever happens (a browser that does not run the animation, a page opened in the
    // background), the launch screen never stays over the app for more than a few seconds.
    const safety = setTimeout(finish, 6000);
    const play = (element: Element | null, keyframes: Keyframe[], options: KeyframeAnimationOptions): Animation | null => {
      if (!element) return null;
      // 'forwards': each step holds its end state, and a later step takes over only once it starts.
      const animation = element.animate(keyframes, { fill: 'forwards', ...options });
      animations.push(animation);
      return animation;
    };

    // Tapping skips: a quick fade into the app.
    const scene = root.current;
    const skip = () => {
      if (finished || !scene) return;
      animations.forEach((a) => a.pause());
      scene.animate([{ opacity: Number(getComputedStyle(scene).opacity) }, { opacity: 0 }], { duration: 220, fill: 'forwards' }).onfinish = finish;
      setTimeout(finish, 400);
    };
    scene?.addEventListener('pointerdown', skip);

    // The landing: the full-screen photo shrinks into Home's card, or the scene fades if there is none.
    const land = () => {
      if (finished || !scene) return;
      const box = scene.getBoundingClientRect();
      const card = document.getElementById(LAUNCH_CARD_ID)?.getBoundingClientRect();
      const visible = card && card.width > 0 && card.height > 0 && card.top < box.bottom && card.bottom > box.top;
      if (!card || !visible || !canLand()) {
        const fade = play(scene, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(1.05)' }], { duration: 450, easing: 'cubic-bezier(0.4, 0, 1, 1)' });
        if (fade) fade.onfinish = finish;
        return;
      }
      const target = { left: card.left - box.left, top: card.top - box.top, width: card.width, height: card.height };
      // The zoomed-in mark is fully covered by the photo now; hide it so it does not show behind the shrinking photo.
      play(masked.current, [{ opacity: 0 }, { opacity: 0 }], { duration: 1 });
      play(
        fly.current,
        [
          { left: '0px', top: '0px', width: `${box.width}px`, height: `${box.height}px`, borderRadius: '0px' },
          { left: `${target.left}px`, top: `${target.top}px`, width: `${target.width}px`, height: `${target.height}px`, borderRadius: `${radius.card}px` },
        ],
        { duration: ms.shrink, easing: shrinkEase },
      );
      play(flyScrim.current, [{ opacity: 0 }, { opacity: 1 }], { duration: ms.shrink, easing: shrinkEase });
      // The navy behind clears as the photo shrinks, showing Home around the card.
      play(scene, [{ backgroundColor: colors.navy }, { backgroundColor: 'rgba(5,59,80,0)' }], { duration: ms.shrink * 0.6, easing: 'ease-out' });
      // Landed: hand over to the real card underneath.
      const settle = play(fly.current, [{ opacity: 1 }, { opacity: 0 }], { duration: ms.settle, delay: ms.shrink });
      if (settle) settle.onfinish = finish;
    };

    let cancelled = false;
    // Wait (briefly) for the images, so the animation never starts on an empty mark.
    const timeout = new Promise<boolean[]>((resolve) => setTimeout(() => resolve([false, false]), 1500));
    void Promise.race([Promise.all([loadImage(symbolUri()), content.photoUri ? loadImage(content.photoUri) : Promise.resolve(true)]), timeout]).then(
      ([symbolLoaded]) => {
        if (cancelled) return;
        if (!symbolLoaded || !scene) {
          finish();
          return;
        }
        const { width, height } = scene.getBoundingClientRect();
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
          const size = `${w}px ${h}px`;
          const position = `${pointX - (SYMBOL.diveX / SYMBOL.width) * w}px ${pointY - (SYMBOL.diveY / SYMBOL.height) * h}px`;
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
        // 2. A light sweeps across the mark while it slowly pushes in.
        play(shine.current, [{ backgroundPosition: '120% 0' }, { backgroundPosition: '-20% 0' }], { duration: 750, delay: 600, easing: 'ease-in-out' });
        play(shine.current, [{ opacity: 1 }, { opacity: 0 }], { duration: 150, delay: ms.dive - 100 });
        play(word.current, [{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: ms.dive - 200 });
        play(masked.current, [at(1), at(1.08)], { duration: ms.dive - ms.push, delay: ms.push, easing: 'linear' });
        // 3. The dive: the mark grows until the photo fills the screen; the full photo takes over at the end.
        const dive = play(masked.current, [at(1.08), at(DIVE_SCALE)], { duration: ms.diveEnd - ms.dive, delay: ms.dive, easing: diveEase });
        play(fly.current, [{ opacity: 0 }, { opacity: 1 }], { duration: 150, delay: ms.diveEnd - 150 });
        // 4. Then it shrinks into Home's card, measured now, after Home has finished appearing underneath.
        if (dive) dive.onfinish = land;
      },
    );

    return () => {
      cancelled = true;
      clearTimeout(safety);
      scene?.removeEventListener('pointerdown', skip);
      animations.forEach((a) => a.cancel());
    };
    // The animation runs once, from what the app knew when it opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const photo: CSSProperties = content.photoUri
    ? { backgroundImage: `url("${content.photoUri}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundImage: `linear-gradient(135deg, ${colors.navy}, ${colors.teal} 55%, ${colors.accent})` };
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
      <div ref={fly} style={{ ...styles.fly, ...photo }}>
        <div ref={flyScrim} style={{ ...styles.layer, background: CARD_SCRIM, opacity: 0 }} />
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: { position: 'absolute', inset: 0, zIndex: 50, overflow: 'hidden', backgroundColor: colors.navy, cursor: 'pointer', transformOrigin: '50% 42%' },
  layer: { position: 'absolute', inset: 0, willChange: 'opacity' },
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
  // The photo that flies into Home's card. It is resized (not scaled), so it keeps the card's crop as it shrinks.
  fly: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', overflow: 'hidden', opacity: 0 },
};
