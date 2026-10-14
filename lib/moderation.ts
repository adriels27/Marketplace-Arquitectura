const SECOND_STRIKE_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

type StrikeWarning = { strike_number: number | null; created_at: string };

export function getActivePublishingRestriction(warnings: StrikeWarning[], now = new Date()) {
  const secondStrike = warnings.find((warning) => warning.strike_number === 2);
  if (!secondStrike) return null;

  const expiresAt = new Date(new Date(secondStrike.created_at).getTime() + SECOND_STRIKE_COOLDOWN_MS);
  return expiresAt > now ? expiresAt : null;
}
