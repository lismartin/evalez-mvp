"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type OrganizationState = { error?: string };

export async function createOrganization(_: OrganizationState, formData: FormData): Promise<OrganizationState> {
  const name = String(formData.get("organizationName") ?? "").trim();
  if (name.length < 2) return { error: "Escribe el nombre de tu empresa u organización." };

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/login");

  const { error } = await supabase.from("organizations").insert({ name });
  if (error) return { error: "No pudimos crear la organización. Inténtalo de nuevo." };

  redirect("/app");
}
