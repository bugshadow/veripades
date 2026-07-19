export const ApiFeedback = ({ isLoading, error, success }) => {
  if (isLoading) {
    return (
      <div className="loading-overlay">
        <div className="terminal-loader">
          [SYSTEM] Execution de la requete cryptographique en cours...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-banner">
        <strong>[ERREUR]</strong> {error.message || error}
      </div>
    );
  }

  if (success) {
    return (
      <div className="success-banner">
        <strong>[SUCCES]</strong> {success}
      </div>
    );
  }

  return null;
};
