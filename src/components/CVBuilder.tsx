import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

type MenuItem = { label: string; onClick?: () => void; icon?: string; disabled?: boolean };
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
      icon: isExportingPDF ? "⏳" : "📄", 
      onClick: isExportingPDF ? undefined : exportPDF,
      disabled: isExportingPDF
    },
    { label: "Word (.doc)", icon: "📝", onClick: exportDOCX },
    { label: "JSON", icon: "{ }", onClick: exportJSON },
    { label: "Markdown (.md)", icon: "📑", onClick: exportMD },
  ];
  const importItems: MenuItem[] = [
    { label: "Desde JSON", icon: "{ }", onClick: () => triggerImport(".json") },
    { label: "Desde Markdown", icon: "📑", onClick: () => triggerImport(".md,.txt") },
  ];

  return (
    <div className="min-h-screen flex flex-col relative">
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 modal-backdrop">
          <div className="modal-card rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex-none w-12 h-12 rounded-3xl bg-red-500/10 text-red-600 flex items-center justify-center text-2xl">
                ⚠️
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
              <div className="flex-none w-12 h-12 rounded-3xl bg-primary/10 text-primary flex items-center justify-center text-2xl">
                📥
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
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Cambiar tema" className="text-xs px-3 py-2 rounded-full border theme-toggle-btn transition">
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <Menu label="⬇ Descargar" variant="primary" items={downloadItems} />
        </div>
      </header>


      <section className="px-4 sm:px-6 pt-8 pb-6 sm:pt-14 sm:pb-10 text-center bg-gradient-to-b from-card via-card to-background border-b border-border">
        <span className="inline-block text-[11px] tracking-widest uppercase text-primary font-bold mb-3 px-3 py-1 rounded-full bg-primary/10">100% gratis · sin registro</span>
        <h2 className="text-3xl sm:text-5xl font-black mb-3 mx-auto leading-[1.1]">
          Crea tu CV profesional <span className="text-primary">en minutos</span>
        </h2>
        <p className="text-muted-foreground text-sm sm:text-lg max-w-xl mx-auto mb-6 px-2">
          Editor en vivo, plantillas estilo Harvard y descargalo gratis.
        </p>
        <div className="flex flex-wrap justify-center items-center gap-2">
          <Menu label="⬇ Descargar" variant="primary" items={downloadItems} />
          <button onClick={requestLoadExample} className="h-10 px-4 py-2 rounded-md border border-border text-sm font-semibold hover:bg-muted inline-flex items-center gap-1.5">Cargar ejemplo</button>
          <Menu label="↥ Importar" variant="secondary" items={importItems} />
          <input ref={importInputRef} type="file" accept=".json,.md,.txt" className="hidden" onChange={e => e.target.files?.[0] && handleImport(e.target.files[0])} />
        </div>

      </section>

      <main className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-4 p-4 sm:p-6 flex-1">
        {/* FORM */}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Editor del CV</span>
            <button onClick={clearAll} className="text-[11px] px-2.5 py-1 rounded-md border border-primary/40 text-primary hover:bg-primary/10 transition">🗑 Vaciar datos</button>
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
            <button onClick={clearAll} className="text-xs px-3 py-2 rounded-md border border-primary/40 text-primary hover:bg-primary/10">🗑 Vaciar datos</button>
          </div>
        </div>

        {/* PREVIEW */}
        <div className="min-w-0">
          {overflowWarn && (
            <div className="mb-3 p-3 rounded-md bg-primary text-primary-foreground text-sm font-medium">
              ⚠ Has alcanzado el límite máximo de 2 páginas. Considera recortar texto.
            </div>
          )}
          <div ref={previewRef} className="preview-panel border border-[var(--border)] bg-[var(--popover)] p-3 sm:p-5 rounded-3xl overflow-visible transition">
            <CVPreview data={debounced} />
          </div>
        </div>
      </main>

      <footer className="border-t border-border px-4 sm:px-6 py-6 text-center text-xs text-muted-foreground bg-card">
        <p>© 2026 cv-easy. Todos los derechos reservados.</p>
        <p className="mt-1">
          Desarrollado por{" "}
          <a href="https://github.com/WilmerParra21" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">Wilmer Parra Gómez</a>
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
      <ModernBlock title="Experiencia">
        {data.experiencia.map((e, i) => (
          <div key={i} className="mb-3">
            <div className="flex justify-between"><strong>{e.rol} · {e.empresa}</strong><span className="text-[11px]">{e.periodo}</span></div>
            {e.descripcion && <p className="italic">{e.descripcion}</p>}
            {bullets(e.logros).length > 0 && <ul className="list-disc pl-5">{bullets(e.logros).map((b,j)=><li key={j}>{b}</li>)}</ul>}
          </div>
        ))}
      </ModernBlock>
      <ModernBlock title="Educación">
        {data.educacion.map((e, i) => <div key={i} className="mb-1"><strong>{e.grado}</strong> — {e.institucion} <span className="text-[11px]">({e.periodo})</span></div>)}
      </ModernBlock>
      {data.certificaciones.length > 0 && (
        <ModernBlock title="Certificaciones">
          {data.certificaciones.map((c, i) => <div key={i}>{c.nombre} — {c.institucion} ({c.fecha})</div>)}
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
      <h2 className="font-bold uppercase border-b border-black mt-3 mb-1">Experiencia</h2>
      {data.experiencia.map((e, i) => (
        <div key={i} className="mb-1">
          <strong>{e.rol}</strong>, {e.empresa} <em>({e.periodo})</em>
          {bullets(e.logros).length > 0 && <ul className="list-disc pl-4">{bullets(e.logros).map((b,j)=><li key={j}>{b}</li>)}</ul>}
        </div>
      ))}
      <h2 className="font-bold uppercase border-b border-black mt-3 mb-1">Educación</h2>
      {data.educacion.map((e, i) => <div key={i}><strong>{e.grado}</strong>, {e.institucion} ({e.periodo})</div>)}
      {data.certificaciones.length > 0 && (
        <>
          <h2 className="font-bold uppercase border-b border-black mt-3 mb-1">Certificaciones</h2>
          {data.certificaciones.map((c, i) => <div key={i}>{c.nombre} — {c.institucion} ({c.fecha})</div>)}
        </>
      )}
      {data.habilidades.length > 0 && (
        <>
          <h2 className="font-bold uppercase border-b border-black mt-3 mb-1">Habilidades</h2>
          {data.habilidades.map((g, i) => <div key={i}><strong>{g.categoria}:</strong> {g.items}</div>)}
        </>
      )}
    </div>
  );
}
