import { readWorkerDatabaseConfig } from "./scheduled-run-reservation.ts";

const valid = readWorkerDatabaseConfig({ SUPABASE_URL: "https://project.supabase.co", SUPABASE_SECRET_KEY: "server-secret" });

let missingVariablesAreRejected = false;
try {
  readWorkerDatabaseConfig({ SUPABASE_URL: "https://project.supabase.co" });
} catch {
  missingVariablesAreRejected = true;
}

if (!valid.supabaseUrl || !missingVariablesAreRejected) {
  throw new Error("Falló la validación de la configuración privada del worker.");
}

console.log("Correctas: configuración privada requerida para reservar ejecuciones.");
