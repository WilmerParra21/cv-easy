# cv-easy

**cv-easy** es un editor de currículum profesional basado en navegador, diseñado para crear y descargar CVs sin registro ni instalación.

---

## 🚀 Vista general

- Editor en vivo con vista previa instantánea.
- Exporta a PDF, Word (.doc), JSON y Markdown.
- Tres plantillas: Harvard, Moderna y Compacta.
- Modo claro/oscuro con diseño responsive.
- Guardado automático en el navegador utilizando `localStorage`.
- Importación de datos desde JSON o Markdown.

---

## 📁 Estructura del proyecto

- `index.html` - punto de entrada HTML.
- `src/main.tsx` - arranque de React.
- `src/App.tsx` - componente principal que carga `CVBuilder`.
- `src/components/CVBuilder.tsx` - editor, vista previa y exportación.
- `src/hooks/use-mobile.tsx` - hook para detectar móvil.
- `src/styles.css` - estilos globales y configuración de diseño.
- `vite.config.ts` - configuración de Vite.
- `tailwind.config.js` - configuración de Tailwind CSS.
- `public/icon.png` - favicon e icono de la app.

---

## 🛠 Dependencias principales

- `react` 19
- `react-dom` 19
- `vite` 8
- `typescript`
- `tailwindcss` 3
- `html2pdf.js`

---

## ⚡ Instalación y ejecución

```bash
npm install
npm run dev
```

Luego abre `http://localhost:port-desplegado` en tu navegador.

---

## 💡 Funcionalidades

- Interfaz intuitiva para editar datos personales, perfil, experiencia, educación, certificaciones y habilidades.
- Vista previa que simula un documento impreso tipo A4.
- Exportación rápida a PDF usando `html2pdf.js`.
- Soporte para cambio de tema claro/oscuro.
- Menú de descarga y opciones de importación.

---

## 📝 Notas adicionales

- Los datos se guardan localmente en el navegador; no se envía nada a servidores externos.
- El favicon utiliza el archivo `public/icon.png`.
- El modo oscuro se aplica tanto al editor como al panel de vista previa.

---

## 🙌 Autor

Desarrollado por **Wilmer Parra Gómez**.
