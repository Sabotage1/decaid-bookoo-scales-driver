# BooKoo Mini driver for Decaid

An installable JavaScript BLE scale plugin for Decaid 0.9.0. It uses Decaid's
device driver runtime and needs no changes to the Decaid app.

Themis Mini firmware **v1.4.1** uses the default configuration.
Weight, battery, tare, timer controls, timer readings and flow readings are
implemented. The planned v1.4.2 shutdown and sleep-countdown-reset commands are
implemented behind an explicit setting and are **off by default**.

## Install

Download **bookoo-mini-0.1.0.zip** from [GitHub Releases](https://github.com/Sabotage1/decaid-bookoo-mini-driver/releases/latest). Choose the plugin ZIP under Assets; do not select GitHub’s source-code archive. No build tools are needed on the tablet.

1. Transfer `bookoo-mini-0.1.0.zip` to the device running Decaid.
2. In Decaid, open **Plugins → cogwheel → Install plugin → ZIP file** and select
   the ZIP. Alternatively, install the `bookoo-mini.reaplugin` folder using
   **Folder snapshot**.
3. Load/enable **BooKoo Mini Scale**. Disconnect an existing native BooKoo session,
   scan again, and select the scale provided by this plugin. Set it as the
   preferred scale if you want automatic connection.
4. On firmware **v1.4.1**, leave **Enable firmware v1.4.2 power commands** off.
5. For machine sleep behavior, set Decaid's **Scale Power Management** to
   **Display Off**. Decaid deliberately disconnects this driver on machine sleep
   and owns subsequent recovery. Older firmware falls back to its own auto-off.

The plugin overrides native BooKoo matching on subsequent discovery. Existing
native and plugin device IDs differ, so the preferred scale is not silently
changed. Unload this plugin and rescan to return to the native integration.
Do not run another enabled plugin that claims the same BooKoo scale.


## If the plugin is loaded but the scale does not connect

Loading a driver does not select its scale. After installation, disconnect the
native scale session, scan, select the discovered BooKoo **plugin** scale as primary,
and save it as preferred. The plugin ID starts with
`plugin:bookoo-mini.reaplugin:bookoo:`; the old native preference is only a Bluetooth
address and does not automatically migrate. This preference mismatch was observed
and corrected during the hardware check above. A remembered native entry can
remain visible as disconnected while the plugin entry is connected.

Keep the scale on and disconnect BOOKOO N or other Bluetooth clients. If discovery
stalls, power-cycle the scale and rescan. For a connection check, read
`GET /api/v1/devices` on your own Decaid host: the plugin scale should have
`state: "connected"` and `connectionRole: "primary"`. Subscribe to
`/ws/v1/scale/snapshot` and place a known weight on the scale. Tare and timer
controls continue through Decaid’s normal scale API; the skin does not need a
BooKoo-specific driver integration. Confirm any skin-specific display behavior.

## When firmware v1.4.2 is available

Update the Mini's firmware using BooKoo's supported update method, then enable
**Enable firmware v1.4.2 power commands** in this plugin's settings. Saving
settings reloads the plugin; reconnect/select the scale if necessary.

With the firmware option enabled:

- **Keep scale awake while connected** sends `03 0A 25 00 00 2C` after the first
  accepted weight and every 60 seconds thereafter. It resets the automatic
  shutdown countdown without changing the scale's stored auto-off duration.
- **Power off on intentional disconnect** sends `03 0A 15 00 00 1C` through
  Decaid's bounded cleanup GATT context before the host closes Bluetooth.

Both options default to on but do nothing until the firmware option is enabled.
Firmware is not inferred from an advertised name or from a successful BLE write.
The driver does not install firmware or attempt to wake a powered-off scale.
You may need to turn the scale on manually before Decaid can reconnect.

**Current API limitation:** Decaid 0.9.0's `disconnect({gatt})` cleanup hook does
not identify the disconnect reason. Enabling power-off therefore covers machine
sleep, a manual disconnect, and switching to another scale. Plugin reload/unload,
link loss, failed initialization, and protocol silence skip shutdown. A future
generic runtime hook carrying a sleep reason would be needed for strictly
sleep-only shutdown.

Keep-awake follows the live scale connection. Enable Decaid's scale power
management to end it when the machine sleeps. With scale power management
disabled, a connected scale continues receiving keep-awake commands.

## Settings

| Setting | Default | Effect |
| --- | --- | --- |
| `Firmware142Commands` | `false` | Gates both new commands; keep off on v1.4.1. |
| `KeepAwake` | `true` | Sends the countdown reset immediately and every 60 seconds when enabled above. |
| `PowerOffOnDisconnect` | `true` | Sends shutdown on intentional disconnect when enabled above. |
| `PacketTimeoutMs` | `2000` | Valid weight packet silence deadline, integer 1000–30000 ms. |

The silence deadline is inherited from Decaid's reference driver and remains
provisional until tested on your hardware. It starts after subscription setup,
or at the first valid notification if one arrives earlier. Invalid packets do
not refresh it. A timeout reports failure once and lets Decaid handle recovery.

## Protocol and behavior

- Service `00000ffe-0000-1000-8000-00805f9b34fb`.
- Notifications `0000ff11-0000-1000-8000-00805f9b34fb`.
- Acknowledged commands `0000ff12-0000-1000-8000-00805f9b34fb`.
- Exactly 20-byte `03 0B` weight frames with a valid XOR checksum and weight sign.
  Weight is signed grams at 0.01 g resolution; timer is a 24-bit millisecond
  value; signed flow is in g/s at 0.01 g/s resolution.
- Invalid battery values retain the previous valid value, starting unknown.
  Invalid flow signs omit only flow and do not discard a valid weight.
- Tare `01`, timer start `04`, stop `05`, reset `06` use six-byte XOR frames.
  The five-byte alternatives mentioned in #1015 are not sent or retried.
- All regular commands are serialized per session. Keep-awake schedules its next
  attempt only after the previous one settles. User command failures propagate;
  keep-awake failures are logged and retried at the next interval.
- Readiness requires an accepted weight. Each publication retains the opaque
  host sample token; no synthetic timestamp or stale-sample fallback is used.
- Reconnects, shot stopping, scale selection and Bluetooth teardown remain owned
  by Decaid. This plugin creates no reconnect loop or direct machine controls.
- BooKoo devices can share advertisement names and UUIDs. This is a Mini driver;
  matching a device is not proof that its model/firmware supports new commands.

## Validation

Run with Node.js 20 or later; no npm dependencies are required:

```sh
npm test
npm run build
```

The automated suite tests protocol frames, firmware gating, keep-awake scheduling,
command serialization, cleanup authority, readiness failures, stale samples,
reconnect callbacks, and four independent scale instances. Three integration
tests use Decaid **v0.9.0's actual JavaScript BLE bridge**, with a simulated Dart/
GATT boundary. They exercise the public bridge rather than replacing it with a
driver-shaped mock. They do not execute the Flutter/Dart host or a physical BLE
stack. `npm run build` checks JavaScript syntax, runs the suite, creates a ZIP
containing one plugin root, validates its contents, and writes `SHA256SUMS`.

**Limited hardware verification:** on October 22, 2026, a Themis Mini on firmware
v1.4.1 connected through this plugin to Decaid 0.9.0 on an Android tablet. The
standard scale WebSocket delivered 178 weight samples over 18 seconds and reported
battery at 90%, with no disconnect during that capture. The empty scale read 0 g.
This confirms connection and live publication, not nonzero-weight accuracy, tare,
timer operation, brew-to-weight stopping, long-session stability, or sleep/wake.
The v1.4.2 commands have not been physically verified. Complete the following
acceptance checks before relying on the driver for a brew:

1. On v1.4.1 with firmware commands off, compare native and plugin readings with
   an empty scale, a known weight and a negative weight after tare.
2. Check battery, timer start/stop/reset and tare through Decaid. Verify timely
   live weights and a supervised brew-to-weight stop.
3. Check machine sleep with Display Off, manual scale power-off, power-on,
   reconnect, app restart and return from a backgrounded tablet browser.
4. After updating to v1.4.2, enable the firmware option. Confirm the scale stays
   awake longer than its configured auto-off duration while the machine is awake,
   then powers off on machine sleep. Check manual disconnect and scale switching
   too. A Bluetooth acknowledgement alone does not prove physical shutdown.

Record the scale firmware, Decaid version, tablet/OS, notification cadence and
observed results. New Mini commands are based on the manufacturer confirmation
reported in #1015 and the published Ultra frame format; Mini v1.4.2 behavior
still needs confirmation on that firmware, including charging behavior.

## Sources and license

- [Decaid 0.9.0 driver announcement](https://decentespresso.com/blog/decaid_090bring_your_driver).
- [Maintainer's requested plugin approach and Mini firmware confirmation, #1015](https://github.com/decentespresso/decaid/issues/1015#issuecomment-6318884349).
- [Decaid v0.9.0 reference driver](https://github.com/decentespresso/decaid/tree/v0.9.0/examples/plugins/bookoo-mini.reaplugin).
- [Decaid v0.9.0 plugin contract](https://github.com/decentespresso/decaid/blob/v0.9.0/doc/Plugins.md).
- [BooKoo Mini protocol](https://github.com/BooKooCode/OpenSource/blob/main/bookoo_mini_scale/protocols.md).
- [BooKoo Ultra protocol including commands 0x15 and 0x25](https://github.com/BooKooCode/OpenSource/blob/main/bookoo_ultra_scale/protocols.md).

This driver derives from Decaid's reference implementation and is distributed
under **GPL-3.0-or-later**. See `LICENSE`, `COPYING`, and `THIRD_PARTY.md`.
