import { redirect } from "next/navigation";
import { MvpWorkspace } from "@/components/mvp-workspace";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function AppPage() {
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

  const { data: organization } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", membership.organization_id)
    .single();

  const { data: websiteRows } = await supabase
    .from("websites")
    .select("id, name, intended_indexability, website_hosts (id, hostname, verification_status, authorization_status)")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false });

  const websites = (websiteRows ?? []).map((website) => ({
    id: website.id,
    name: website.name,
    intendedIndexability: website.intended_indexability,
    hosts: (website.website_hosts ?? []).map((host) => ({
      id: host.id,
      hostname: host.hostname,
      verificationStatus: host.verification_status,
      authorizationStatus: host.authorization_status
    }))
  }));

  return (
    <MvpWorkspace
      organizationName={organization?.name ?? "Tu organización"}
      email={typeof claimsData?.claims.email === "string" ? claimsData.claims.email : undefined}
      websites={websites}
      signOutAction={signOut}
    />
  );
}
