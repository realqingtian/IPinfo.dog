import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCandidate, gatherCandidates, comparison, createWebRtcController, webrtcPolicy, type Peer, type Candidate, type IceResult } from "../../src/features/webrtc/detection.ts";
import type { ProbeOutcome } from "../../src/features/ip/exit.ts";

const tick = () => new Promise(resolve => setImmediate(resolve));
const item = (address: string, type = "srflx") => ({ address, type, protocol: "udp" });
const parsed = (address: string, type = "srflx") => parseCandidate(item(address, type))!;
const success = (address: string): ProbeOutcome => ({ ok: true, data: { address, family: address.includes(":") ? "ipv6" : "ipv4", detectedAt: "2026-11-13T00:00:00Z" } });
const result = (address = "8.8.8.8"): IceResult => ({ phase: "complete", candidates: [parsed(address)], stunErrors: 0, capped: false });
const urls = { ipv4: "https://v4.example/api/exit", ipv6: "https://v6.example/api/exit" };
class FakePeer {
  onicecandidate: Peer["onicecandidate"] = null;
  onicecandidateerror: Peer["onicecandidateerror"] = null;
  onicegatheringstatechange: Peer["onicegatheringstatechange"] = null;
  iceGatheringState: RTCIceGatheringState = "new";
  closed = 0; channelClosed = 0; descriptions = 0;
  createDataChannel() { return { close: () => this.channelClosed++ } as unknown as RTCDataChannel; }
  async createOffer(): Promise<RTCSessionDescriptionInit> { return { type: "offer", sdp: "not retained" }; }
  async setLocalDescription() { this.descriptions++; }
  close() { this.closed++; }
  candidate(address: string, type = "srflx") { this.onicecandidate?.call(this as unknown as RTCPeerConnection, { candidate: item(address, type) } as RTCPeerConnectionIceEvent); }
  complete() { this.iceGatheringState = "complete"; this.onicegatheringstatechange?.call(this as unknown as RTCPeerConnection, new Event("icegatheringstatechange")); }
}
test("ICE parser classifies public, private, mDNS and mapped addresses without retaining SDP", () => {
  assert.equal(parsed("8.8.8.8").scope, "public");
  assert.equal(parsed("192.168.1.2", "host").scope, "nonpublic");
  assert.equal(parsed("fe80::1", "host").scope, "nonpublic");
  assert.equal(parsed("2001:4860:4860::8888").family, "ipv6");
  assert.equal(parsed("::ffff:8.8.8.8").address, "8.8.8.8");
  assert.deepEqual(parseCandidate(item("Secret-123.LOCAL.", "host")), { address: "secret-123.local", family: null, kind: "host", protocol: "udp", scope: "mdns" });
  assert.equal(parseCandidate({ candidate: "candidate:1 1 UDP 123 8.8.8.8 34000 typ srflx raddr 192.168.1.2 rport 10000" })?.address, "8.8.8.8");
  for (const input of [item("example.com"), item("1.2.3.4/24"), item("https://8.8.8.8"), item("8.8.8.8", "bogus"), { ...item("8.8.8.8"), protocol: "sctp" }, { candidate: "x".repeat(4097) }, item("test.local", "srflx")]) assert.equal(parseCandidate(input), null);
  assert.deepEqual(Object.keys(parsed("8.8.8.8")).sort(), ["address", "family", "kind", "protocol", "scope"]);
});
test("same-family comparison distinguishes difference, unavailable reference, private and relay", () => {
  const exits = { ipv4: { phase: "success" as const, address: "8.8.8.8", error: null }, ipv6: { phase: "error" as const, address: null, error: "TIMEOUT" } };
  assert.equal(comparison(parsed("8.8.8.8"), exits), "matching");
  assert.equal(comparison(parsed("1.1.1.1"), exits), "different");
  assert.equal(comparison(parsed("2001:4860:4860::8888"), exits), "unconfirmed");
  assert.equal(comparison(parsed("192.168.0.1", "host"), exits), "local");
  assert.equal(comparison(parsed("test.local", "host"), exits), "local");
  assert.equal(comparison(parsed("8.8.8.8", "relay"), exits), "relay");
});
test("gather uses only fixed STUN and a data channel; completion closes resources and deduplicates", async () => {
  const peer = new FakePeer(), progress: Candidate[][] = [];
  const gathering = gatherCandidates(new AbortController().signal, values => progress.push(values), { factory: config => {
    assert.deepEqual(config, { iceServers: [{ urls: webrtcPolicy.stun }], iceCandidatePoolSize: 0, iceTransportPolicy: "all" }); return peer;
  } });
  await tick(); assert.equal(peer.descriptions, 1);
  peer.candidate("8.8.8.8"); peer.candidate("::ffff:8.8.8.8"); peer.candidate("test.local", "host"); peer.complete();
  const r = await gathering; assert.equal(r.phase, "complete"); assert.equal(r.candidates.length, 2); assert.equal(progress.length, 2);
  assert.equal(peer.closed, 1); assert.equal(peer.channelClosed, 1); assert.equal(peer.onicecandidate, null);
});
test("timeout retains partial candidates and records bounded STUN errors, never a safety verdict", async () => {
  const peer = new FakePeer(); const gathering = gatherCandidates(new AbortController().signal, () => {}, { factory: () => peer, timeoutMs: 5 });
  peer.candidate("8.8.8.8");
  for (let i = 0; i < 110; i++) peer.onicecandidateerror?.call(peer as unknown as RTCPeerConnection, {} as RTCPeerConnectionIceErrorEvent);
  const r = await gathering; assert.equal(r.phase, "timedout"); assert.equal(r.candidates.length, 1); assert.equal(r.stunErrors, 99); assert.equal(peer.closed, 1);
});
test("abort closes peer, detaches callbacks and does not apply a late offer", async () => {
  const peer = new FakePeer(); let resolve!: (offer: RTCSessionDescriptionInit) => void;
  peer.createOffer = () => new Promise(r => { resolve = r; });
  const abort = new AbortController(), gathering = gatherCandidates(abort.signal, () => {}, { factory: () => peer });
  peer.candidate("8.8.8.8"); abort.abort(); resolve({ type: "offer" });
  const r = await gathering; await tick(); assert.equal(r.phase, "cancelled"); assert.equal(r.candidates.length, 1); assert.equal(peer.closed, 1); assert.equal(peer.descriptions, 0);
});
test("candidate count is bounded and unsupported, pre-aborted and constructor failure settle", async () => {
  const peer = new FakePeer(), gathering = gatherCandidates(new AbortController().signal, () => {}, { factory: () => peer });
  for (let i = 1; i <= 65; i++) peer.candidate(`8.8.4.${i}`);
  const r = await gathering; assert.equal(r.candidates.length, 64); assert.equal(r.capped, true); assert.equal(peer.closed, 1);
  assert.equal((await gatherCandidates(new AbortController().signal, () => {})).phase, "unsupported");
  assert.equal((await gatherCandidates(AbortSignal.abort(), () => {}, { factory: () => { throw Error(); } })).phase, "cancelled");
  assert.equal((await gatherCandidates(new AbortController().signal, () => {}, { factory: () => { throw Error(); } })).phase, "error");
});
test("offer failure and an empty completed collection remain distinct from unsupported or timeout", async () => {
  const failed = new FakePeer(); failed.createOffer = async () => { throw Error("restricted"); };
  assert.equal((await gatherCandidates(new AbortController().signal, () => {}, { factory: () => failed })).phase, "error"); assert.equal(failed.closed, 1);
  const empty = new FakePeer(); const gathering = gatherCandidates(new AbortController().signal, () => {}, { factory: () => empty }); empty.complete();
  const r = await gathering; assert.equal(r.phase, "complete"); assert.deepEqual(r.candidates, []);
});
test("controller is initially idle and independent failures preserve completed observations", async () => {
  let calls = 0;
  const controller = createWebRtcController({ urls, gather: async () => { calls++; return result(); }, probe: async (_url, family) => { calls++; return family === "ipv4" ? success("8.8.8.8") : { ok: false, code: "TIMEOUT" }; } });
  assert.equal(calls, 0); assert.equal(controller.getSnapshot().ice.phase, "idle");
  controller.runAll(); await tick(); assert.equal(calls, 3); assert.equal(controller.getSnapshot().ice.candidates.length, 1); assert.equal(controller.getSnapshot().exits.ipv4.phase, "success"); assert.equal(controller.getSnapshot().exits.ipv6.error, "TIMEOUT");
  controller.runExit("ipv6"); await tick(); assert.equal(calls, 4); assert.equal(controller.getSnapshot().ice.candidates.length, 1); controller.dispose();
});
test("controller restart and cancel isolate late results and retain partial ICE data", async () => {
  const pending: { resolve: (r: IceResult) => void; progress: (c: Candidate[]) => void; signal: AbortSignal }[] = [];
  const controller = createWebRtcController({ urls, gather: (signal, progress) => new Promise(resolve => pending.push({ resolve, progress, signal })), probe: async () => success("8.8.8.8") });
  controller.runIce(); await tick(); controller.runIce(); await tick(); assert.equal(pending[0].signal.aborted, true);
  pending[0].progress([parsed("1.1.1.1")]); pending[0].resolve(result("1.1.1.1")); await tick(); assert.equal(controller.getSnapshot().ice.phase, "running"); assert.deepEqual(controller.getSnapshot().ice.candidates, []);
  pending[1].progress([parsed("8.8.8.8")]); controller.cancel(); pending[1].resolve(result("1.1.1.1")); await tick(); assert.equal(controller.getSnapshot().ice.phase, "cancelled"); assert.equal(controller.getSnapshot().ice.candidates[0].address, "8.8.8.8"); controller.dispose();
});
test("dispose suppresses late candidate callbacks and HTTPS results", async () => {
  let complete!: (r: ProbeOutcome) => void, progress!: (c: Candidate[]) => void;
  const controller = createWebRtcController({ urls, gather: async (_signal, report) => { progress = report; return result(); }, probe: () => new Promise(resolve => { complete = resolve; }) });
  controller.runIce(); controller.runExit("ipv4"); await tick(); controller.dispose(); const before = controller.getSnapshot();
  progress([parsed("1.1.1.1")]); complete(success("1.1.1.1")); await tick(); assert.equal(controller.getSnapshot(), before);
});
