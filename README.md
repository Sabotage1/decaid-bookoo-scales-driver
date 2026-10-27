# BooKoo Scales Driver

Community Bluetooth scale driver for **BooKoo Themis Mini and Themis Ultra**, using
Decaid 0.9.0's JavaScript device-driver runtime. Publishes weight, battery, flow and
timer readings through Decaid's normal Scale interface, with tare and timer
start/stop/reset commands. Existing skins can use their standard scale integration.

**Current release: v0.2.0.** Download the
[installation ZIP](https://github.com/Sabotage1/decaid-bookoo-scales-driver/releases/download/v0.2.0/bookoo-scales-0.2.0.zip),
[SHA-256 checksums](https://github.com/Sabotage1/decaid-bookoo-scales-driver/releases/download/v0.2.0/SHA256SUMS)
and [release notes](https://github.com/Sabotage1/decaid-bookoo-scales-driver/releases/tag/v0.2.0).
The repository is now **Sabotage1/decaid-bookoo-scales-driver**, previously
`Sabotage1/decaid-bookoo-mini-driver`. The installed plugin keeps its original ID
so existing Mini users can update in place.

## Models, firmware and power commands

Mini and Ultra use the same BLE service and standard weight frame. Their names
and UUIDs do not reliably identify model or firmware. The driver does not guess a
firmware version from a successful connection or an acknowledged write.

| Scale / firmware | Standard weights and controls | Power command compatibility |
| --- | --- | --- |
| Mini v1.4.1 or unknown Mini firmware | Implemented | Disabled |
| Mini v1.4.2+ | Implemented | Shutdown and keep-awake; based on manufacturer confirmation reported in issue #1015, pending hardware verification |
| Ultra v3.1.2 and earlier, or unknown Ultra firmware | Shared published protocol implemented | Disabled |
| Ultra release v4.0.0 | Implemented | Shutdown only |
| Ultra release v4.0.1+ | Implemented | Shutdown and keep-awake |

Set **Power command compatibility** only after checking the scale's firmware.
The selector is a manual compatibility declaration, not automatic firmware
validation. Default settings send neither power command.

Ultra restrictions from the manufacturer apply: tare is unavailable during
automatic running/done or while charging; timer commands are effective in timing
and ratio modes; shutdown is unavailable while charging. A GATT acknowledgement
alone does not prove the scale performed an action. Choose an appropriate manual
mode for Decaid's tare/timer workflow. The driver does not change device modes,
calibration, presets, automatic stop conditions or powder weight.

## Install or update

1. Download the **bookoo-scales-0.2.0.zip** release asset linked above and transfer
   it to the device running Decaid 0.9.0. Use this asset, rather than GitHub's
   generated source-code archive.
2. Open **Plugins → cogwheel → Install plugin → ZIP file** and select that ZIP.
   Alternatively install the `bookoo-mini.reaplugin` folder as a **Folder snapshot**.
3. Load/enable **BooKoo Scales Driver**. On a first install, disconnect the native
   BooKoo session, turn on the scale, disconnect BOOKOO N or other BLE clients,
   rescan and select the plugin scale as **primary** and **preferred**.
4. Leave power commands disabled for old or unknown firmware. For supported
   firmware, select the compatibility option in the table above. Saving settings
   reloads the plugin; reconnect if necessary.
5. For machine sleep, use Decaid's **Display Off** scale power-management mode.
   Without a supported shutdown command, this deliberately disconnects Bluetooth
   and leaves the scale to its own auto-off timer.
6. Check a known weight, tare and timer controls in the skin before brewing.

For existing installations, the visible name and ZIP filename change while the
plugin ID remains
`bookoo-mini.reaplugin`, its driver ID remains `bookoo`, and the folder deliberately
retains its old name. Updating an installed v0.1.0 plugin therefore preserves its
saved settings and plugin-backed preferred-scale ID. Do not install a second,
renamed copy beside the old driver. The filename is not the plugin's identity.

Existing users who enabled `Firmware142Commands` retain their Mini behavior when
compatibility is **Legacy Mini setting**. Explicit choices such as **Disabled** or
**Shutdown only** override the old checkbox. Keep the legacy Mini checkbox off
when configuring an Ultra; use the compatibility selector instead.

### Install with tracked GitHub updates

As an alternative to the ZIP, choose **Plugins → cogwheel → Install plugin →
GitHub Release** and enter `Sabotage1/decaid-bookoo-scales-driver`. Decaid installs
the release ZIP and tracks future release tags. Use **Check for updates** to check
a tracked install. ZIP and folder installs are snapshots and need manual updates.

### Enable Ultra keep-alive and shutdown

For an Ultra on confirmed release firmware **v4.0.1 or later**, open the driver's
**Settings** and select:

- **Power command compatibility:** `Shutdown and keep-awake`.
- **Keep scale awake while connected:** on.
- **Power off on intentional disconnect:** on.

Save, then reconnect if needed. For machine sleep, also select Decaid's
**Display Off** scale power-management mode. The legacy Mini firmware checkbox is
not used with this explicit compatibility choice. Older or unknown firmware
should use the option in the compatibility table above.

## Power behavior

With **Shutdown and keep-awake** compatibility and **Keep scale awake while
connected** enabled, the driver sends `03 0A 25 00 00 2C` after the first accepted
weight and every 60 seconds after the previous attempt settles. This resets the
auto-off countdown without changing the saved auto-off duration. **Shutdown only**
never sends this command, including on Ultra v4.0.0.

With a compatible selection and **Power off on intentional disconnect** enabled,
the driver sends `03 0A 15 00 00 1C` through the host's cleanup GATT context before
Bluetooth teardown. Decaid 0.9.0 does not provide the disconnect reason to this
hook, so this also covers manual disconnect and switching scales. Plugin unload/
reload, link loss, failed initialization and protocol silence skip shutdown.
A powered-off scale may need its physical button before it can reconnect.

Keep-awake ends when the connection retires. With Decaid scale power management
disabled, it continues while the scale remains connected, including machine sleep.
The driver does not wake a powered-off scale or update its firmware.

**Settings are shared by all physical scales connected by this plugin.** If you
connect mixed models/firmware, choose only capabilities supported by every active
scale, or leave power support Disabled. Per-scale firmware profiles are not exposed.

## Settings

| Setting | Default | Effect |
| --- | --- | --- |
| `PowerCommandSupport` | `Legacy Mini setting` | Options: Legacy Mini setting, Disabled, Shutdown only, Shutdown and keep-awake. |
| `Firmware142Commands` | `false` | Backward-compatible Mini setting; only used in Legacy Mini setting mode. |
| `KeepAwake` | `true` | Countdown reset, only when compatibility permits both commands. |
| `PowerOffOnDisconnect` | `true` | Shutdown, only when compatibility permits shutdown. |
| `PacketTimeoutMs` | `2000` | Valid weight silence deadline, integer 1000–30000 ms. |

The silence watchdog starts after subscription setup, or at an earlier valid
weight notification. Invalid frames and Ultra powder/settlement events do not
refresh it. A timeout reports failure once; Decaid owns recovery. The default is
inherited from the reference Mini driver and needs confirmation on real Ultra
hardware. Do not increase it to conceal an unreliable weight stream.

## Connection troubleshooting

Loading a driver does not select a scale. A native preference containing only a
Bluetooth address will not automatically migrate to a plugin ID. Select the
plugin entry and save it as preferred. IDs start with
`plugin:bookoo-mini.reaplugin:bookoo:` for both models. A remembered native entry
may remain disconnected while the plugin scale is connected; this is expected.

Keep the scale on and other BLE clients disconnected. Power-cycle and rescan if
needed. `GET /api/v1/devices` on your own Decaid host should show the plugin scale
as `connected` and `primary`. `/ws/v1/scale/snapshot` should deliver live weights.
The driver does not create its own scan/reconnect loop or direct machine controls.

## Protocol

- Service `00000ffe-0000-1000-8000-00805f9b34fb`; notifications
  `0000ff11-0000-1000-8000-00805f9b34fb`; acknowledged commands
  `0000ff12-0000-1000-8000-00805f9b34fb`.
- Standard weights: exactly 20 bytes, header `03 0B`, XOR checksum, signed grams
  at 0.01 g resolution, 24-bit millisecond timer and signed flow at 0.01 g/s.
- Ultra's ounce display flag does not change BLE weight units: published weight
  remains grams. No ounces-to-grams conversion is applied to an already-gram value.
- Ultra `03 0F` powder frames and `03 0D` automatic settlement frames are ignored.
  They never become live beverage weights, timer/flow updates, readiness evidence
  or liveness evidence. This version does not expose those extra channels.
- Invalid battery values retain the last valid value, initially unknown. Invalid
  flow signs omit flow without discarding the weight.
- Tare `01`, timer start `04`, stop `05`, reset `06`: six-byte XOR commands.
- Each publication retains the host's opaque sample token. No JS timestamp or
  stale-sample fallback is invented. Regular writes are serialized per session;
  keep-awake is single-flight. User command errors propagate; maintenance failures
  are logged before a later periodic attempt.

## Build and validation

Node.js 20+ and system zip/unzip; no npm dependencies:

```sh
npm test
npm run build
```

Build outputs `dist/bookoo-scales-0.2.0.zip` and `dist/SHA256SUMS`. The ZIP has one
plugin root, with its manifest, source, README and license. Build verifies archive
entries and their bytes against source.

All **38 automated tests** pass for this release. They cover both model frame contracts, grams despite Ultra ounce
selection, ignored non-weight frames, firmware power profiles, migration of Mini
settings, exact commands, timeouts, stale callbacks and independent sessions.
Integration tests use Decaid v0.9.0's unmodified JavaScript BLE bridge with a
simulated Dart/GATT boundary. They do not execute the Flutter host or physical BLE.

**Hardware evidence:** the previous v0.1.0 Mini driver connected on Mini v1.4.1
with Decaid 0.9.0 on Android, receiving 178 empty-scale weight samples in 18 seconds
with battery reporting and no disconnect during that capture. That was not an
accuracy or brewing acceptance test. **The v0.2.0 build, Ultra hardware and new
power commands have not been physically verified.**

Before relying on either model, compare empty, known and negative weights; tare;
all timer controls; timely updates during a supervised brew-to-weight stop; and
long-session behavior, sleep, power-cycle, reconnect, app restart and tablet
background/foreground operation. For Ultra, compare grams and ounce display modes,
manual timing/ratio modes, automatic-mode traffic, supported power commands on the
exact firmware, and behavior while charging. Record model, firmware, Decaid/OS
versions, notification cadence and observed results. A Bluetooth acknowledgement
is not proof of physical shutdown.

## Sources and license

- [BooKoo Ultra protocol](https://github.com/BooKooCode/OpenSource/blob/main/bookoo_ultra_scale/protocols.md), inspected October 27, 2026; document dated September 18, 2026.
- [BooKoo Mini protocol](https://github.com/BooKooCode/OpenSource/blob/main/bookoo_mini_scale/protocols.md).
- [Mini v1.4.2 manufacturer confirmation and plugin approach, Decaid #1015](https://github.com/decentespresso/decaid/issues/1015#issuecomment-6318884349).
- [Decaid v0.9.0 reference plugin](https://github.com/decentespresso/decaid/tree/v0.9.0/examples/plugins/bookoo-mini.reaplugin).
- [Decaid v0.9.0 plugin contract](https://github.com/decentespresso/decaid/blob/v0.9.0/doc/Plugins.md).

Community plugin, not an official Decent Espresso or BooKoo release.
GPL-3.0-or-later; see LICENSE, COPYING and THIRD_PARTY.md.
