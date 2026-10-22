import {readFileSync} from 'node:fs';
import vm from 'node:vm';

export const SERVICE = '00000ffe-0000-1000-8000-00805f9b34fb';
export const DATA = '0000ff11-0000-1000-8000-00805f9b34fb';
export const COMMAND = '0000ff12-0000-1000-8000-00805f9b34fb';
export const sourceUrl = new URL('../bookoo-mini.reaplugin/plugin.js', import.meta.url);
export const flush = async () => {for (let i = 0; i < 30; i++) await Promise.resolve();};
export const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => {resolve = yes; reject = no;});
  return {promise, resolve, reject};
};
export const plain = value => JSON.parse(JSON.stringify(value));

export function packet(grams = 12.34, {battery = 70, timerMs = 3210, flow = 1.23} = {}) {
  const data = new Array(20).fill(0);
  const weight = Math.round(Math.abs(grams) * 100);
  const rate = Math.round(Math.abs(flow) * 100);
  data[0] = 3; data[1] = 11;
  data[2] = (timerMs >>> 16) & 255; data[3] = (timerMs >>> 8) & 255; data[4] = timerMs & 255;
  data[5] = 1; data[6] = grams < 0 ? 45 : 43;
  data[7] = (weight >>> 16) & 255; data[8] = (weight >>> 8) & 255; data[9] = weight & 255;
  data[10] = flow < 0 ? 45 : 43; data[11] = (rate >>> 8) & 255; data[12] = rate & 255;
  data[13] = battery;
  return checksum(data);
}

export function checksum(data) {
  data[19] = data.slice(0, 19).reduce((sum, byte) => sum ^ byte, 0);
  return data;
}

export const encode = data => Buffer.from(data).toString('base64');
export const bytes = encoded => [...Buffer.from(encoded, 'base64')];

export class Clock {
  now = 0;
  timers = new Map();
  sequence = 0;
  setTimeout = (callback, delay) => {
    const id = ++this.sequence;
    this.timers.set(id, {at: this.now + Math.max(0, delay), callback});
    return id;
  };
  clearTimeout = id => this.timers.delete(id);
  async tick(ms) {
    const target = this.now + ms;
    while (true) {
      const next = [...this.timers].filter(([, timer]) => timer.at <= target)
        .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!next) break;
      this.now = next[1].at;
      this.timers.delete(next[0]);
      next[1].callback();
      await flush();
    }
    this.now = target;
    await flush();
  }
}

export function load(settings = {}) {
  const clock = new Clock();
  const logs = [];
  let factory;
  const host = {
    log: message => logs.push(message),
    devices: {bindDriver(id, bound) {factory = bound; return Promise.resolve();}}
  };
  const context = vm.createContext({
    host,
    btoa: value => Buffer.from(value, 'binary').toString('base64'),
    setTimeout: clock.setTimeout,
    clearTimeout: clock.clearTimeout,
  });
  vm.runInContext(readFileSync(sourceUrl, 'utf8'), context);
  const plugin = context.createPlugin(host);
  plugin.onLoad(settings);
  return {clock, logs, plugin, create: () => factory.create({name: 'BOOKOO'})};
}

export function session(options = {}) {
  const writes = [], cleanupWrites = [], published = [], information = [];
  let callback, disconnectCallback, reported = 0, retired = false;
  const ready = deferred();
  function write(target, service, characteristic, data) {
    const entry = {service, characteristic, data: bytes(data)};
    target.push(entry);
    return options.write?.(entry) ?? Promise.resolve();
  }
  const value = {
    writes, cleanupWrites, published, information,
    subscribed: ready.promise,
    get reported() {return reported;},
    gatt: {
      async discoverServices() {return options.services ?? [SERVICE];},
      onDisconnect(callback) {disconnectCallback = callback;},
      async subscribe(service, characteristic, subscriber) {
        if (options.subscribeError) throw options.subscribeError;
        callback = subscriber;
        if (options.firstPacket) await subscriber(encode(options.firstPacket), 'first');
        ready.resolve();
        await options.subscriptionDelay;
        return {unsubscribe: async () => {callback = undefined;}};
      },
      writeWithResponse(service, characteristic, data) {
        if (retired) return Promise.reject(Object.assign(new Error('retired'), {code: 'stale_session'}));
        return write(writes, service, characteristic, data);
      }
    },
    async publish(snapshot, token) {
      await options.publish?.(snapshot, token);
      if (retired) throw Object.assign(new Error('retired'), {code: 'stale_session'});
      published.push({snapshot: plain(snapshot), token});
    },
    async publishInfo(info) {information.push(plain(info));},
    async reportDisconnected() {reported++;},
    emit(data, token = 'sample') {return callback(encode(data), token);},
    emitBase64(data, token = 'sample') {return callback(data, token);},
    drop() {retired = true; disconnectCallback?.();},
    cleanup() {
      retired = true;
      return {gatt: {writeWithResponse: (service, characteristic, data) =>
        write(cleanupWrites, service, characteristic, data)}};
    }
  };
  return value;
}

export async function connected(harness, options = {}) {
  const driver = harness.create();
  const link = session(options);
  const connection = driver.connect(link);
  await link.subscribed;
  if (!options.firstPacket) await link.emit(packet(), 'ready');
  await connection;
  return {driver, link};
}

export async function streamFor(harness, link, ms) {
  for (let elapsed = 0; elapsed < ms; elapsed += 1000) {
    await harness.clock.tick(Math.min(1000, ms - elapsed));
    await link.emit(packet());
  }
}
