"use client";

import { useMemo, useState } from "react";
import { buildReportNarrative, type ReportFinding } from "@/lib/report-assistant";
import styles from "./workspace.module.css";

export type ViewerFinding = ReportFinding & {
  id: string;
  state: string;
  evidence?: { type: string; payload: unknown };
};

function areaFor(ruleId: string) {
  if (ruleId.startsWith("TLS")) return { label: "Seguridad", symbol: "✦" };
  if (ruleId.startsWith("LINK")) return { label: "Enlaces y redirecciones", symbol: "↗" };
  return { label: "Fundamentos SEO", symbol: "⌕" };
}

export function ReportViewer({ findings, status, coverage }: { findings: ViewerFinding[]; status: string; coverage: { evaluated?: number; blocked?: number; notApplicable?: number } }) {
  const [selectedId, setSelectedId] = useState(findings[0]?.id ?? "");
  const selected = findings.find((finding) => finding.id === selectedId);
  const narrative = useMemo(() => buildReportNarrative({ status, findings: selected ? [selected] : [], coverage }), [coverage, selected, status]);

  if (!findings.length) return <section className={styles.emptyReport}><h2>Esta ejecución no registró hallazgos.</h2><p>Consulta la cobertura para entender qué reglas se evaluaron y cuáles quedaron fuera de alcance.</p></section>;

  return <div className={styles.reportBody}>
    <div className={styles.reportList} role="tablist" aria-label="Hallazgos del informe" aria-orientation="vertical">
      {findings.map((finding) => {
        const area = areaFor(finding.ruleId);
        const active = finding.id === selectedId;
        return <button className={`${styles.reportFinding}${active ? ` ${styles.reportFindingActive}` : ""}`} type="button" role="tab" aria-selected={active} key={finding.id} onClick={() => setSelectedId(finding.id)}>
          <span className={styles.findingSymbol}>{area.symbol}</span>
          <span><b>{finding.title}</b><small>{area.label} · {finding.ruleId}</small></span>
          <span className={styles.findingArrow}>→</span>
        </button>;
      })}
    </div>

    {selected && <section className={styles.reportInspector} role="tabpanel">
      <p className={styles.inspectorLabel}>{areaFor(selected.ruleId).label} · {selected.priority}</p>
      <h2>{selected.title}</h2>
      <p className={styles.inspectorCopy}>{narrative.summary}</p>
      <div className={styles.assistedExplanation}><strong>Explicación asistida</strong><p>{narrative.nextSteps[0]}</p><small>Generada solo desde este hallazgo y su regla técnica. No crea resultados nuevos.</small></div>
      {selected.evidence && <details className={styles.evidenceToggle}><summary>Ver evidencia</summary><dl><dt>Tipo de evidencia</dt><dd>{selected.evidence.type}</dd><dt>Observación</dt><dd><pre>{JSON.stringify(selected.evidence.payload, null, 2)}</pre></dd></dl></details>}
      <div className={styles.resultNote}>{selected.ruleId} · Resultado técnico confirmado</div>
    </section>}
  </div>;
}
