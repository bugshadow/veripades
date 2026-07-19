const shorten = (value = '', length = 96) => value && value.length > length ? `${value.slice(0, length)}...` : value || '-';

export const InspectorPanel = ({ report }) => {
  if (!report) return null;

  const chain = report.certificate_chain || [];
  const token = report.timestamp_token || {};
  const byteRange = report.byte_range || [];

  return (
    <section className="inspector-panel" aria-label="Mode Inspecteur">
      <div className="inspector-panel__grid">
        <div>
          <h4>ByteRange PDF</h4>
          <code>[{byteRange.join(', ')}]</code>
          <p>Deux segments signes, le CMS occupe l'espace exclu entre les plages.</p>
        </div>
        <div>
          <h4>Jeton d'horodatage</h4>
          <code>{token.present ? `${token.size_bytes} octets \u00b7 ${token.signing_time || 'heure locale TSA'}` : 'absent'}</code>
          <p>{shorten(token.raw_der_hex, 128)}</p>
        </div>
      </div>

      <h4>Chaine de certificats</h4>
      <div className="certificate-chain">
        {chain.length === 0 && <span className="certificate-chain__empty">Chaine non exposee par le rapport.</span>}
        {chain.map((cert) => (
          <div className="certificate-node" key={`${cert.role}-${cert.serial_number}`}>
            <span className="certificate-node__role">{cert.role}</span>
            <strong>{cert.common_name || cert.subject}</strong>
            <small>{cert.valid ? 'valide' : 'invalide'} {'\u00b7'} {cert.key?.family} {cert.key?.label} {'\u00b7'} {cert.days_remaining ?? '-'} jours restants</small>
          </div>
        ))}
      </div>
    </section>
  );
};