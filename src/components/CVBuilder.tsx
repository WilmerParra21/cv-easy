import { useEffect, useMemo, useRef, useState, useCallback } from "react";

type CVData = {
  config: { plantilla: "harvard" | "modern" | "compact"; fuente: string; mostrar_foto: boolean };
  datos_personales: { nombre: string; puesto: string; correo: string; telefono: string; ubicacion: string; foto_base64: string };
  experiencia: Array<{ empresa: string; rol: string; periodo: string; descripcion: string }>;
  educacion: Array<{ institucion: string; grado: string; periodo: string }>;
  habilidades: string[];
};

const STORAGE_KEY = "cv-easy:data";
const THEME_KEY = "cv-easy:theme";
const WELCOME_KEY = "cv-easy:welcome-dismissed";

const DEFAULT_DATA: CVData = {
  config: { plantilla: "harvard", fuente: "Times New Roman", mostrar_foto: true },
  datos_personales: { nombre: "", puesto: "", correo: "", telefono: "", ubicacion: "", foto_base64: "" },
  experiencia: [{ empresa: "", rol: "", periodo: "", descripcion: "" }],
  educacion: [{ institucion: "", grado: "", periodo: "" }],
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

const inputCls = "w-full px-3 py-2 rounded-md bg-background border border-input text-sm outline-none focus:border-primary transition";

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

function dataToMarkdown(d: CVData): string {
  let md = `# ${d.datos_personales.nombre || ""}\n\n`;
  md += `**${d.datos_personales.puesto || ""}**\n\n`;
  md += `${d.datos_personales.correo} | ${d.datos_personales.telefono} | ${d.datos_personales.ubicacion}\n\n`;
  md += `## Experiencia\n`;
  d.experiencia.forEach(e => { md += `### ${e.rol} — ${e.empresa}\n*${e.periodo}*\n${e.descripcion}\n\n`; });
  md += `## Educación\n`;
  d.educacion.forEach(e => { md += `- **${e.grado}**, ${e.institucion} (${e.periodo})\n`; });
  md += `\n## Habilidades\n${d.habilidades.join(", ")}\n`;
  md += `\n<!--CV_JSON:${btoa(unescape(encodeURIComponent(JSON.stringify(d))))}-->\n`;
  return md;
}

function parseImport(text: string): CVData | null {
  try { return { ...DEFAULT_DATA, ...JSON.parse(text) }; } catch {}
  const m = text.match(/<!--CV_JSON:(.+?)-->/);
  if (m) { try { return { ...DEFAULT_DATA, ...JSON.parse(decodeURIComponent(escape(atob(m[1])))) }; } catch {} }
  return null;
}

export default function CVBuilder() {
  const [data, setData] = useState<CVData>(DEFAULT_DATA);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [showWelcome, setShowWelcome] = useState(false);
  const [overflowWarn, setOverflowWarn] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const previewRef = useRef<HTMLDivElement>(null);

  // Load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setData({ ...DEFAULT_DATA, ...JSON.parse(raw) });
    } catch {}
    const t = (localStorage.getItem(THEME_KEY) as "dark" | "light") || "dark";
    setTheme(t);
    if (!localStorage.getItem(WELCOME_KEY)) setShowWelcome(true);
  }, []);

  // Theme apply
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // Debounced persist + render
  const debounced = useDebounced(data, 300);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(debounced)); } catch {}
  }, [debounced]);

  // Overflow detection (2 pages max ~ 297mm * 2)
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

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    triggerDownload(blob, "cv-easy.json");
  };
  const exportMD = () => {
    const blob = new Blob([dataToMarkdown(data)], { type: "text/markdown" });
    triggerDownload(blob, "cv-easy.md");
  };
  const exportPDF = async () => {
    const el = previewRef.current?.querySelector(".cv-pages") as HTMLElement | null;
    if (!el) return;
    const mod = await import("html2pdf.js");
    const html2pdf = (mod as any).default ?? mod;
    html2pdf().set({
      margin: 0,
      filename: `${data.datos_personales.nombre || "cv-easy"}.pdf`,
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"] },
    }).from(el).save();
  };
  const handleImport = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      const parsed = parseImport(String(r.result));
      if (parsed) setData(parsed);
      else alert("No se pudo leer el archivo. Asegúrate de que sea .json o .md generado por cv-easy.");
    };
    r.readAsText(file);
  };
  const reset = () => {
    if (confirm("¿Borrar todos los datos y empezar de cero?")) {
      setData(DEFAULT_DATA);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {showWelcome && (
        <div className="bg-card border-b border-border px-4 py-3 flex items-start gap-3">
          <div className="flex-1 text-sm">
            <strong className="silver-text font-bold">¡Bienvenido a cv-easy!</strong>{" "}
            Crea tu CV profesional gratis, sin registrarte. Escribe en el formulario y mira el resultado al instante. Cuando termines, descárgalo en PDF.
          </div>
          <button onClick={() => { setShowWelcome(false); localStorage.setItem(WELCOME_KEY, "1"); }} className="bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-md font-medium shrink-0">Entendido</button>
        </div>
      )}

      {/* Header */}
      <header className="px-4 sm:px-6 py-4 border-b border-border flex items-center justify-between gap-3 bg-card">
        <h1 className="text-xl sm:text-2xl font-black tracking-tight">
          <span className="silver-text">cv</span><span className="text-primary">-easy</span>
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted">
            {theme === "dark" ? "☀ Claro" : "☾ Oscuro"}
          </button>
          <button onClick={exportPDF} className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-md bg-primary text-primary-foreground font-semibold hover:opacity-90">
            ⬇ Descargar PDF
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="px-4 sm:px-6 py-8 sm:py-12 text-center bg-gradient-to-b from-card to-background border-b border-border">
        <h2 className="text-2xl sm:text-4xl font-black mb-3 max-w-2xl mx-auto leading-tight">
          Tu currículum profesional, <span className="text-primary">listo en minutos</span>.
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto mb-5">
          Sin registro, sin pagos, sin complicaciones. Edita, visualiza y descarga.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <button onClick={reset} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold">Crear desde cero</button>
          <label className="px-4 py-2 rounded-md border border-border text-sm font-semibold cursor-pointer hover:bg-muted">
            Importar Respaldo (.json / .md)
            <input type="file" accept=".json,.md" className="hidden" onChange={e => e.target.files?.[0] && handleImport(e.target.files[0])} />
          </label>
        </div>
      </section>

      {/* Workspace */}
      <main className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-4 p-4 sm:p-6 flex-1">
        {/* FORM */}
        <div className="min-w-0">
          {/* Template & Font selectors */}
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
              <input className={inputCls} value={data.datos_personales.nombre} onChange={e => update("datos_personales", { ...data.datos_personales, nombre: e.target.value })} placeholder="Ej. María García López" />
            </Field>
            <Field label="Puesto / Profesión" help="El trabajo al que aspiras. Ej. 'Contadora Pública'." required>
              <input className={inputCls} value={data.datos_personales.puesto} onChange={e => update("datos_personales", { ...data.datos_personales, puesto: e.target.value })} placeholder="Ej. Desarrolladora Web" />
            </Field>
            <Field label="Correo electrónico" help="Un email que revises a diario.">
              <input className={inputCls} type="email" value={data.datos_personales.correo} onChange={e => update("datos_personales", { ...data.datos_personales, correo: e.target.value })} />
            </Field>
            <Field label="Teléfono" help="Incluye el código de país. Ej. +52 555 123 4567.">
              <input className={inputCls} value={data.datos_personales.telefono} onChange={e => update("datos_personales", { ...data.datos_personales, telefono: e.target.value })} />
            </Field>
            <Field label="Ubicación" help="Ciudad y país. No pongas tu dirección completa.">
              <input className={inputCls} value={data.datos_personales.ubicacion} onChange={e => update("datos_personales", { ...data.datos_personales, ubicacion: e.target.value })} placeholder="Ciudad de México, México" />
            </Field>
            <Field label="Foto (opcional)" help="Una foto reciente, fondo neutro. Se comprime automáticamente.">
              <input type="file" accept="image/*" onChange={e => onPhoto(e.target.files?.[0])} className="text-xs" />
              {data.datos_personales.foto_base64 && (
                <button type="button" onClick={() => update("datos_personales", { ...data.datos_personales, foto_base64: "" })} className="text-xs text-primary mt-1 underline">Quitar foto</button>
              )}
            </Field>
          </Section>

          <Section title="Experiencia">
            {data.experiencia.map((exp, i) => (
              <div key={i} className="border border-border rounded-md p-3 mb-2">
                <Field label="Empresa" help="Nombre de la empresa u organización.">
                  <input className={inputCls} value={exp.empresa} onChange={e => { const a = [...data.experiencia]; a[i] = { ...exp, empresa: e.target.value }; update("experiencia", a); }} />
                </Field>
                <Field label="Rol / Cargo" help="El puesto que desempeñaste.">
                  <input className={inputCls} value={exp.rol} onChange={e => { const a = [...data.experiencia]; a[i] = { ...exp, rol: e.target.value }; update("experiencia", a); }} />
                </Field>
                <Field label="Periodo" help="Fechas. Ej. 'Ene 2022 – Actual'.">
                  <input className={inputCls} value={exp.periodo} onChange={e => { const a = [...data.experiencia]; a[i] = { ...exp, periodo: e.target.value }; update("experiencia", a); }} />
                </Field>
                <Field label="Descripción" help="2 o 3 frases con tus logros. Empieza con verbo: 'Lideré...', 'Aumenté...'.">
                  <textarea className={inputCls} rows={3} value={exp.descripcion} onChange={e => { const a = [...data.experiencia]; a[i] = { ...exp, descripcion: e.target.value }; update("experiencia", a); }} />
                </Field>
                <button type="button" onClick={() => update("experiencia", data.experiencia.filter((_, j) => j !== i))} className="text-xs text-primary">Eliminar</button>
              </div>
            ))}
            <button type="button" onClick={() => update("experiencia", [...data.experiencia, { empresa: "", rol: "", periodo: "", descripcion: "" }])} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted">+ Agregar experiencia</button>
          </Section>

          <Section title="Educación">
            {data.educacion.map((ed, i) => (
              <div key={i} className="border border-border rounded-md p-3 mb-2">
                <Field label="Institución" help="Universidad, instituto o escuela.">
                  <input className={inputCls} value={ed.institucion} onChange={e => { const a = [...data.educacion]; a[i] = { ...ed, institucion: e.target.value }; update("educacion", a); }} />
                </Field>
                <Field label="Grado" help="Título o nivel. Ej. 'Licenciatura en Administración'.">
                  <input className={inputCls} value={ed.grado} onChange={e => { const a = [...data.educacion]; a[i] = { ...ed, grado: e.target.value }; update("educacion", a); }} />
                </Field>
                <Field label="Periodo" help="Ej. '2018 – 2022'.">
                  <input className={inputCls} value={ed.periodo} onChange={e => { const a = [...data.educacion]; a[i] = { ...ed, periodo: e.target.value }; update("educacion", a); }} />
                </Field>
                <button type="button" onClick={() => update("educacion", data.educacion.filter((_, j) => j !== i))} className="text-xs text-primary">Eliminar</button>
              </div>
            ))}
            <button type="button" onClick={() => update("educacion", [...data.educacion, { institucion: "", grado: "", periodo: "" }])} className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted">+ Agregar educación</button>
          </Section>

          <Section title="Habilidades">
            <div className="flex gap-2 mb-2">
              <input className={inputCls} value={skillInput} onChange={e => setSkillInput(e.target.value)} placeholder="Ej. Excel avanzado" onKeyDown={e => { if (e.key === "Enter" && skillInput.trim()) { e.preventDefault(); update("habilidades", [...data.habilidades, skillInput.trim()]); setSkillInput(""); } }} />
              <button type="button" onClick={() => { if (skillInput.trim()) { update("habilidades", [...data.habilidades, skillInput.trim()]); setSkillInput(""); } }} className="px-3 rounded-md bg-primary text-primary-foreground text-sm">+</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.habilidades.map((s, i) => (
                <span key={i} className="bg-muted text-xs px-2 py-1 rounded-md inline-flex items-center gap-1">
                  {s}
                  <button onClick={() => update("habilidades", data.habilidades.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-primary">×</button>
                </span>
              ))}
            </div>
          </Section>

          <div className="flex flex-wrap gap-2 mt-4">
            <button onClick={exportJSON} className="text-xs px-3 py-2 rounded-md border border-border hover:bg-muted">Exportar JSON</button>
            <button onClick={exportMD} className="text-xs px-3 py-2 rounded-md border border-border hover:bg-muted">Exportar Markdown</button>
            <button onClick={reset} className="text-xs px-3 py-2 rounded-md border border-border hover:bg-muted">Reiniciar</button>
          </div>
        </div>

        {/* PREVIEW */}
        <div className="min-w-0">
          {overflowWarn && (
            <div className="mb-3 p-3 rounded-md bg-primary text-primary-foreground text-sm font-medium">
              ⚠ Has alcanzado el límite máximo de 2 páginas. Considera recortar texto.
            </div>
          )}
          <div ref={previewRef} className="overflow-auto bg-muted/50 p-2 sm:p-4 rounded-lg max-h-[80vh]">
            <CVPreview data={debounced} />
          </div>
        </div>
      </main>

      {/* Footer */}
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

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function CVPreview({ data }: { data: CVData }) {
  const { plantilla, fuente, mostrar_foto } = data.config;
  const dp = data.datos_personales;
  const style: React.CSSProperties = { fontFamily: fuente };

  // Estimate splitting into 2 pages: use a single paper but allow content to grow
  // We render up to 2 .cv-paper divs; second page only if content suggests overflow.
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

function HarvardTemplate({ data, mostrar_foto }: { data: CVData; mostrar_foto: boolean }) {
  const dp = data.datos_personales;
  return (
    <div>
      <header className="text-center border-b-2 border-black pb-3 mb-4">
        {mostrar_foto && dp.foto_base64 && <img src={dp.foto_base64} alt="" className="w-24 h-24 rounded-full object-cover mx-auto mb-2" />}
        <h1 className="text-2xl font-bold tracking-wide">{dp.nombre || "Tu Nombre"}</h1>
        <p className="text-sm italic">{dp.puesto}</p>
        <p className="text-xs mt-1">{[dp.correo, dp.telefono, dp.ubicacion].filter(Boolean).join(" • ")}</p>
      </header>
      <Block title="EXPERIENCIA">
        {data.experiencia.map((e, i) => (
          <div key={i} className="mb-3">
            <div className="flex justify-between text-sm">
              <strong>{e.empresa}</strong>
              <span className="italic">{e.periodo}</span>
            </div>
            <div className="text-sm italic">{e.rol}</div>
            <p className="text-sm mt-1 whitespace-pre-line">{e.descripcion}</p>
          </div>
        ))}
      </Block>
      <Block title="EDUCACIÓN">
        {data.educacion.map((e, i) => (
          <div key={i} className="mb-2 text-sm flex justify-between">
            <span><strong>{e.institucion}</strong> — {e.grado}</span>
            <span className="italic">{e.periodo}</span>
          </div>
        ))}
      </Block>
      {data.habilidades.length > 0 && (
        <Block title="HABILIDADES">
          <p className="text-sm">{data.habilidades.join(" • ")}</p>
        </Block>
      )}
    </div>
  );
}

function ModernTemplate({ data, mostrar_foto }: { data: CVData; mostrar_foto: boolean }) {
  const dp = data.datos_personales;
  return (
    <div>
      <header className="flex gap-4 items-center mb-5 pb-4 border-b-4 border-black">
        {mostrar_foto && dp.foto_base64 && <img src={dp.foto_base64} alt="" className="w-20 h-20 rounded object-cover" />}
        <div>
          <h1 className="text-3xl font-black">{dp.nombre || "Tu Nombre"}</h1>
          <p className="text-base">{dp.puesto}</p>
          <p className="text-xs mt-1 text-gray-700">{[dp.correo, dp.telefono, dp.ubicacion].filter(Boolean).join(" | ")}</p>
        </div>
      </header>
      <ModernBlock title="Experiencia">
        {data.experiencia.map((e, i) => (
          <div key={i} className="mb-3">
            <div className="flex justify-between"><strong className="text-sm">{e.rol} · {e.empresa}</strong><span className="text-xs">{e.periodo}</span></div>
            <p className="text-sm mt-1 whitespace-pre-line">{e.descripcion}</p>
          </div>
        ))}
      </ModernBlock>
      <ModernBlock title="Educación">
        {data.educacion.map((e, i) => <div key={i} className="text-sm mb-1"><strong>{e.grado}</strong> — {e.institucion} <span className="text-xs">({e.periodo})</span></div>)}
      </ModernBlock>
      {data.habilidades.length > 0 && (
        <ModernBlock title="Habilidades">
          <div className="flex flex-wrap gap-1">
            {data.habilidades.map((s, i) => <span key={i} className="text-xs border border-black px-2 py-0.5 rounded">{s}</span>)}
          </div>
        </ModernBlock>
      )}
    </div>
  );
}

function CompactTemplate({ data, mostrar_foto }: { data: CVData; mostrar_foto: boolean }) {
  const dp = data.datos_personales;
  return (
    <div className="text-sm">
      <header className="mb-3">
        <h1 className="text-xl font-bold">{dp.nombre || "Tu Nombre"} — <span className="font-normal">{dp.puesto}</span></h1>
        <p className="text-xs">{[dp.correo, dp.telefono, dp.ubicacion].filter(Boolean).join(" · ")}</p>
      </header>
      <h2 className="font-bold text-xs uppercase border-b border-black mt-3 mb-1">Experiencia</h2>
      {data.experiencia.map((e, i) => (
        <div key={i} className="mb-1">
          <strong>{e.rol}</strong>, {e.empresa} <em className="text-xs">({e.periodo})</em>
          <div className="text-xs whitespace-pre-line">{e.descripcion}</div>
        </div>
      ))}
      <h2 className="font-bold text-xs uppercase border-b border-black mt-3 mb-1">Educación</h2>
      {data.educacion.map((e, i) => <div key={i} className="text-xs"><strong>{e.grado}</strong>, {e.institucion} ({e.periodo})</div>)}
      {data.habilidades.length > 0 && (
        <>
          <h2 className="font-bold text-xs uppercase border-b border-black mt-3 mb-1">Habilidades</h2>
          <p className="text-xs">{data.habilidades.join(", ")}</p>
        </>
      )}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h2 className="text-sm font-bold border-b border-black mb-2 tracking-widest">{title}</h2>
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
