import { useEffect, useMemo, useState } from 'react';

const SYMBOLS = '0123456789abcdefABCDEF';

const randomHashLike = (length) => Array.from({ length }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]).join('');

const getReducedMotion = () => (
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
);

export const AnimatedHash = ({ value = '', active = true, className = '', chunk = 4 }) => {
  const target = value || '-';
  const [reducedMotion, setReducedMotion] = useState(getReducedMotion);
  const [display, setDisplay] = useState(() => (active && !getReducedMotion() ? randomHashLike(target.length) : target));

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = () => setReducedMotion(mediaQuery.matches);
    handleChange();
    mediaQuery.addEventListener?.('change', handleChange);
    return () => mediaQuery.removeEventListener?.('change', handleChange);
  }, []);

  useEffect(() => {
    if (!active || !value || reducedMotion) {
      setDisplay(target);
      return undefined;
    }

    let frame = 0;
    const totalFrames = 24;
    const interval = window.setInterval(() => {
      frame += 1;
      const locked = Math.ceil((frame / totalFrames) * target.length);
      const next = target
        .split('')
        .map((char, index) => (index < locked ? char : SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]))
        .join('');
      setDisplay(next);
      if (frame >= totalFrames) {
        window.clearInterval(interval);
        setDisplay(target);
      }
    }, 28);

    return () => window.clearInterval(interval);
  }, [active, reducedMotion, target, value]);

  const formatted = useMemo(() => {
    if (!display || display === '-') return display;
    return display.match(new RegExp(`.{1,${chunk}}`, 'g'))?.join(' ') || display;
  }, [chunk, display]);

  return <span className={`animated-hash ${className}`}>{formatted}</span>;
};