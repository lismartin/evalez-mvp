"use server";

import { redirect } from "next/navigation";
import { enqueueLocalFixtureJob } from "@/lib/local-fixture-queue";
import { createClient } from "@/lib/supabase/server";

export async function enqueueFixtureRun(formData: FormData) {
  if (process.env.NODE_ENV === "production") redirect("/app");

  const websiteId = String(formData.get("websiteId") ?? "");
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (!membership) redirect("/onboarding");

  const { data: website } = await supabase
    .from("websites")
    .select("id")
    .eq("id", websiteId)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();
  if (!website) redirect("/app");

  await enqueueLocalFixtureJob(website.id, membership.organization_id);
  redirect(`/app/sites/${website.id}?fixture=queued`);
}
