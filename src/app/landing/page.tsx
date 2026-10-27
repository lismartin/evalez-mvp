import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="landing-frame">
      <iframe title="Landing evalez V3" src="/landing-v3/index.html" />
      <Link className="mvp-launcher" href="/app">
        Abrir MVP local <span aria-hidden="true">→</span>
      </Link>
    </main>
  );
}
