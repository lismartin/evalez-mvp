"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CreateWebsiteState = { error?: string };

function normalizeHost(input: string) {
  const value = input.trim().toLowerCase();
  if (!value) return null;

  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password || url.port || (url.pathname !== "/" && url.pathname !== "")) return null;
    const host = url.hostname.replace(/\.$/, "");
    if (!host || host === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;
    return host;
  } catch {
    return null;
  }
}

export async function createWebsite(_: CreateWebsiteState, formData: FormData): Promise<CreateWebsiteState> {
  const hostname = normalizeHost(String(formData.get("hostname") ?? ""));
  const indexability = String(formData.get("intendedIndexability") ?? "unknown");
  const intendedIndexability = indexability === "yes" ? true : indexability === "no" ? false : null;

  if (!hostname) {
    return { error: "Introduce un host exacto, por ejemplo www.tusitio.ch. No añadas rutas, puertos ni direcciones IP." };
  }

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

  const { data: website, error: websiteError } = await supabase
    .from("websites")
    .insert({
      organization_id: membership.organization_id,
      name: hostname,
      intended_indexability: intendedIndexability
    })
    .select("id")
    .single();

  if (websiteError || !website) {
    return { error: "No pudimos guardar el sitio. Inténtalo de nuevo." };
  }

  const { data: host, error: hostError } = await supabase.from("website_hosts").insert({
    website_id: website.id,
    hostname
  }).select("id").single();

  if (hostError) {
    return { error: "El sitio se creó, pero no pudimos registrar el host. Revisa la base de datos antes de volver a intentarlo." };
  }

  const { error: auditError } = await supabase.from("audit_events").insert({
    organization_id: membership.organization_id,
    actor_id: userId,
    event_type: "host_registered",
    subject_type: "website_host",
    subject_id: host.id,
    details: {
      website_id: website.id,
      hostname,
      intended_indexability: intendedIndexability
    }
  });

  if (auditError) {
    return { error: "El host se guardó, pero no se pudo registrar el evento. Aplica la migración de auditoría y recarga la página." };
  }

  redirect("/app");
}
