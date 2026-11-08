import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import {Clock, SERVICE, DATA, COMMAND, sourceUrl, encode, bytes, packet, plain, flush} from './harness.mjs';

function bridge(settings = {}) {
  const clock = new Clock();
  const handlers = new Map(), links = new Map(), calls = [], logs = [];
  let boundFactory, serial = 0;
  const context = vm.createContext({
    pluginId: 'bookoo-mini.reaplugin', pluginGeneration: 1,
    pluginBridgeToken: 'test-token', __deviceNonce: 'test', __deviceSeq: 0,
    setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout,
    btoa: value => Buffer.from(value, 'binary').toString('base64'),
    __deviceSetHandlers: (handle, entry) => handlers.set(handle, entry),
    __deviceRemoveHandlers: handle => handlers.delete(handle),
    __deviceCall: async (type, payload) => {
      calls.push({type, ...plain(payload)});
      if (type === 'bindDriver') {boundFactory = handlers.get(payload.registrationHandle); return {};}
      const link = links.get(payload.registrationHandle);
      if (!link) throw new Error('Unknown physical binding');
      if (type === 'gatt') {
        const cleanup = payload.authority === link.cleanupAuthority;
        if (payload.authority !== link.authority && !cleanup || link.retired && !cleanup) {
          throw Object.assign(new Error('stale'), {code: 'stale_session'});
        }
        if (payload.operation === 'discoverServices') return {value: [SERVICE]};
        if (payload.operation === 'subscribe') {
          assert.equal(payload.args.service, SERVICE);
          assert.equal(payload.args.characteristic, DATA);
          link.listener = payload.args.listener;
          return {value: {subscription: 'sub-' + serial}};
        }
        if (payload.operation === 'write') {
          assert.equal(payload.args.service, SERVICE);
          assert.equal(payload.args.characteristic, COMMAND);
          assert.equal(payload.args.withResponse, true);
          link.writes.push({cleanup, data: bytes(payload.args.data)});
          return {value: null};
        }
      }
      if (payload.session !== link.domainSession || link.retired) {
        throw Object.assign(new Error('stale'), {code: 'stale_session'});
      }
      if (type === 'blePublish') {
        if (link.rejectSample) throw Object.assign(new Error('expired'), {code: 'stale_sample'});
        link.publications.push(plain(payload));
        return {};
      }
      if (type === 'bleDisconnected') {link.reported++; return {};}
      throw new Error('Unexpected bridge call: ' + type);
    }
  });
  vm.runInContext(readFileSync(new URL('./fixtures/decaid-v0.9.0-ble-bridge.js', import.meta.url), 'utf8'), context);
  vm.runInContext(readFileSync(sourceUrl, 'utf8'), context);
  const host = {log: message => logs.push(message), devices: {bindDriver: vm.runInContext('__bindBleDriver', context)}};
  const plugin = context.createPlugin(host);
  plugin.onLoad(settings);

  async function create(id) {
    const handle = 'physical-' + (++serial);
    const link = {
      handle, authority: 'live-' + serial, cleanupAuthority: 'cleanup-' + serial,
      domainSession: 'domain-' + serial, retired: false, publications: [], writes: [], reported: 0
    };
    links.set(handle, link);
    boundFactory.handlers.create({
      registrationHandle: handle,
      device: {id, name: 'BOOKOO', advertisement: {
        name: 'BOOKOO', nameComplete: true, serviceUuids: [SERVICE], servicesComplete: true
      }}
    });
    const entry = handlers.get(handle);
    link.entry = entry;
    link.publish = data => entry.handlers.bleEvent({
      session: link.authority, type: 'notification', listener: link.listener,
      data: encode(data), sample: 'host-sample-' + serial
    });
    const session = entry.connectTransport('connect-' + serial, {
      gattSession: link.authority, session: link.domainSession
    });
    link.connection = entry.handlers.connect(session);
    await flush();
    return link;
  }
  async function disconnect(link) {
    link.retired = true;
    await link.entry.handlers.disconnect({gattSession: link.cleanupAuthority});
    await link.entry.handlers.bleEvent({session: link.authority, type: 'disconnect'});
  }
  return {clock, plugin, create, disconnect, calls, logs};
}

test('real Decaid v0.9.0 bridge carries default Mini power commands, samples and deliberate cleanup', async () => {
  const host = bridge();
  const link = await host.create('AA:BB:CC');
  await link.publish(packet(-10.5));
  await link.connection;
  await link.entry.handlers.resetTimer();
  assert.equal(link.publications[0].snapshot.weight, -10.5);
  assert.equal(link.publications[0].sample, 'host-sample-1');
  assert.deepEqual(link.writes.map(write => write.data[2]), [18, 6]);
  await host.disconnect(link);
  assert.deepEqual(link.writes.at(-1), {cleanup: true, data: [3, 10, 17, 0, 0, 24]});
  assert.equal(host.clock.timers.size, 0);
});

test('real bridge: old disabled-by-default Mini settings upgrade to public v1.4.2 frames', async () => {
  const host = bridge({PowerCommandSupport: 'Legacy Mini setting', Firmware142Commands: false});
  const link = await host.create('MINI-1.4.2');
  await link.publish(packet());
  await link.connection;
  assert.deepEqual(link.writes, [{cleanup: false, data: [3, 10, 18, 0, 0, 27]}]);
  await host.disconnect(link);
  assert.deepEqual(link.writes.at(-1), {cleanup: true, data: [3, 10, 17, 0, 0, 24]});
  assert.equal(host.clock.timers.size, 0);
});

test('real bridge: Ultra model keeps its distinct power protocol', async () => {
  const host = bridge({ScaleModel: 'Ultra'});
  const link = await host.create('ULTRA-4.0.1');
  await link.publish(packet());
  await link.connection;
  assert.deepEqual(link.writes, [{cleanup: false, data: [3, 10, 37, 0, 0, 44]}]);
  await host.disconnect(link);
  assert.deepEqual(link.writes.at(-1), {cleanup: true, data: [3, 10, 21, 0, 0, 28]});
  assert.equal(host.clock.timers.size, 0);
});

test('real bridge drops expired samples without losing the subscription or forging a timestamp', async () => {
  const host = bridge();
  const link = await host.create('AA:BB:CC');
  link.rejectSample = true;
  await link.publish(packet(10));
  assert.equal(link.publications.length, 0);
  link.rejectSample = false;
  await link.publish(packet(20));
  await link.connection;
  assert.equal(link.publications[0].snapshot.weight, 20);
  assert.ok(host.calls.filter(call => call.type === 'blePublish').every(call => call.sample));
  await host.disconnect(link);
});

test('real bridge keeps four physical instances independent and fences terminal callbacks', async () => {
  const host = bridge({Firmware142Commands: true});
  const live = [];
  for (let i = 0; i < 4; i++) {
    const link = await host.create('device-' + i);
    await link.publish(packet(i));
    await link.connection;
    live.push(link);
  }
  await host.disconnect(live[0]);
  await live[0].publish(packet(999));
  assert.equal(live[0].publications.length, 1);
  await live[1].entry.handlers.tare();
  assert.deepEqual(live[1].writes.map(write => write.data[2]), [18, 1]);
  assert.deepEqual(live[2].writes.map(write => write.data[2]), [18]);
  host.plugin.onUnload();
  for (const link of live.slice(1)) await host.disconnect(link);
  assert.equal(host.clock.timers.size, 0);
  assert.equal(live.slice(1).some(link => link.writes.some(write => write.data[2] === 17)), false);
});

test('real bridge: Ultra v4.0.0 compatibility shuts down without sending keep-awake', async () => {
  const host = bridge({ScaleModel: 'Ultra', PowerCommandSupport: 'Shutdown only'});
  const link = await host.create('ULTRA-TEST');
  const ounceDisplay = packet(18.75); ounceDisplay[5] = 2;
  ounceDisplay[19] = ounceDisplay.slice(0, 19).reduce((sum, byte) => sum ^ byte, 0);
  await link.publish(ounceDisplay);
  await link.connection;
  assert.equal(link.publications[0].snapshot.weight, 18.75);
  assert.equal(link.writes.length, 0);
  await link.entry.handlers.tare();
  await link.entry.handlers.startTimer();
  await link.entry.handlers.stopTimer();
  await link.entry.handlers.resetTimer();
  assert.deepEqual(link.writes.map(write => write.data[2]), [1, 4, 5, 6]);
  await host.disconnect(link);
  assert.deepEqual(link.writes.at(-1), {cleanup: true, data: [3, 10, 21, 0, 0, 28]});
  assert.equal(host.clock.timers.size, 0);
});
