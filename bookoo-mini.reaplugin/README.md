# BooKoo Scales Driver for Decaid

v0.2.0 supports **Themis Mini and Themis Ultra** standard weight,
battery, flow and timer readings, plus tare and timer controls. Use Decaid 0.9.0.

Install `bookoo-scales-0.2.0.zip` through **Plugins → cogwheel → Install plugin →
ZIP file**, then enable **BooKoo Scales Driver**. Disconnect any native BooKoo
session, rescan, and select the plugin scale as primary and preferred.
Disconnect BOOKOO N and other BLE clients before connecting.

The internal ID/folder `bookoo-mini.reaplugin` and driver ID `bookoo` are retained
so updates from v0.1.0 keep settings and preferred-scale identity. Install this as
an update, not as a second renamed plugin.

[Downloads and full installation guide](https://github.com/Sabotage1/decaid-bookoo-scales-driver).
You can also choose **GitHub Release** during installation and enter
`Sabotage1/decaid-bookoo-scales-driver` to track future releases. ZIP and folder
installs need manual updates.

## Power command compatibility

Choose the option matching confirmed firmware:

| Firmware | Compatibility |
| --- | --- |
| Mini v1.4.1, older/unknown firmware, Ultra v3.1.2 and earlier | Disabled |
| Ultra v4.0.0 | Shutdown only |
| Ultra v4.0.1+ or Mini v1.4.2+ | Shutdown and keep-awake |

The default **Legacy Mini setting** preserves the old `Firmware142Commands`
checkbox. With that checkbox off, power commands stay disabled. Explicit
compatibility selections override it. Model and firmware are not auto-detected.
The selector applies to every scale connected by this plugin; for mixed or
uncertain firmware, leave it Disabled.

For Ultra release v4.0.1+, select **Shutdown and keep-awake** and leave both
**Keep scale awake while connected** and **Power off on intentional disconnect**
on. Save and reconnect if needed. Leave the legacy Mini checkbox off; an explicit
compatibility selection overrides it.

**Keep scale awake while connected** resets auto-off on connection and every 60
seconds, only with Shutdown and keep-awake compatibility. **Power off on intentional
disconnect** applies to either shutdown-compatible setting. The two toggles can
independently disable their commands.

Use Decaid's **Display Off** scale power policy for machine sleep. Power-off also
covers manual disconnect and switching scales because the host cleanup hook has
no sleep reason. Plugin unload/reload and connection failures skip shutdown.
With Decaid power management disabled, keep-awake continues while connected.
A powered-off scale may need its physical button before reconnecting.

Ultra shutdown is unavailable while charging. Tare is restricted during automatic
running/done or charging; timer commands require timing or ratio mode. The driver
does not change modes or automatic settings. An acknowledged write may still have
no effect if the device rejects the action in its current mode.

## Readings and validation

Ultra BLE weights remain grams even with ounces selected on the display. Extra
powder and automatic settlement packets are ignored and never published as live
beverage weights. The notification silence watchdog defaults to 2000 ms and can
be set to integer 1000–30000 ms; its cadence needs a hardware check on the Ultra.

All 38 automated tests pass, covering both protocols and the real Decaid v0.9.0 JavaScript BLE
bridge with simulated GATT. Limited v0.1.0 hardware evidence confirms Mini v1.4.1
connection and empty-scale weight/battery publication. **This v0.2.0 build, the
Ultra and the new power commands have not been physically verified.** Check known
weights, tare, timer controls, supervised brew stopping, sleep and reconnect before
relying on it.

[Ultra protocol](https://github.com/BooKooCode/OpenSource/blob/main/bookoo_ultra_scale/protocols.md),
[Mini protocol](https://github.com/BooKooCode/OpenSource/blob/main/bookoo_mini_scale/protocols.md),
[Decaid reference plugin](https://github.com/decentespresso/decaid/tree/v0.9.0/examples/plugins/bookoo-mini.reaplugin),
[Mini firmware confirmation](https://github.com/decentespresso/decaid/issues/1015).

Community plugin. GPL-3.0-or-later; see LICENSE and COPYING.
