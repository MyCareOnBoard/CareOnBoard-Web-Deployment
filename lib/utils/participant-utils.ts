/**
 * Participant Utility Functions
 * Helper functions for working with conversation participants
 */

import { Conversation, ConversationParticipant } from "@/lib/hooks/useMessaging";

/**
 * Get display name for a participant
 */
export function getParticipantDisplayName(
  participant: ConversationParticipant | null | undefined
): string {
  if (!participant) return "Unknown User";
  return participant.name || participant.uid || "Unknown User";
}

/**
 * Get role with panel context
 */
export function getParticipantRole(
  participant: ConversationParticipant | null | undefined
): string {
  if (!participant) return "User";
  return participant.role || participant.userType || "User";
}

/**
 * Check if conversation is cross-panel
 */
export function isCrossPanelConversation(conversation: Conversation | null): boolean {
  if (!conversation) return false;
  return conversation.isCrossPanel || false;
}

/**
 * Get panel badge text for a participant
 */
export function getParticipantBadgeText(
  participant: ConversationParticipant | null | undefined
): string | null {
  if (!participant) return null;

  const userType = participant.userType?.toLowerCase() || "";
  
  if (userType === "super_admin") {
    return "Super Admin";
  } else if (userType === "agency") {
    return "Agency";
  } else if (userType === "agency_staff") {
    return "Staff";
  } else if (userType === "employee") {
    return "DSP";
  }
  
  return participant.role || null;
}

/**
 * Get participant that is not the current user
 */
export function getOtherParticipant(
  conversation: Conversation | null,
  currentUserId?: string
): ConversationParticipant | null {
  if (!conversation || !currentUserId) return null;

  const participants = conversation.participantDetails || conversation.participants || [];
  return participants.find((p) => p.uid !== currentUserId) || participants[0] || null;
}

/**
 * Get all participants except current user
 */
export function getOtherParticipants(
  conversation: Conversation | null,
  currentUserId?: string
): ConversationParticipant[] {
  if (!conversation || !currentUserId) return [];

  const participants = conversation.participantDetails || conversation.participants || [];
  return participants.filter((p) => p.uid !== currentUserId);
}

/**
 * Check if participant is from a different panel than current user
 */
export function isCrossPanelParticipant(
  participant: ConversationParticipant | null,
  currentUserType?: string
): boolean {
  if (!participant || !currentUserType) return false;

  const participantType = participant.userType?.toLowerCase() || "";
  const currentType = currentUserType.toLowerCase();

  // Super admin is always cross-panel with others
  if (participantType === "super_admin" || currentType === "super_admin") {
    return participantType !== currentType;
  }

  // Agency and agency_staff are same panel
  if (
    (participantType === "agency" || participantType === "agency_staff") &&
    (currentType === "agency" || currentType === "agency_staff")
  ) {
    return false;
  }

  // Employee is user panel
  if (participantType === "employee" && currentType === "employee") {
    return false;
  }

  // Different types = cross-panel
  return participantType !== currentType;
}
