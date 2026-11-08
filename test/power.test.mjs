import assert from 'node:assert/strict';
import test from 'node:test';
import {load, connected, session, packet, streamFor, flush} from './harness.mjs';

// Independent golden frames from BooKoo's published protocols, checked 2026-11-08:
// bookoo_mini_scale/protocols.md (2026-10-30) and
// bookoo_ultra_scale/protocols.md (2026-09-18) in BooKooCode/OpenSource.
// Mini source commit: 4211fe09d909de14d5ad4aea1fa26dec18cc3c80.
const miniKeepAlive = [0x03, 0x0a, 0x12, 0x00, 0x00, 0x1b];
const miniShutdown = [0x03, 0x0a, 0x11, 0x00, 0x00, 0x18];
const ultraKeepAlive = [0x03, 0x0a, 0x25, 0x00, 0x00, 0x2c];
const ultraShutdown = [0x03, 0x0a, 0x15, 0x00, 0x00, 0x1c];

test('default Mini v1.4.2 sends only the published Mini frames over repeated keep-alive cycles', async () => {
  const harness = load();
  const {driver, link} = await connected(harness);
  await streamFor(harness, link, 120000);
  assert.deepEqual(link.writes.map(entry => entry.data), [miniKeepAlive, miniKeepAlive, miniKeepAlive]);
  await driver.disconnect(link.cleanup());
  assert.deepEqual(link.cleanupWrites.map(entry => entry.data), [miniShutdown]);
  assert.equal(harness.clock.timers.size, 0);
});

test('Mini upgrades enable the released commands despite a saved false legacy checkbox', async () => {
  for (const saved of [
    {Firmware142Commands: false},
    {Firmware142Commands: true},
    {PowerCommandSupport: 'Legacy Mini setting', Firmware142Commands: false},
    {PowerCommandSupport: 'Legacy Mini setting', Firmware142Commands: true},
    {PowerCommandSupport: 'Shutdown and keep-awake', Firmware142Commands: false},
  ]) {
    const harness = load(saved);
    const {driver, link} = await connected(harness);
    await flush();
    assert.deepEqual(link.writes.map(entry => entry.data), [miniKeepAlive]);
    await driver.disconnect(link.cleanup());
    assert.deepEqual(link.cleanupWrites.map(entry => entry.data), [miniShutdown]);
  }
});

test('explicit saved power opt-outs survive the Mini default change', async () => {
  for (const saved of [
    {PowerCommandSupport: 'Disabled'},
    {PowerCommandSupport: 'Disabled', Firmware142Commands: true},
    {PowerCommandSupport: 'Legacy Mini setting', Firmware142Commands: false,
      KeepAwake: false, PowerOffOnDisconnect: false},
  ]) {
    const harness = load(saved);
    const {driver, link} = await connected(harness);
    await streamFor(harness, link, 120000);
    await driver.disconnect(link.cleanup());
    assert.deepEqual(link.writes, []);
    assert.deepEqual(link.cleanupWrites, []);
    assert.equal(harness.clock.timers.size, 0);
  }
});

test('both model protocols respect each independently saved power toggle', async () => {
  for (const [model, keepAlive, shutdown] of [
    ['Mini', miniKeepAlive, miniShutdown], ['Ultra', ultraKeepAlive, ultraShutdown],
  ]) {
    for (const [KeepAwake, PowerOffOnDisconnect] of [[false, true], [true, false], [false, false]]) {
      const harness = load({ScaleModel: model, KeepAwake, PowerOffOnDisconnect});
      const {driver, link} = await connected(harness);
      await flush();
      assert.deepEqual(link.writes.map(entry => entry.data), KeepAwake ? [keepAlive] : []);
      await driver.disconnect(link.cleanup());
      assert.deepEqual(link.cleanupWrites.map(entry => entry.data), PowerOffOnDisconnect ? [shutdown] : []);
      assert.equal(harness.clock.timers.size, 0);
    }
  }
});

test('shutdown-only uses the chosen model and never schedules keep-alive', async () => {
  for (const [model, shutdown] of [['Mini', miniShutdown], ['Ultra', ultraShutdown]]) {
    const harness = load({ScaleModel: model, PowerCommandSupport: 'Shutdown only'});
    const {driver, link} = await connected(harness);
    await streamFor(harness, link, 120000);
    assert.deepEqual(link.writes, []);
    await driver.disconnect(link.cleanup());
    assert.deepEqual(link.cleanupWrites.map(entry => entry.data), [shutdown]);
    assert.equal(harness.clock.timers.size, 0);
  }
});

test('Ultra model selection retains Ultra frames with default-enabled power settings', async () => {
  const harness = load({ScaleModel: 'Ultra'});
  const {driver, link} = await connected(harness);
  await streamFor(harness, link, 60000);
  assert.deepEqual(link.writes.map(entry => entry.data), [ultraKeepAlive, ultraKeepAlive]);
  await driver.disconnect(link.cleanup());
  assert.deepEqual(link.cleanupWrites.map(entry => entry.data), [ultraShutdown]);
});

test('default power commands wait for an accepted live weight before starting', async () => {
  const harness = load();
  const driver = harness.create();
  const link = session();
  const connection = driver.connect(link);
  await link.subscribed;
  const corrupt = packet(); corrupt[19] ^= 1;
  await link.emit(corrupt);
  await flush();
  assert.deepEqual(link.writes, []);
  await link.emit(packet());
  await connection;
  await flush();
  assert.deepEqual(link.writes.map(entry => entry.data), [miniKeepAlive]);
  await driver.disconnect(link.cleanup());
});

test('unknown model choices fail before Bluetooth is bound', () => {
  for (const ScaleModel of ['mini', 'Auto', 'Unknown', '', true, 0, [], {}]) {
    assert.throws(() => load({ScaleModel}), /ScaleModel must be Mini or Ultra/);
  }
});

test('load logs the selected protocol and enabled features for field diagnosis', () => {
  assert.ok(load().logs.some(line => line.includes('Power protocol: Mini; keep-alive on; shutdown on')));
  assert.ok(load({ScaleModel: 'Ultra', PowerCommandSupport: 'Shutdown only'}).logs
    .some(line => line.includes('Power protocol: Ultra; keep-alive off; shutdown on')));
  assert.ok(load({PowerCommandSupport: 'Disabled'}).logs
    .some(line => line.includes('keep-alive off; shutdown off')));
});
