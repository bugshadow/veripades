import { SiteFooter } from './SiteFooter';
import { SiteHeader } from './SiteHeader';

export const PublicLayout = ({ children, className = '' }) => (
  <div className={`public-shell ${className}`}>
    <a className="skip-link" href="#main-content">Aller au contenu</a>
    <SiteHeader />
    <main id="main-content">{children}</main>
    <SiteFooter />
  </div>
);
