import clsx from 'clsx';

export const SealStamp = ({ state = 'pending', size = 'md', impact = false, cracked = false, rotation = -8, miniature = false }) => {
  const status = cracked ? 'invalid' : state;
  const style = status === 'valid' ? { '--seal-rotation': `${rotation}deg` } : undefined;

  return (
    <div
      className={clsx(
        'seal-stamp',
        `seal-stamp--${status}`,
        `seal-stamp--${size}`,
        impact && 'seal-stamp--impact',
        miniature && 'seal-stamp--miniature'
      )}
      style={style}
      aria-label={status === 'valid' ? 'Sceau valide' : status === 'invalid' ? 'Sceau fissure' : 'Sceau en attente'}
    >
      <svg className="seal-stamp__ring" viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="55" />
        <circle cx="60" cy="60" r="48" />
      </svg>
      <span className="seal-stamp__word">{'\u0645\u0648\u062b\u0651\u0642'}</span>
      {status === 'valid' && <span className="seal-stamp__ink" aria-hidden="true" />}
      {status === 'invalid' && <span className="seal-stamp__crack" aria-hidden="true" />}
    </div>
  );
};