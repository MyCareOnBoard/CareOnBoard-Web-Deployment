import axiosClient from '../axios';

/**
 * Family portal API.
 *
 * The portal is scoped to one client by the signed-in family member's own user
 * record, so nothing here takes a clientId — the server ignores one if sent.
 */

export type FamilyPortalContact = {
  name: string;
  /** Either identifies the contact at sign-in; at least one is required. */
  primaryPhone?: string;
  email?: string;
  relationship?: string;
  /** Server-set: the family member who granted this access. */
  addedBy?: string;
  addedAt?: string;
};

export type GrantAccessRequest = {
  name: string;
  primaryPhone?: string;
  email?: string;
  relationship?: string;
};

export type GrantAccessResponse = {
  success: boolean;
  message?: string;
  data?: {
    contact: FamilyPortalContact;
    totalContacts: number;
  };
};

/**
 * Why a caller-visible reason instead of the raw status.
 *
 * The server answers 409 for two different situations — the person already has
 * access, and the client is at its contact limit — and the page needs to say
 * something different about each. Everything else collapses to the server's own
 * message, which is already written for the person reading it.
 */
export type GrantAccessFailure =
  | 'duplicate'
  | 'limit-reached'
  | 'not-permitted'
  | 'no-client'
  | 'invalid'
  | 'unknown';

export class GrantAccessError extends Error {
  readonly reason: GrantAccessFailure;

  constructor(reason: GrantAccessFailure, message: string) {
    super(message);
    this.name = 'GrantAccessError';
    this.reason = reason;
  }
}

function classify(status: number | undefined, message: string): GrantAccessFailure {
  if (status === 400) return 'invalid';
  if (status === 403) return 'not-permitted';
  if (status === 404) return 'no-client';
  if (status === 409) return /limit/i.test(message) ? 'limit-reached' : 'duplicate';
  return 'unknown';
}

export const familyPortalApi = {
  /** Grant another relative access to the portal of the client you are linked to. */
  async grantAccess(payload: GrantAccessRequest): Promise<GrantAccessResponse> {
    try {
      const res = await axiosClient.post<GrantAccessResponse>('/familyPortal/contacts', {
        name: payload.name,
        // Omitted rather than sent empty: the server requires one of the two, and
        // "" would satisfy that check while being unusable at sign-in.
        primaryPhone: payload.primaryPhone || undefined,
        email: payload.email ? payload.email.trim().toLowerCase() : undefined,
        relationship: payload.relationship || undefined,
      });
      return res.data;
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      };
      const message =
        axiosErr.response?.data?.message ?? axiosErr.message ?? 'Failed to grant access';
      throw new GrantAccessError(classify(axiosErr.response?.status, message), message);
    }
  },
};
