import { readValue, type EnvironmentValues } from "./environment.ts";

export async function collectEnvironment(): Promise<EnvironmentValues> {
  const nav = navigator as Navigator & { deviceMemory?: number; userAgentData?: { brands?: { brand: string; version: string }[] } };
  const values: EnvironmentValues = {};
  const readers = {
    userAgent: () => nav.userAgent, platform: () => nav.platform,
    language: () => nav.language, languages: () => nav.languages.join(", "),
    timeZone: () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    offset: () => -new Date().getTimezoneOffset(),
    brands: () => nav.userAgentData?.brands?.slice(0, 8).map(x => `${x.brand} ${x.version}`).join(", "),
    screen: () => `${screen.width} × ${screen.height}`,
    availableScreen: () => `${screen.availWidth} × ${screen.availHeight}`,
    viewport: () => `${window.innerWidth} × ${window.innerHeight}`,
    pixelRatio: () => window.devicePixelRatio, colorDepth: () => screen.colorDepth,
    touchPoints: () => nav.maxTouchPoints, coarsePointer: () => matchMedia("(pointer: coarse)").matches,
    darkPreference: () => matchMedia("(prefers-color-scheme: dark)").matches,
    processors: () => nav.hardwareConcurrency, memory: () => nav.deviceMemory,
    automation: () => nav.webdriver,
  };
  for (const [key, reader] of Object.entries(readers)) values[key as keyof EnvironmentValues] = readValue(reader);
  values.canvas2d = null; values.canvasStable = null; values.canvasHash = null;
  try {
    const canvas = document.createElement("canvas"); canvas.width = 180; canvas.height = 40;
    const context = canvas.getContext("2d"); values.canvas2d = Boolean(context);
    if (context) {
      context.fillStyle = "#e5e7eb"; context.fillRect(0, 0, 180, 40);
      context.fillStyle = "#27272a"; context.font = "16px Arial"; context.fillText("IPinfo.dog 012345", 5, 26);
      const first = context.getImageData(0, 0, 180, 40).data;
      const second = context.getImageData(0, 0, 180, 40).data;
      values.canvasStable = first.length === second.length && first.every((value, i) => value === second[i]);
      if (window.crypto?.subtle) {
        const hash = await crypto.subtle.digest("SHA-256", Uint8Array.from(first).buffer);
        values.canvasHash = Array.from(new Uint8Array(hash), value => value.toString(16).padStart(2, "0")).join("");
      }
    }
  } catch { /* A restricted readback is not a failure of the remaining fields. */ }
  values.webgl = null; values.webglVendor = null; values.webglRenderer = null;
  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  try {
    const canvas = document.createElement("canvas");
    gl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGLRenderingContext | WebGL2RenderingContext | null;
    values.webgl = Boolean(gl);
    if (gl) {
      const context = gl;
      const extension = (() => { try { return context.getExtension("WEBGL_debug_renderer_info"); } catch { return null; } })();
      values.webglVendor = readValue(() => context.getParameter(extension?.UNMASKED_VENDOR_WEBGL ?? context.VENDOR));
      values.webglRenderer = readValue(() => context.getParameter(extension?.UNMASKED_RENDERER_WEBGL ?? context.RENDERER));
    }
  } catch { /* Privacy settings and unavailable graphics contexts remain unknown. */ }
  finally { try { gl?.getExtension("WEBGL_lose_context")?.loseContext(); } catch { /* Context may already be lost. */ } }
  return values;
}
