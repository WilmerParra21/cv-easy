import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const CVBuilder = lazy(() => import("@/components/CVBuilder"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "cv-easy — Crea tu CV profesional gratis en PDF, sin registro" },
      { name: "description", content: "Crea, edita y descarga tu currículum profesional en PDF, gratis y sin registro. Plantillas estilo Harvard, vista previa en vivo y optimizado para móvil." },
      { name: "keywords", content: "crear cv gratis, curriculum pdf, plantilla harvard, cv online, generador curriculum, cv sin registro" },
      { name: "author", content: "Wilmer Parra Gómez" },
      { name: "theme-color", content: "#d32f2f" },
      { property: "og:title", content: "cv-easy — Tu CV profesional, gratis y en minutos" },
      { property: "og:description", content: "Editor en vivo, plantillas profesionales y descarga en PDF. 100% gratis, sin registro." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { property: "og:site_name", content: "cv-easy" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "cv-easy — Crea tu CV profesional gratis" },
      { name: "twitter:description", content: "Editor de CV en vivo con descarga en PDF. Sin registro." },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "cv-easy",
        description: "Editor de currículum profesional online, gratuito y sin registro, con exportación a PDF.",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Any",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        inLanguage: "es",
        author: { "@type": "Person", name: "Wilmer Parra Gómez", url: "https://github.com/WilmerParra21" },
      }),
    }],
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
