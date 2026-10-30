import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listLocalFixtureJobs } from "@/lib/local-fixture-queue";
import styles from "@/components/workspace.module.css";
import { enqueueFixtureRun, seedLocalDemoReport } from "./fixture-actions";
import { requestDnsChallenge, requestStatic1Authorization, scheduleStatic1Run } from "./host-actions";

type PageProps = { params: Promise<{ websiteId: string }>; searchParams: Promise<{ fixture?: string; verification?: string; authorization?: string; run?: string; demo?: string; demoStage?: string }> };

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function eventLabel(eventType: string) {
  if (eventType === "host_registered") return "Host registrado";
  return eventType;
}

export default async function WebsiteDetailPage({ params, searchParams }: PageProps) {
  const { websiteId } = await params;
  const { fixture, verification, authorization, run, demo, demoStage } = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", userId)
    .maybeSingle();
  if (!membership) redirect("/onboarding");

  const { data: website } = await supabase
    .from("websites")
    .select("id, name, intended_indexability, created_at, website_hosts (id, hostname, verification_status, authorization_status, verification_method, verification_checked_at, authorization_profile, authorization_granted_at)")
    .eq("id", websiteId)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  if (!website) notFound();

  const { data: events } = await supabase
    .from("audit_events")
    .select("id, event_type, details, created_at")
    .eq("organization_id", membership.organization_id)
    .contains("details", { website_id: website.id })
    .order("created_at", { ascending: false });

  const { data: analysisRuns } = await supabase
    .from("analysis_runs")
    .select("id, profile_id, status, created_at")
    .eq("website_id", website.id)
    .order("created_at", { ascending: false });

  const hostIds = (website.website_hosts ?? []).map((host) => host.id);
  const { data: challenges } = await supabase
    .from("host_verification_challenges")
    .select("website_host_id, record_name, token_value, status, method, requested_at, expires_at")
    .in("website_host_id", hostIds)
    .order("requested_at", { ascending: false });
  const { data: authorizationRequests } = await supabase
    .from("analysis_authorization_requests")
    .select("website_host_id, profile_id, profile_version, status, requested_at")
    .in("website_host_id", hostIds)
    .order("requested_at", { ascending: false });

  const fixtureJobs = process.env.NODE_ENV === "production" ? [] : await listLocalFixtureJobs(website.id);

  return (
    <main className={styles.detailShell}>
      <Link className="text-link" href="/app">← Volver a sitios</Link>
      <header className={styles.detailHeader}>
        <div>
          <p className="eyebrow">Detalle del sitio</p>
          <h1>{website.name}</h1>
        </div>
      </header>

      <section className={styles.detailGrid}>
        <article className={styles.detailPanel}>
          <p className="section-label">Contexto</p>
          <h2>Configuración registrada</h2>
          <p><strong>Intención de indexación:</strong> {website.intended_indexability === true ? "Debe aparecer en buscadores" : website.intended_indexability === false ? "No debe aparecer en buscadores" : "Sin definir"}</p>
          <p><strong>Registro:</strong> {dateLabel(website.created_at)}</p>
        </article>

        <article className={styles.detailPanel}>
          <p className="section-label">Análisis</p>
          <h2>Estado actual</h2>
          <p>No hay ningún análisis ejecutado. Este sitio no puede iniciar comprobaciones externas hasta completar control y autorización válidos.</p>
        </article>
      </section>

      <section className={styles.detailPanel} style={{ marginTop: 16 }}>
        <p className="section-label">Hosts exactos</p>
        <h2>Control y autorización</h2>
        {(website.website_hosts ?? []).map((host) => (
          <HostControls
            key={host.id}
            websiteId={website.id}
            host={host}
            challenge={challenges?.find((item) => item.website_host_id === host.id)}
            authorizationRequest={authorizationRequests?.find((item) => item.website_host_id === host.id)}
            isOwner={membership.role === "owner"}
            verificationFeedback={verification}
            authorizationFeedback={authorization}
            runFeedback={run}
          />
        ))}
      </section>

      {process.env.NODE_ENV !== "production" && (
        <section className={styles.detailPanel} style={{ marginTop: 16 }}>
          <p className="section-label">Solo desarrollo local</p>
          <h2>Cola de fixtures</h2>
          <p>Esta cola no contacta el host registrado ni crea un informe para clientes. Solo envía datos controlados al worker local para comprobar la conexión entre componentes.</p>
          <Link className={styles.reportLink} href="/app/report-preview">Ver visualización de informe de prueba</Link>
          <form action={seedLocalDemoReport}><input type="hidden" name="websiteId" value={website.id} /><button className="secondary-button" type="submit">Crear informe demo en Supabase</button></form>
          {demo === "created" && <p className={styles.status}>Informe demo creado. Ábrelo desde el historial de análisis.</p>}
          {demo === "missing-secret" && <p className={styles.error}>Falta configurar la clave de servidor para guardar el informe demo.</p>}
          {demo === "no-host" && <p className={styles.error}>Registra primero un host para asociar el informe demo.</p>}
          {demo === "forbidden" && <p className={styles.error}>Solo el propietario de la organización puede crear datos demo.</p>}
          {demo === "error" && <p className={styles.error}>No se pudo guardar el informe demo en la etapa: {demoStage ?? "desconocida"}. Revisa la terminal donde ejecutas pnpm dev.</p>}
          {fixture === "queued" && <p className={styles.status}>Fixture encolado. Ejecuta el worker desde otra terminal.</p>}
          <form action={enqueueFixtureRun}><input type="hidden" name="websiteId" value={website.id} /><button className="primary-button" type="submit">Encolar fixture local</button></form>
          {!fixtureJobs.length ? <p>Aún no hay fixtures locales para este sitio.</p> : <ul className={styles.eventList}>{fixtureJobs.map((job) => <li key={job.id}><strong>{job.status === "queued" ? "En cola" : job.status === "running" ? "En ejecución" : "Completado"}</strong><time>{dateLabel(job.createdAt)}</time>{job.result && <p>{job.result.passed} correctas · {job.result.findings} hallazgos · {job.result.blocked} bloqueadas</p>}</li>)}</ul>}
        </section>
      )}

      <section className={styles.detailPanel} style={{ marginTop: 16 }}>
        <p className="section-label">Historial de análisis</p>
        <h2>Ejecuciones</h2>
        {!analysisRuns?.length ? (
          <p>Aún no hay ejecuciones. Un worker aislado creará las ejecuciones únicamente después de que este host tenga control y autorización válidos.</p>
        ) : (
          <ul className={styles.eventList}>
            {analysisRuns.map((run) => <li key={run.id}><Link className={styles.reportLink} href={`/app/sites/${website.id}/reports/${run.id}`}>{run.profile_id} · {run.status}</Link><time>{dateLabel(run.created_at)}</time></li>)}
          </ul>
        )}
      </section>

      <section className={styles.detailPanel} style={{ marginTop: 16 }}>
        <p className="section-label">Historial</p>
        <h2>Eventos registrados</h2>
        {!events?.length ? (
          <p>Aún no hay eventos para este sitio. Los nuevos registros de host aparecerán aquí tras aplicar la migración de auditoría.</p>
        ) : (
          <ul className={styles.eventList}>
            {events.map((event) => <li key={event.id}><strong>{eventLabel(event.event_type)}</strong><time>{dateLabel(event.created_at)}</time></li>)}
          </ul>
        )}
      </section>
    </main>
  );
}

function HostControls({
  websiteId,
  host,
  challenge,
  authorizationRequest,
  isOwner,
  verificationFeedback,
  authorizationFeedback,
  runFeedback
}: {
  websiteId: string;
  host: { id: string; hostname: string; verification_status: string; authorization_status: string; verification_method: string | null; authorization_profile: string | null };
  challenge?: { record_name: string; token_value: string; status: string; method: string; requested_at: string; expires_at: string };
  authorizationRequest?: { profile_id: string; profile_version: string; status: string; requested_at: string };
  isOwner: boolean;
  verificationFeedback?: string;
  authorizationFeedback?: string;
  runFeedback?: string;
}) {
  const canSchedule =
    isOwner &&
    host.verification_status === "verified" &&
    host.authorization_status === "authorized" &&
    host.authorization_profile === "STATIC-1" &&
    authorizationRequest?.status === "approved";

  return (
    <div className={styles.eventList}>
      <strong>{host.hostname}</strong>
      <p>Control DNS: {host.verification_status === "verified" ? "verificado" : "pendiente"}. Método: {host.verification_method ?? "sin iniciar"}.</p>
      {challenge?.status === "pending" ? <><p>Crea este registro DNS: <strong>{challenge.record_name}</strong></p><code>{challenge.token_value}</code><p>El desafío vence el {dateLabel(challenge.expires_at)}. Aún no se ha realizado una comprobación DNS.</p></> : isOwner ? <form action={requestDnsChallenge}><input type="hidden" name="websiteId" value={websiteId} /><input type="hidden" name="hostId" value={host.id} /><button className="secondary-button" type="submit">Preparar desafío DNS</button></form> : <p>Solo el propietario de la organización puede solicitar la verificación.</p>}
      {verificationFeedback === "error" && <p>El desafío no pudo guardarse. Comprueba que aplicaste la migración correspondiente.</p>}
      <p>Autorización de análisis: {host.authorization_status === "authorized" ? "autorizada" : "pendiente"}. Perfil: {host.authorization_profile ?? "sin asignar"}.</p>
      {authorizationRequest?.status === "pending" ? <p>Solicitud pendiente para {authorizationRequest.profile_id} v{authorizationRequest.profile_version}. Esto no autoriza todavía ningún análisis.</p> : isOwner ? <form action={requestStatic1Authorization}><input type="hidden" name="websiteId" value={websiteId} /><input type="hidden" name="hostId" value={host.id} /><button className="secondary-button" type="submit">Solicitar autorización STATIC-1</button></form> : <p>Solo el propietario de la organización puede solicitar autorización.</p>}
      {authorizationFeedback === "error" && <p>La solicitud no pudo guardarse. Comprueba que aplicaste la migración correspondiente.</p>}
      {canSchedule ? <form action={scheduleStatic1Run}><input type="hidden" name="websiteId" value={websiteId} /><input type="hidden" name="hostId" value={host.id} /><button className="primary-button" type="submit">Programar análisis STATIC-1</button></form> : <p>El análisis solo podrá programarse cuando este host tenga control DNS y autorización STATIC-1 aprobados.</p>}
      {runFeedback === "scheduled" && <p className={styles.status}>Ejecución programada. Aún no se iniciará tráfico: falta conectar el consumidor de la cola del worker.</p>}
      {runFeedback === "error" && <p>La ejecución no pudo programarse. Comprueba que la verificación, autorización y migración estén vigentes.</p>}
    </div>
  );
}
