import { LoaderCircle } from 'lucide-react';
import clsx from 'clsx';

export const ButtonStamp = ({ children, primary = false, className, isLoading = false, loadingLabel = 'Traitement en cours', icon: Icon, ...props }) => (
  <button className={clsx('stamp-button', primary && 'stamp-button--primary', className)} disabled={isLoading || props.disabled} {...props}>
    {isLoading ? <LoaderCircle className="spin" size={17} aria-hidden="true" /> : Icon ? <Icon size={17} aria-hidden="true" /> : null}
    <span>{isLoading ? loadingLabel : children}</span>
  </button>
);
