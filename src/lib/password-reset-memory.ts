let activeResetToken: string | null = null;

export function setActiveResetToken(token: string) {
  activeResetToken = token;
}

export function getActiveResetToken() {
  return activeResetToken;
}

export function consumeActiveResetToken() {
  const token = activeResetToken;
  activeResetToken = null;
  return token;
}

export function clearActiveResetToken() {
  activeResetToken = null;
}
