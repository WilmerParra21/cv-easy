import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIsMobile } from "../hooks/use-mobile";
import { saveCVToGoogleDrive } from "../services/googleDrive";

type SkillGroup = { categoria: string; items: string };
type CVTemplateId = "harvard" | "modern" | "compact" | "creative" | "gradient";
type CVData = {
  config: { plantilla: CVTemplateId; fuente: string; mostrar_foto: boolean; accentColor: string };
  datos_personales: {
    nombre: string;
    puesto: string;
    correo: string;
    telefono: string;
    ubicacion: string;
    linkedin: string;
    foto_base64: string;
  };
  perfil: string;
  experiencia: Array<{
    empresa: string;
    rol: string;
    periodo: string;
    descripcion: string;
    logros: string;
  }>;
  educacion: Array<{ institucion: string; grado: string; periodo: string }>;
  certificaciones: Array<{ nombre: string; institucion: string; fecha: string }>;
  habilidades: SkillGroup[];
};

const STORAGE_KEY = "cv-help:data:v3";
const THEME_KEY = "cv-help:theme";
const LANGUAGE_KEY = "cv-help:language";
const WELCOME_KEY = "cv-help:welcome-dismissed:v2";
const DEFAULT_ACCENT_COLOR = "#1d4ed8";

const SAMPLE_DATA: CVData = {
  config: {
    plantilla: "harvard",
    fuente: "Times New Roman",
    mostrar_foto: false,
    accentColor: DEFAULT_ACCENT_COLOR,
  },
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
    {
      nombre: "Gestión Financiera para No Financieros",
      institucion: "ESIC Business School",
      fecha: "Octubre 2024",
    },
    {
      nombre: "Excel Avanzado para Administración",
      institucion: "Cámara de Comercio de Madrid",
      fecha: "Marzo 2023",
    },
    { nombre: "Atención al Cliente y Negociación", institucion: "CEPADE", fecha: "Junio 2022" },
  ],
  habilidades: [
    {
      categoria: "Gestión Administrativa",
      items:
        "Facturación, control de gastos, tesorería, archivo documental, gestión de proveedores",
    },
    {
      categoria: "Contabilidad y Finanzas",
      items: "Contabilidad básica, conciliaciones bancarias, presupuestos, informes financieros",
    },
    {
      categoria: "Herramientas Ofimáticas",
      items: "Microsoft Office (Excel avanzado, Word, PowerPoint), Google Workspace, SAP, Sage",
    },
    {
      categoria: "Habilidades Blandas",
      items:
        "Liderazgo de equipos, comunicación efectiva, organización, resolución de problemas, atención al detalle",
    },
    { categoria: "Idiomas", items: "Español (nativo), Inglés (B2 – First Certificate)" },
  ],
};

const EMPTY_DATA: CVData = {
  config: {
    plantilla: "harvard",
    fuente: "Times New Roman",
    mostrar_foto: false,
    accentColor: DEFAULT_ACCENT_COLOR,
  },
  datos_personales: {
    nombre: "",
    puesto: "",
    correo: "",
    telefono: "",
    ubicacion: "",
    linkedin: "",
    foto_base64: "",
  },
  perfil: "",
  experiencia: [{ empresa: "", rol: "", periodo: "", descripcion: "", logros: "" }],
  educacion: [{ institucion: "", grado: "", periodo: "" }],
  certificaciones: [],
  habilidades: [],
};

const TEMPLATE_OPTIONS: Array<{
  id: CVTemplateId;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
}> = [
  { id: "harvard", labelKey: "templateHarvardLabel", descriptionKey: "templateHarvardDescription" },
  { id: "modern", labelKey: "templateModernLabel", descriptionKey: "templateModernDescription" },
  { id: "compact", labelKey: "templateCompactLabel", descriptionKey: "templateCompactDescription" },
  {
    id: "creative",
    labelKey: "templateCreativeLabel",
    descriptionKey: "templateCreativeDescription",
  },
  {
    id: "gradient",
    labelKey: "templateGradientLabel",
    descriptionKey: "templateGradientDescription",
  },
];

const TEMPLATE_SAMPLE_DATA: Record<CVTemplateId, CVData> = {
  harvard: SAMPLE_DATA,
  modern: {
    ...SAMPLE_DATA,
    config: { ...SAMPLE_DATA.config, plantilla: "modern" },
    datos_personales: {
      nombre: "Martín Gómez Pérez",
      puesto: "Especialista en Marketing Digital",
      correo: "martin.gomez@ejemplo.com",
      telefono: "+34 622 123 456",
      ubicacion: "Barcelona, España",
      linkedin: "martin-gomez-marketing",
      foto_base64: "",
    },
    perfil:
      "Profesional en marketing digital con experiencia en generación de leads, campañas de publicidad online y análisis de métricas. Enfocado en la mejora del ROI mediante contenido estratégico, automatización y optimización de funnels.",
    experiencia: [
      {
        empresa: "Agencia Nova Marketing – Barcelona, España",
        rol: "Coordinador de Marketing Digital",
        periodo: "Enero 2023 – Presente",
        descripcion:
          "Lidero campañas de inbound marketing y publicidad digital para clientes B2B y B2C.",
        logros:
          "Aumenté el tráfico orgánico en un 45% en 6 meses mediante estrategia SEO y contenido de valor.\nReduje el coste por lead en un 30% mediante optimización de campañas en Google Ads y Meta Ads.",
      },
    ],
    educacion: [
      {
        institucion: "Universidad de Barcelona",
        grado: "Grado en Marketing y Publicidad",
        periodo: "Septiembre 2015 – Junio 2019",
      },
    ],
    certificaciones: [
      { nombre: "Google Ads Search", institucion: "Google", fecha: "2024" },
      { nombre: "Analítica Web", institucion: "Google Analytics Academy", fecha: "2023" },
    ],
    habilidades: [
      {
        categoria: "Marketing Digital",
        items: "SEO, SEM, Google Analytics, Meta Ads, email marketing",
      },
      { categoria: "Estrategia", items: "Automatización, embudos de conversión, contenidos, CRO" },
    ],
  },
  compact: {
    ...SAMPLE_DATA,
    config: { ...SAMPLE_DATA.config, plantilla: "compact" },
    datos_personales: {
      nombre: "Lucía Salas León",
      puesto: "Desarrolladora Full Stack",
      correo: "lucia.salas@ejemplo.com",
      telefono: "+34 610 987 654",
      ubicacion: "Valencia, España",
      linkedin: "lucia-salas-fullstack",
      foto_base64: "",
    },
    perfil:
      "Desarrolladora full stack especializada en aplicaciones web con React, Node.js y bases de datos relacionales. Apasionada por el rendimiento, el diseño accesible y la escritura de código escalable.",
    experiencia: [
      {
        empresa: "TechWave Solutions – Valencia, España",
        rol: "Desarrolladora Full Stack",
        periodo: "Marzo 2022 – Presente",
        descripcion:
          "Desarrollo de productos SaaS y plataformas internas para clientes internacionales.",
        logros:
          "Diseñé y construí un panel administrativo que redujo el tiempo de gestión en un 25%.\nImplementé APIs RESTful y mejoras de rendimiento que aceleraron la carga en un 40%.",
      },
    ],
    educacion: [
      {
        institucion: "Politécnica de Valencia",
        grado: "Grado en Ingeniería Informática",
        periodo: "Septiembre 2014 – Junio 2018",
      },
    ],
    certificaciones: [
      { nombre: "AWS Cloud Practitioner", institucion: "Amazon Web Services", fecha: "2024" },
    ],
    habilidades: [
      { categoria: "Tecnologías", items: "React, TypeScript, Node.js, PostgreSQL, Docker" },
      { categoria: "Metodologías", items: "Agile, TDD, DevOps, CI/CD" },
    ],
  },
  creative: {
    ...SAMPLE_DATA,
    config: { ...SAMPLE_DATA.config, plantilla: "creative" },
    datos_personales: {
      nombre: "Noelia Ruiz Castillo",
      puesto: "Diseñadora UX/UI Creativa",
      correo: "noelia.ruiz@ejemplo.com",
      telefono: "+34 611 234 789",
      ubicacion: "Sevilla, España",
      linkedin: "noelia-ruiz-design",
      foto_base64: "",
    },
    perfil:
      "Diseñadora UX/UI con experiencia en productos digitales, branding y diseño de interfaces modernas. Combina creatividad con investigación de usuario para entregar experiencias memorables.",
    experiencia: [
      {
        empresa: "Studio Brío – Sevilla, España",
        rol: "Diseñadora UX/UI Senior",
        periodo: "Mayo 2022 – Presente",
        descripcion:
          "Diseño de interfaces y experiencia de usuario para aplicaciones móviles y webs de retail.",
        logros:
          "Aumenté la conversión de formularios en un 22% tras rediseñar la experiencia de onboarding.\nCreé un sistema de diseño que mejoró la consistencia visual y la velocidad de entrega de propuestas.",
      },
    ],
    educacion: [
      {
        institucion: "Escuela Superior de Diseño de Madrid",
        grado: "Máster en Diseño de Experiencia de Usuario",
        periodo: "Septiembre 2020 – Junio 2021",
      },
    ],
    certificaciones: [
      { nombre: "UX Design", institucion: "Interaction Design Foundation", fecha: "2023" },
    ],
    habilidades: [
      { categoria: "Diseño", items: "Figma, prototipado, diseño visual, investigación UX" },
      { categoria: "Herramientas", items: "Sketch, Adobe XD, Miro, Zeplin" },
    ],
  },
  gradient: {
    ...SAMPLE_DATA,
    config: { ...SAMPLE_DATA.config, plantilla: "gradient" },
    datos_personales: {
      nombre: "Felipe Cortés Navarro",
      puesto: "Product Manager",
      correo: "felipe.cortes@ejemplo.com",
      telefono: "+34 623 456 789",
      ubicacion: "Bilbao, España",
      linkedin: "felipe-cortes-product",
      foto_base64: "",
    },
    perfil:
      "Product Manager con experiencia en diseño de producto, priorización de roadmap y coordinación de equipos multidisciplinares. Enfocado en crear soluciones que aporten valor real al usuario.",
    experiencia: [
      {
        empresa: "Innovea Labs – Bilbao, España",
        rol: "Product Manager",
        periodo: "Julio 2023 – Presente",
        descripcion: "Dirijo el desarrollo de productos digitales en mercados fintech y ecommerce.",
        logros:
          "Lideré el lanzamiento de un nuevo producto que alcanzó los objetivos de adopción en el primer trimestre.\nMejoré la comunicación entre diseño y desarrollo con ceremonias ágiles enfocadas en resultado.",
      },
    ],
    educacion: [
      {
        institucion: "Universidad del País Vasco",
        grado: "Grado en Administración de Empresas",
        periodo: "Septiembre 2013 – Junio 2017",
      },
    ],
    certificaciones: [
      { nombre: "Scrum Product Owner", institucion: "Scrum Alliance", fecha: "2024" },
    ],
    habilidades: [
      {
        categoria: "Gestión de Producto",
        items: "Roadmap, estrategia, priorización, OKR, user stories",
      },
      { categoria: "Comunicación", items: "Stakeholders, workshops, research, métricas" },
    ],
  },
};

type Language = "es" | "en";
type TranslationKey = keyof (typeof TRANSLATIONS)["es"];

const FONTS = [
  { label: "Times New Roman (Serif)", value: "Times New Roman" },
  { label: "Georgia (Serif)", value: "Georgia" },
  { label: "Arial (Sans-Serif)", value: "Arial" },
  { label: "Helvetica (Sans-Serif)", value: "Helvetica" },
  { label: "Inter (Sans-Serif)", value: "Inter" },
  { label: "Calibri (Corporativa)", value: "Calibri" },
  { label: "Cambria (Corporativa)", value: "Cambria" },
];

const TRANSLATIONS: Record<Language, Record<string, string | string[]>> = {
  es: {
    appTitle: "CVrap",
    headerSubtitle: "CV profesional en minutos",
    headerTitle: "Crea tu Currículum en Minutos",
    headerDescription:
      "Editor intuitivo con vista previa en tiempo real. Elige entre plantillas profesionales y descárgalo listo para postular.",
    download: "Descargar",
    driveSave: "Guardar en Drive",
    driveSaving: "Guardando en Drive...",
    driveSaved: "Guardado en Drive",
    import: "Importar",
    loadExample: "Cargar ejemplo",
    clearData: "Vaciar datos",
    viewPreview: "Vista Previa",
    professionalTemplates: "Plantillas Profesionales",
    autosave: "Autoguardado",
    atsSecure: "Formato ATS Seguro",
    formTitle: "Formulario de Curriculum",
    templateTitle: "Plantilla",
    selectedTemplate: "Plantilla seleccionada",
    accentColor: "Color de acento",
    font: "Tipografía",
    fontHelp: "Fuente del CV. Las del sistema cargan más rápido.",
    colorAccentHelp: "Cambia el color principal de las plantillas con estilo.",
    fakeData: "Datos falsos",
    fakeDataActive: "Datos falsos activos",
    showPhotoCVDark: "Mostrar foto en el CV",
    uploadPhoto: "Subir foto",
    removePhoto: "Quitar foto",
    photoHelp: "JPG, PNG. Aparecerá en la vista previa del CV.",
    importFromJSON: "Desde JSON",
    importFromMarkdown: "Desde Markdown",
    email: "Correo electrónico",
    phone: "Teléfono",
    location: "Ubicación",
    linkedin: "LinkedIn (usuario)",
    sectionPersonal: "Datos Personales",
    sectionProfile: "Perfil Profesional",
    sectionEducation: "Educación",
    sectionCertifications: "Certificaciones",
    sectionExperience: "Experiencia",
    sectionSkills: "Habilidades (por categorías)",
    fieldName: "Nombre completo",
    fieldJob: "Puesto / Profesión",
    fieldPhoto: "Foto (opcional)",
    fieldSummary: "Resumen",
    fieldExperienceCompany: "Empresa y ubicación",
    fieldExperienceRole: "Rol / Cargo",
    fieldExperiencePeriod: "Periodo",
    fieldExperienceDescription: "Descripción breve",
    fieldExperienceAchievements: "Logros (uno por línea)",
    fieldEducationInstitution: "Institución",
    fieldEducationDegree: "Grado",
    fieldEducationPeriod: "Periodo",
    fieldCertificationName: "Nombre del curso o certificación",
    fieldCertificationInstitution: "Institución",
    fieldCertificationDate: "Fecha",
    fieldSkillsCategory: "Categoría",
    fieldSkillsItems: "Habilidades (separadas por comas)",
    nameHelp: "Tu nombre y apellido tal como quieres que aparezcan.",
    jobHelp: "El trabajo al que aspiras.",
    photoHelp: "JPG, PNG. Aparecerá en la vista previa del CV.",
    emailHelp: "Un email que revises a diario.",
    phoneHelp: "Incluye código de país.",
    locationHelp: "Ciudad y país.",
    linkedinHelp: "Solo el nombre de usuario de tu perfil de LinkedIn.",
    summaryHelp:
      "Un párrafo de 4-6 líneas resumiendo quién eres, tus años de experiencia y tus fortalezas.",
    experienceCompanyHelp: "Ej. 'Nombre Empresa, S.L. – Ciudad, País'.",
    experienceRoleHelp: "El puesto que desempeñaste.",
    experiencePeriodHelp: "Ej. 'Marzo 2022 – Presente'.",
    experienceDescriptionHelp: "Una línea que resuma el rol.",
    experienceAchievementsHelp: "Cada línea será un viñeta. Empieza con un verbo en pasado.",
    educationInstitutionHelp: "Nombre de la institución o centro educativo.",
    educationDegreeHelp: "Título, grado o formación.",
    educationPeriodHelp: "Fechas o periodo cursado.",
    certificationNameHelp: "Nombre del curso o certificación.",
    certificationInstitutionHelp: "Organización o escuela que expide la certificación.",
    certificationDateHelp: "Fecha de obtención o estudio.",
    skillsCategoryHelp: "Ej. 'Lenguajes y Frameworks'.",
    skillsItemsHelp: "Ej. 'React, Node.js, TypeScript'.",
    emailLabel: "Email",
    phoneLabel: "Teléfono",
    locationLabel: "Ubicación",
    linkedinLabel: "LinkedIn",
    footerCopyright: "© 2026 CVrap. Todos los derechos reservados.",
    footerMadeBy: "Desarrollado por",
    addEducation: "+ Agregar educación",
    addCertification: "+ Agregar certificación",
    addExperience: "+ Agregar experiencia",
    addSkillCategory: "+ Agregar categoría",
    exporting: "Exportando...",
    pdf: "PDF",
    toggleTheme: "Cambiar tema",
    remove: "Eliminar",
    cancel: "Cancelar",
    confirmClear: "Vaciar datos",
    confirmClearText:
      "Al vaciar los datos se eliminará todo el contenido actual y no se podrá recuperar. ¿Estás seguro?",
    loadExampleConfirmTitle: "Cargar ejemplo",
    loadExampleConfirmText:
      "Al cargar el ejemplo se limpiarán todos los datos actuales y se perderá el avance guardado. ¿Estás seguro?",
    previewTitle: "Vista previa del CV",
    close: "Cerrar",
    language: "Idioma",
    languageHelp: "Selecciona el idioma de la interfaz.",
    templateHarvardLabel: "Harvard",
    templateHarvardDescription: "Limpia, clásica y fácil de leer.",
    templateModernLabel: "Moderna",
    templateModernDescription: "Diseño con secciones claras y buena jerarquía.",
    templateCompactLabel: "Compacta",
    templateCompactDescription: "Formato compacto para una sola página.",
    templateCreativeLabel: "Creative",
    templateCreativeDescription: "Panel lateral creativo con estilo moderno.",
    templateGradientLabel: "Gradient",
    templateGradientDescription: "Cabecera degradada y secciones sofisticadas.",
  },
  en: {
    appTitle: "CVrap",
    headerSubtitle: "Professional CV in minutes",
    headerTitle: "Create Your Resume in Minutes",
    headerDescription:
      "Intuitive editor with real-time preview. Choose professional templates and download it ready to apply.",
    download: "Download",
    driveSave: "Save to Drive",
    driveSaving: "Saving to Drive...",
    driveSaved: "Saved to Drive",
    import: "Import",
    loadExample: "Load example",
    clearData: "Clear data",
    viewPreview: "Preview",
    professionalTemplates: "Professional Templates",
    autosave: "Autosave",
    atsSecure: "ATS-Safe Format",
    formTitle: "Resume Form",
    templateTitle: "Template",
    selectedTemplate: "Selected template",
    accentColor: "Accent color",
    font: "Font",
    fontHelp: "System fonts load faster.",
    colorAccentHelp: "Change the main accent color for styled templates.",
    fakeData: "Fake data",
    fakeDataActive: "Fake data active",
    showPhotoCVDark: "Show photo on CV",
    uploadPhoto: "Upload photo",
    removePhoto: "Remove photo",
    photoHelp: "JPG, PNG. It will appear in the CV preview.",
    importFromJSON: "From JSON",
    importFromMarkdown: "From Markdown",
    email: "Email",
    phone: "Phone",
    location: "Location",
    linkedin: "LinkedIn (handle)",
    sectionPersonal: "Personal Information",
    sectionProfile: "Professional profile",
    sectionEducation: "Education",
    sectionCertifications: "Certifications",
    sectionExperience: "Experience",
    sectionSkills: "Skills (by category)",
    fieldName: "Full name",
    fieldJob: "Position / Profession",
    fieldPhoto: "Photo (optional)",
    fieldSummary: "Summary",
    fieldExperienceCompany: "Company and location",
    fieldExperienceRole: "Role / Position",
    fieldExperiencePeriod: "Period",
    fieldExperienceDescription: "Brief description",
    fieldExperienceAchievements: "Achievements (one per line)",
    fieldEducationInstitution: "Institution",
    fieldEducationDegree: "Degree",
    fieldEducationPeriod: "Period",
    fieldCertificationName: "Course or certification name",
    fieldCertificationInstitution: "Institution",
    fieldCertificationDate: "Date",
    fieldSkillsCategory: "Category",
    fieldSkillsItems: "Skills (comma separated)",
    nameHelp: "Your full name as it should appear.",
    jobHelp: "The job you are applying for.",
    photoHelp: "JPG, PNG. It will appear in the CV preview.",
    emailHelp: "An email you check every day.",
    phoneHelp: "Include your country code.",
    locationHelp: "City and country.",
    linkedinHelp: "Only your LinkedIn username.",
    summaryHelp: "A 4-6 line paragraph summarizing who you are, your experience and strengths.",
    experienceCompanyHelp: "E.g. 'Company Name, Inc. – City, Country'.",
    experienceRoleHelp: "The position you held.",
    experiencePeriodHelp: "E.g. 'March 2022 – Present'.",
    experienceDescriptionHelp: "One line that summarizes the role.",
    experienceAchievementsHelp: "Each line becomes a bullet. Start with a past-tense verb.",
    educationInstitutionHelp: "Name of the institution or school.",
    educationDegreeHelp: "Degree or qualification.",
    educationPeriodHelp: "Dates or period attended.",
    certificationNameHelp: "Course or certification name.",
    certificationInstitutionHelp: "Issuing organization or school.",
    certificationDateHelp: "Date obtained.",
    skillsCategoryHelp: "e.g. 'Languages and Frameworks'.",
    skillsItemsHelp: "e.g. 'React, Node.js, TypeScript'.",
    emailLabel: "Email",
    phoneLabel: "Phone",
    locationLabel: "Location",
    linkedinLabel: "LinkedIn",
    footerCopyright: "© 2026 CVrap. All rights reserved.",
    footerMadeBy: "Built by",
    addEducation: "+ Add education",
    addCertification: "+ Add certification",
    addExperience: "+ Add experience",
    addSkillCategory: "+ Add category",
    exporting: "Exporting...",
    pdf: "PDF",
    toggleTheme: "Toggle theme",
    addSkillCategory: "+ Add category",
    remove: "Remove",
    cancel: "Cancel",
    confirmClear: "Clear data",
    confirmClearText:
      "Clearing data will remove all current content and cannot be recovered. Are you sure?",
    loadExampleConfirmTitle: "Load example",
    loadExampleConfirmText:
      "Loading the example will erase current data and saved progress. Are you sure?",
    previewTitle: "CV Preview",
    close: "Close",
    language: "Language",
    languageHelp: "Select the interface language.",
    templateHarvardLabel: "Harvard",
    templateHarvardDescription: "Clean, classic and easy to read.",
    templateModernLabel: "Modern",
    templateModernDescription: "A design with clear sections and strong hierarchy.",
    templateCompactLabel: "Compact",
    templateCompactDescription: "A compact format for a one-page resume.",
    templateCreativeLabel: "Creative",
    templateCreativeDescription: "A creative sidebar layout with modern style.",
    templateGradientLabel: "Gradient",
    templateGradientDescription: "A polished header and elegant section styling.",
  },
};

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
      <button
        type="button"
        aria-label="Ayuda"
        className="w-4 h-4 rounded-full bg-muted text-muted-foreground text-[10px] leading-4 inline-flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition"
      >
        ?
      </button>
      <span className="tt">{text}</span>
    </span>
  );
}

function Field(props: {
  label: string;
  help: string;
  required?: boolean;
  children: React.ReactNode;
}) {
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

const inputCls =
  "w-full px-4 py-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 spellcheck";

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg mb-3 bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex justify-between items-center px-4 py-3 text-sm font-semibold"
      >
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
    try {
      const parsed = JSON.parse(decodeURIComponent(escape(atob(m[1]))));
      return { ...EMPTY_DATA, ...parsed, config: { ...EMPTY_DATA.config, ...parsed.config } };
    } catch {}
  }
  return null;
}

const IconFile = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
  </svg>
);

const IconCode = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <path d="M16 18l6-6-6-6" />
    <path d="M8 6l-6 6 6 6" />
  </svg>
);

const IconWord = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <path d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
    <path d="M7 7h10" />
    <path d="M7 12h10" />
    <path d="M7 17h6" />
  </svg>
);

const IconSpinner = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5 animate-spin"
  >
    <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
    <path d="M22 12a10 10 0 0 0-10-10" />
  </svg>
);

const IconSun = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4"
  >
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
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z" />
  </svg>
);

const IconLanguage = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4"
  >
    <circle cx="12" cy="12" r="8" />
    <path d="M4 12h16" />
    <path d="M12 4a8 8 0 0 1 0 16" />
    <path d="M8 4a8 8 0 0 0 0 16" />
  </svg>
);

const IconEye = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconDocument = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <line x1="9" y1="13" x2="15" y2="13" />
    <line x1="9" y1="17" x2="15" y2="17" />
  </svg>
);

const IconSave = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const IconDownload = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M5 21h14" />
  </svg>
);

const IconRefresh = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5"
  >
    <path d="M20 11a8.1 8.1 0 0 0-14.7-3L3 11" />
    <path d="M3 4v7h7" />
    <path d="M4 13a8.1 8.1 0 0 0 14.7 3L21 13" />
    <path d="M21 20v-7h-7" />
  </svg>
);

const IconDrive = (
  <svg aria-hidden="true" viewBox="0 0 48 48" className="drive-logo" role="img">
    <path fill="#0F9D58" d="M16.2 7h9.5l13.1 22.7-4.8 8.3h-9.5l4.8-8.3L16.2 7Z" />
    <path fill="#F4B400" d="M16.2 7 4 28.1l4.8 8.3h9.6l4.7-8.3L20.9 7h-4.7Z" />
    <path fill="#4285F4" d="M8.8 36.4h25.2L29.2 44H13.6c-3.7 0-6.8-2-8.5-5.1l3.7-2.5Z" />
  </svg>
);

const IconWarning = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-6 w-6"
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const IconUpload = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-6 w-6"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const IconTrash = (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

type MenuItem = {
  label: string;
  onClick?: () => void;
  icon?: JSX.Element | string;
  disabled?: boolean;
};
function Menu({
  label,
  items,
  variant = "ghost",
  icon,
}: {
  label: string;
  items: MenuItem[];
  variant?: "primary" | "secondary" | "ghost";
  icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const btnCls =
    variant === "primary"
      ? "h-10 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/20 hover:opacity-90 inline-flex items-center gap-1.5"
      : variant === "secondary"
        ? "h-10 px-4 py-2 rounded-md menu-secondary-btn text-sm font-semibold shadow-lg shadow-black/10 hover:bg-muted inline-flex items-center gap-1.5"
        : "h-10 px-4 py-2 rounded-md border border-border text-sm font-semibold hover:bg-muted inline-flex items-center gap-1.5";
  return (
    <div ref={ref} className="relative inline-block">
      <button type="button" onClick={() => setOpen((o) => !o)} className={btnCls}>
        {icon && <span className="menu-leading-icon">{icon}</span>}
        {label}
        <span className="text-[10px] opacity-70">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 min-w-[180px] rounded-md menu-panel shadow-xl z-30 py-1 animate-in fade-in zoom-in-95 duration-100">
          {items.map((it, i) => (
            <button
              key={i}
              onClick={() => {
                setOpen(false);
                it.onClick?.();
              }}
              disabled={it.disabled}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-[var(--foreground)] ${it.disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/80 hover:text-[var(--foreground)]"}`}
            >
              {it.icon && <span className="text-base">{it.icon}</span>}
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LanguageMenu({
  language,
  onChange,
}: {
  language: Language;
  onChange: (language: Language) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const selectLanguage = (nextLanguage: Language) => {
    onChange(nextLanguage);
    setOpen(false);
  };

  return (
    <div ref={ref} className="language-menu">
      <button
        type="button"
        className="language-menu-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Idioma"
      >
        {IconLanguage}
        <strong>{language === "es" ? "ES" : "EN"}</strong>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="language-menu-panel" role="menu">
          <button
            type="button"
            className={language === "es" ? "is-active" : ""}
            onClick={() => selectLanguage("es")}
            role="menuitem"
          >
            <span>Español (ES)</span>
            {language === "es" && <i aria-hidden="true" />}
          </button>
          <button
            type="button"
            className={language === "en" ? "is-active" : ""}
            onClick={() => selectLanguage("en")}
            role="menuitem"
          >
            <span>English (EN)</span>
            {language === "en" && <i aria-hidden="true" />}
          </button>
        </div>
      )}
    </div>
  );
}

export default function CVBuilder() {
  const [data, setData] = useState<CVData>(EMPTY_DATA);
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [showWelcome, setShowWelcome] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [showLoadExampleModal, setShowLoadExampleModal] = useState(false);
  const [sampleMode, setSampleMode] = useState(false);
  const [overflowWarn, setOverflowWarn] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [driveStatus, setDriveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [language, setLanguage] = useState<Language>("es");
  const [realData, setRealData] = useState<CVData>(EMPTY_DATA); // Guardar datos reales del usuario
  const isMobile = useIsMobile();
  const previewRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const importAcceptRef = useRef<string>(".json,.md,.txt");

  // Helper: Verificar si los datos están vacíos (sin contenido real del usuario)
  const isDataEmpty = (cvData: CVData): boolean => {
    const dp = cvData.datos_personales;
    const hasPersonalData =
      dp.nombre ||
      dp.puesto ||
      dp.correo ||
      dp.telefono ||
      dp.ubicacion ||
      dp.linkedin ||
      dp.foto_base64;
    const hasProfile = cvData.perfil;
    const hasExperience = cvData.experiencia.some(
      (e) => e.empresa || e.rol || e.descripcion || e.logros,
    );
    const hasEducation = cvData.educacion.some((e) => e.institucion || e.grado || e.periodo);
    const hasCertifications = cvData.certificaciones.length > 0;
    const hasSkills = cvData.habilidades.length > 0;

    return (
      !hasPersonalData &&
      !hasProfile &&
      !hasExperience &&
      !hasEducation &&
      !hasCertifications &&
      !hasSkills
    );
  };

  // Helper: Obtener datos de ejemplo según la plantilla
  const getTemplateSampleData = (plantilla: CVTemplateId): CVData => {
    const sample = TEMPLATE_SAMPLE_DATA[plantilla] || SAMPLE_DATA;
    return { ...sample, config: { ...data.config, plantilla } };
  };

  // Helper: Merge datos reales con datos de ejemplo (los datos reales tienen prioridad)
  const mergeWithSampleData = (realData: CVData, sampleData: CVData): CVData => {
    return {
      config: realData.config, // Mantener config actual
      datos_personales: {
        nombre: realData.datos_personales.nombre || sampleData.datos_personales.nombre,
        puesto: realData.datos_personales.puesto || sampleData.datos_personales.puesto,
        correo: realData.datos_personales.correo || sampleData.datos_personales.correo,
        telefono: realData.datos_personales.telefono || sampleData.datos_personales.telefono,
        ubicacion: realData.datos_personales.ubicacion || sampleData.datos_personales.ubicacion,
        linkedin: realData.datos_personales.linkedin || sampleData.datos_personales.linkedin,
        foto_base64:
          realData.datos_personales.foto_base64 || sampleData.datos_personales.foto_base64,
      },
      perfil: realData.perfil || sampleData.perfil,
      experiencia:
        realData.experiencia.length > 0 && realData.experiencia.some((e) => e.empresa || e.rol)
          ? realData.experiencia
          : sampleData.experiencia,
      educacion:
        realData.educacion.length > 0 && realData.educacion.some((e) => e.institucion || e.grado)
          ? realData.educacion
          : sampleData.educacion,
      certificaciones:
        realData.certificaciones.length > 0 ? realData.certificaciones : sampleData.certificaciones,
      habilidades: realData.habilidades.length > 0 ? realData.habilidades : sampleData.habilidades,
    };
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      let loadedData = EMPTY_DATA;
      let shouldActivateSampleMode = false;

      if (raw) {
        const parsed = JSON.parse(raw);
        loadedData = {
          ...EMPTY_DATA,
          ...parsed,
          config: { ...EMPTY_DATA.config, ...parsed.config },
        };

        // Si los datos cargados están vacíos, activar modo ejemplo por defecto
        if (isDataEmpty(loadedData)) {
          shouldActivateSampleMode = true;
          const sampleData = getTemplateSampleData(loadedData.config.plantilla);
          loadedData = sampleData;
        }
      } else {
        // Primera vez que entra (sin datos guardados), activar ejemplo
        shouldActivateSampleMode = true;
        loadedData = SAMPLE_DATA;
      }

      setData(loadedData);
      setSampleMode(shouldActivateSampleMode);
      setRealData(EMPTY_DATA); // Inicialmente no hay datos reales
    } catch {}

    const t = (localStorage.getItem(THEME_KEY) as "dark" | "light") || "light";
    setTheme(t);
    const savedLang = localStorage.getItem(LANGUAGE_KEY) as Language | null;
    if (savedLang === "es" || savedLang === "en") setLanguage(savedLang);
    if (!localStorage.getItem(WELCOME_KEY)) setShowWelcome(true);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_KEY, language);
    // Actualizar el atributo lang del documento para spellcheck
    document.documentElement.setAttribute("lang", language);
    // Actualizar todos los inputs y textareas para que usen el idioma correcto
    const inputs = document.querySelectorAll('input[type="text"], textarea');
    inputs.forEach((input) => {
      input.setAttribute("lang", language);
      input.setAttribute("spellcheck", "true");
    });
  }, [language]);

  const debounced = useDebounced(data, 300);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(debounced));
    } catch {}
  }, [debounced]);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const pages = el.querySelectorAll(".cv-paper");
    if (pages.length > 2) setOverflowWarn(true);
    else {
      const last = pages[pages.length - 1] as HTMLElement | undefined;
      if (last && last.scrollHeight > last.clientHeight + 4 && pages.length >= 2)
        setOverflowWarn(true);
      else setOverflowWarn(false);
    }
  }, [debounced]);

  const tr = (key: TranslationKey) => TRANSLATIONS[language][key] as string;

  const saveToDrive = async () => {
    if (driveStatus === "saving") return;
    setDriveStatus("saving");
    try {
      const el = previewRef.current?.querySelector(".cv-pages") as HTMLElement | null;
      let pdfBlob: Blob | undefined;
      if (el) {
        try {
          const mod = await import("html2pdf.js");
          const html2pdf = (mod as any).default ?? mod;
          pdfBlob = (await html2pdf()
            .set({
              margin: 0,
              image: { type: "jpeg", quality: 0.95 },
              html2canvas: { scale: 2, useCORS: true },
              jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
              pagebreak: { mode: ["css"] },
            })
            .from(el)
            .output("blob")) as Blob;
        } catch (pdfErr) {
          console.warn("No se pudo generar el PDF para Drive:", pdfErr);
        }
      }
      const pdfName = `CV - ${data.datos_personales.nombre || "CV"} - generado por CVrap.pdf`;
      await saveCVToGoogleDrive(data, pdfBlob, pdfName);
      setDriveStatus("saved");
      window.setTimeout(() => setDriveStatus("idle"), 2600);
    } catch (error) {
      setDriveStatus("idle");
      alert(
        error instanceof Error ? error.message : "No se pudo guardar el respaldo en Google Drive.",
      );
    }
  };

  const update = useCallback(<K extends keyof CVData>(key: K, value: CVData[K]) => {
    setData((d) => {
      const newData = { ...d, [key]: value };

      // Actualizar realData con los datos que el usuario está escribiendo
      setRealData((prev) => ({ ...prev, [key]: value }));

      return newData;
    });
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
            filename: `${data.datos_personales.nombre || "cv-help"}.pdf`,
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
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
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
    if (data.perfil) {
      lines.push("\n## Perfil profesional\n", data.perfil);
    }
    if (data.educacion.length) {
      lines.push("\n## Educación");
      data.educacion.forEach((e) =>
        lines.push(`- **${e.grado}** — ${e.institucion} _(${e.periodo})_`),
      );
    }
    if (data.certificaciones.length) {
      lines.push("\n## Certificaciones");
      data.certificaciones.forEach((c) =>
        lines.push(`- ${c.nombre} — ${c.institucion} (${c.fecha})`),
      );
    }
    if (data.experiencia.length) {
      lines.push("\n## Experiencia");
      data.experiencia.forEach((e) => {
        lines.push(`\n### ${e.rol} — ${e.empresa} _(${e.periodo})_`);
        if (e.descripcion) lines.push(e.descripcion);
        bullets(e.logros).forEach((b) => lines.push(`- ${b}`));
      });
    }
    if (data.habilidades.length) {
      lines.push("\n## Habilidades");
      data.habilidades.forEach((g) => lines.push(`- **${g.categoria}:** ${g.items}`));
    }
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    lines.push(`\n<!--CV_JSON:${b64}-->`);
    const name = (dp.nombre || "cv-help").replace(/\s+/g, "_");
    download(`${name}.md`, lines.join("\n"), "text/markdown");
  };
  const exportDOCX = () => {
    const el = previewRef.current?.querySelector(".cv-pages") as HTMLElement | null;
    if (!el) return;
    const html = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>CV</title><style>body{font-family:${data.config.fuente},serif;font-size:12px;color:#000;}h1{font-size:24px;margin:0 0 4px;}h2{font-size:14px;border-bottom:1px solid #000;padding-bottom:2px;margin:12px 0 6px;}ul{margin:4px 0;padding-left:20px;}p{margin:4px 0;}.cv-paper{padding:0;}header{text-align:center;}</style></head><body>${el.innerHTML}</body></html>`;
    const name = (data.datos_personales.nombre || "cv-help").replace(/\s+/g, "_");
    download(`${name}.doc`, html, "application/msword");
  };
  const handleImport = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      const parsed = parseImport(String(r.result));
      if (parsed) {
        setData(parsed);
        setRealData(parsed); // Los datos importados son datos reales
        setSampleMode(false); // Desactivar modo ejemplo al importar
      } else {
        alert("No se pudo leer el archivo.");
      }
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
    setRealData(EMPTY_DATA); // También limpiar datos reales
    setSampleMode(false); // Desactivar modo ejemplo
    localStorage.removeItem(STORAGE_KEY);
    setShowClearModal(false);
  };

  const cancelClearAll = () => {
    setShowClearModal(false);
  };

  const toggleSampleData = () => {
    if (!sampleMode) {
      // Activar: Merge datos reales con ejemplo
      const sampleData = getTemplateSampleData(data.config.plantilla);
      const merged = mergeWithSampleData(realData, sampleData);
      setData(merged);
      setSampleMode(true);
      return;
    }

    // Desactivar: Volver solo a los datos reales del usuario
    setData({ ...realData, config: data.config });
    setSampleMode(false);
  };

  const requestLoadExample = () => {
    setShowLoadExampleModal(true);
  };

  const confirmLoadExample = () => {
    setData(SAMPLE_DATA);
    setRealData(EMPTY_DATA); // Limpiar datos reales al cargar ejemplo
    setSampleMode(true); // Activar modo ejemplo
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_DATA));
    } catch {}
    setShowLoadExampleModal(false);
  };

  const cancelLoadExample = () => {
    setShowLoadExampleModal(false);
  };

  const downloadItems: MenuItem[] = [
    {
      label: isExportingPDF ? tr("exporting") : tr("pdf"),
      icon: isExportingPDF ? IconSpinner : IconFile,
      onClick: isExportingPDF ? undefined : exportPDF,
      disabled: isExportingPDF,
    },
    { label: "Word (.doc)", icon: IconWord, onClick: exportDOCX },
    { label: "JSON", icon: IconCode, onClick: exportJSON },
    { label: "Markdown (.md)", icon: IconCode, onClick: exportMD },
  ];
  const importItems: MenuItem[] = [
    { label: tr("importFromJSON"), icon: IconCode, onClick: () => triggerImport(".json") },
    { label: tr("importFromMarkdown"), icon: IconCode, onClick: () => triggerImport(".md,.txt") },
  ];

  return (
    <div className="min-h-screen flex flex-col relative">
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 modal-backdrop">
          <div className="modal-card rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="flex-none w-12 h-12 rounded-3xl bg-primary/10 text-primary flex items-center justify-center">
                {IconWarning}
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-semibold tracking-tight">{tr("confirmClear")}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{tr("confirmClearText")}</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={cancelClearAll}
                className="w-full sm:w-auto rounded-full modal-cancel-btn px-4 py-2 text-sm transition"
              >
                {tr("cancel")}
              </button>
              <button
                onClick={confirmClearAll}
                className="w-full sm:w-auto rounded-full modal-primary-btn px-4 py-2 text-sm font-semibold"
              >
                {tr("confirmClear")}
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
                <h2 className="text-xl font-semibold tracking-tight">
                  {tr("loadExampleConfirmTitle")}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">{tr("loadExampleConfirmText")}</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                onClick={cancelLoadExample}
                className="w-full sm:w-auto rounded-full modal-cancel-btn px-4 py-2 text-sm transition"
              >
                {tr("cancel")}
              </button>
              <button
                onClick={confirmLoadExample}
                className="w-full sm:w-auto rounded-full modal-primary-btn px-4 py-2 text-sm font-semibold"
              >
                {tr("loadExample")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 modal-backdrop">
          <div className="modal-card rounded-3xl shadow-2xl w-full max-w-4xl max-h-[calc(100vh-2rem)] sm:max-h-[90vh] overflow-visible flex flex-col">
            <div className="modal-header flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-xl font-semibold tracking-tight">{tr("previewTitle")}</h2>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="modal-close-btn"
                aria-label={tr("close")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto modal-body bg-gray-100 dark:bg-gray-900">
              <div className="preview-panel border border-[var(--border)] bg-[var(--popover)] p-3 sm:p-5 rounded-3xl overflow-x-auto overflow-y-auto transition max-w-none mx-auto">
                <CVPreview data={debounced} tr={tr} />
              </div>
            </div>
            <div className="p-4 border-t border-border flex justify-center gap-3">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-6 py-2 rounded-full modal-cancel-btn text-sm transition"
              >
                {tr("close")}
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-50 border-b border-border/50 backdrop-blur-xl bg-white/95 dark:bg-[var(--card)]/95 supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-[var(--card)]/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-6">
            {/* Logo y Brand */}
            <div className="flex items-center gap-3">
              <img src="/cvrap-icon.svg" alt="CVrap" className="brand-mark" />
              <div className="flex flex-col">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                  <span>CVrap</span>
                </h1>
                <p className="hidden sm:block text-xs text-muted-foreground">
                  {tr("headerSubtitle")}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <LanguageMenu language={language} onChange={setLanguage} />

              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label={tr("toggleTheme")}
                className="w-10 h-10 rounded-xl border border-border hover:border-primary/50 bg-[var(--input)] hover:bg-[var(--card)] theme-toggle-btn transition-all duration-200 inline-flex items-center justify-center shadow-sm"
              >
                {theme === "dark" ? IconSun : IconMoon}
              </button>

              <button
                type="button"
                onClick={saveToDrive}
                disabled={driveStatus === "saving"}
                title={tr("driveSave")}
                className="drive-save-btn h-10 px-3 rounded-xl border border-border bg-[var(--input)] text-sm font-semibold inline-flex items-center gap-2 shadow-sm transition disabled:cursor-wait disabled:opacity-70"
              >
                <span className="drive-logo-wrap">{IconDrive}</span>
                <span className="hidden lg:inline">
                  {driveStatus === "saving"
                    ? tr("driveSaving")
                    : driveStatus === "saved"
                      ? tr("driveSaved")
                      : tr("driveSave")}
                </span>
              </button>

              {/* Download Button */}
              <Menu label={tr("download")} variant="primary" items={downloadItems} />
            </div>
          </div>
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
            {tr("headerTitle")}
          </h2>

          <p className="text-muted-foreground text-base sm:text-lg lg:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
            {tr("headerDescription")}
          </p>

          <div className="flex flex-wrap justify-center items-center gap-3 mb-8">
            <Menu
              label={`${tr("download")} PDF`}
              icon={IconDownload}
              variant="primary"
              items={downloadItems}
            />
            <button
              onClick={requestLoadExample}
              className="hero-secondary-button h-10 px-4 py-2 rounded-md border border-border text-sm font-semibold hover:bg-muted inline-flex items-center gap-1.5"
            >
              {IconRefresh}
              {tr("loadExample")}
            </button>
            <Menu label={tr("import")} icon={IconUpload} variant="secondary" items={importItems} />
            <input
              ref={importInputRef}
              type="file"
              accept=".json,.md,.txt"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
            />
          </div>

          <div className="flex flex-wrap justify-center items-center gap-6 max-w-2xl mx-auto">
            {[
              { icon: IconEye, text: "Vista Previa en Vivo" },
              { icon: IconDocument, text: tr("professionalTemplates") },
              { icon: "✓", text: tr("atsSecure") },
            ].map((feature) => (
              <div
                key={feature.text}
                className="hero-feature inline-flex items-center gap-2.5 text-sm font-medium text-foreground/80"
              >
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
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-white shadow-lg shadow-primary/25 transition hover:scale-105 active:scale-95 font-semibold text-sm animate-pulse hover:animate-none"
          aria-label={tr("viewPreview")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span>{tr("viewPreview")}</span>
        </button>
      )}

      <main className="flex-1 relative">
        <div className="md:grid md:grid-cols-2 md:gap-6 md:p-6">
          {/* Form - scrolls independently on desktop and tablets */}
          <div className="md:order-1 min-w-0 pb-20 px-4 sm:px-0">
            {/* FORM */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3 px-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {tr("formTitle")}
              </span>
              <button
                onClick={clearAll}
                className="h-10 px-4 py-2 rounded-full border border-border text-sm font-semibold hover:bg-muted transition inline-flex items-center gap-2"
              >
                <span className="inline-flex">{IconTrash}</span>
                {tr("clearData")}
              </button>
            </div>
            <div className="border border-border rounded-lg p-4 mb-3 bg-card">
              <div className="text-sm font-semibold mb-3">{tr("templateTitle")}</div>
              <div className="mb-4">
                <label className="block text-xs font-medium mb-2 text-muted-foreground">
                  {tr("selectedTemplate")}
                </label>
                <div className="relative">
                  <select
                    value={data.config.plantilla}
                    onChange={(e) => {
                      const plantilla = e.target.value as CVTemplateId;
                      const config = { ...data.config, plantilla };
                      if (sampleMode) {
                        setData({ ...TEMPLATE_SAMPLE_DATA[plantilla], config });
                      } else {
                        update("config", config);
                      }
                    }}
                    className="w-full appearance-none rounded-2xl border border-border bg-[var(--input)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    {TEMPLATE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {tr(option.labelKey)}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-muted-foreground">
                    ▾
                  </span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {tr(
                    TEMPLATE_OPTIONS.find((opt) => opt.id === data.config.plantilla)
                      ?.descriptionKey || "templateHarvardDescription",
                  )}
                </p>
              </div>
              <label className="inline-flex items-center gap-3 rounded-full bg-card px-3 py-2 border border-border mb-4">
                <span
                  className="relative inline-flex h-6 w-11 items-center rounded-full bg-muted transition-colors duration-200"
                  style={{ backgroundColor: sampleMode ? "#0ea5e9" : "#e2e8f0" }}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={sampleMode}
                    onChange={toggleSampleData}
                  />
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${sampleMode ? "translate-x-5" : "translate-x-1"}`}
                  ></span>
                </span>
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  {tr("fakeData")}
                </span>
              </label>
              <Field label={tr("language")} help={tr("languageHelp")}>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className={inputCls}
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </Field>
              <Field label={tr("font")} help={tr("fontHelp")}>
                <select
                  value={data.config.fuente}
                  onChange={(e) => update("config", { ...data.config, fuente: e.target.value })}
                  className={inputCls}
                >
                  {FONTS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </Field>
              {["creative", "gradient"].includes(data.config.plantilla) && (
                <Field label={tr("accentColor")} help={tr("colorAccentHelp")}>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="color"
                      value={data.config.accentColor}
                      onChange={(e) =>
                        update("config", { ...data.config, accentColor: e.target.value })
                      }
                      className="h-10 w-14 rounded-xl border border-border p-0"
                    />
                    <input
                      type="text"
                      value={data.config.accentColor}
                      onChange={(e) =>
                        update("config", { ...data.config, accentColor: e.target.value })
                      }
                      className={inputCls + " max-w-[140px]"}
                    />
                  </div>
                </Field>
              )}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.config.mostrar_foto}
                  onChange={(e) =>
                    update("config", { ...data.config, mostrar_foto: e.target.checked })
                  }
                />
                {tr("showPhotoCVDark")}
              </label>
            </div>

            <Section title={tr("sectionPersonal")}>
              <Field label={tr("fieldName")} help={tr("nameHelp")} required>
                <input
                  className={inputCls}
                  value={data.datos_personales.nombre}
                  onChange={(e) =>
                    update("datos_personales", { ...data.datos_personales, nombre: e.target.value })
                  }
                />
              </Field>
              <Field label={tr("fieldJob")} help={tr("jobHelp")} required>
                <input
                  className={inputCls}
                  value={data.datos_personales.puesto}
                  onChange={(e) =>
                    update("datos_personales", { ...data.datos_personales, puesto: e.target.value })
                  }
                />
              </Field>
              <Field label={tr("fieldPhoto")} help={tr("photoHelp")}>
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="flex h-32 w-32 items-center justify-center rounded-full border-2 border-dashed border-muted bg-secondary/80">
                    {data.datos_personales.foto_base64 ? (
                      <img
                        src={data.datos_personales.foto_base64}
                        alt="Foto de perfil"
                        className="h-28 w-28 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        {IconUpload}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="photo-upload"
                      className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold cursor-pointer transition hover:opacity-95"
                    >
                      {IconUpload}
                      {tr("uploadPhoto")}
                    </label>
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={(e) => onPhoto(e.target.files?.[0])}
                      className="sr-only"
                    />
                    {data.datos_personales.foto_base64 && (
                      <button
                        type="button"
                        onClick={() =>
                          update("datos_personales", { ...data.datos_personales, foto_base64: "" })
                        }
                        className="text-sm text-primary underline"
                      >
                        {tr("removePhoto")}
                      </button>
                    )}
                    <p className="text-xs text-muted-foreground">{tr("photoHelp")}</p>
                  </div>
                </div>
              </Field>
              <Field label={tr("email")} help={tr("emailHelp")}>
                <input
                  className={inputCls}
                  type="email"
                  value={data.datos_personales.correo}
                  onChange={(e) =>
                    update("datos_personales", { ...data.datos_personales, correo: e.target.value })
                  }
                />
              </Field>
              <Field label={tr("phone")} help={tr("phoneHelp")}>
                <input
                  className={inputCls}
                  value={data.datos_personales.telefono}
                  onChange={(e) =>
                    update("datos_personales", {
                      ...data.datos_personales,
                      telefono: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label={tr("location")} help={tr("locationHelp")}>
                <input
                  className={inputCls}
                  value={data.datos_personales.ubicacion}
                  onChange={(e) =>
                    update("datos_personales", {
                      ...data.datos_personales,
                      ubicacion: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label={tr("linkedin")} help={tr("linkedinHelp")}>
                <input
                  className={inputCls}
                  value={data.datos_personales.linkedin}
                  onChange={(e) =>
                    update("datos_personales", {
                      ...data.datos_personales,
                      linkedin: e.target.value,
                    })
                  }
                />
              </Field>
            </Section>

            <Section title={tr("sectionProfile")}>
              <Field label={tr("fieldSummary")} help={tr("summaryHelp")}>
                <textarea
                  className={inputCls}
                  rows={6}
                  value={data.perfil}
                  onChange={(e) => update("perfil", e.target.value)}
                />
              </Field>
            </Section>

            <Section title={tr("sectionEducation")}>
              {data.educacion.map((ed, i) => (
                <div key={i} className="border border-border rounded-md p-3 mb-2">
                  <Field
                    label={tr("fieldEducationInstitution")}
                    help={tr("educationInstitutionHelp")}
                  >
                    <input
                      className={inputCls}
                      value={ed.institucion}
                      onChange={(e) => {
                        const a = [...data.educacion];
                        a[i] = { ...ed, institucion: e.target.value };
                        update("educacion", a);
                      }}
                    />
                  </Field>
                  <Field label={tr("fieldEducationDegree")} help={tr("educationDegreeHelp")}>
                    <input
                      className={inputCls}
                      value={ed.grado}
                      onChange={(e) => {
                        const a = [...data.educacion];
                        a[i] = { ...ed, grado: e.target.value };
                        update("educacion", a);
                      }}
                    />
                  </Field>
                  <Field label={tr("fieldEducationPeriod")} help={tr("educationPeriodHelp")}>
                    <input
                      className={inputCls}
                      value={ed.periodo}
                      onChange={(e) => {
                        const a = [...data.educacion];
                        a[i] = { ...ed, periodo: e.target.value };
                        update("educacion", a);
                      }}
                    />
                  </Field>
                  <button
                    type="button"
                    onClick={() =>
                      update(
                        "educacion",
                        data.educacion.filter((_, j) => j !== i),
                      )
                    }
                    className="text-xs text-primary"
                  >
                    {tr("remove")}
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  update("educacion", [
                    ...data.educacion,
                    { institucion: "", grado: "", periodo: "" },
                  ])
                }
                className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted"
              >
                {tr("addEducation")}
              </button>
            </Section>

            <Section title={tr("sectionCertifications")}>
              {data.certificaciones.map((c, i) => (
                <div key={i} className="border border-border rounded-md p-3 mb-2">
                  <Field label={tr("fieldCertificationName")} help={tr("certificationNameHelp")}>
                    <input
                      className={inputCls}
                      value={c.nombre}
                      onChange={(e) => {
                        const a = [...data.certificaciones];
                        a[i] = { ...c, nombre: e.target.value };
                        update("certificaciones", a);
                      }}
                    />
                  </Field>
                  <Field
                    label={tr("fieldCertificationInstitution")}
                    help={tr("certificationInstitutionHelp")}
                  >
                    <input
                      className={inputCls}
                      value={c.institucion}
                      onChange={(e) => {
                        const a = [...data.certificaciones];
                        a[i] = { ...c, institucion: e.target.value };
                        update("certificaciones", a);
                      }}
                    />
                  </Field>
                  <Field label={tr("fieldCertificationDate")} help={tr("certificationDateHelp")}>
                    <input
                      className={inputCls}
                      value={c.fecha}
                      onChange={(e) => {
                        const a = [...data.certificaciones];
                        a[i] = { ...c, fecha: e.target.value };
                        update("certificaciones", a);
                      }}
                    />
                  </Field>
                  <button
                    type="button"
                    onClick={() =>
                      update(
                        "certificaciones",
                        data.certificaciones.filter((_, j) => j !== i),
                      )
                    }
                    className="text-xs text-primary"
                  >
                    {tr("remove")}
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  update("certificaciones", [
                    ...data.certificaciones,
                    { nombre: "", institucion: "", fecha: "" },
                  ])
                }
                className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted"
              >
                {tr("addCertification")}
              </button>
            </Section>

            <Section title={tr("sectionExperience")}>
              {data.experiencia.map((exp, i) => (
                <div key={i} className="border border-border rounded-md p-3 mb-2">
                  <Field label={tr("fieldExperienceCompany")} help={tr("experienceCompanyHelp")}>
                    <input
                      className={inputCls}
                      value={exp.empresa}
                      onChange={(e) => {
                        const a = [...data.experiencia];
                        a[i] = { ...exp, empresa: e.target.value };
                        update("experiencia", a);
                      }}
                    />
                  </Field>
                  <Field label={tr("fieldExperienceRole")} help={tr("experienceRoleHelp")}>
                    <input
                      className={inputCls}
                      value={exp.rol}
                      onChange={(e) => {
                        const a = [...data.experiencia];
                        a[i] = { ...exp, rol: e.target.value };
                        update("experiencia", a);
                      }}
                    />
                  </Field>
                  <Field label={tr("fieldExperiencePeriod")} help={tr("experiencePeriodHelp")}>
                    <input
                      className={inputCls}
                      value={exp.periodo}
                      onChange={(e) => {
                        const a = [...data.experiencia];
                        a[i] = { ...exp, periodo: e.target.value };
                        update("experiencia", a);
                      }}
                    />
                  </Field>
                  <Field
                    label={tr("fieldExperienceDescription")}
                    help={tr("experienceDescriptionHelp")}
                  >
                    <input
                      className={inputCls}
                      value={exp.descripcion}
                      onChange={(e) => {
                        const a = [...data.experiencia];
                        a[i] = { ...exp, descripcion: e.target.value };
                        update("experiencia", a);
                      }}
                    />
                  </Field>
                  <Field
                    label={tr("fieldExperienceAchievements")}
                    help={tr("experienceAchievementsHelp")}
                  >
                    <textarea
                      className={inputCls}
                      rows={4}
                      value={exp.logros}
                      onChange={(e) => {
                        const a = [...data.experiencia];
                        a[i] = { ...exp, logros: e.target.value };
                        update("experiencia", a);
                      }}
                    />
                  </Field>
                  <button
                    type="button"
                    onClick={() =>
                      update(
                        "experiencia",
                        data.experiencia.filter((_, j) => j !== i),
                      )
                    }
                    className="text-xs text-primary"
                  >
                    {tr("remove")}
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  update("experiencia", [
                    ...data.experiencia,
                    { empresa: "", rol: "", periodo: "", descripcion: "", logros: "" },
                  ])
                }
                className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted"
              >
                {tr("addExperience")}
              </button>
            </Section>

            <Section title={tr("sectionSkills")}>
              {data.habilidades.map((g, i) => (
                <div key={i} className="border border-border rounded-md p-3 mb-2">
                  <Field label={tr("fieldSkillsCategory")} help={tr("skillsCategoryHelp")}>
                    <input
                      className={inputCls}
                      value={g.categoria}
                      onChange={(e) => {
                        const a = [...data.habilidades];
                        a[i] = { ...g, categoria: e.target.value };
                        update("habilidades", a);
                      }}
                    />
                  </Field>
                  <Field label={tr("fieldSkillsItems")} help={tr("skillsItemsHelp")}>
                    <input
                      className={inputCls}
                      value={g.items}
                      onChange={(e) => {
                        const a = [...data.habilidades];
                        a[i] = { ...g, items: e.target.value };
                        update("habilidades", a);
                      }}
                    />
                  </Field>
                  <button
                    type="button"
                    onClick={() =>
                      update(
                        "habilidades",
                        data.habilidades.filter((_, j) => j !== i),
                      )
                    }
                    className="text-xs text-primary"
                  >
                    {tr("remove")}
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  update("habilidades", [...data.habilidades, { categoria: "", items: "" }])
                }
                className="text-xs px-3 py-1.5 rounded-md border border-border hover:bg-muted"
              >
                {tr("addSkillCategory")}
              </button>
            </Section>

            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={clearAll}
                className="text-xs px-3 py-2 rounded-md border border-primary/40 text-primary hover:bg-primary/10 transition inline-flex items-center gap-2"
              >
                <span>{IconTrash}</span>
                {tr("clearData")}
              </button>
            </div>
          </div>

          {/* Preview - sticky on tablets and desktop within main section only */}
          <div className="hidden md:block md:order-2 min-w-0">
            <div className="sticky top-6 h-[calc(100vh-3rem)]">
              <div className="h-full flex flex-col">
                <CVActions data={debounced} tr={tr} />
                {overflowWarn && (
                  <div className="mb-3 p-3 rounded-md bg-primary text-primary-foreground text-sm font-medium">
                    ⚠ Has alcanzado el límite máximo de 2 páginas.
                  </div>
                )}
                <div
                  ref={previewRef}
                  className="preview-panel border border-[var(--border)] bg-[var(--popover)] p-3 sm:p-4 rounded-2xl transition shadow-lg flex-1 overflow-y-auto"
                >
                  <CVPreview data={debounced} tr={tr} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile preview - only in modal, not visible by default */}
      {/* Preview is shown only when user clicks the floating button */}

      <footer className="border-t border-border px-4 sm:px-6 py-6 text-center text-xs text-muted-foreground bg-card">
        <p>{tr("footerCopyright")}</p>
        <p className="mt-1">
          {tr("footerMadeBy")} {""}
          <a
            href="https://github.com/WilmerParra21"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-medium hover:underline"
          >
            DevsParra
          </a>
        </p>
      </footer>
    </div>
  );
}

function CVPreview({ data, tr }: { data: CVData; tr: (key: TranslationKey) => string }) {
  const { plantilla, fuente, mostrar_foto } = data.config;
  const style: React.CSSProperties = { fontFamily: fuente };

  const content = useMemo(() => {
    if (plantilla === "harvard")
      return <HarvardTemplate data={data} mostrar_foto={mostrar_foto} tr={tr} />;
    if (plantilla === "modern")
      return <ModernTemplate data={data} mostrar_foto={mostrar_foto} tr={tr} />;
    if (plantilla === "creative")
      return <CreativeTemplate data={data} mostrar_foto={mostrar_foto} tr={tr} />;
    if (plantilla === "gradient")
      return <GradientTemplate data={data} mostrar_foto={mostrar_foto} tr={tr} />;
    return <CompactTemplate data={data} mostrar_foto={mostrar_foto} tr={tr} />;
  }, [data, plantilla, mostrar_foto, tr]);

  return (
    <div className="cv-pages" style={style}>
      <div className="cv-paper">{content}</div>
    </div>
  );
}

function CVActions({ data, tr }: { data: CVData; tr: (key: TranslationKey) => string }) {
  return (
    <div className="flex flex-col gap-2 mb-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {tr("viewPreview")}
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          {tr(
            TEMPLATE_OPTIONS.find((opt) => opt.id === data.config.plantilla)?.labelKey ||
              "templateTitle",
          )}
        </span>
      </div>
    </div>
  );
}

function bullets(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function HarvardTemplate({
  data,
  mostrar_foto,
  tr,
}: {
  data: CVData;
  mostrar_foto: boolean;
  tr: (key: TranslationKey) => string;
}) {
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
        {mostrar_foto && dp.foto_base64 && (
          <img
            src={dp.foto_base64}
            alt=""
            className="w-24 h-24 rounded-full object-cover mx-auto mb-2"
          />
        )}
        <h1 className="text-3xl font-bold tracking-tight">{dp.nombre || tr("defaultName")}</h1>
        {dp.puesto && <p className="text-sm mt-1">{dp.puesto}</p>}
        {contactParts.length > 0 && (
          <p className="text-[11px] mt-2 text-gray-700">{contactParts.join("   ")}</p>
        )}
      </header>

      {data.perfil && (
        <HarvardBlock title={tr("sectionProfile")}>
          <p className="text-justify">{data.perfil}</p>
        </HarvardBlock>
      )}

      {data.educacion.some((e) => e.institucion || e.grado) && (
        <HarvardBlock title={tr("sectionEducation")}>
          {data.educacion.map((e, i) => (
            <div key={i} className="mb-1.5">
              <div className="flex justify-between items-baseline">
                <span>
                  <strong>{e.institucion}</strong>
                </span>
                <span className="italic text-[11px]">{e.periodo}</span>
              </div>
              {e.grado && <div className="italic">{e.grado}</div>}
            </div>
          ))}
        </HarvardBlock>
      )}

      {data.certificaciones.length > 0 && (
        <HarvardBlock title={tr("sectionCertifications")}>
          {data.certificaciones.map((c, i) => (
            <div key={i} className="mb-0.5">
              {c.nombre}
              {c.institucion && ` (${c.institucion})`}
              {c.fecha && ` - ${c.fecha}`}
            </div>
          ))}
        </HarvardBlock>
      )}

      {data.experiencia.some((e) => e.empresa || e.rol) && (
        <HarvardBlock title={tr("sectionExperience")}>
          {data.experiencia.map((e, i) => (
            <div key={i} className="mb-2.5">
              <div className="flex justify-between items-baseline">
                <strong>
                  {e.rol}
                  {e.empresa && `, ${e.empresa}`}
                </strong>
                <span className="italic text-[11px] whitespace-nowrap ml-2">{e.periodo}</span>
              </div>
              {e.descripcion && <div className="italic mb-1">{e.descripcion}</div>}
              {bullets(e.logros).length > 0 && (
                <ul className="list-disc pl-5 space-y-0.5">
                  {bullets(e.logros).map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </HarvardBlock>
      )}

      {data.habilidades.length > 0 && (
        <HarvardBlock title={tr("sectionSkills")}>
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

function ModernTemplate({
  data,
  mostrar_foto,
  tr,
}: {
  data: CVData;
  mostrar_foto: boolean;
  tr: (key: TranslationKey) => string;
}) {
  const dp = data.datos_personales;
  return (
    <div className="text-[12px]">
      <header className="flex gap-4 items-center mb-5 pb-4 border-b-4 border-black">
        {mostrar_foto && dp.foto_base64 && (
          <img src={dp.foto_base64} alt="" className="w-20 h-20 rounded object-cover" />
        )}
        <div>
          <h1 className="text-3xl font-black">{dp.nombre || tr("defaultName")}</h1>
          <p className="text-base">{dp.puesto}</p>
          <p className="text-[11px] mt-1 text-gray-700">
            {[dp.correo, dp.telefono, dp.ubicacion, dp.linkedin].filter(Boolean).join(" | ")}
          </p>
        </div>
      </header>
      {data.perfil && (
        <ModernBlock title={tr("sectionProfile")}>
          <p className="text-justify">{data.perfil}</p>
        </ModernBlock>
      )}
      {data.educacion.length > 0 && (
        <ModernBlock title={tr("sectionEducation")}>
          {data.educacion.map((e, i) => (
            <div key={i} className="mb-1">
              <strong>{e.grado}</strong> — {e.institucion}{" "}
              <span className="text-[11px]">({e.periodo})</span>
            </div>
          ))}
        </ModernBlock>
      )}
      {data.certificaciones.length > 0 && (
        <ModernBlock title={tr("sectionCertifications")}>
          {data.certificaciones.map((c, i) => (
            <div key={i}>
              {c.nombre} — {c.institucion} ({c.fecha})
            </div>
          ))}
        </ModernBlock>
      )}
      {data.experiencia.length > 0 && (
        <ModernBlock title={tr("sectionExperience")}>
          {data.experiencia.map((e, i) => (
            <div key={i} className="mb-3">
              <div className="flex justify-between">
                <strong>
                  {e.rol} · {e.empresa}
                </strong>
                <span className="text-[11px]">{e.periodo}</span>
              </div>
              {e.descripcion && <p className="italic">{e.descripcion}</p>}
              {bullets(e.logros).length > 0 && (
                <ul className="list-disc pl-5">
                  {bullets(e.logros).map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </ModernBlock>
      )}
      {data.habilidades.length > 0 && (
        <ModernBlock title={tr("sectionSkills")}>
          {data.habilidades.map((g, i) => (
            <div key={i} className="mb-1">
              <strong>{g.categoria}:</strong> {g.items}
            </div>
          ))}
        </ModernBlock>
      )}
    </div>
  );
}

function CompactTemplate({
  data,
  mostrar_foto,
  tr,
}: {
  data: CVData;
  mostrar_foto: boolean;
  tr: (key: TranslationKey) => string;
}) {
  const dp = data.datos_personales;
  return (
    <div className="text-[11px]">
      <header className="mb-3">
        <h1 className="text-xl font-bold">
          {dp.nombre || tr("defaultName")} — <span className="font-normal">{dp.puesto}</span>
        </h1>
        <p>{[dp.correo, dp.telefono, dp.ubicacion, dp.linkedin].filter(Boolean).join(" · ")}</p>
      </header>
      {data.perfil && <p className="mb-2 text-justify">{data.perfil}</p>}
      <h2 className="font-bold uppercase border-b border-black mt-3 mb-1">
        {tr("sectionEducation")}
      </h2>
      {data.educacion.map((e, i) => (
        <div key={i}>
          <strong>{e.grado}</strong>, {e.institucion} ({e.periodo})
        </div>
      ))}
      {data.certificaciones.length > 0 && (
        <>
          <h2 className="font-bold uppercase border-b border-black mt-3 mb-1">
            {tr("sectionCertifications")}
          </h2>
          {data.certificaciones.map((c, i) => (
            <div key={i}>
              {c.nombre} — {c.institucion} ({c.fecha})
            </div>
          ))}
        </>
      )}
      <h2 className="font-bold uppercase border-b border-black mt-3 mb-1">
        {tr("sectionExperience")}
      </h2>
      {data.experiencia.map((e, i) => (
        <div key={i} className="mb-1">
          <strong>{e.rol}</strong>, {e.empresa} <em>({e.periodo})</em>
          {bullets(e.logros).length > 0 && (
            <ul className="list-disc pl-4">
              {bullets(e.logros).map((b, j) => (
                <li key={j}>{b}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
      {data.habilidades.length > 0 && (
        <>
          <h2 className="font-bold uppercase border-b border-black mt-3 mb-1">
            {tr("sectionSkills")}
          </h2>
          {data.habilidades.map((g, i) => (
            <div key={i}>
              <strong>{g.categoria}:</strong> {g.items}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function CreativeTemplate({
  data,
  mostrar_foto,
  tr,
}: {
  data: CVData;
  mostrar_foto: boolean;
  tr: (key: TranslationKey) => string;
}) {
  const dp = data.datos_personales;
  const accent = data.config.accentColor || DEFAULT_ACCENT_COLOR;
  return (
    <div className="text-[12px] text-slate-700">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
        <aside
          className="rounded-3xl border bg-slate-100 p-5 shadow-sm"
          style={{ borderColor: accent }}
        >
          {mostrar_foto && dp.foto_base64 && (
            <img
              src={dp.foto_base64}
              alt="Foto"
              className="w-28 h-28 rounded-full object-cover mx-auto mb-4"
            />
          )}
          <h1 className="text-2xl font-bold text-center" style={{ color: accent }}>
            {dp.nombre || tr("defaultName")}
          </h1>
          <p className="text-sm text-slate-600 text-center mb-4">{dp.puesto}</p>
          <div className="space-y-3 text-sm">
            {dp.correo && (
              <div>
                <strong>{tr("emailLabel")}</strong>
                <p>{dp.correo}</p>
              </div>
            )}
            {dp.telefono && (
              <div>
                <strong>{tr("phoneLabel")}</strong>
                <p>{dp.telefono}</p>
              </div>
            )}
            {dp.ubicacion && (
              <div>
                <strong>{tr("locationLabel")}</strong>
                <p>{dp.ubicacion}</p>
              </div>
            )}
            {dp.linkedin && (
              <div>
                <strong>{tr("linkedinLabel")}</strong>
                <p>{dp.linkedin}</p>
              </div>
            )}
          </div>
        </aside>

        <main className="space-y-4">
          {data.perfil && (
            <section className="rounded-3xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 mb-3">
                {tr("sectionProfile")}
              </h2>
              <p className="text-sm leading-6 text-slate-700">{data.perfil}</p>
            </section>
          )}
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {data.educacion.some((e) => e.institucion || e.grado) && (
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 mb-3">
                  {tr("sectionEducation")}
                </h2>
                <div className="space-y-3">
                  {data.educacion.map((e, i) => (
                    <div key={i}>
                      <p className="font-semibold text-slate-900">{e.institucion}</p>
                      <p className="text-sm text-slate-600">{e.grado}</p>
                      <p className="text-[11px] text-slate-500">{e.periodo}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {data.certificaciones.length > 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 mb-3">
                  {tr("sectionCertifications")}
                </h2>
                <div className="space-y-2 text-sm text-slate-700">
                  {data.certificaciones.map((c, i) => (
                    <div key={i}>
                      <p>{c.nombre}</p>
                      <p className="text-[11px] text-slate-500">
                        {c.institucion} · {c.fecha}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {data.experiencia.length > 0 && (
            <section className="rounded-3xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 mb-3">
                {tr("sectionExperience")}
              </h2>
              <div className="space-y-4 text-sm text-slate-700">
                {data.experiencia.map((e, i) => (
                  <div key={i}>
                    <div className="flex justify-between gap-4">
                      <p className="font-semibold text-slate-900">{e.rol}</p>
                      <span className="text-[11px] text-slate-500">{e.periodo}</span>
                    </div>
                    <p className="text-slate-600">{e.empresa}</p>
                    {e.descripcion && <p className="mt-2 text-slate-600 italic">{e.descripcion}</p>}
                    {bullets(e.logros).length > 0 && (
                      <ul className="mt-2 list-disc pl-5 space-y-1 text-slate-600">
                        {bullets(e.logros).map((b, j) => (
                          <li key={j}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.habilidades.length > 0 && (
            <section className="rounded-3xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 mb-3">
                {tr("sectionSkills")}
              </h2>
              <div className="space-y-2 text-sm text-slate-700">
                {data.habilidades.map((g, i) => (
                  <div key={i}>
                    <strong>{g.categoria}:</strong> {g.items}
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function GradientTemplate({
  data,
  mostrar_foto,
  tr,
}: {
  data: CVData;
  mostrar_foto: boolean;
  tr: (key: TranslationKey) => string;
}) {
  const dp = data.datos_personales;
  return (
    <div className="text-[12px] text-slate-800">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-lg">
        <header
          className="px-6 py-8 text-white"
          style={{
            background: `linear-gradient(90deg, ${data.config.accentColor || DEFAULT_ACCENT_COLOR} 0%, ${data.config.accentColor || DEFAULT_ACCENT_COLOR}cc 55%, ${data.config.accentColor || DEFAULT_ACCENT_COLOR}80 100%)`,
          }}
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold">{dp.nombre || "Tu Nombre"}</h1>
              <p className="mt-2 text-base">{dp.puesto}</p>
            </div>
            {mostrar_foto && dp.foto_base64 && (
              <img
                src={dp.foto_base64}
                alt="Foto"
                className="w-24 h-24 rounded-full object-cover border-4 border-white"
              />
            )}
          </div>
          <p className="mt-4 text-sm text-white/90">
            {[dp.correo, dp.telefono, dp.ubicacion, dp.linkedin].filter(Boolean).join(" · ")}
          </p>
        </header>
        <div className="grid gap-5 p-6 md:grid-cols-[1fr_220px]">
          <section className="space-y-5">
            {data.perfil && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                  {tr("sectionProfile")}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-700">{data.perfil}</p>
              </div>
            )}
            {data.experiencia.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                  {tr("sectionExperience")}
                </h2>
                <div className="mt-3 space-y-4 text-sm text-slate-700">
                  {data.experiencia.map((e, i) => (
                    <div key={i} className="rounded-3xl border border-slate-200 p-4 bg-slate-50">
                      <div className="flex justify-between gap-4">
                        <p className="font-semibold text-slate-900">{e.rol}</p>
                        <span className="text-[11px] text-slate-500">{e.periodo}</span>
                      </div>
                      <p className="text-slate-600">{e.empresa}</p>
                      {e.descripcion && (
                        <p className="mt-2 text-slate-600 italic">{e.descripcion}</p>
                      )}
                      {bullets(e.logros).length > 0 && (
                        <ul className="mt-2 list-disc pl-5 space-y-1 text-slate-600">
                          {bullets(e.logros).map((b, j) => (
                            <li key={j}>{b}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
          <aside className="space-y-5">
            {data.educacion.some((e) => e.institucion || e.grado) && (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 mb-3">
                  {tr("sectionEducation")}
                </h2>
                <div className="space-y-3 text-sm text-slate-700">
                  {data.educacion.map((e, i) => (
                    <div key={i}>
                      <p className="font-semibold">{e.grado}</p>
                      <p>{e.institucion}</p>
                      <p className="text-[11px] text-slate-500">{e.periodo}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {data.certificaciones.length > 0 && (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 mb-3">
                  {tr("sectionCertifications")}
                </h2>
                <div className="space-y-2 text-sm text-slate-700">
                  {data.certificaciones.map((c, i) => (
                    <div key={i}>
                      <p>{c.nombre}</p>
                      <p className="text-[11px] text-slate-500">
                        {c.institucion} · {c.fecha}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {data.habilidades.length > 0 && (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 mb-3">
                  {tr("sectionSkills")}
                </h2>
                <div className="space-y-2 text-sm text-slate-700">
                  {data.habilidades.map((g, i) => (
                    <div key={i}>
                      <strong>{g.categoria}:</strong> {g.items}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
