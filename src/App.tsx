import { Suspense, lazy } from "react";

const CVBuilder = lazy(() => import("./components/CVBuilder"));

export default function App() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Cargando cv-easy…</div>}>
      <CVBuilder />
    </Suspense>
  );
}
