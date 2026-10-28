import { NextResponse } from "next/server";
import { buildGeminiReportPrompt, parseGeminiReportExplanation } from "@/lib/gemini-report";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Gemini Free está desactivado en producción." }, { status: 403 });
  }
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "AI_API_KEY no está configurada en el servidor." }, { status: 503 });

  const body = await request.json().catch(() => null) as { analysisRunId?: string; findingId?: string; previewId?: "preview-seo" | "preview-link" } | null;

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });

  const { data: membership } = await supabase.from("organization_members").select("organization_id").eq("user_id", userId).maybeSingle();
  if (!membership) return NextResponse.json({ error: "Organización no encontrada." }, { status: 403 });

  const previewFindings = {
    "preview-seo": { ruleId: "SEO-001", title: "La página de servicios está bloqueada para buscadores.", priority: "medium", evidence: [{ page_path: "/servicios", declared_indexable: true, effective_noindex: true }] },
    "preview-link": { ruleId: "LINK-001", title: "El enlace de contacto no lleva a una página válida.", priority: "medium", evidence: [{ source_path: "/", target_path: "/contacto-anterior", target_status: 404 }] }
  } as const;

  let reportInput: { ruleId: string; title: string; priority: string; evidence: unknown };
  if (body?.previewId && previewFindings[body.previewId]) {
    reportInput = previewFindings[body.previewId];
  } else {
    if (!body?.analysisRunId || !body.findingId) return NextResponse.json({ error: "Solicitud incompleta." }, { status: 400 });
    const { data: finding } = await supabase
      .from("findings")
      .select("id, rule_id, title, priority, analysis_runs!inner (id, organization_id), evidence (payload)")
      .eq("id", body.findingId)
      .eq("analysis_run_id", body.analysisRunId)
      .eq("analysis_runs.organization_id", membership.organization_id)
      .maybeSingle();
    if (!finding) return NextResponse.json({ error: "Hallazgo no disponible." }, { status: 404 });
    reportInput = { ruleId: finding.rule_id, title: finding.title, priority: finding.priority, evidence: Array.isArray(finding.evidence) ? finding.evidence.map((item) => item.payload) : [] };
  }

  const model = process.env.AI_MODEL || "gemini-3.5-flash-lite";
  const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: buildGeminiReportPrompt(reportInput) }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2, maxOutputTokens: 350 }
    })
  });
  if (!geminiResponse.ok) {
    const errorPayload = await geminiResponse.json().catch(() => null) as { error?: { message?: string; status?: string } } | null;
    const detail = errorPayload?.error?.message || errorPayload?.error?.status || "Sin detalle disponible.";
    return NextResponse.json({ error: `Gemini respondió ${geminiResponse.status}: ${detail}` }, { status: 502 });
  }

  const payload = await geminiResponse.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return NextResponse.json({ error: "Gemini no devolvió contenido utilizable." }, { status: 502 });

  try {
    return NextResponse.json({ explanation: parseGeminiReportExplanation(text), mode: "gemini-development" });
  } catch {
    return NextResponse.json({ error: "Gemini devolvió una respuesta inválida." }, { status: 502 });
  }
}
