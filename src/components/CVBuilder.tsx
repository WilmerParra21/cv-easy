import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIsMobile } from "../hooks/use-mobile";

type SkillGroup = { categoria: string; items: string };
type CVData = {
  config: { plantilla: "harvard" | "modern" | "compact"; fuente: string; mostrar_foto: boolean };
  datos_personales: { nombre: string; puesto: string; correo: string; telefono: string; ubicacion: string; linkedin: string; foto_base64: string };
  perfil: string;
  experiencia: Array<{ empresa: string; rol: string; periodo: string; descripcion: string; logros: string }>;
  educacion: Array<{ institucion: string; grado: string; periodo: string }>;
  certificaciones: Array<{ nombre: string; institucion: string; fecha: string }>;
  habilidades: SkillGroup[];
};

const STORAGE_KEY = "cv-easy:data:v3";
const THEME_KEY = "cv-easy:theme";
const WELCOME_KEY = "cv-easy:welcome-dismissed:v2";

const SAMPLE_DATA: CVData = {
  config: { plantilla: "harvard", fuente: "Times New Roman", mostrar_foto: false },
  datos_personales: {
    nombre: "Ana Rodríguez Martínez",
    puesto: "Licenciada en Administración de Empresas",
    correo: "ana.rodriguez@ejemplo.com",
    telefono: "+34 612 345 678",
    ubicacion: "Madrid, España",
    linkedin: "ana-rodriguez-martinez",
    foto_base64: "",
  },
  perfil:
    "Licenciada en Administración de Empresas con más de 6 años de experiencia en gestión administrativa, control financiero y coordinación de equipos. Especialista en optimización de procesos internos, planificación presupuestaria y atención a proveedores y clientes corporativos. Combina visión estratégica con un enfoque práctico orientado a resultados, garantizando el cumplimiento de objetivos, la mejora continua y la eficiencia operativa en entornos dinámicos y multidisciplinares.",
  experiencia: [
    {
      empresa: "Grupo Mercantil Ibérico, S.A. – Madrid, España",
      rol: "Administradora General",
      periodo: "Abril 2022 – Presente",
      descripcion: "Gestión administrativa, financiera y operativa de la oficina central.",
      logros:
        "Reorganicé el área administrativa reduciendo los tiempos de facturación en un 30%.\nImplementé un sistema de control de gastos que generó un ahorro anual del 18% en costes operativos.\nCoordiné un equipo de 8 personas entre administración, contabilidad y atención al cliente.\nNegocié contratos con 25 proveedores estratégicos mejorando las condiciones de pago.",
    },
    {
      empresa: "Distribuciones Castilla, S.L. – Valladolid, España",
      rol: "Asistente Administrativa Senior",
      periodo: "Febrero 2019 – Marzo 2022",
      descripcion: "Soporte administrativo, contable y comercial a la dirección.",
      logros:
        "Gestioné la facturación mensual de más de 400 clientes con cero incidencias contables.\nElaboré informes financieros y de tesorería para la toma de decisiones de la gerencia.\nDigitalicé el archivo documental de la empresa, agilizando consultas internas en un 60%.",
    },
  ],
  educacion: [
    {
      institucion: "Universidad Complutense de Madrid",
      grado: "Licenciatura en Administración y Dirección de Empresas",
      periodo: "Septiembre 2013 – Junio 2018",
    },
  ],
  certificaciones: [
    { nombre: "Gestión Financiera para No Financieros", institucion: "ESIC Business School", fecha: "Octubre 2024" },
    { nombre: "Excel Avanzado para Administración", institucion: "Cámara de Comercio de Madrid", fecha: "Marzo 2023" },
    { nombre: "Atención al Cliente y Negociación", institucion: "CEPADE", fecha: "Junio 2022" },
  ],
  habilidades: [
    { categoria: "Gestión Administrativa", items: "Facturación, control de gastos, tesorería, archivo documental, gestión de proveedores" },
    { categoria: "Contabilidad y Finanzas", items: "Contabilidad básica, conciliaciones bancarias, presupuestos, informes financieros" },
    { categoria: "Herramientas Ofimáticas", items: "Microsoft Office (Excel avanzado, Word, PowerPoint), Google Workspace, SAP, Sage" },
    { categoria: "Habilidades Blandas", items: "Liderazgo de equipos, comunicación efectiva, organización, resolución de problemas, atención al detalle" },
    { categoria: "Idiomas", items: "Español (nativo), Inglés (B2 – First Certificate)" },
  ],
};

const EMPTY_DATA: CVData = {
  config: { plantilla: "harvard", fuente: "Times New Roman", mostrar_foto: false },
  datos_personales: { nombre: "", puesto: "", correo: "", telefono: "", ubicacion: "", linkedin: "", foto_base64: "" },
  perfil: "",
  experiencia: [{ empresa: "", rol: "", periodo: "", descripcion: "", logros: "" }],
  educacion: [{ institucion: "", grado: "", periodo: "" }],
  certificaciones: [],
  habilidades: [],
};

const FONTS = [
  { label: "Times New Roman (Serif)", value: "Times New Roman" },
  { label: "Georgia (Serif)", value: "Georgia" },
  { label: "Arial (Sans-Serif)", value: "Arial" },
  { label: "Helvetica (Sans-Serif)", value: "Helvetica" },
  { label: "Inter (Sans-Serif)", value: "Inter" },
  { label: "Calibri (Corporativa)", value: "Calibri" },
  { label: "Cambria (Corporativa)", value: "Cambria" },
];

function useDebounced<T>(value: T, delay = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function Help({ text }: { text: string }) {
  return (
    <span className="tooltip-trigger ml-1 align-middle">
      <button type="button" aria-label="Ayuda" className="w-4 h-4 rounded-full bg-muted text-muted-foreground text-[10px] leading-4 inline-flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition">?</button>
      <span className="tt">{text}</span>
    </span>
  );
}

function Field(props: { label: string; help: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block mb-3">
      <span className="text-xs font-medium block mb-1">
        {props.label}
        {props.required && <span className="text-primary ml-1">*</span>}
        <Help text={props.help} />
      </span>
      {props.children}
    </label>
  );
}

const inputCls = "w-full px-4 py-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg mb-3 bg-card">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex justify-between items-center px-4 py-3 text-sm font-semibold">
        <span>{title}</span>
        <span className="text-muted-foreground">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

async function compressImage(file: File, maxW = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function parseImport(text: string): CVData | null {
  try {
    const parsed = JSON.parse(text);
    return { ...EMPTY_DATA, ...parsed };
  } catch {}
  const m = text.match(/<!--CV_JSON:(.+?)-->/);
  if (m) {
    try { return { ...EMPTY_DATA, ...JSON.parse(decodeURIComponent(escape(atob(m[1])))) }; } catch {}
  }
  return null;
}

const IconFile = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);

const IconCode = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M16 18l6-6-6-6" />
    <path d="M8 6l-6 6 6 6" />
  </svg>
);

const IconWord = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
    <path d="M7 7h10" />
    <path d="M7 12h10" />
    <path d="M7 17h6" />
  </svg>
);

const IconSpinner = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 animate-spin">
    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
    <path d="M22 12a10 10 0 0 0-10-10" />
  </svg>
);

const IconSun = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);

const IconMoon = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
  </svg>
);

const IconEye = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconDocument = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <line x1="9" y1="13" x2="15" y2="13" />
    <line x1="9" y1="17" x2="15" y2="17" />
  </svg>
);

const IconSave = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const IconWarning = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconUpload = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const IconTrash = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

type MenuItem = { label: string; onClick?: () => void; icon?: JSX.Element | string; disabled?: boolean };
function Menu({ label, items, variant = "ghost" }: { label: string; items: MenuItem[]; variant?: "primary" | "secondary" | "ghost" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const btnCls = variant === "primary"
    ? "h-10 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/20 hover:opacity-90 inline-flex items-center gap-1.5"
    : variant === "secondary"
    ? "h-10 px-4 py-2 rounded-md menu-secondary-btn text-sm font-semibold shadow-lg shadow-black/10 hover:bg-muted inline-flex items-center gap-1.5"
    : "h-10 px-4 py-2 rounded-md border border-border text-sm font-semibold hover:bg-muted inline-flex items-center gap-1.5";
  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen(o => !o)} className={btnCls}>{label}<span className="text-[10px] opacity-70">▾</span></button>
      {open && (
        <div className="absolute right-0 mt-2 min-w-[180px] rounded-md menu-panel shadow-xl z-30 py-1 animate-in fade-in zoom-in-95 duration-100">
          {items.map((it, i) => (
            <button key={i} onClick={() => { setOpen(false); it.onClick?.(); }}
              disabled={it.disabled}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-[var(--foreground)] ${it.disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/80 hover:text-[var(--foreground)]"}`}>
              {it.icon && <span className="text-base">{it.icon}</span>}{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CVBuilder() {
  const [data, setData] = useState<CVData>(SAMPLE_DATA);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [showWelcome, setShowWelcome] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showLoadExampleModal, setShowLoadExampleModal] = useState(false);
  const [overflowWarn, setOverflowWarn] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const isMobile = useIsMobile();
  const previewRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const importAcceptRef = useRef<string>(".json,.md,.txt");


  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setData({ ...EMPTY_DATA, ...JSON.parse(raw) });
    } catch {}
    const t = (localStorage.getItem(THEME_KEY) as "dark" | "light") || "dark";
    setTheme(t);
    if (!localStorage.getItem(WELCOME_KEY)) setShowWelcome(true);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const debounced = useDebounced(data, 300);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(debounced)); } catch {}
  }, [debounced]);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const pages = el.querySelectorAll(".cv-paper");
    if (pages.length > 2) setOverflowWarn(true);
    else {
      const last = pages[pages.length - 1] as HTMLElement | undefined;
      if (last && last.scrollHeight > last.clientHeight + 4 && pages.length >= 2) setOverflowWarn(true);
      else setOverflowWarn(false);
    }
  }, [debounced]);

  const update = useCallback(<K extends keyof CVData>(key: K, value: CVData[K]) => {
    setData(d => ({ ...d, [key]: value }));
  }, []);

  const onPhoto = async (f?: File) => {
    if (!f) return;
    const b64 = await compressImage(f);
    update("datos_personales", { ...data.datos_personales, foto_base64: b64 });
  };

  const exportPDF = async () => {
    try {
      setIsExportingPDF(true);
      const el = previewRef.current?.querySelector(".cv-pages") as HTMLElement | null;
      if (!el) {
        alert("No se encontró el contenido del CV para exportar.");
        setIsExportingPDF(false);
        return;
      }
      
      const mod = await import("html2pdf.js");
      const html2pdf = (mod as any).default ?? mod;
      
      await new Promise((resolve, reject) => {
        html2pdf()
          .set({
            margin: 0,
            filename: `${data.datos_personales.nombre || "cv-easy"}.pdf`,
            image: { type: "jpeg", quality: 0.95 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
            pagebreak: { mode: ["css", "legacy"] },
          })
          .from(el)
          .save()
          .then(() => {
            resolve(true);
          })
          .catch((err: any) => {
            reject(err);
          });
      });
    } catch (err) {
      console.error("Error al exportar PDF:", err);
      alert("Error al exportar PDF. Revisa la consola para más detalles.");
    } finally {
      setIsExportingPDF(false);
    }
  };
  const download = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const exportJSON = () => {
    const name = (data.datos_personales.nombre || "cv-easy").replace(/\s+/g, "_");
    download(`${name}.json`, JSON.stringify(data, null, 2), "application/json");
  };
  const exportMD = () => {
    const dp = data.datos_personales;
    const lines: string[] = [];
    lines.push(`# ${dp.nombre || "Tu Nombre"}`);
    if (dp.puesto) lines.push(`**${dp.puesto}**`);
    const contact = [dp.correo, dp.telefono, dp.ubicacion, dp.linkedin].filter(Boolean).join(" · ");
    if (contact) lines.push(contact);
    if (data.perfil) { lines.push("\n## Perfil profesional\n", data.perfil); }
    if (data.educacion.length) {
      lines.push("\n## Educación");
      data.educacion.forEach(e => lines.push(`- **${e.grado}** — ${e.institucion} _(${e.periodo})_`));
    }
    if (data.certificaciones.length) {
      lines.push("\n## Certificaciones");
      data.certificaciones.forEach(c => lines.push(`- ${c.nombre} — ${c.institucion} (${c.fecha})`));
    }
    if (data.experiencia.length) {
      lines.push("\n## Experiencia");
      data.experiencia.forEach(e => {
        lines.push(`\n### ${e.rol} — ${e.empresa} _(${e.periodo})_`);
        if (e.descripcion) lines.push(e.descripcion);
        bullets(e.logros).forEach(b => lines.push(`- ${b}`));
      });
    }
    if (data.habilidades.length) {
      lines.push("\n## Habilidades");
      data.habilidades.forEach(g => lines.push(`- **${g.categoria}:** ${g.items}`));
    }
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    lines.push(`\n<!--CV_JSON:${b64}-->`);
    const name = (dp.nombre || "cv-easy").replace(/\s+/g, "_");
    download(`${name}.md`, lines.join("\n"), "text/markdown");
  };
  const exportDOCX = () => {
    const el = previewRef.current?.querySelector(".cv-pages") as HTMLElement | null;
    if (!el) return;
    const html = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>CV</title><style>body{font-family:${data.config.fuente},serif;font-size:12px;color:#000;}h1{font-size:24px;margin:0 0 4px;}h2{font-size:14px;border-bottom:1px solid #000;padding-bottom:2px;margin:12px 0 6px;}ul{margin:4px 0;padding-left:20px;}p{margin:4px 0;}.cv-paper{padding:0;}header{text-align:center;}</style></head><body>${el.innerHTML}</body></html>`;
    const name = (data.datos_personales.nombre || "cv-easy").replace(/\s+/g, "_");
    download(`${name}.doc`, html, "application/msword");
  };
  const handleImport = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      const parsed = parseImport(String(r.result));
      if (parsed) setData(parsed);
      else alert("No se pudo leer el archivo.");
    };
    r.readAsText(file);
  };
  const triggerImport = (accept: string) => {
    importAcceptRef.current = accept;
    if (importInputRef.current) {
      importInputRef.current.accept = accept;
      importInputRef.current.value = "";
      importInputRef.current.click();
    }
  };
  const clearAll = () => {
    setShowClearModal(true);
  };

  const confirmClearAll = () => {
    setData(EMPTY_DATA);
    localStorage.removeItem(STORAGE_KEY);
    setShowClearModal(false);
  };

  const cancelClearAll = () => {
    setShowClearModal(false);
  };

  const requestLoadExample = () => {
    setShowLoadExampleModal(true);
  };

  const confirmLoadExample = () => {
    setData(SAMPLE_DATA);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_DATA)); } catch {}
    setShowLoadExampleModal(false);
  };

  const cancelLoadExample = () => {
    setShowLoadExampleModal(false);
  };

  const downloadItems: MenuItem[] = [
    { 
      label: isExportingPDF ? "Exportando..." : "PDF", 
      icon: isExportingPDF ? IconSpinner : IconFile, 
      onClick: isExportingPDF ? undefined : exportPDF,
      disabled: isExportingPDF
    },
    { label: "Word (.doc)", icon: IconWord, onClick: exportDOCX },
    { label: "JSON", icon: IconCode, onClick: exportJSON },
    { label: "Markdown (.md)", icon: IconCode, onClick: exportMD },
  ];
  const importItems: MenuItem[] = [
    { label: "Desde JSON", icon: IconCode, onClick: () => triggerImport(".json") },
    { label: "Desde Markdown", icon: IconCode, onClick: () => triggerImport(".md,.txt") },
  ];

  return (
    <div className="min-h-screen flex flex-col relative">
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 modal-backdrop">
          <div className="modal-card rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex-none w-12 h-12 rounded-3xl bg-red-500/10 text-red-600 flex items-center justify-center">
                {IconWarning}
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-semibold tracking-tight">Limpiar datos del cv?</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Esta acción eliminará toda la información guardada en el editor. No se podrá deshacer.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button onClick={cancelClearAll} className="w-full sm:w-auto rounded-full modal-cancel-btn px-4 py-2 text-sm transition">
                Cancelar
              </button>
              <button onClick={confirmClearAll} className="w-full sm:w-auto rounded-full modal-primary-btn px-4 py-2 text-sm font-semibold">
                Vaciar datos
              </button>
            </div>
          </div>
        </div>
      )}

      {showLoadExampleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 modal-backdrop">
          <div className="modal-card rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex-none w-12 h-12 rounded-3xl bg-primary/10 text-primary flex items-center justify-center">
                {IconUpload}
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-semibold tracking-tight">Cargar ejemplo</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Al cargar el ejemplo se limpiarán todos los datos actuales y se perderá el avance guardado. ¿Estás seguro?
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button onClick={cancelLoadExample} className="w-full sm:w-auto rounded-full modal-cancel-btn px-4 py-2 text-sm transition">
                Cancelar
              </button>
              <button onClick={confirmLoadExample} className="w-full sm:w-auto rounded-full modal-primary-btn px-4 py-2 text-sm font-semibold">
                Cargar ejemplo
              </button>
            </div>
          </div>
        </div>
      )}

      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 modal-backdrop">
          <div className="modal-card rounded-3xl shadow-2xl w-full max-w-4xl max-h-[calc(100vh-2rem)] sm:max-h-[90vh] overflow-visible flex flex-col">
            <div className="modal-header flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-xl font-semibold tracking-tight">Vista previa del CV</h2>
              <button 
                onClick={() => setShowPreviewModal(false)}
                className="modal-close-btn"
                aria-label="Cerrar preview"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto modal-body bg-gray-100 dark:bg-gray-900">
              <div className="preview-panel border border-[var(--border)] bg-[var(--popover)] p-3 sm:p-5 rounded-3xl overflow-x-auto overflow-y-auto transition max-w-none mx-auto">
                <CVPreview data={debounced} />
              </div>
            </div>
            <div className="p-4 border-t border-border flex justify-center gap-3">
              <button 
                onClick={() => setShowPreviewModal(false)}
                className="px-6 py-2 rounded-full modal-cancel-btn text-sm transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="px-4 sm:px-6 py-4 flex items-center justify-between gap-4 bg-card">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-none w-12 h-12 rounded-3xl bg-white border border-border shadow-sm overflow-hidden p-2 flex items-center justify-center">
            <img src="/icon.png" alt="cv-easy" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground truncate">Crea tu currículum</p>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
              cv<span className="text-primary">.</span>easy
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Cambiar tema" className="text-xs px-3 py-2 rounded-full border theme-toggle-btn transition inline-flex items-center justify-center">
            {theme === "dark" ? IconSun : IconMoon}
          </button>
          <Menu label="Descargar" variant="primary" items={downloadItems} />
        </div>
      </header>


      <section className="relative px-6 sm:px-8 pt-16 pb-20 sm:pt-20 sm:pb-24 overflow-hidden border-b border-border">
        {/* Subtle background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-primary/3 rounded-full blur-3xl"></div>
        </div>
        
        <div className="mx-auto max-w-4xl relative z-10 text-center">

          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-5 leading-[1.1] tracking-tight">
            Crea tu curriculum profesional en minutos
          </h2>
          
          <p className="text-muted-foreground text-base sm:text-lg lg:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
            Editor intuitivo con vista previa en tiempo real. Elige entre plantillas profesionales y descargalo gratis.
           
          </p>
          
          <div className="flex flex-wrap justify-center items-center gap-3 mb-8">
            <Menu label="Descargar" variant="primary" items={downloadItems} />
            <button onClick={requestLoadExample} className="h-10 px-4 py-2 rounded-md border border-border text-sm font-semibold hover:bg-muted inline-flex items-center gap-1.5">Cargar ejemplo</button>
            <Menu label="Importar" variant="secondary" items={importItems} />
            <input ref={importInputRef} type="file" accept=".json,.md,.txt" className="hidden" onChange={e => e.target.files?.[0] && handleImport(e.target.files[0])} />
          </div>
          
          <div className="flex flex-wrap justify-center items-center gap-6 max-w-2xl mx-auto">
            {[
              { icon: IconEye, text: "Vista Previa" },
              { icon: IconDocument, text: "Plantillas Profesionales" },
              { icon: IconSave, text: "Autoguardado (Caché)" },
            ].map((feature) => (
              <div key={feature.text} className="inline-flex items-center gap-2.5 text-sm font-medium text-foreground/80">
                <span className="text-lg">{feature.icon}</span>
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Botón flotante para ver preview en móvil */}
      {isMobile && (
        <button
          onClick={() => setShowPreviewModal(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition hover:scale-105 active:scale-95 font-semibold text-sm animate-pulse hover:animate-none"
          aria-label="Ver vista previa del CV"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <span>Ver Preview</span>
        </button>
      )}

      <main className="flex-1 relative">
        <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:p-6">
          {/* Form - scrolls independently on desktop */}
          <div className="lg:order-1 min-w-0 pb-20 px-4 sm:px-0">
          {/* FORM */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Formulario de Curriculum</span>
            <button onClick={clearAll} className="text-[11px] px-2.5 py-1 rounded-md border border-primary/40 text-primary hover:bg-primary/10 transition inline-flex items-center gap-1">
              <span className="inline-flex">{IconTrash}</span>
              Vaciar datos
            </button>
          </div>
          <div className="border border-border rounded-lg p-4 mb-3 bg-card">
            <div className="text-sm font-semibold mb-3">Plantilla</div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {(["harvard","modern","compact"] as const).map(t => (
                <button key={t} onClick={() => update("config", { ...data.config, plantilla: t })}
                  className={`p-3 rounded-md border text-xs font-medium capitalize transition ${data.config.plantilla === t ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}>
                  {t === "harvard" ? "Harvard" : t === "modern" ? "Moderna" : "Compacta"}
                </button>
              ))}
            </div>
            <Field label="Tipografía" help="Fuente del CV. Las del sistema cargan más rápido.">
              <select value={data.config.fuente} onChange={e => update("config", { ...data.config, fuente: e.target.value })} className={inputCls}>
                {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={data.config.mostrar_foto} onChange={e => update("config", { ...data.config, mostrar_foto: e.target.checked })} />
              Mostrar foto en el CV
            </label>
          </div>

          <Section title="Datos Personales">
            <Field label="Nombre completo" help="Tu nombre y apellido tal como quieres que aparezcan." required>
              <input className={inputCls} value={data.datos_personales.nombre} onChange={e => update("datos_personales", { ...data.datos_personales, nombre: e.target.value })} />
            </Field>
            <Field label="Puesto / Profesión" help="El trabajo al que aspiras." required>
              <input className={inputCls} value={data.datos_personales.puesto} onChange={e => update("datos_personales", { ...data.datos_personales, puesto: e.target.value })} />
            </Field>
            <Field label="Correo electrónico" help="Un email que revises a diario.">
              <input className={inputCls} type="email" value={data.datos_personales.correo} onChange={e => update("datos_personales", { ...data.datos_personales, correo: e.target.value })} />
            </Field>
            <Field label="Teléfono" help="Incluye código de país.">
              <input className={inputCls} value={data.datos_personales.telefono} onChange={e => update("datos_personales", { ...data.datos_personales, telefono: e.target.value })} />
            </Field>
            <Field label="Ubicación" help="Ciudad y país.">
              <input className={inputCls} value={data.datos_personales.ubicacion} onChange={e => update("datos_personales", { ...data.datos_personales, ubicacion: e.target.value })} />
            </Field>
            <Field label="LinkedIn (usuario)" help="Solo el nombre de usuario de tu perfil de LinkedIn.">
              <input className={inputCls} value={data.datos_personales.linkedin} onChange={e => update("datos_personales", { ...data.datos_personales, linkedin: e.target.value })} />
            </Field>
            <Field label="Foto (opcional)" help="Una foto reciente con fondo neutro. Se comprime automáticamente.">
              <input type="file" accept="image/*" onChange={e => onPhoto(e.target.files?.[0])} className="text-xs" />
              {data.datos_personales.foto_base64 && (
                <button type="button" onClick={() => update("datos_personales", { ...data.datos_personales, foto_base64: "" })} className="text-xs text-primary mt-1 underline">Quitar foto</button>
              )}
            </Field>
          </Section>

          <Section title="Perfil Profesional">
            <Field label="Resumen" help="Un párrafo de 4-6 líneas resumiendo quién eres, tus años de experiencia y tus fortalezas.">
              <textarea className={inputCls} rows={6} value={data.perfil} onChange={e => update("perfil", e.target.value)} />
            </Field>
          </Section>

          <Section title="Educación">
            {data.educacion.map((ed, i) => (
              <div key={i} className="border border-border rounded-md p-3 mb-2">
                <Field label="Institución" help="Universidad, instituto o escuela.">
                  <input className={inputCls} value={ed.institucion} onChange={e => { const a = [...data.educacion]; a[i] = { ...ed, institucion: e.target.value }; update("educacion", a); }} />
                </Field>
                <Field label="Grado" help="Ej. 'Grado en Ingeniería Informática'.">
                  <input className={inputCls} value={ed.grado} onChange={e => { const a = [...data.educacion]; a[i] = { ...ed, grado: e.target.value }; update("educacion", a); }} />
                </Field>
                <Field label="Periodo" help="Ej. 'Septiembre 2018 – Junio 2022'.">
                  <input className={inputCls} value={ed.periodo} onChange={e => { const a = [...data.educacion]; a[i] = { ...ed, periodo: e.target.value }; update("educacion", a); }} />
                </Field>
                <button type="button" onClick={() => update("educacion", data.educacion.filter((_, j) => j !== i))} className="text-xs text-primary">Eliminar</button>
              </div>
            ))}
            <button type="button" onClick={() => update("educacion", [...data.educacion, { institucion: "", grado: "", periodo: "" }])} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted">+ Agregar educación</button>
          </Section>

          <Section title="Certificaciones">
            {data.certificaciones.map((c, i) => (
              <div key={i} className="border border-border rounded-md p-3 mb-2">
                <Field label="Nombre del curso o certificación" help="Ej. 'AWS Solutions Architect'.">
                  <input className={inputCls} value={c.nombre} onChange={e => { const a = [...data.certificaciones]; a[i] = { ...c, nombre: e.target.value }; update("certificaciones", a); }} />
                </Field>
                <Field label="Institución" help="Quién emite la certificación.">
                  <input className={inputCls} value={c.institucion} onChange={e => { const a = [...data.certificaciones]; a[i] = { ...c, institucion: e.target.value }; update("certificaciones", a); }} />
                </Field>
                <Field label="Fecha" help="Mes y año de obtención.">
                  <input className={inputCls} value={c.fecha} onChange={e => { const a = [...data.certificaciones]; a[i] = { ...c, fecha: e.target.value }; update("certificaciones", a); }} />
                </Field>
                <button type="button" onClick={() => update("certificaciones", data.certificaciones.filter((_, j) => j !== i))} className="text-xs text-primary">Eliminar</button>
              </div>
            ))}
            <button type="button" onClick={() => update("certificaciones", [...data.certificaciones, { nombre: "", institucion: "", fecha: "" }])} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted">+ Agregar certificación</button>
          </Section>

          <Section title="Experiencia">
            {data.experiencia.map((exp, i) => (
              <div key={i} className="border border-border rounded-md p-3 mb-2">
                <Field label="Empresa y ubicación" help="Ej. 'Nombre Empresa, S.L. – Ciudad, País'.">
                  <input className={inputCls} value={exp.empresa} onChange={e => { const a = [...data.experiencia]; a[i] = { ...exp, empresa: e.target.value }; update("experiencia", a); }} />
                </Field>
                <Field label="Rol / Cargo" help="El puesto que desempeñaste.">
                  <input className={inputCls} value={exp.rol} onChange={e => { const a = [...data.experiencia]; a[i] = { ...exp, rol: e.target.value }; update("experiencia", a); }} />
                </Field>
                <Field label="Periodo" help="Ej. 'Marzo 2022 – Presente'.">
                  <input className={inputCls} value={exp.periodo} onChange={e => { const a = [...data.experiencia]; a[i] = { ...exp, periodo: e.target.value }; update("experiencia", a); }} />
                </Field>
                <Field label="Descripción breve" help="Una línea que resuma el rol.">
                  <input className={inputCls} value={exp.descripcion} onChange={e => { const a = [...data.experiencia]; a[i] = { ...exp, descripcion: e.target.value }; update("experiencia", a); }} />
                </Field>
                <Field label="Logros (uno por línea)" help="Cada línea será un viñeta. Empieza con un verbo en pasado.">
                  <textarea className={inputCls} rows={4} value={exp.logros} onChange={e => { const a = [...data.experiencia]; a[i] = { ...exp, logros: e.target.value }; update("experiencia", a); }} />
                </Field>
                <button type="button" onClick={() => update("experiencia", data.experiencia.filter((_, j) => j !== i))} className="text-xs text-primary">Eliminar</button>
              </div>
            ))}
            <button type="button" onClick={() => update("experiencia", [...data.experiencia, { empresa: "", rol: "", periodo: "", descripcion: "", logros: "" }])} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted">+ Agregar experiencia</button>
          </Section>

          <Section title="Habilidades (por categorías)">
            {data.habilidades.map((g, i) => (
              <div key={i} className="border border-border rounded-md p-3 mb-2">
                <Field label="Categoría" help="Ej. 'Lenguajes y Frameworks'.">
                  <input className={inputCls} value={g.categoria} onChange={e => { const a = [...data.habilidades]; a[i] = { ...g, categoria: e.target.value }; update("habilidades", a); }} />
                </Field>
                <Field label="Habilidades (separadas por comas)" help="Ej. 'React, Node.js, TypeScript'.">
                  <input className={inputCls} value={g.items} onChange={e => { const a = [...data.habilidades]; a[i] = { ...g, items: e.target.value }; update("habilidades", a); }} />
                </Field>
                <button type="button" onClick={() => update("habilidades", data.habilidades.filter((_, j) => j !== i))} className="text-xs text-primary">Eliminar</button>
              </div>
            ))}
            <button type="button" onClick={() => update("habilidades", [...data.habilidades, { categoria: "", items: "" }])} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted">+ Agregar categoría</button>
          </Section>

          <div className="flex flex-wrap gap-2 mt-4">
            <button onClick={clearAll} className="text-xs px-3 py-2 rounded-md border border-primary/40 text-primary hover:bg-primary/10 transition inline-flex items-center gap-2">
              <span>{IconTrash}</span>
              Vaciar datos
            </button>
          </div>
        </div>

        {/* Preview - sticky on desktop within main section only */}
        <div className="hidden lg:block lg:order-2 min-w-0">
          <div className="sticky top-6 h-[calc(100vh-3rem)]">
            <div className="h-full flex flex-col">
              <CVActions data={debounced} />
              {overflowWarn && (
                <div className="mb-3 p-3 rounded-md bg-primary text-primary-foreground text-sm font-medium">
                  ⚠ Has alcanzado el límite máximo de 2 páginas.
                </div>
              )}
              <div ref={previewRef} className="preview-panel border border-[var(--border)] bg-[var(--popover)] p-3 sm:p-4 rounded-2xl transition shadow-lg flex-1 overflow-y-auto">
                <CVPreview data={debounced} />
              </div>
            </div>
          </div>
        </div>
        </div>
      </main>

      {/* Mobile preview - only in modal, not visible by default */}
      {/* Preview is shown only when user clicks the floating button */}

      <footer className="border-t border-border px-4 sm:px-6 py-6 text-center text-xs text-muted-foreground bg-card">
        <p>© 2026 cv-easy. Todos los derechos reservados.</p>
        <p className="mt-1">
          Desarrollado por{" "}
          <a href="https://github.com/WilmerParra21" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">DevsParra</a>
        </p>
      </footer>
    </div>
  );
}

function CVPreview({ data }: { data: CVData }) {
  const { plantilla, fuente, mostrar_foto } = data.config;
  const style: React.CSSProperties = { fontFamily: fuente };

  const content = useMemo(() => {
    if (plantilla === "harvard") return <HarvardTemplate data={data} mostrar_foto={mostrar_foto} />;
    if (plantilla === "modern") return <ModernTemplate data={data} mostrar_foto={mostrar_foto} />;
    return <CompactTemplate data={data} mostrar_foto={mostrar_foto} />;
  }, [data, plantilla, mostrar_foto]);

  return (
    <div className="cv-pages" style={style}>
      <div className="cv-paper">{content}</div>
    </div>
  );
}

function CVActions({ data }: { data: CVData }) {
  return (
    <div className="flex flex-col gap-2 mb-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vista previa</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          {data.config.plantilla === "harvard" ? "Harvard" : data.config.plantilla === "modern" ? "Moderna" : "Compacta"}
        </span>
      </div>
    </div>
  );
}

function bullets(text: string): string[] {
  return text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}

function HarvardTemplate({ data, mostrar_foto }: { data: CVData; mostrar_foto: boolean }) {
  const dp = data.datos_personales;
  const contactParts = [
    dp.ubicacion && `📍 ${dp.ubicacion}`,
    dp.correo && `✉ ${dp.correo}`,
    dp.telefono && `📞 ${dp.telefono}`,
    dp.linkedin && `🔗 ${dp.linkedin}`,
  ].filter(Boolean) as string[];
  return (
    <div className="text-[12px] leading-snug">
      <header className="text-center mb-4">
        {mostrar_foto && dp.foto_base64 && <img src={dp.foto_base64} alt="" className="w-24 h-24 rounded-full object-cover mx-auto mb-2" />}
        <h1 className="text-3xl font-bold tracking-tight">{dp.nombre || "Tu Nombre"}</h1>
        {dp.puesto && <p className="text-sm mt-1">{dp.puesto}</p>}
        {contactParts.length > 0 && (
          <p className="text-[11px] mt-2 text-gray-700">{contactParts.join("   ")}</p>
        )}
      </header>

      {data.perfil && (
        <HarvardBlock title="Perfil Profesional">
          <p className="text-justify">{data.perfil}</p>
        </HarvardBlock>
      )}

      {data.educacion.some(e => e.institucion || e.grado) && (
        <HarvardBlock title="Educación">
          {data.educacion.map((e, i) => (
            <div key={i} className="mb-1.5">
              <div className="flex justify-between items-baseline">
                <span><strong>{e.institucion}</strong></span>
                <span className="italic text-[11px]">{e.periodo}</span>
              </div>
              {e.grado && <div className="italic">{e.grado}</div>}
            </div>
          ))}
        </HarvardBlock>
      )}

      {data.certificaciones.length > 0 && (
        <HarvardBlock title="Certificaciones">
          {data.certificaciones.map((c, i) => (
            <div key={i} className="mb-0.5">
              {c.nombre}{c.institucion && ` (${c.institucion})`}{c.fecha && ` - ${c.fecha}`}
            </div>
          ))}
        </HarvardBlock>
      )}

      {data.experiencia.some(e => e.empresa || e.rol) && (
        <HarvardBlock title="Experiencia">
          {data.experiencia.map((e, i) => (
            <div key={i} className="mb-2.5">
              <div className="flex justify-between items-baseline">
                <strong>{e.rol}{e.empresa && `, ${e.empresa}`}</strong>
                <span className="italic text-[11px] whitespace-nowrap ml-2">{e.periodo}</span>
              </div>
              {e.descripcion && <div className="italic mb-1">{e.descripcion}</div>}
              {bullets(e.logros).length > 0 && (
                <ul className="list-disc pl-5 space-y-0.5">
                  {bullets(e.logros).map((b, j) => <li key={j}>{b}</li>)}
                </ul>
              )}
            </div>
          ))}
        </HarvardBlock>
      )}

      {data.habilidades.length > 0 && (
        <HarvardBlock title="Habilidades">
          {data.habilidades.map((g, i) => (
            <div key={i} className="mb-1">
              <strong>{g.categoria}:</strong> {g.items}
            </div>
          ))}
        </HarvardBlock>
      )}
    </div>
  );
}

function HarvardBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-3">
      <h2 className="text-[13px] font-bold border-b border-black pb-0.5 mb-1.5">{title}</h2>
      {children}
    </section>
  );
}

function ModernBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h2 className="text-base font-bold mb-2 uppercase tracking-wide">{title}</h2>
      {children}
    </section>
  );
}

function ModernTemplate({ data, mostrar_foto }: { data: CVData; mostrar_foto: boolean }) {
  const dp = data.datos_personales;
  return (
    <div className="text-[12px]">
      <header className="flex gap-4 items-center mb-5 pb-4 border-b-4 border-black">
        {mostrar_foto && dp.foto_base64 && <img src={dp.foto_base64} alt="" className="w-20 h-20 rounded object-cover" />}
        <div>
          <h1 className="text-3xl font-black">{dp.nombre || "Tu Nombre"}</h1>
          <p className="text-base">{dp.puesto}</p>
          <p className="text-[11px] mt-1 text-gray-700">{[dp.correo, dp.telefono, dp.ubicacion, dp.linkedin].filter(Boolean).join(" | ")}</p>
        </div>
      </header>
      {data.perfil && <ModernBlock title="Perfil"><p className="text-justify">{data.perfil}</p></ModernBlock>}
      {data.educacion.length > 0 && (
        <ModernBlock title="Educación">
          {data.educacion.map((e, i) => <div key={i} className="mb-1"><strong>{e.grado}</strong> — {e.institucion} <span className="text-[11px]">({e.periodo})</span></div>)}
        </ModernBlock>
      )}
      {data.certificaciones.length > 0 && (
        <ModernBlock title="Certificaciones">
          {data.certificaciones.map((c, i) => <div key={i}>{c.nombre} — {c.institucion} ({c.fecha})</div>)}
        </ModernBlock>
      )}
      {data.experiencia.length > 0 && (
        <ModernBlock title="Experiencia">
          {data.experiencia.map((e, i) => (
            <div key={i} className="mb-3">
              <div className="flex justify-between"><strong>{e.rol} · {e.empresa}</strong><span className="text-[11px]">{e.periodo}</span></div>
              {e.descripcion && <p className="italic">{e.descripcion}</p>}
              {bullets(e.logros).length > 0 && <ul className="list-disc pl-5">{bullets(e.logros).map((b,j)=><li key={j}>{b}</li>)}</ul>}
            </div>
          ))}
        </ModernBlock>
      )}
      {data.habilidades.length > 0 && (
        <ModernBlock title="Habilidades">
          {data.habilidades.map((g, i) => <div key={i} className="mb-1"><strong>{g.categoria}:</strong> {g.items}</div>)}
        </ModernBlock>
      )}
    </div>
  );
}

function CompactTemplate({ data, mostrar_foto }: { data: CVData; mostrar_foto: boolean }) {
  const dp = data.datos_personales;
  return (
    <div className="text-[11px]">
      <header className="mb-3">
        <h1 className="text-xl font-bold">{dp.nombre || "Tu Nombre"} — <span className="font-normal">{dp.puesto}</span></h1>
        <p>{[dp.correo, dp.telefono, dp.ubicacion, dp.linkedin].filter(Boolean).join(" · ")}</p>
      </header>
      {data.perfil && <p className="mb-2 text-justify">{data.perfil}</p>}
      <h2 className="font-bold uppercase border-b border-black mt-3 mb-1">Educación</h2>
      {data.educacion.map((e, i) => <div key={i}><strong>{e.grado}</strong>, {e.institucion} ({e.periodo})</div>)}
      {data.certificaciones.length > 0 && (
        <>
          <h2 className="font-bold uppercase border-b border-black mt-3 mb-1">Certificaciones</h2>
          {data.certificaciones.map((c, i) => <div key={i}>{c.nombre} — {c.institucion} ({c.fecha})</div>)}
        </>
      )}
      <h2 className="font-bold uppercase border-b border-black mt-3 mb-1">Experiencia</h2>
      {data.experiencia.map((e, i) => (
        <div key={i} className="mb-1">
          <strong>{e.rol}</strong>, {e.empresa} <em>({e.periodo})</em>
          {bullets(e.logros).length > 0 && <ul className="list-disc pl-4">{bullets(e.logros).map((b,j)=><li key={j}>{b}</li>)}</ul>}
        </div>
      ))}
      {data.habilidades.length > 0 && (
        <>
          <h2 className="font-bold uppercase border-b border-black mt-3 mb-1">Habilidades</h2>
          {data.habilidades.map((g, i) => <div key={i}><strong>{g.categoria}:</strong> {g.items}</div>)}
        </>
      )}
    </div>
  );
}
