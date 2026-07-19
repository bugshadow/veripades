import { useEffect, useState } from 'react';
import { AnimatedHash } from '../ui/AnimatedHash';

const getReducedMotion = () => (
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
);

export const HashComparator = ({ before = '', after = '', altered = false, animate = true }) => {
  const [revealDiffs, setRevealDiffs] = useState(!animate || !altered || getReducedMotion());
  const max = Math.max(before?.length || 0, after?.length || 0);
  const beforeChars = (before || '').padEnd(max, ' ').split('');
  const afterChars = (after || '').padEnd(max, ' ').split('');
  const showAlignedDiffs = altered && revealDiffs;

  useEffect(() => {
    if (!animate || !altered || getReducedMotion()) {
      setRevealDiffs(true);
      return undefined;
    }

    setRevealDiffs(false);
    const timer = window.setTimeout(() => setRevealDiffs(true), 820);
    return () => window.clearTimeout(timer);
  }, [after, altered, animate, before]);

  const renderChars = (chars, other) => chars.map((char, index) => {
    const different = char !== other[index];
    return (
      <span key={`${index}-${char}`} className={different && altered ? 'hash-comparator__diff' : undefined}>
        {char === ' ' ? '\u00a0' : char}
      </span>
    );
  });

  return (
    <div className={`hash-comparator ${altered ? 'hash-comparator--altered' : ''} ${showAlignedDiffs ? 'hash-comparator--revealed' : ''}`} aria-label="Comparaison des empreintes SHA-256">
      <div className="hash-comparator__column">
        <span className="hash-comparator__label">HASH CMS</span>
        <code>{showAlignedDiffs ? renderChars(beforeChars, afterChars) : <AnimatedHash value={before} active={animate} />}</code>
      </div>
      <div className={`hash-comparator__column ${showAlignedDiffs ? 'hash-comparator__column--altered' : ''}`}>
        <span className="hash-comparator__label">HASH RECALCULE</span>
        <code>{showAlignedDiffs ? renderChars(afterChars, beforeChars) : <AnimatedHash value={after} active={animate} />}</code>
      </div>
    </div>
  );
};