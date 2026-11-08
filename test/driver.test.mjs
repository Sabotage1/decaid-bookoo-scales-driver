import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {load, connected, session, packet, checksum, encode, deferred, flush,
  streamFor, SERVICE, COMMAND} from './harness.mjs';

test('manifest provides a BLE scale with Mini power commands on by default', () => {
  const manifest = JSON.parse(readFileSync(new URL('../bookoo-mini.reaplugin/manifest.json', import.meta.url)));
  assert.equal(manifest.id, 'bookoo-mini.reaplugin');
  assert.equal(manifest.apiVersion, 1);
  assert.deepEqual(manifest.permissions, ['transport.ble', 'log']);
  assert.equal(manifest.settings.ScaleModel.default, 'Mini');
  assert.equal(manifest.settings.PowerCommandSupport.default, 'Shutdown and keep-awake');
  assert.equal(manifest.settings.KeepAwake.default, true);
  assert.equal(manifest.settings.PowerOffOnDisconnect.default, true);
  assert.equal('Firmware142Commands' in manifest.settings, false);
  assert.equal(manifest.drivers[0].type, 'scale');
  assert.ok(manifest.drivers[0].capabilities.includes('disconnectToSleep'));
  for (const setting of Object.values(manifest.settings)) {
    assert.ok(setting.label && setting.description);
  }
});

test('publishes signed weight, timer, signed flow, battery and the opaque host sample token', async () => {
  const harness = load();
  const {driver, link} = await connected(harness);
  await link.emit(packet(-45.67, {flow: -2.34, timerMs: 0xffffff, battery: 0}), 'host-token');
  assert.deepEqual(link.published.at(-1), {
    snapshot: {weight: -45.67, battery: 0, timerMs: 0xffffff, flow: -2.34}, token: 'host-token'
  });
  await driver.disconnect(link.cleanup());
  assert.equal(harness.clock.timers.size, 0);
});

test('invalid packets cannot publish or establish readiness', async () => {
  const harness = load();
  const driver = harness.create();
  const link = session();
  let ready = false;
  const connection = driver.connect(link).then(() => {ready = true;});
  await link.subscribed;
  const invalid = [[], packet().slice(0, 19), [...packet(), 0],
    checksum([4, ...packet().slice(1)]), checksum([3, 10, ...packet().slice(2)])];
  const sign = packet(); sign[6] = 0; invalid.push(checksum(sign));
  const corrupt = packet(); corrupt[19] ^= 1; invalid.push(corrupt);
  for (const value of invalid) await link.emit(value);
  for (const value of ['', '%%%%', encode(packet()).slice(0, -1), 'A'.repeat(28)]) {
    await link.emitBase64(value);
  }
  await flush();
  assert.equal(link.published.length, 0);
  assert.equal(ready, false);
  await link.emit(packet());
  await connection;
  await driver.disconnect(link.cleanup());
});

test('invalid battery retains the last valid value and starts unknown', async () => {
  const harness = load();
  const {driver, link} = await connected(harness, {firstPacket: packet(0, {battery: 255})});
  assert.equal(link.published[0].snapshot.battery, null);
  await link.emit(packet(0, {battery: 82}));
  await link.emit(packet(0, {battery: 101}));
  assert.equal(link.published.at(-1).snapshot.battery, 82);
  await driver.disconnect(link.cleanup());
});

test('invalid flow sign omits flow without discarding a valid weight', async () => {
  const harness = load();
  const {driver, link} = await connected(harness);
  const value = packet(99); value[10] = 0;
  await link.emit(checksum(value));
  assert.equal(link.published.at(-1).snapshot.weight, 99);
  assert.equal('flow' in link.published.at(-1).snapshot, false);
  await driver.disconnect(link.cleanup());
});

test('tare and timer writes use full UUIDs, six-byte XOR frames and acknowledged writes', async () => {
  const harness = load({PowerCommandSupport: 'Disabled'});
  const {driver, link} = await connected(harness);
  await driver.tare(); await driver.startTimer(); await driver.stopTimer(); await driver.resetTimer();
  assert.deepEqual(link.writes.map(entry => entry.data), [
    [3, 10, 1, 0, 0, 8], [3, 10, 4, 0, 0, 13],
    [3, 10, 5, 0, 0, 12], [3, 10, 6, 0, 0, 15]
  ]);
  for (const entry of link.writes) {
    assert.equal(entry.service, SERVICE); assert.equal(entry.characteristic, COMMAND);
  }
  await driver.disconnect(link.cleanup());
  assert.equal(link.cleanupWrites.length, 0);
});

test('older Mini firmware can explicitly disable keep-awake and shutdown commands', async () => {
  const harness = load({PowerCommandSupport: 'Disabled'});
  const {driver, link} = await connected(harness);
  await streamFor(harness, link, 180000);
  assert.equal(link.writes.length, 0);
  await driver.disconnect(link.cleanup());
  assert.equal(link.cleanupWrites.length, 0);
});

test('Mini v1.4.2 defaults send keep-awake immediately and every 60 seconds', async () => {
  const harness = load();
  const {driver, link} = await connected(harness);
  await flush();
  assert.deepEqual(link.writes.map(entry => entry.data), [[3, 10, 18, 0, 0, 27]]);
  await streamFor(harness, link, 120000);
  assert.equal(link.writes.length, 3);
  await driver.disconnect(link.cleanup());
  assert.deepEqual(link.cleanupWrites.map(entry => entry.data), [[3, 10, 17, 0, 0, 24]]);
  assert.equal(harness.clock.timers.size, 0);
});

test('keep-awake and shutdown can be independently disabled', async () => {
  const harness = load({Firmware142Commands: true, KeepAwake: false, PowerOffOnDisconnect: false});
  const {driver, link} = await connected(harness);
  await streamFor(harness, link, 120000);
  await driver.disconnect(link.cleanup());
  assert.equal(link.writes.length, 0);
  assert.equal(link.cleanupWrites.length, 0);
});

test('shutdown uses cleanup authority even after normal GATT authority is revoked', async () => {
  const harness = load({Firmware142Commands: true, KeepAwake: false});
  const {driver, link} = await connected(harness);
  await driver.disconnect(link.cleanup());
  await driver.disconnect(link.cleanup());
  assert.equal(link.writes.length, 0);
  assert.equal(link.cleanupWrites.length, 1);
  await assert.rejects(driver.tare());
});

test('link loss cancels timers and never sends shutdown', async () => {
  const harness = load({Firmware142Commands: true});
  const {driver, link} = await connected(harness);
  link.drop();
  const count = link.writes.length;
  await harness.clock.tick(180000);
  assert.equal(link.writes.length, count);
  assert.equal(link.cleanupWrites.length, 0);
  assert.equal(harness.clock.timers.size, 0);
  await assert.rejects(driver.startTimer());
});

test('packet silence reports one failure to the host and stops maintenance', async () => {
  const harness = load({Firmware142Commands: true});
  const {link} = await connected(harness);
  await harness.clock.tick(2000);
  assert.equal(link.reported, 1);
  const count = link.writes.length;
  await harness.clock.tick(120000);
  assert.equal(link.reported, 1);
  assert.equal(link.writes.length, count);
  assert.equal(harness.clock.timers.size, 0);
});

test('watchdog starts after subscription setup and accepts packets before subscribe resolves', async () => {
  for (const early of [false, true]) {
    const harness = load();
    const driver = harness.create();
    const delay = deferred();
    const link = session({subscriptionDelay: delay.promise, firstPacket: early ? packet() : undefined});
    const connection = driver.connect(link);
    await link.subscribed;
    if (early) {
      await link.emit(packet());
      await harness.clock.tick(1000);
    } else {
      await harness.clock.tick(5000);
    }
    assert.equal(link.reported, 0);
    delay.resolve();
    await flush();
    if (!early) await link.emit(packet());
    await connection;
    await driver.disconnect(link.cleanup());
  }
});

test('startup failures reject without leaking timers or unhandled readiness promises', async () => {
  for (const options of [{services: []}, {subscribeError: new Error('subscribe failed')}]) {
    const harness = load();
    const driver = harness.create();
    await assert.rejects(driver.connect(session(options)));
    assert.equal(harness.clock.timers.size, 0);
  }
  const harness = load();
  const driver = harness.create();
  const link = session();
  const connection = driver.connect(link);
  const rejection = assert.rejects(connection);
  await link.subscribed;
  link.drop();
  await rejection;
  assert.equal(harness.clock.timers.size, 0);
});

test('stale samples retain their provenance and cannot establish readiness', async () => {
  const harness = load();
  const driver = harness.create();
  let reject = true, ready = false;
  const link = session({publish: () => {
    if (reject) throw Object.assign(new Error('expired sample'), {code: 'stale_sample'});
  }});
  const connection = driver.connect(link).then(() => {ready = true;});
  await link.subscribed;
  await assert.rejects(link.emit(packet(), 'expired'), {code: 'stale_sample'});
  assert.equal(ready, false);
  reject = false;
  await link.emit(packet(), 'fresh');
  await connection;
  assert.equal(link.published[0].token, 'fresh');
  await driver.disconnect(link.cleanup());
});

test('keep-awake is single-flight and serializes with user commands', async () => {
  const harness = load({Firmware142Commands: true});
  const gate = deferred();
  const {driver, link} = await connected(harness, {write: entry => entry.data[2] === 18 ? gate.promise : undefined});
  const tare = driver.tare();
  await streamFor(harness, link, 120000);
  assert.equal(link.writes.length, 1);
  gate.resolve(); await tare; await flush();
  assert.deepEqual(link.writes.map(entry => entry.data[2]), [18, 1]);
  await streamFor(harness, link, 60000);
  assert.equal(link.writes.filter(entry => entry.data[2] === 18).length, 2);
  await driver.disconnect(link.cleanup());
});

test('keep-awake failure logs and retries without losing weight or user command errors', async () => {
  const harness = load({Firmware142Commands: true});
  const error = new Error('write failed');
  const {driver, link} = await connected(harness, {write: () => Promise.reject(error)});
  await flush();
  assert.ok(harness.logs.some(message => message.includes('write failed')));
  await assert.rejects(driver.tare(), /write failed/);
  await streamFor(harness, link, 60000);
  assert.ok(link.published.length > 1);
  assert.equal(link.writes.filter(entry => entry.data[2] === 18).length, 2);
  await assert.rejects(driver.disconnect(link.cleanup()), /write failed/);
  assert.equal(harness.clock.timers.size, 0);
});

test('old callbacks and queued commands cannot affect a replacement session', async () => {
  const harness = load({PowerCommandSupport: 'Disabled'});
  const driver = harness.create();
  const old = session();
  const connecting = driver.connect(old);
  await old.subscribed; await old.emit(packet()); await connecting;
  old.drop();
  const next = session();
  const reconnected = driver.connect(next);
  await next.subscribed; await next.emit(packet(20)); await reconnected;
  await old.emit(packet(900));
  old.drop();
  await driver.tare();
  assert.equal(next.published.at(-1).snapshot.weight, 20);
  assert.equal(next.writes.length, 1);
  await driver.disconnect(next.cleanup());
});

test('four physical bindings are independent and plugin unload cancels all timers', async () => {
  const harness = load({Firmware142Commands: true});
  const instances = [];
  for (let i = 0; i < 4; i++) instances.push(await connected(harness));
  await instances[0].driver.disconnect(instances[0].link.cleanup());
  await instances[1].driver.tare();
  assert.equal(instances[1].link.writes.at(-1).data[2], 1);
  assert.equal(instances[2].link.writes.length, 1);
  harness.plugin.onUnload();
  assert.equal(harness.clock.timers.size, 0);
  for (const {driver, link} of instances.slice(1)) await driver.disconnect(link.cleanup());
});

test('settings reject invalid types and timeout bounds before binding a driver', () => {
  for (const settings of [
    {ScaleModel: 'mini'}, {ScaleModel: {}}, {KeepAwake: 1}, {PowerOffOnDisconnect: 'false'},
    {PacketTimeoutMs: 0}, {PacketTimeoutMs: 999}, {PacketTimeoutMs: 30001},
    {PacketTimeoutMs: 2000.5}, {PacketTimeoutMs: '2000'}, {PacketTimeoutMs: Infinity}
  ]) assert.throws(() => load(settings));
});

test('configurable packet timeout waits for its exact deadline', async () => {
  const harness = load({PacketTimeoutMs: 5000});
  const {link} = await connected(harness);
  await harness.clock.tick(4999);
  assert.equal(link.reported, 0);
  await harness.clock.tick(1);
  assert.equal(link.reported, 1);
});

test('invalid packets do not extend the silence deadline', async () => {
  const harness = load();
  const {link} = await connected(harness);
  await harness.clock.tick(1500);
  const bad = packet(); bad[19] ^= 1;
  await link.emit(bad);
  await harness.clock.tick(500);
  assert.equal(link.reported, 1);
});

test('intentional retirement rejects readiness immediately before the first weight', async () => {
  const harness = load({Firmware142Commands: true});
  const driver = harness.create();
  const link = session();
  const connecting = driver.connect(link);
  const rejected = assert.rejects(connecting);
  await link.subscribed;
  await driver.disconnect(link.cleanup());
  await rejected;
  assert.equal(link.cleanupWrites.length, 0);
  assert.equal(harness.clock.timers.size, 0);
});
