import clsx from 'clsx';

export const ButtonStamp = ({ children, primary = false, className, isLoading, ...props }) => {
  return (
    <button 
      className={clsx('btn-stamp', primary && 'primary', className)} 
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? 'TRAITEMENT...' : children}
    </button>
  );
};
