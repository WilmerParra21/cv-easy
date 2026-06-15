import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const CVBuilder = lazy(() => import("@/components/CVBuilder"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "cv-easy — Crea tu CV profesional gratis en minutos" },
      { name: "description", content: "Crea, edita y descarga tu currículum profesional en PDF sin registrarte. Gratis, ligero y funciona en cualquier teléfono." },
      { property: "og:title", content: "cv-easy — Tu CV profesional, gratis y en minutos" },
      { property: "og:description", content: "Crea, edita y descarga tu currículum en PDF sin registrarte." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Cargando cv-easy…</div>}>
      <CVBuilder />
    </Suspense>
  );
}
