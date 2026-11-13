import { parseIp } from "../../lib/ip.ts";
import { fetchExit, type ProbeOutcome, type Family } from "../ip/exit.ts";

export const webrtcPolicy = { stun: "stun:stun.cloudflare.com:3478", timeoutMs: 8_000, maxCandidates: 64 } as const;
export type IceKind = "host" | "srflx" | "prflx" | "relay";
export type Candidate = { address: string; family: Family | null; scope: "public" | "nonpublic" | "mdns"; kind: IceKind; protocol: "udp" | "tcp" };
export type CandidateInput = { candidate?: string; address?: string | null; type?: string | null; protocol?: string | null };
const kinds = ["host", "srflx", "prflx", "relay"];

/** Retain only the displayed address, type and transport, never raw SDP, ports or ICE credentials. */
export function parseCandidate(input: CandidateInput): Candidate | null {
  if (input.candidate && input.candidate.length > 4096) return null;
  const parts = input.candidate?.trim().split(/\s+/) ?? [];
  const validLine = parts[0]?.startsWith("candidate:") && parts[6] === "typ";
  const address = input.address ?? (validLine ? parts[4] : undefined);
  const kind = input.type ?? (validLine ? parts[7] : undefined);
  const protocol = (input.protocol ?? (validLine ? parts[2] : ""))?.toLowerCase();
  if (!address || !kind || !kinds.includes(kind) || (protocol !== "udp" && protocol !== "tcp")) return null;
  const base: Pick<Candidate, "kind" | "protocol"> = { kind: kind as IceKind, protocol };
  if (kind === "host" && address.length <= 253 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.local\.?$/i.test(address)) {
    return { ...base, address: address.toLowerCase().replace(/\.$/, ""), family: null, scope: "mdns" };
  }
  try { const ip = parseIp(address); return { ...base, address: ip.address, family: ip.family, scope: ip.isPublic ? "public" : "nonpublic" }; } catch { return null; }
}

export type IceResult = { phase: "complete" | "timedout" | "cancelled" | "unsupported" | "error"; candidates: Candidate[]; stunErrors: number; capped: boolean };
export type Peer = Pick<RTCPeerConnection, "onicecandidate" | "onicecandidateerror" | "onicegatheringstatechange" | "iceGatheringState" | "createDataChannel" | "close"> & {
  createOffer(): Promise<RTCSessionDescriptionInit>;
  setLocalDescription(description: RTCSessionDescriptionInit): Promise<void>;
};
export function gatherCandidates(signal: AbortSignal, onProgress: (candidates: Candidate[]) => void, {
  factory = typeof RTCPeerConnection === "undefined" ? undefined : (config: RTCConfiguration): Peer => new RTCPeerConnection(config),
  timeoutMs = webrtcPolicy.timeoutMs,
}: { factory?: (config: RTCConfiguration) => Peer; timeoutMs?: number } = {}): Promise<IceResult> {
  if (signal.aborted) return Promise.resolve({ phase: "cancelled", candidates: [], stunErrors: 0, capped: false });
  if (!factory) return Promise.resolve({ phase: "unsupported", candidates: [], stunErrors: 0, capped: false });
  return new Promise(resolve => {
    let peer: Peer | undefined, channel: RTCDataChannel | undefined;
    let finished = false, stunErrors = 0, capped = false;
    const candidates: Candidate[] = [], seen = new Set<string>();
    const finish = (phase: IceResult["phase"]) => {
      if (finished) return; finished = true; clearTimeout(timer); signal.removeEventListener("abort", cancel);
      if (peer) { peer.onicecandidate = null; peer.onicecandidateerror = null; peer.onicegatheringstatechange = null; }
      try { channel?.close(); } catch { /* Cleanup must not prevent settlement. */ }
      try { peer?.close(); } catch { /* Already closed or policy disabled. */ }
      resolve({ phase, candidates: [...candidates], stunErrors, capped });
    };
    const cancel = () => finish("cancelled");
    signal.addEventListener("abort", cancel, { once: true });
    const timer = setTimeout(() => finish("timedout"), timeoutMs);
    try {
      peer = factory({ iceServers: [{ urls: webrtcPolicy.stun }], iceCandidatePoolSize: 0, iceTransportPolicy: "all" });
      peer.onicecandidate = event => {
        if (finished || !event.candidate) return;
        const candidate = parseCandidate(event.candidate); if (!candidate) return;
        const key = `${candidate.kind}|${candidate.protocol}|${candidate.address}`; if (seen.has(key)) return;
        if (candidates.length >= webrtcPolicy.maxCandidates) { capped = true; finish("complete"); return; }
        seen.add(key); candidates.push(candidate); onProgress([...candidates]);
      };
      peer.onicecandidateerror = () => { if (!finished) stunErrors = Math.min(stunErrors + 1, 99); };
      peer.onicegatheringstatechange = () => { if (peer?.iceGatheringState === "complete") finish("complete"); };
      channel = peer.createDataChannel("ipinfo-diagnostic");
      const active = peer;
      void active.createOffer().then(offer => { if (!finished) return active.setLocalDescription(offer); }).catch(() => finish("error"));
    } catch { finish("error"); }
  });
}

export type ExitSlot = { phase: "idle" | "running" | "success" | "error" | "cancelled"; address: string | null; error: string | null };
export type IceSlot = Omit<IceResult, "phase"> & { phase: IceResult["phase"] | "idle" | "running" };
export type WebRtcSnapshot = { ice: IceSlot; exits: Record<Family, ExitSlot> };
const emptyExit = (): ExitSlot => ({ phase: "idle", address: null, error: null });
const emptyIce = (): IceSlot => ({ phase: "idle", candidates: [], stunErrors: 0, capped: false });
export function comparison(candidate: Candidate, exits: WebRtcSnapshot["exits"]): "matching" | "different" | "unconfirmed" | "relay" | "local" {
  if (candidate.kind === "relay") return "relay";
  if (candidate.scope !== "public" || !candidate.family) return "local";
  const exit = exits[candidate.family];
  if (exit.phase !== "success" || !exit.address) return "unconfirmed";
  return candidate.address === exit.address ? "matching" : "different";
}
export function createWebRtcController({ gather = gatherCandidates, probe = fetchExit, urls }: {
  urls: Record<Family, string>;
  gather?: typeof gatherCandidates;
  probe?: (url: string, family: Family, signal: AbortSignal) => Promise<ProbeOutcome>;
}) {
  const initial: WebRtcSnapshot = { ice: emptyIce(), exits: { ipv4: emptyExit(), ipv6: emptyExit() } };
  let state = initial;
  const listeners = new Set<() => void>(), requests = new Map<string, AbortController>();
  const generations = { ice: 0, ipv4: 0, ipv6: 0 };
  const emit = () => listeners.forEach(listener => listener());
  const setIce = (ice: IceSlot) => { state = { ...state, ice }; emit(); };
  const setExit = (family: Family, slot: ExitSlot) => { state = { ...state, exits: { ...state.exits, [family]: slot } }; emit(); };
  const begin = (key: keyof typeof generations) => {
    const generation = ++generations[key]; requests.get(key)?.abort();
    const abort = new AbortController(); requests.set(key, abort); return { generation, abort };
  };
  const runIce = () => {
    const { generation, abort } = begin("ice"); setIce({ ...emptyIce(), phase: "running" });
    void Promise.resolve().then(() => gather(abort.signal, candidates => {
      if (generation === generations.ice && state.ice.phase === "running") setIce({ ...state.ice, candidates });
    })).catch((): IceResult => ({ phase: "error", candidates: state.ice.candidates, stunErrors: 0, capped: false })).then(result => {
      if (generation !== generations.ice) return; requests.delete("ice"); setIce(result);
    });
  };
  const runExit = (family: Family) => {
    const { generation, abort } = begin(family); setExit(family, { phase: "running", address: null, error: null });
    void Promise.resolve().then(() => probe(urls[family], family, abort.signal)).catch((): ProbeOutcome => ({ ok: false, code: "DETECTION_FAILED" })).then(result => {
      if (generation !== generations[family]) return; requests.delete(family);
      setExit(family, result.ok ? { phase: "success", address: result.data.address, error: null } : { phase: "error", address: null, error: result.code });
    });
  };
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => state, getServerSnapshot: () => initial,
    runIce, runExit, runAll() { runIce(); runExit("ipv4"); runExit("ipv6"); },
    cancel() {
      for (const [key, abort] of requests) {
        ++generations[key as keyof typeof generations]; abort.abort();
        if (key === "ice") setIce({ ...state.ice, phase: "cancelled" });
        else setExit(key as Family, { phase: "cancelled", address: null, error: null });
      }
      requests.clear();
    },
    dispose() { ++generations.ice; ++generations.ipv4; ++generations.ipv6; for (const abort of requests.values()) abort.abort(); requests.clear(); },
  };
}
