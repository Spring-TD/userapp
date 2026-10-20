export function parsePersonName(fullName: string): { first_name: string; last_name: string } {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { first_name: 'User', last_name: 'External' };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: '.' };
  }
  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(' ')
  };
}

export function buildExternalUserRef(externalUserId: string): string {
  return externalUserId.trim();
}
