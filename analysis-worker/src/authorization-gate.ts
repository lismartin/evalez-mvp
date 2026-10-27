export type AuthorizationGateInput = {
  requestedProfile: "STATIC-1";
  requestedProfileVersion: string;
  hostVerificationStatus: "pending" | "verified" | "failed" | "expired" | "revoked";
  authorization: {
    status: "pending" | "approved" | "rejected" | "revoked";
    profileId: string;
    profileVersion: string;
    approvedAt?: string;
  } | null;
};

export type AuthorizationGateResult = {
  allowed: boolean;
  reason:
    | "verification_not_valid"
    | "authorization_missing"
    | "authorization_not_approved"
    | "authorization_profile_mismatch"
    | "allowed";
};

export function canStartAuthorizedAnalysis(input: AuthorizationGateInput): AuthorizationGateResult {
  if (input.hostVerificationStatus !== "verified") {
    return { allowed: false, reason: "verification_not_valid" };
  }
  if (!input.authorization) {
    return { allowed: false, reason: "authorization_missing" };
  }
  if (input.authorization.status !== "approved" || !input.authorization.approvedAt) {
    return { allowed: false, reason: "authorization_not_approved" };
  }
  if (
    input.authorization.profileId !== input.requestedProfile ||
    input.authorization.profileVersion !== input.requestedProfileVersion
  ) {
    return { allowed: false, reason: "authorization_profile_mismatch" };
  }
  return { allowed: true, reason: "allowed" };
}
