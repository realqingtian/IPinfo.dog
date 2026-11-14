export const environmentGroups = {
  browser: ["platform", "language", "languages", "timeZone", "offset", "brands"],
  screen: ["screen", "availableScreen", "viewport", "pixelRatio", "colorDepth", "touchPoints", "coarsePointer", "darkPreference"],
  device: ["processors", "memory", "automation", "canvas2d", "canvasStable", "canvasHash", "webgl", "webglVendor", "webglRenderer"],
} as const;
export type EnvironmentField = (typeof environmentGroups)[keyof typeof environmentGroups][number] | "userAgent";
export type EnvironmentValue = string | number | boolean | null;
export type EnvironmentValues = Partial<Record<EnvironmentField, EnvironmentValue>>;
export const requestHeaderNames = ["user-agent", "accept-language", "sec-ch-ua", "sec-ch-ua-mobile", "sec-ch-ua-platform"] as const;
export type RequestView = Record<(typeof requestHeaderNames)[number], string | null>;
export function textValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.replace(/[\x00-\x1f\x7f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 1024) || null;
}
export function readValue(reader: () => unknown): EnvironmentValue {
  try { const value = reader(); return typeof value === "boolean" ? value : typeof value === "number" ? Number.isFinite(value) ? value : null : textValue(value); }
  catch { return null; }
}
export function requestView(headers: { get: (key: string) => string | null }): RequestView {
  return Object.fromEntries(requestHeaderNames.map(key => [key, readValue(() => headers.get(key))])) as RequestView;
}
export function primaryLanguage(header: string | null): string | null {
  const values = (header ?? "").split(",").map((part, index) => {
    const [tag, ...params] = part.trim().split(";");
    const quality = params.find(p => p.trim().startsWith("q="));
    const q = quality ? Number(quality.trim().slice(2)) : 1;
    return { tag: tag.toLowerCase(), q, index };
  }).filter(x => /^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/.test(x.tag) && Number.isFinite(x.q) && x.q > 0 && x.q <= 1);
  return values.sort((a, b) => b.q - a.q || a.index - b.index)[0]?.tag ?? null;
}
export function compareEnvironment(values: EnvironmentValues, headers: RequestView) {
  const ua = textValue(values.userAgent), serverUa = headers["user-agent"];
  const language = primaryLanguage(textValue(values.language)), serverLanguage = primaryLanguage(headers["accept-language"]);
  return {
    userAgent: !ua || !serverUa || ua.length >= 1024 || serverUa.length >= 1024 ? "unconfirmed" : ua === serverUa ? "matching" : "different",
    language: !language || !serverLanguage ? "unconfirmed" : language === serverLanguage ? "matching" : "different",
  } as const;
}
export type EnvironmentState = { phase: "idle" | "running" | "complete" | "error"; values: EnvironmentValues };
export function createEnvironmentController(collect: () => Promise<EnvironmentValues>) {
  const initial: EnvironmentState = { phase: "idle", values: {} };
  let state = initial, generation = 0;
  const listeners = new Set<() => void>();
  const publish = (next: EnvironmentState) => { state = next; for (const listener of listeners) listener(); };
  return {
    getSnapshot: () => state, getServerSnapshot: () => initial,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    clear() { generation++; publish(initial); },
    async run() {
      const current = ++generation;
      publish({ phase: "running", values: {} });
      try { const values = await collect(); if (current === generation) publish({ phase: "complete", values }); }
      catch { if (current === generation) publish({ phase: "error", values: {} }); }
    },
  };
}
