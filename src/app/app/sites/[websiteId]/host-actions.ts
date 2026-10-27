"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function ownerContext(websiteId: string, hostId: string) {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", userId)
    .maybeSingle();
  if (!membership || membership.role !== "owner") redirect(`/app/sites/${websiteId}`);

  const { data: host } = await supabase
    .from("website_hosts")
    .select("id, hostname")
    .eq("id", hostId)
    .eq("website_id", websiteId)
    .maybeSingle();
  if (!host) redirect(`/app/sites/${websiteId}`);

  return { supabase, userId, organizationId: membership.organization_id, host };
}

export async function requestDnsChallenge(formData: FormData) {
  const websiteId = String(formData.get("websiteId") ?? "");
  const hostId = String(formData.get("hostId") ?? "");
  const context = await ownerContext(websiteId, hostId);
  const tokenValue = `evalez-verification=${crypto.randomUUID()}`;
  const recordName = `_evalez-verification.${context.host.hostname}`;
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await context.supabase.from("host_verification_challenges").insert({
    organization_id: context.organizationId,
    website_host_id: context.host.id,
    method: "dns_txt",
    record_name: recordName,
    token_value: tokenValue,
    requested_by: context.userId,
    expires_at: expiresAt
  });

  if (!error) {
    await context.supabase.from("audit_events").insert({
      organization_id: context.organizationId,
      actor_id: context.userId,
      event_type: "dns_verification_requested",
      subject_type: "website_host",
      subject_id: context.host.id,
      details: { website_id: websiteId, hostname: context.host.hostname, method: "dns_txt" }
    });
  }
  redirect(`/app/sites/${websiteId}?verification=${error ? "error" : "requested"}`);
}

export async function requestStatic1Authorization(formData: FormData) {
  const websiteId = String(formData.get("websiteId") ?? "");
  const hostId = String(formData.get("hostId") ?? "");
  const context = await ownerContext(websiteId, hostId);

  const { error } = await context.supabase.from("analysis_authorization_requests").insert({
    organization_id: context.organizationId,
    website_host_id: context.host.id,
    profile_id: "STATIC-1",
    profile_version: "1",
    requested_by: context.userId,
    authorization_text_version: "MVP-1"
  });

  if (!error) {
    await context.supabase.from("audit_events").insert({
      organization_id: context.organizationId,
      actor_id: context.userId,
      event_type: "analysis_authorization_requested",
      subject_type: "website_host",
      subject_id: context.host.id,
      details: { website_id: websiteId, hostname: context.host.hostname, profile: "STATIC-1", profile_version: "1" }
    });
  }
  redirect(`/app/sites/${websiteId}?authorization=${error ? "error" : "requested"}`);
}

export async function scheduleStatic1Run(formData: FormData) {
  const websiteId = String(formData.get("websiteId") ?? "");
  const hostId = String(formData.get("hostId") ?? "");
  const context = await ownerContext(websiteId, hostId);

  const { error } = await context.supabase.rpc("schedule_authorized_static1_run", {
    p_website_id: websiteId,
    p_website_host_id: hostId
  });

  redirect(`/app/sites/${websiteId}?run=${error ? "error" : "scheduled"}`);
}
