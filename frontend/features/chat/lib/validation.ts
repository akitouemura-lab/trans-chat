export function validateRoomId(roomId: string): string | null {
  if (roomId.length === 0) return "Room ID is required.";
  if (roomId.length > 80) return "Room ID must be 80 characters or less.";
  if (!/^[a-zA-Z0-9_-]+$/.test(roomId)) {
    return "Room ID can only contain letters, numbers, hyphens, and underscores.";
  }

  return null;
}

export function validateInviteToken(inviteToken: string): string | null {
  if (inviteToken.length === 0) return "Invite token is required.";
  if (inviteToken.length > 128) {
    return "Invite token must be 128 characters or less.";
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(inviteToken)) {
    return "Invite token is invalid.";
  }

  return null;
}

export function validateUserName(userName: string): string | null {
  if (userName.length === 0) return "User name is required.";
  if (userName.length > 30) return "User name must be 30 characters or less.";

  return null;
}

export function validateMessage(text: string): string | null {
  if (text.length === 0) return "Message is required.";
  if (text.length > 1000) return "Message must be 1000 characters or less.";

  return null;
}
