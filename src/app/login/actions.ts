"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = { error?: string; message?: string };

function credentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? "")
  };
}

export async function signIn(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { email, password } = credentials(formData);
  if (!email || !password) return { error: "Introduce tu correo y contraseña." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "No pudimos iniciar sesión. Revisa tus datos o confirma tu correo." };

  redirect("/app");
}

export async function signUp(_: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const { email, password } = credentials(formData);
  if (!email || password.length < 8) {
    return { error: "Usa un correo válido y una contraseña de al menos 8 caracteres." };
  }

  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/confirm?next=/onboarding` }
  });

  if (error) return { error: "No pudimos crear la cuenta. Inténtalo de nuevo." };
  if (!data.session) return { message: "Revisa tu correo para confirmar la cuenta antes de iniciar sesión." };

  redirect("/onboarding");
}
