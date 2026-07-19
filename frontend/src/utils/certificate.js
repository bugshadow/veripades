export const certificateStrengthLabel = (report) => {
  const certificate = report?.certificate || report?.certificate_chain?.find((item) => item.role === 'Utilisateur') || report?.certificate_chain?.[0];
  const key = report?.signature_algorithm || certificate?.key;
  const family = key?.family || 'ECDSA';
  const label = key?.label || 'P-256';
  const days = certificate?.days_remaining ?? '-';
  const filled = Math.min(8, Math.max(1, Math.round(((key?.bits || 256) / 256) * 8)));
  const gauge = `${'\u2588'.repeat(filled)}${'\u2591'.repeat(10 - filled)}`;
  return `[${gauge}] ${family} ${label} \u00b7 ${days} jours restants`;
};

export const randomSealRotation = () => -(6 + Math.random() * 5).toFixed(2);

