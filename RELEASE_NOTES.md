# BooKoo Scales Driver v0.2.0 for Decaid

Adds **BooKoo Themis Ultra** support alongside **Themis Mini** and renames the
visible plugin to **BooKoo Scales Driver**. Both models use Decaid's normal Scale
interface, so existing skins can use their standard weight, tare and timer controls.

The repository is now [Sabotage1/decaid-bookoo-scales-driver](https://github.com/Sabotage1/decaid-bookoo-scales-driver),
previously `Sabotage1/decaid-bookoo-mini-driver`.

## Installation and upgrading

1. Download [bookoo-scales-0.2.0.zip](https://github.com/Sabotage1/decaid-bookoo-scales-driver/releases/download/v0.2.0/bookoo-scales-0.2.0.zip).
2. In Decaid 0.9.0, open **Plugins → cogwheel → Install plugin → ZIP file** and
   select the downloaded ZIP. Load/enable **BooKoo Scales Driver**.
3. On first installation, disconnect the native BooKoo session and other BLE
   clients such as BOOKOO N. Turn on the scale, rescan and select the plugin scale
   as **primary** and **preferred**.
4. Configure power commands for the scale's confirmed firmware as described below.
5. Check a known weight, tare and timer controls before brewing.

For tracked updates, use **Install plugin → GitHub Release** with repository
`Sabotage1/decaid-bookoo-scales-driver`, then **Check for updates** when needed.
ZIP and folder installations are snapshots and require manual updates. Download
the named installation asset rather than GitHub's generated source archive.

The internal plugin ID/folder remains `bookoo-mini.reaplugin` and the driver ID
stays `bookoo`. Existing Mini settings and plugin-backed preferred-scale IDs are
preserved when updating v0.1.0. Install as an update; do not create a renamed copy.

## Mini and Ultra features

- Signed weight in grams, battery, signed flow and timer readings.
- Tare and timer start, stop and reset commands.
- Optional keep-alive and shutdown on compatible firmware.
- Ultra ounce display selections still publish grams correctly.
- Ultra powder and automatic settlement frames are ignored and never treated as
  live beverage weights, readiness or weight-stream activity.
- Retained host sample provenance, command serialization, session isolation and
  configurable weight-stream silence handling. Decaid owns reconnect behavior.

## Firmware compatibility and power settings

Set **Power command compatibility** manually; model/firmware are not detected:

| Firmware | Select |
| --- | --- |
| Mini v1.4.1, older or unknown firmware; Ultra v3.1.2 and earlier | Disabled |
| Ultra release v4.0.0 | Shutdown only |
| Ultra release v4.0.1+ or Mini v1.4.2+ | Shutdown and keep-awake |

For **Ultra v4.0.1+**, select **Shutdown and keep-awake** and leave both **Keep
scale awake while connected** and **Power off on intentional disconnect** on.
Save, then reconnect if necessary. For shutdown when the espresso machine sleeps,
also use Decaid's **Display Off** scale power-management mode.

Keep-alive sends the countdown-reset command after the first accepted weight and
every **60 seconds** after the preceding attempt finishes. It does not change the
scale's saved auto-off duration. Shutdown runs before a healthy intentional
disconnect, including machine sleep, manual disconnect and switching scales.
Plugin unload/reload, link loss, failed initialization and protocol silence skip
shutdown. A powered-off scale may need its physical button before reconnecting.

The default **Legacy Mini setting** preserves the old `Firmware142Commands`
checkbox, which defaults to off. Explicit compatibility selections override that
checkbox. The two power toggles can independently disable their commands.
Settings apply to every scale connected by this plugin; use capabilities supported
by all active scales. Keep-alive continues while connected if Decaid scale power
management is disabled.

Ultra shutdown is unavailable while charging. Tare and timer mode restrictions
also apply. The driver does not change scale modes, calibration, presets, powder
weight or automatic stop settings. An acknowledged BLE write does not prove the
device performed an action. See the [full guide](https://github.com/Sabotage1/decaid-bookoo-scales-driver#readme)
and [manufacturer Ultra protocol](https://github.com/BooKooCode/OpenSource/blob/main/bookoo_ultra_scale/protocols.md).

## Validation and downloads

**38 automated tests pass**, including the unmodified Decaid v0.9.0 JavaScript BLE
bridge with simulated Dart/GATT. The build checks syntax, archive contents and
byte-for-byte agreement between packaged files and source.

The previous v0.1.0 Mini build had a limited live connection/empty-scale check on
Mini v1.4.1 and Android Decaid 0.9.0: 178 samples over 18 seconds with battery
reporting. **The new v0.2.0 build, Ultra hardware and power commands have not been
physically verified.** Check known weights, tare/timers, a supervised brew stop,
long sessions, sleep and reconnect before relying on it. This release includes no
firmware updater or remote power-on.

The release contains exactly one installation ZIP and [SHA256SUMS](https://github.com/Sabotage1/decaid-bookoo-scales-driver/releases/download/v0.2.0/SHA256SUMS).
Full source, protocol references, troubleshooting and license attribution are in
the repository. Community plugin, GPL-3.0-or-later.
