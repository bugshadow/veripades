import { useTheme } from '../../context/ThemeContext';

export const ThemeToggle = ({ compact = false }) => {
  const { theme, toggleTheme } = useTheme();
  const nextLabel = theme === 'dark' ? 'Passer au papier clair' : 'Passer au terminal sombre';
  return (
    <button type="button" className={`theme-seal ${compact ? 'theme-seal--compact' : ''}`} onClick={toggleTheme} aria-label={nextLabel} title={nextLabel}>
      <span className="theme-seal__mark" aria-hidden="true"><span className="theme-seal__core" /></span>
      {!compact && <span>{theme === 'dark' ? 'TERMINAL' : 'PAPIER'}</span>}
    </button>
  );
};
