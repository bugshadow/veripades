import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export const ApiFeedback = ({ error, success, info }) => {
  const value = error || success || info;
  if (!value) return null;
  const kind = error ? 'error' : success ? 'success' : 'info';
  const Icon = error ? AlertTriangle : success ? CheckCircle2 : Info;
  return <div className={`feedback feedback--${kind}`} role={error ? 'alert' : 'status'}><Icon size={17} aria-hidden="true" /><span>{value?.message || value}</span></div>;
};
