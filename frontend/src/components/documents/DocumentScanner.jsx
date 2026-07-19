import { useEffect, useState } from 'react';
import { AnimatedHash } from '../ui/AnimatedHash';

export const DocumentScanner = ({ file, phase = 'idle', hash }) => {
  const [softLoop, setSoftLoop] = useState(false);
  const scanning = phase === 'uploading' || phase === 'looping';
  const ready = Boolean(hash);
  const phaseClass = softLoop || phase === 'looping' ? 'document-scanner--looping' : `document-scanner--${phase}`;

  useEffect(() => {
    setSoftLoop(false);
    if (phase !== 'uploading') return undefined;
    const timer = window.setTimeout(() => setSoftLoop(true), 1100);
    return () => window.clearTimeout(timer);
  }, [phase]);

  return (
    <div className={`document-scanner ${phaseClass} ${scanning ? 'document-scanner--scanning' : ''} ${ready ? 'document-scanner--ready' : ''}`}>
      <div className="document-scanner__paper" aria-label="Miniature PDF analysee">
        <div className="document-scanner__fold" />
        <div className="document-scanner__line document-scanner__line--long" />
        <div className="document-scanner__line" />
        <div className="document-scanner__line document-scanner__line--short" />
        <div className="document-scanner__grid" />
        {scanning && <div className="document-scanner__beam" />}
      </div>
      <div className="document-scanner__meta">
        <span>{file?.name || 'Aucun PDF selectionne'}</span>
        {file && <small>{`${(file.size / 1024 / 1024).toFixed(2)} MB \u00b7 PDF`}</small>}
      </div>
      <div className="document-scanner__hash">
        <span>SHA-256</span>
        <code>{ready ? <AnimatedHash value={hash} active={true} /> : '[empreinte en attente]'}</code>
      </div>
    </div>
  );
};