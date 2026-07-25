import clsx from 'clsx';

export const SealStamp = ({ state = 'pending', size = 'md', impact = false, rotation = -8, label, miniature = false }) => {
  const statusLabel = label || (state === 'valid' ? 'Document authentique' : state === 'invalid' ? 'Document altéré' : state === 'progress' ? 'Analyse en cours' : 'Cachet en attente');
  const arcId = `seal-arc-${size}-${state}-${miniature ? 'mini' : 'full'}`;
  return (
    <div className={clsx('seal-stamp', `seal-stamp--${state}`, `seal-stamp--${size}`, impact && 'seal-stamp--impact', miniature && 'seal-stamp--miniature')} style={{ '--seal-rotation': `${rotation}deg` }} role="img" aria-label={statusLabel}>
      <svg className="seal-stamp__svg" viewBox="0 0 160 160" aria-hidden="true">
        <circle className="seal-stamp__outer" cx="80" cy="80" r="70" />
        <circle className="seal-stamp__inner" cx="80" cy="80" r="59" />
        <path className="seal-stamp__arc" id={arcId} d="M 29 86 A 54 54 0 0 1 131 86" />
        {!miniature && <text className="seal-stamp__legend"><textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">PREUVE CRYPTOGRAPHIQUE</textPath></text>}
        {state === 'invalid' && <path className="seal-stamp__fracture" d="M42 39 L70 70 L59 88 L91 112 L82 133 M70 70 L105 49 M59 88 L34 109" />}
      </svg>
      {!miniature && <span className="seal-stamp__arabic">موثّق</span>}
      {!miniature && <span className="seal-stamp__state">{state === 'invalid' ? 'ALTÉRÉ' : state === 'valid' ? 'VALIDÉ' : 'PAdES'}</span>}
      <span className="seal-stamp__texture" aria-hidden="true" />
    </div>
  );
};
