# BooKoo Scales Driver

Community Bluetooth driver for **BooKoo Themis Mini and Themis Ultra**, using
Decaid 0.9.0's JavaScript device-driver runtime. It publishes weight, battery,
flow and timer readings through Decaid's normal Scale interface, with tare and
timer start/stop/reset. Existing skins use their standard scale integration.

**Current release: v0.3.0.** Download the
[installation ZIP](https://github.com/Sabotage1/decaid-bookoo-scales-driver/releases/download/v0.3.0/bookoo-scales-0.3.0.zip),
[SHA-256 checksums](https://github.com/Sabotage1/decaid-bookoo-scales-driver/releases/download/v0.3.0/SHA256SUMS)
and [release notes](https://github.com/Sabotage1/decaid-bookoo-scales-driver/releases/tag/v0.3.0).

## Mini v1.4.2 power fix and new defaults

Earlier versions incorrectly sent the Ultra's power commands to the Mini. The
public Mini v1.4.2 protocol, updated by BooKoo on October 30, 2026, specifies
**shutdown 0x11** and **keep-alive 0x12**. Ultra uses **0x15** and **0x25**.
v0.3.0 selects the command set using **Scale model for power commands**.

**Mini is the default model. Keep-alive and shutdown are ON by default**, targeting
public Mini firmware v1.4.2 or later. The former `Firmware142Commands` checkbox is
removed and no longer gates these features. An old saved `false` or `Legacy Mini
setting` does not keep them disabled after updating. Explicit **Disabled** choices
and saved off toggles are preserved; enable them in Settings if needed.

**Ultra users upgrading from any earlier version must select Ultra in the new
model setting before using power commands.** The model is not detected from the
shared Bluetooth name or UUIDs. On older or unsupported firmware, select Disabled.

## Install or update

1. Transfer **bookoo-scales-0.3.0.zip** to the device running Decaid 0.9.0. Choose
   the named release asset rather than GitHub's generated source-code archive.
2. Open **Plugins → cogwheel → Install plugin → ZIP file**, select the ZIP, and
   load/enable **BooKoo Scales Driver**. A folder snapshot also works.
3. For Mini public v1.4.2+, the default power settings are ready. For Ultra, open
   Settings and select **Scale model for power commands → Ultra**, then choose
   the compatibility option below. Save and reconnect if needed.
4. On first installation, disconnect any native BooKoo session and BOOKOO N or
   other BLE clients. Turn on the scale, rescan and select the plugin scale as
   **primary** and **preferred**.
5. For shutdown when the espresso machine sleeps, set Decaid's scale power
   management to **Display Off**, or use the equivalent skin setting.
6. Check a known weight, tare and timer controls before brewing.

Alternatively choose **Install plugin → GitHub Release** and enter
`Sabotage1/decaid-bookoo-scales-driver`. **Check for updates** checks tracked
GitHub installations. ZIP and folder installs are snapshots and need manual updates.

If GitHub release downloads fail with HTTP 504, choose **GitHub Branch**, enter
`Sabotage1/decaid-bookoo-scales-driver`, and use branch `main`. This tracks branch
commits. Root-level `manifest.json` and `plugin.js` support Decaid 0.9.1's archive
layout; the build synchronizes them from the packaged plugin folder.

The installed plugin ID/folder remains `bookoo-mini.reaplugin` and its driver ID
remains `bookoo`, preserving existing settings and plugin-backed preferred-scale
IDs on update. Install as an update, rather than as a second renamed copy. The
former `Sabotage1/decaid-bookoo-mini-driver` repository links redirect here.

## Firmware and model settings

| Device / firmware | Scale model | Power command compatibility |
| --- | --- | --- |
| Mini public v1.4.2+ | Mini (default) | Shutdown and keep-awake (default) |
| Mini v1.4.1 or earlier; beta v1.5.0.0806; unconfirmed firmware | Mini | Disabled |
| Ultra release v4.0.1+ | Ultra | Shutdown and keep-awake |
| Ultra release v4.0.0 | Ultra | Shutdown only |
| Ultra v3.1.2 or earlier; unconfirmed firmware | Ultra | Disabled |

Firmware compatibility is a manual setting. Neither a successful connection nor
an acknowledged write detects firmware or proves the scale performed an action.
These settings apply to every active scale connected by this plugin. **For mixed
Mini/Ultra connections, disable power commands:** a shared model setting cannot
select a different command set per device.

For the default Mini setup, leave these enabled:

- **Power command compatibility:** Shutdown and keep-awake.
- **Keep scale awake while connected:** on.
- **Power off on intentional disconnect:** on.

## Power behavior

| Model | Keep-alive frame | Shutdown frame |
| --- | --- | --- |
| Mini public v1.4.2+ | `03 0A 12 00 00 1B` | `03 0A 11 00 00 18` |
| Ultra (compatible firmware above) | `03 0A 25 00 00 2C` | `03 0A 15 00 00 1C` |

Keep-alive starts after the first accepted weight and repeats every **60 seconds**
after the previous attempt settles. It resets the auto-off countdown without
changing the saved auto-off duration. Writes are serialized and do not overlap.
The Shutdown only option never sends keep-alive. Either power toggle can be
turned off independently.

Shutdown is sent through the host's cleanup GATT context before Bluetooth
teardown on a healthy intentional disconnect. Decaid 0.9.0 does not provide the
disconnect reason, so this also applies to manual disconnect and switching scales.
Plugin unload/reload, link loss, failed initialization and protocol silence skip
shutdown. A powered-off scale may need its physical button before reconnecting.

Keep-alive stops when the connection retires. If Decaid scale power management is
disabled, the connection and keep-alive may continue during machine sleep. Plugin
power settings alone do not change Decaid's machine-sleep policy. Use Display Off
for a deliberate sleep disconnect without an immediate recovery attempt. The
driver does not remotely wake the scale or update its firmware.

Mini tare/timer actions depend on its mode and timer state. Ultra shutdown is
unavailable while charging; Ultra tare is unavailable while charging or during
automatic running/done, and timer commands require timing or ratio mode. Choose
an appropriate manual mode for Decaid's controls. The driver does not change
modes, calibration, presets, automatic stop conditions or powder weight.

## Settings

| Setting | Default | Effect |
| --- | --- | --- |
| `ScaleModel` | `Mini` | Selects Mini 0x11/0x12 or Ultra 0x15/0x25 power commands. |
| `PowerCommandSupport` | `Shutdown and keep-awake` | Both commands, shutdown only, or Disabled. |
| `KeepAwake` | `true` | Enables countdown reset when compatibility permits it. |
| `PowerOffOnDisconnect` | `true` | Enables shutdown when compatibility permits it. |
| `PacketTimeoutMs` | `2000` | Valid weight silence deadline; integer 1000–30000 ms. |

The old `Firmware142Commands` value is ignored. The plugin also accepts the old
Legacy Mini setting string as an alias for both commands when an older host
passes it; Decaid 0.9.0 reconciles that retired enum value to the new default.
Explicit Disabled values and false power toggles survive an update.

## Connection and power troubleshooting

Loading the plugin does not select a scale. A native preference containing only
a Bluetooth address does not automatically migrate to a plugin ID. Select the
plugin entry and save it as preferred. Its ID starts with
`plugin:bookoo-mini.reaplugin:bookoo:`. A remembered native entry can remain
disconnected while the plugin scale is connected.

Check that v0.3.0 is installed, the model matches the physical scale, and power
compatibility and both toggles are enabled. On load, the log identifies the
selected model and effective settings, for example:

```text
[bookoo-scales] Power protocol: Mini; keep-alive on; shutdown on
```

If an explicit Disabled selection or off toggle was saved earlier, turn it on.
For sleep shutdown, check Decaid's Display Off policy. Unloading the plugin is
not a shutdown test. For Ultra, disconnect charging power before testing shutdown.
Keep other Bluetooth apps disconnected; power-cycle and rescan if necessary.
`GET /api/v1/devices` should show the plugin scale connected and primary, and
`/ws/v1/scale/snapshot` should deliver current weights.

The weight-stream watchdog starts after subscription setup or an earlier valid
notification. Invalid frames and Ultra powder/settlement frames do not extend it.
A timeout reports failure once and lets Decaid recover. The default 2-second
cadence still needs physical Ultra confirmation; do not increase it to hide an
unreliable stream.

## Protocol and validation

- Service `00000ffe-0000-1000-8000-00805f9b34fb`, notifications
  `0000ff11-0000-1000-8000-00805f9b34fb`, acknowledged commands
  `0000ff12-0000-1000-8000-00805f9b34fb`.
- Weight frames are 20 bytes with header `03 0B` and XOR checksum; signed grams
  and flow have 0.01 resolution, with a 24-bit millisecond timer.
- Ultra ounce display selections do not change BLE weight units. Powder `03 0F`
  and automatic settlement `03 0D` frames are ignored, not used as beverage samples
  or stream-liveness evidence.
- Invalid battery values retain the last valid value, initially unknown. Invalid
  flow signs omit flow without discarding the weight.
- Tare `01`, timer start `04`, stop `05`, reset `06` use six-byte XOR commands.
- Publications retain the host's opaque sample token rather than inventing JS
  timestamps or disguising delayed samples. Decaid owns reconnect behavior.

Node.js 20+ and system zip/unzip are needed to build; there are no npm dependencies:

```sh
npm run build
```

All **49 automated tests** pass, including exact Mini and Ultra command frames,
periodic keep-alive, old-settings migration, preserved opt-outs, independent
sessions and the unmodified Decaid v0.9.0 JavaScript BLE bridge with simulated
Dart/GATT. The build checks syntax, archive entries and byte-for-byte agreement
between source and `dist/bookoo-scales-0.3.0.zip`, and writes `dist/SHA256SUMS`.

**Physical validation:** the v0.3.0 power fix has not yet been verified on physical
Mini v1.4.2 or Ultra hardware. Prior v0.1.0 evidence was limited to 178 empty-scale
Mini v1.4.1 samples in 18 seconds on Android, with battery reporting. Before
relying on the driver, check known and negative weights, tare/timers, a supervised
brew-to-weight stop, long sessions, machine sleep and reconnect on the exact
firmware and tablet/OS. A successful GATT write alone is not physical proof.

## Sources and license

- [BooKoo Mini protocol](https://github.com/BooKooCode/OpenSource/blob/main/bookoo_mini_scale/protocols.md), document updated October 30, 2026; checked November 8, 2026. This is the source of the corrected public Mini power commands.
- [BooKoo Ultra protocol](https://github.com/BooKooCode/OpenSource/blob/main/bookoo_ultra_scale/protocols.md), checked November 8, 2026.
- [Original discussion, Decaid #1015](https://github.com/decentespresso/decaid/issues/1015). Its early Ultra-style Mini opcodes are superseded by the released Mini protocol above.
- [Decaid v0.9.0 reference plugin](https://github.com/decentespresso/decaid/tree/v0.9.0/examples/plugins/bookoo-mini.reaplugin).
- [Decaid v0.9.0 plugin contract](https://github.com/decentespresso/decaid/blob/v0.9.0/doc/Plugins.md).

Community plugin, GPL-3.0-or-later; see LICENSE, COPYING and THIRD_PARTY.md.
