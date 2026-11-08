// Copyright (C) 2025-2026 Decent Espresso and 2026 Roy Ackerman.
// SPDX-License-Identifier: GPL-3.0-or-later

function createPlugin(host) {
  "use strict";

  const service = "00000ffe-0000-1000-8000-00805f9b34fb";
  const dataCharacteristic = "0000ff11-0000-1000-8000-00805f9b34fb";
  const commandCharacteristic = "0000ff12-0000-1000-8000-00805f9b34fb";
  // Mini public v1.4.2 uses 11/12, not the Ultra's 15/25 (hexadecimal).
  const powerCommands = {
    Mini: {shutdown: 0x11, keepAwake: 0x12},
    Ultra: {shutdown: 0x15, keepAwake: 0x25}
  };
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const sessions = new Set();
  let settings;
  let unloaded = false;

  function decode(data) {
    if (typeof data !== "string" || data.length !== 28 || data[27] !== "=") return null;
    const bytes = [];
    for (let i = 0; i < data.length; i += 4) {
      const a = alphabet.indexOf(data[i]);
      const b = alphabet.indexOf(data[i + 1]);
      const c = alphabet.indexOf(data[i + 2]);
      const d = data[i + 3] === "=" ? 0 : alphabet.indexOf(data[i + 3]);
      if (a < 0 || b < 0 || c < 0 || d < 0) return null;
      bytes.push((a << 2) | (b >> 4), ((b & 15) << 4) | (c >> 2));
      if (data[i + 3] !== "=") bytes.push(((c & 3) << 6) | d);
    }
    if (bytes.length !== 20 || bytes[0] !== 3 || bytes[1] !== 11) return null;
    if (bytes[6] !== 43 && bytes[6] !== 45) return null;
    if (bytes.slice(0, 19).reduce((sum, byte) => sum ^ byte, 0) !== bytes[19]) return null;
    const weight = (bytes[7] << 16) | (bytes[8] << 8) | bytes[9];
    const snapshot = {
      weight: (bytes[6] === 45 ? -weight : weight) / 100,
      battery: bytes[13],
      timerMs: (bytes[2] << 16) | (bytes[3] << 8) | bytes[4]
    };
    if (bytes[10] === 43 || bytes[10] === 45) {
      const flow = (bytes[11] << 8) | bytes[12];
      snapshot.flow = (bytes[10] === 45 ? -flow : flow) / 100;
    }
    return snapshot;
  }

  function write(gatt, opcode) {
    const bytes = [3, 10, opcode, 0, 0];
    bytes.push(bytes.reduce((sum, byte) => sum ^ byte, 0));
    return gatt.writeWithResponse(service, commandCharacteristic,
      btoa(String.fromCharCode(...bytes)));
  }

  function stoppedError() {
    const error = new Error("BooKoo session is not connected");
    error.code = "stale_session";
    return error;
  }

  function stop(state, error) {
    if (!state || state.stopped) return;
    state.stopped = true;
    clearTimeout(state.watchdog);
    clearTimeout(state.keepAwakeTimer);
    state.fail(error || stoppedError());
    sessions.delete(state);
  }

  function command(state, opcode) {
    if (!state || state.stopped) return Promise.reject(stoppedError());
    const result = state.commands.then(() => {
      if (state.stopped) throw stoppedError();
      return write(state.session.gatt, opcode);
    });
    state.commands = result.catch(() => {});
    return result;
  }

  function keepAwake(state) {
    if (state.stopped || settings.PowerCommandSupport !== "Shutdown and keep-awake" || !settings.KeepAwake) return;
    command(state, powerCommands[settings.ScaleModel].keepAwake).catch(error => {
      if (!state.stopped) host.log("[bookoo-scales] Keep-awake failed: " + error.message);
    }).then(() => {
      if (!state.stopped) {
        state.keepAwakeTimer = setTimeout(() => keepAwake(state), 60000);
      }
    });
  }

  function readSettings(values) {
    const result = {};
    for (const [key, fallback] of [
      ["KeepAwake", true], ["PowerOffOnDisconnect", true]
    ]) {
      const value = values[key] == null ? fallback : values[key];
      if (typeof value !== "boolean") throw new Error(key + " must be a boolean");
      result[key] = value;
    }
    result.ScaleModel = values.ScaleModel == null ? "Mini" : values.ScaleModel;
    if (result.ScaleModel !== "Mini" && result.ScaleModel !== "Ultra") {
      throw new Error("ScaleModel must be Mini or Ultra");
    }
    const support = values.PowerCommandSupport == null ? "Shutdown and keep-awake" : values.PowerCommandSupport;
    if (!["Legacy Mini setting", "Disabled", "Shutdown only", "Shutdown and keep-awake"].includes(support)) {
      throw new Error("PowerCommandSupport must be a supported compatibility option");
    }
    // Upgrade the former disabled-by-default Mini gate. Preserve explicit opt-outs.
    // Firmware142Commands is obsolete; even a saved false must not gate v1.4.2.
    result.PowerCommandSupport = support === "Legacy Mini setting" ? "Shutdown and keep-awake" : support;
    const timeout = values.PacketTimeoutMs == null ? 2000 : values.PacketTimeoutMs;
    if (!Number.isInteger(timeout) || timeout < 1000 || timeout > 30000) {
      throw new Error("PacketTimeoutMs must be an integer between 1000 and 30000");
    }
    result.PacketTimeoutMs = timeout;
    return result;
  }

  return {
    id: "bookoo-mini.reaplugin",
    version: "0.3.0",
    onLoad(values) {
      settings = readSettings(values || {});
      unloaded = false;
      host.log("[bookoo-scales] Power protocol: " + settings.ScaleModel +
        "; keep-alive " + (settings.PowerCommandSupport === "Shutdown and keep-awake" && settings.KeepAwake ? "on" : "off") +
        "; shutdown " + (settings.PowerCommandSupport !== "Disabled" && settings.PowerOffOnDisconnect ? "on" : "off"));
      return host.devices.bindDriver("bookoo", {
        create() {
          let active;
          return {
            async connect(session) {
              if (unloaded) throw stoppedError();
              if (active && !active.stopped) throw new Error("BooKoo session is already connected");
              let resolveReady, rejectReady, settled = false;
              const readiness = new Promise((resolve, reject) => {
                resolveReady = resolve;
                rejectReady = reject;
              });
              readiness.catch(() => {});
              const state = {
                session, stopped: false, ready: false, cleanupStarted: false,
                watchdog: null, keepAwakeTimer: null, commands: Promise.resolve(),
                fail(error) {
                  if (!settled) {settled = true; rejectReady(error);}
                }
              };
              active = state;
              sessions.add(state);
              let battery = null;
              function watchPackets() {
                clearTimeout(state.watchdog);
                state.watchdog = setTimeout(() => {
                  const error = new Error("BooKoo protocol silence");
                  stop(state, error);
                  host.log("[bookoo-scales] " + error.message);
                  session.reportDisconnected().catch(() => {});
                }, settings.PacketTimeoutMs);
              }
              try {
                session.gatt.onDisconnect(() => stop(state, new Error("BooKoo disconnected before readiness")));
                const services = await session.gatt.discoverServices();
                if (state.stopped) throw stoppedError();
                if (!services.includes(service)) throw new Error("BooKoo service unavailable");
                await session.gatt.subscribe(service, dataCharacteristic, async (data, sample) => {
                  if (state.stopped) return;
                  const snapshot = decode(data);
                  if (!snapshot) return;
                  watchPackets();
                  if (snapshot.battery <= 100) battery = snapshot.battery;
                  snapshot.battery = battery;
                  await session.publish(snapshot, sample);
                  if (!state.stopped && !settled) {settled = true; resolveReady();}
                });
                if (state.stopped) throw stoppedError();
                if (state.watchdog === null) watchPackets();
                await readiness;
                if (state.stopped) throw stoppedError();
                state.ready = true;
                keepAwake(state);
              } catch (error) {
                stop(state, error);
                throw error;
              }
            },
            async disconnect(context) {
              const state = active;
              if (!state || state.cleanupStarted) return;
              state.cleanupStarted = true;
              const powerOff = !unloaded && !state.stopped && state.ready &&
                settings.PowerCommandSupport !== "Disabled" && settings.PowerOffOnDisconnect;
              stop(state);
              await state.commands;
              if (powerOff) await write(context.gatt, powerCommands[settings.ScaleModel].shutdown);
            },
            tare() {return command(active, 0x01);},
            startTimer() {return command(active, 0x04);},
            stopTimer() {return command(active, 0x05);},
            resetTimer() {return command(active, 0x06);}
          };
        }
      });
    },
    onUnload() {
      unloaded = true;
      for (const state of sessions) stop(state);
    }
  };
}
