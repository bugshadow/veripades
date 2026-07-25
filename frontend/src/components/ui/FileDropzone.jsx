import { FileText, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

export const FileDropzone = ({ file, onFile, disabled = false, title = 'Déposer un document PDF', description = 'PDF uniquement, 10 Mo maximum' }) => {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const selectFile = (selected) => { if (selected) onFile(selected); };
  return (
    <div className={`file-drop ${dragging ? 'file-drop--dragging' : ''} ${file ? 'file-drop--ready' : ''}`} role="button" tabIndex={disabled ? -1 : 0} aria-disabled={disabled}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(event) => { if (!disabled && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); inputRef.current?.click(); } }}
      onDragEnter={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }} onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
      onDrop={(event) => { event.preventDefault(); setDragging(false); if (!disabled) selectFile(event.dataTransfer.files?.[0]); }}>
      <input ref={inputRef} className="sr-only" type="file" accept="application/pdf,.pdf" disabled={disabled} onChange={(event) => selectFile(event.target.files?.[0])} />
      <span className="file-drop__index">FORMULAIRE PDF-01</span>
      <span className="file-drop__icon" aria-hidden="true">{file ? <FileText size={30} /> : <Upload size={30} />}</span>
      <strong>{file ? file.name : title}</strong>
      <span>{file ? `${(file.size / 1024 / 1024).toFixed(2)} Mo · prêt pour traitement` : description}</span>
      <span className="file-drop__corners" aria-hidden="true" />
    </div>
  );
};
