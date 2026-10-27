import { createClient } from "@supabase/supabase-js";

export type ReservedStatic1Run = {
  id: string;
  organization_id: string;
  website_id: string;
  website_host_id: string;
  profile_id: "STATIC-1";
  profile_version: "1";
  requested_by: string | null;
  scheduled_at: string;
};

export type WorkerDatabaseConfig = {
  supabaseUrl: string;
  supabaseSecretKey: string;
};

export function readWorkerDatabaseConfig(environment: Readonly<Record<string, string | undefined>>): WorkerDatabaseConfig {
  const supabaseUrl = environment.SUPABASE_URL;
  const supabaseSecretKey = environment.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error("El worker requiere SUPABASE_URL y SUPABASE_SECRET_KEY.");
  }

  return { supabaseUrl, supabaseSecretKey };
}

export async function reserveNextStatic1Run(config: WorkerDatabaseConfig): Promise<ReservedStatic1Run | null> {
  const supabase = createClient(config.supabaseUrl, config.supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  const { data, error } = await supabase.rpc("reserve_next_static1_run");

  if (error) throw new Error(`No se pudo reservar la ejecución: ${error.message}`);
  if (!data?.length) return null;

  const run = data[0] as ReservedStatic1Run;
  if (run.profile_id !== "STATIC-1" || run.profile_version !== "1") {
    throw new Error("El worker recibió un perfil distinto de STATIC-1 v1.");
  }
  return run;
}
