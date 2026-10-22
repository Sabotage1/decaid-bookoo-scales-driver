# BooKoo Mini Scale for Decaid 0.9.0

JavaScript BLE driver for Themis Mini weight, battery, flow, timer readings,
tare and timer controls. Firmware v1.4.1 uses the default settings.

Install this folder or its release ZIP from Decaid's Plugins screen, enable
**BooKoo Mini Scale**, disconnect any existing native BooKoo connection, rescan,
and select the scale supplied by this plugin. Re-select it as the preferred
scale for automatic connection; native and plugin IDs differ.

**Leave "Enable firmware v1.4.2 power commands" off on v1.4.1.** After updating
the Mini to v1.4.2 or later, turn it on to enable the two power settings:

- Keep-awake: reset the auto-off countdown on connection and every 60 seconds.
- Power-off: send shutdown before an intentional disconnect.

Choose Decaid's **Display Off** scale power-management mode for machine sleep.
On v1.4.1 this deliberately disconnects Bluetooth; physical shutdown still follows
the scale's own auto-off timer. On v1.4.2, with firmware commands enabled, shutdown
is attempted before disconnecting.

The current driver API does not supply a disconnect reason: enabling power-off
also affects manual disconnect and switching scales. Plugin unload/reload,
connection failure, protocol silence and link loss skip shutdown. Keep-awake
continues while connected if Decaid scale power management is disabled.
Turning a powered-off scale back on may require the physical button.

The notification silence watchdog defaults to 2000 ms and can be set to an
integer between 1000 and 30000 ms in plugin settings. This threshold and physical
behavior need confirmation on your scale. Limited hardware verification on October 22, 2026 confirmed connection and live
empty-scale weight/battery publication on Mini v1.4.1 with Decaid 0.9.0. Tare,
timer controls, brew stopping, long-session stability and sleep/wake remain to be
checked. New v1.4.2 commands are not hardware-verified. Automated tests cover the
protocol and Decaid v0.9.0's JavaScript BLE bridge with simulated GATT.

Derived from the [Decaid reference plugin](https://github.com/decentespresso/decaid/tree/v0.9.0/examples/plugins/bookoo-mini.reaplugin).
Mini power commands follow [issue #1015](https://github.com/decentespresso/decaid/issues/1015)
and [BooKoo's published command framing](https://github.com/BooKooCode/OpenSource/blob/main/bookoo_ultra_scale/protocols.md).

GPL-3.0-or-later. See LICENSE and COPYING.
