export function isParticipantRestricted(participant: { restrictedUntil: string | null }): boolean {
  return participant.restrictedUntil !== null && new Date(participant.restrictedUntil).getTime() > Date.now();
}
