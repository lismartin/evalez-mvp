"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createOrganization, type OrganizationState } from "./actions";
import styles from "../auth.module.css";

const initialState: OrganizationState = {};

export function OrganizationForm() {
  const [state, action, pending] = useActionState(createOrganization, initialState);

  return (
    <main className={styles.shell}>
      <Link href="/" aria-label="Volver a inicio"><img className="wordmark" src="/brand/logo/logo-color.svg" alt="evalez" /></Link>
      <section className={styles.card}>
        <p className="eyebrow">Configuración inicial</p>
        <h1>Crea tu organización</h1>
        <p>La organización separa de forma segura los sitios, informes y autorizaciones de cada empresa.</p>
        <form className={styles.form} action={action}>
          <label htmlFor="organizationName">Nombre de la empresa u organización</label>
          <input id="organizationName" name="organizationName" autoComplete="organization" required minLength={2} />
          {state.error && <p className={styles.error} role="alert">{state.error}</p>}
          <button className="primary-button" disabled={pending}>{pending ? "Creando…" : "Continuar"}</button>
        </form>
      </section>
    </main>
  );
}
