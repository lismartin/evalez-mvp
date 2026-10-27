export type DnsTxtResolver = {
  lookupTxt(recordName: string): Promise<string[][]>;
};

export type DnsChallenge = {
  recordName: string;
  tokenValue: string;
  status: "pending" | "verified" | "failed" | "expired" | "revoked";
  expiresAt: string;
};

export type DnsVerificationResult = {
  status: "verified" | "pending" | "expired" | "unchanged";
  checkedAt?: string;
  reason: "token_found" | "token_not_found" | "challenge_expired" | "challenge_not_pending" | "resolver_unavailable";
  evidence: { recordName: string; answerCount: number };
};

export async function verifyDnsTxtChallenge(
  challenge: DnsChallenge,
  resolver: DnsTxtResolver,
  now = new Date()
): Promise<DnsVerificationResult> {
  if (challenge.status !== "pending") {
    return {
      status: "unchanged",
      reason: "challenge_not_pending",
      evidence: { recordName: challenge.recordName, answerCount: 0 }
    };
  }

  if (new Date(challenge.expiresAt) <= now) {
    return {
      status: "expired",
      checkedAt: now.toISOString(),
      reason: "challenge_expired",
      evidence: { recordName: challenge.recordName, answerCount: 0 }
    };
  }

  try {
    const answers = await resolver.lookupTxt(challenge.recordName);
    const values = answers.map((parts) => parts.join(""));
    const tokenFound = values.includes(challenge.tokenValue);
    return {
      status: tokenFound ? "verified" : "pending",
      checkedAt: now.toISOString(),
      reason: tokenFound ? "token_found" : "token_not_found",
      evidence: { recordName: challenge.recordName, answerCount: values.length }
    };
  } catch {
    // Un fallo temporal de DNS no confirma ni rechaza el control del host.
    return {
      status: "pending",
      checkedAt: now.toISOString(),
      reason: "resolver_unavailable",
      evidence: { recordName: challenge.recordName, answerCount: 0 }
    };
  }
}
