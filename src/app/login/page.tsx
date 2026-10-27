"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp, type AuthFormState } from "./actions";
import styles from "../auth.module.css";

const initialState: AuthFormState = {};

export default function LoginPage() {
  const [signInState, signInAction, signInPending] = useActionState(signIn, initialState);
  const [signUpState, signUpAction, signUpPending] = useActionState(signUp, initialState);
  const error = signInState.error ?? signUpState.error;
  const message = signInState.message ?? signUpState.message;

  return (
    <main className={styles.shell}>
      <Link href="/" aria-label="Volver a inicio"><img className="wordmark" src="/brand/logo/logo-color.svg" alt="evalez" /></Link>
      <section className={styles.card}>
        <p className="eyebrow">Área privada</p>
        <h1>Accede a tus informes</h1>
        <p>Usa tu correo para crear una cuenta o iniciar sesión. Las verificaciones y análisis reales se activarán en fases posteriores.</p>
        <form className={styles.form}>
          <label htmlFor="email">Correo electrónico</label>
          <input id="email" name="email" type="email" autoComplete="email" required />
          <label htmlFor="password">Contraseña</label>
          <input id="password" name="password" type="password" minLength={8} autoComplete="current-password" required />
          {error && <p className={styles.error} role="alert">{error}</p>}
          {message && <p className={styles.success} role="status">{message}</p>}
          <div className={styles.actions}>
            <button className="primary-button" formAction={signInAction} disabled={signInPending || signUpPending}>
              {signInPending ? "Accediendo…" : "Iniciar sesión"}
            </button>
            <button className="secondary-button" formAction={signUpAction} disabled={signInPending || signUpPending}>
              {signUpPending ? "Creando cuenta…" : "Crear cuenta"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
