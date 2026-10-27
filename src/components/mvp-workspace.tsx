"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createWebsite, type CreateWebsiteState } from "@/app/app/site-actions";
import styles from "./workspace.module.css";

export type WebsiteRecord = {
  id: string;
  name: string;
  intendedIndexability: boolean | null;
  hosts: {
    id: string;
    hostname: string;
    verificationStatus: string;
    authorizationStatus: string;
  }[];
};

type MvpWorkspaceProps = {
  organizationName: string;
  email?: string;
  websites: WebsiteRecord[];
  signOutAction: () => Promise<void>;
};

const initialState: CreateWebsiteState = {};

function verificationLabel(status: string) {
  return status === "verified" ? "Control verificado" : status === "revoked" ? "Control revocado" : "Control pendiente";
}

function authorizationLabel(status: string) {
  return status === "authorized" ? "Análisis autorizado" : status === "revoked" ? "Autorización revocada" : "Sin autorización de análisis";
}

export function MvpWorkspace({ organizationName, email, websites, signOutAction }: MvpWorkspaceProps) {
  const [state, action, pending] = useActionState(createWebsite, initialState);

  return (
    <main className="app-shell">
      <header className="app-header">
        <Link href="/" aria-label="Volver a inicio"><img className="wordmark" src="/brand/logo/logo-color.svg" alt="evalez" /></Link>
        <div className={styles.accountActions}>
          <span className="environment-badge">{organizationName}</span>
          <form action={signOutAction}><button className={styles.signOut} type="submit">Cerrar sesión</button></form>
        </div>
      </header>

      <section className="workspace-intro">
        <p className="eyebrow">Sitios web</p>
        <h1>Gestiona los hosts de tu organización</h1>
        <p>Sesión activa{email ? `: ${email}` : ""}. Cada host se registra de forma separada antes de poder verificar control o autorizar un análisis.</p>
      </section>

      <section className="workspace-card">
        <p className="section-label">Sitios registrados</p>
        {websites.length === 0 ? (
          <p className={styles.empty}>Aún no has registrado ningún sitio. Añade el primer host exacto para preparar la verificación.</p>
        ) : (
          <div className={styles.siteGrid}>
            {websites.map((website) => (
              <article className={styles.siteCard} key={website.id}>
                <h3>{website.name}</h3>
                <dl className={styles.siteMeta}>
                  <div><dt>Intención de indexación</dt><dd><strong>{website.intendedIndexability === true ? "Debe aparecer en buscadores" : website.intendedIndexability === false ? "No debe aparecer en buscadores" : "Sin definir"}</strong></dd></div>
                  {website.hosts.map((host) => (
                    <div key={host.id}>
                      <dt>Host</dt><dd><strong>{host.hostname}</strong></dd>
                      <span className={styles.status}>{verificationLabel(host.verificationStatus)}</span>{" "}
                      <span className={styles.status}>{authorizationLabel(host.authorizationStatus)}</span>
                    </div>
                  ))}
                </dl>
                <Link className={styles.detailLink} href={`/app/sites/${website.id}`}>Ver detalle del sitio →</Link>
              </article>
            ))}
          </div>
        )}

        <form className={styles.siteForm} action={action}>
          <p className="section-label">Nuevo sitio</p>
          <h2>Registra un host exacto</h2>
          <p>Por ahora solo guardamos el sitio. El control DNS y la autorización explícita se añadirán como pasos posteriores y no se simulan aquí.</p>
          <label htmlFor="hostname">Host</label>
          <input id="hostname" name="hostname" placeholder="www.tusitio.ch" autoComplete="url" required />
          <label htmlFor="intendedIndexability">Intención de indexación</label>
          <select id="intendedIndexability" name="intendedIndexability" defaultValue="unknown">
            <option value="unknown">Aún no lo sé</option>
            <option value="yes">Este sitio debe aparecer en buscadores</option>
            <option value="no">Este sitio no debe aparecer en buscadores</option>
          </select>
          {state.error && <p className={styles.error} role="alert">{state.error}</p>}
          <button className="primary-button" type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar sitio"}</button>
        </form>
      </section>
    </main>
  );
}
