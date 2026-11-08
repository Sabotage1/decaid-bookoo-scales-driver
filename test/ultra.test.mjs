import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {load, connected, session, packet, checksum, streamFor, flush} from './harness.mjs';

test('BooKoo Scales Driver expands the display name while retaining installed device identity', () => {
  const manifest = JSON.parse(readFileSync(new URL('../bookoo-mini.reaplugin/manifest.json', import.meta.url)));
  assert.equal(manifest.name, 'BooKoo Scales Driver');
  assert.equal(manifest.id, 'bookoo-mini.reaplugin');
  assert.equal(manifest.drivers[0].id, 'bookoo');
  assert.equal(manifest.version, '0.3.0');
  assert.equal(manifest.settings.PowerCommandSupport.type, 'enum');
  assert.equal(manifest.settings.PowerCommandSupport.default, 'Shutdown and keep-awake');
  assert.equal(load().plugin.version, manifest.version);
});

test('Ultra ounce display still publishes grams and preserves signed flow and timer', async () => {
  const harness = load();
  const {driver, link} = await connected(harness);
  const ultra = [0x03, 0x0b, 0x00, 0x75, 0x30, 0x02, 0x2b, 0x00, 0x30,
    0x39, 0x2d, 0x00, 0xfa, 0x55, 0x00, 0x96, 0x01, 0x01, 0x00, 0x79];
  await link.emit(ultra, 'ultra-sample');
  assert.deepEqual(link.published.at(-1), {
    snapshot: {weight: 123.45, battery: 85, timerMs: 30000, flow: -2.5}, token: 'ultra-sample'
  });
  await driver.disconnect(link.cleanup());
});

for (const [mode, resets, shutsDown] of [
  ['Disabled', false, false],
  ['Shutdown only', false, true],
  ['Shutdown and keep-awake', true, true],
]) {
  test(`Ultra power compatibility: ${mode}`, async () => {
    const harness = load({ScaleModel: 'Ultra', PowerCommandSupport: mode});
    const {driver, link} = await connected(harness);
    await flush();
    await streamFor(harness, link, 120000);
    assert.deepEqual(link.writes.map(entry => entry.data), resets ?
      Array.from({length: 3}, () => [3, 10, 37, 0, 0, 44]) : []);
    await driver.disconnect(link.cleanup());
    assert.deepEqual(link.cleanupWrites.map(entry => entry.data), shutsDown ?
      [[3, 10, 21, 0, 0, 28]] : []);
    assert.equal(harness.clock.timers.size, 0);
  });
}

test('explicit compatibility overrides the saved legacy Mini firmware switch', async () => {
  for (const mode of ['Disabled', 'Shutdown only']) {
    const harness = load({ScaleModel: 'Ultra', PowerCommandSupport: mode, Firmware142Commands: true});
    const {driver, link} = await connected(harness);
    await streamFor(harness, link, 60000);
    assert.equal(link.writes.length, 0);
    await driver.disconnect(link.cleanup());
    assert.equal(link.cleanupWrites.length, mode === 'Shutdown only' ? 1 : 0);
  }
});

test('explicit legacy compatibility upgrades to the corrected Mini v1.4.2 commands', async () => {
  const harness = load({PowerCommandSupport: 'Legacy Mini setting', Firmware142Commands: true});
  const {driver, link} = await connected(harness);
  await flush();
  assert.deepEqual(link.writes.map(entry => entry.data), [[3, 10, 18, 0, 0, 27]]);
  await driver.disconnect(link.cleanup());
  assert.deepEqual(link.cleanupWrites.map(entry => entry.data), [[3, 10, 17, 0, 0, 24]]);
});

test('Ultra power options still respect independent keep-awake and shutdown switches', async () => {
  for (const [keepAwake, powerOff] of [[false, true], [true, false], [false, false]]) {
    const harness = load({ScaleModel: 'Ultra', PowerCommandSupport: 'Shutdown and keep-awake', KeepAwake: keepAwake,
      PowerOffOnDisconnect: powerOff});
    const {driver, link} = await connected(harness);
    await flush();
    assert.equal(link.writes.length, keepAwake ? 1 : 0);
    await driver.disconnect(link.cleanup());
    assert.equal(link.cleanupWrites.length, powerOff ? 1 : 0);
  }
});

test('invalid power compatibility values fail before Bluetooth binding', () => {
  for (const value of [true, 0, '', 'Ultra', 'shutdown only', [], {}]) {
    assert.throws(() => load({PowerCommandSupport: value}));
  }
});

test('Ultra powder and automatic settlement frames cannot establish weight readiness', async () => {
  const harness = load();
  const driver = harness.create();
  const link = session();
  let ready = false;
  const connection = driver.connect(link).then(() => {ready = true;});
  await link.subscribed;
  for (const type of [0x0d, 0x0f]) {
    const frame = packet(50); frame[1] = type;
    await link.emit(checksum(frame));
  }
  assert.equal(ready, false);
  assert.equal(link.published.length, 0);
  await link.emit(packet(3));
  await connection;
  await driver.disconnect(link.cleanup());
});

test('Ultra extra frames never refresh the live weight freshness deadline', async () => {
  const harness = load();
  const {link} = await connected(harness);
  await harness.clock.tick(1500);
  for (const type of [0x0d, 0x0f]) {
    const frame = packet(50); frame[1] = type;
    await link.emit(checksum(frame));
  }
  await harness.clock.tick(500);
  assert.equal(link.reported, 1);
  assert.equal(link.published.length, 1);
});
