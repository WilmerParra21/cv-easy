const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const DRIVE_FILE_NAME = "CVrap - respaldo.json";
const DRIVE_PDF_FILE_NAME = "CVrap - CV.pdf";
const DRIVE_API = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files";
const TOKEN_PROMPT_TIMEOUT = 10000;

let gisLoader: Promise<void> | undefined;
let cachedToken: { value: string; expiresAt: number } | undefined;
let tokenRequest: Promise<string> | undefined;
let tokenClient: { requestAccessToken: (options?: { prompt?: string }) => void } | undefined;
let pendingResolve: ((token: string) => void) | undefined;
let pendingReject: ((error: Error) => void) | undefined;

function loadGoogleIdentityServices() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisLoader) return gisLoader;

  gisLoader = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("No se pudo cargar Google Identity Services.")),
        { once: true },
      );
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar Google Identity Services."));
    document.head.appendChild(script);
  });
  return gisLoader;
}

async function ensureTokenClient(clientId: string) {
  if (tokenClient) return tokenClient;
  await loadGoogleIdentityServices();
  tokenClient = window.google!.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: DRIVE_SCOPE,
    callback: (response) => {
      const resolve = pendingResolve;
      const reject = pendingReject;
      pendingResolve = undefined;
      pendingReject = undefined;
      if (response.access_token) {
        const expiresIn = response.expires_in || 3600;
        cachedToken = {
          value: response.access_token,
          expiresAt: Date.now() + expiresIn * 1000,
        };
        resolve?.(response.access_token);
      } else {
        reject?.(
          new Error(
            response.error_description || response.error || "Google no concedió acceso a Drive.",
          ),
        );
      }
    },
  });
  return tokenClient;
}

function requestAccessToken(clientId: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      pendingResolve = undefined;
      pendingReject = undefined;
      reject(
        new Error("La solicitud a Google está tardando demasiado. Por favor, inténtalo de nuevo."),
      );
    }, TOKEN_PROMPT_TIMEOUT);

    pendingResolve = (token) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      pendingResolve = undefined;
      pendingReject = undefined;
      resolve(token);
    };
    pendingReject = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      pendingResolve = undefined;
      pendingReject = undefined;
      reject(error);
    };

    ensureTokenClient(clientId).then(
      (client) => {
        if (settled) return;
        client.requestAccessToken({ prompt: "" });
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        pendingResolve = undefined;
        pendingReject = undefined;
        reject(err);
      },
    );
  });
}

async function getAccessToken(clientId: string) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }
  if (tokenRequest) return tokenRequest;

  tokenRequest = requestAccessToken(clientId);
  try {
    return await tokenRequest;
  } finally {
    tokenRequest = undefined;
  }
}

async function findDriveFile(token: string, fileName: string) {
  const query = `name = '${fileName}' and trashed = false`;
  const response = await fetch(
    `${DRIVE_API}?q=${encodeURIComponent(query)}&spaces=drive&pageSize=1&fields=files(id,name,modifiedTime,webViewLink)`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (response.status === 401) throw new DriveAuthError();
  if (!response.ok) throw new Error("No se pudo consultar tu Google Drive.");
  const body = (await response.json()) as { files?: Array<{ id: string; webViewLink?: string }> };
  return body.files?.[0];
}

async function uploadBackup(token: string, data: unknown, fileId?: string) {
  const metadata = fileId
    ? { name: DRIVE_FILE_NAME }
    : { name: DRIVE_FILE_NAME, mimeType: "application/json", parents: ["root"] };
  const boundary = `cvrap-${Date.now()}`;
  const body = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(data)}\r\n--${boundary}--`;
  const endpoint = fileId
    ? `${DRIVE_UPLOAD_API}/${fileId}?uploadType=multipart`
    : `${DRIVE_UPLOAD_API}?uploadType=multipart`;
  const response = await fetch(endpoint, {
    method: fileId ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (response.status === 401) throw new DriveAuthError();
  if (!response.ok) throw new Error("No se pudo guardar el respaldo en Google Drive.");
  return (await response.json()) as { id: string; webViewLink?: string };
}

async function uploadPDF(token: string, pdfBlob: Blob, fileId?: string, fileName?: string) {
  const name = fileName || DRIVE_PDF_FILE_NAME;
  const metadata = fileId ? { name } : { name, mimeType: "application/pdf", parents: ["root"] };

  const boundary = `cvrap-pdf-${Date.now()}`;
  const metadataStr = JSON.stringify(metadata);
  const prefix = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadataStr}\r\n--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`;
  const suffix = `\r\n--${boundary}--`;

  const prefixBytes = new TextEncoder().encode(prefix);
  const pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer());
  const suffixBytes = new TextEncoder().encode(suffix);

  const totalLength = prefixBytes.length + pdfBytes.length + suffixBytes.length;
  const combined = new Uint8Array(totalLength);
  combined.set(prefixBytes, 0);
  combined.set(pdfBytes, prefixBytes.length);
  combined.set(suffixBytes, prefixBytes.length + pdfBytes.length);

  const body = new Blob([combined], { type: `multipart/related; boundary=${boundary}` });

  const endpoint = fileId
    ? `${DRIVE_UPLOAD_API}/${fileId}?uploadType=multipart`
    : `${DRIVE_UPLOAD_API}?uploadType=multipart`;

  const response = await fetch(endpoint, {
    method: fileId ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (response.status === 401) throw new DriveAuthError();
  if (!response.ok) throw new Error("No se pudo guardar el PDF en Google Drive.");
  return (await response.json()) as { id: string; webViewLink?: string };
}

class DriveAuthError extends Error {
  constructor() {
    super("La sesión de Google Drive caducó.");
  }
}

export function clearDriveAuth() {
  cachedToken = undefined;
  tokenClient = undefined;
  pendingResolve = undefined;
  pendingReject = undefined;
  tokenRequest = undefined;
}

export async function saveCVToGoogleDrive(data: unknown, pdfBlob?: Blob, pdfFileName?: string) {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  if (!clientId)
    throw new Error("Falta configurar VITE_GOOGLE_CLIENT_ID para conectar Google Drive.");
  let token = await getAccessToken(clientId);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const existing = await findDriveFile(token, DRIVE_FILE_NAME);
      await uploadBackup(token, data, existing?.id);
      if (pdfBlob) {
        const name = pdfFileName || DRIVE_PDF_FILE_NAME;
        const existingPDF = await findDriveFile(token, name);
        await uploadPDF(token, pdfBlob, existingPDF?.id, name);
      }
      return {
        action: existing ? ("updated" as const) : ("created" as const),
        webViewLink: existing?.webViewLink,
      };
    } catch (error) {
      if (!(error instanceof DriveAuthError) || attempt > 0) throw error;
      cachedToken = undefined;
      token = await getAccessToken(clientId);
    }
  }

  throw new Error("No se pudo guardar el respaldo en Google Drive.");
}
