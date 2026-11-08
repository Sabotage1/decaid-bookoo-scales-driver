# BooKoo Scales Driver for Decaid

v0.3.0 supports Themis Mini and Ultra through Decaid 0.9.0's standard Scale
interface: weight, battery, flow, timer readings, tare and timer start/stop/reset.

## Mini v1.4.2 fix

Earlier versions reused the Ultra's power commands on Mini. Public Mini v1.4.2
requires shutdown **0x11** and keep-alive **0x12**. Ultra retains **0x15/0x25**.

**Mini is the default model, and keep-alive and shutdown are ON by default.**
The former Mini firmware checkbox no longer gates these features. A saved legacy
false upgrades to enabled; explicit Disabled choices and false toggles survive.

**Ultra users must select Ultra in Scale model for power commands after updating.**
Model and firmware are not detected automatically. Settings apply to all active
scales; disable power commands for mixed Mini/Ultra connections.

## Install and settings

Install `bookoo-scales-0.3.0.zip` through **Plugins → cogwheel → Install plugin →
ZIP file** and enable **BooKoo Scales Driver**. Alternatively install using
**GitHub Release** with `Sabotage1/decaid-bookoo-scales-driver` to track updates.
ZIP and folder snapshots need manual updates.

Keep the plugin ID/folder `bookoo-mini.reaplugin` and driver ID `bookoo`; update
in place to preserve settings and preferred-scale identity. On first install,
disconnect the native BooKoo session and other Bluetooth clients such as BOOKOO N,
rescan, and select the plugin scale as primary and preferred.

| Firmware | Scale model | Power compatibility |
| --- | --- | --- |
| Mini public v1.4.2+ | Mini (default) | Shutdown and keep-awake (default) |
| Mini v1.4.1 or earlier; beta v1.5.0.0806; unconfirmed firmware | Mini | Disabled |
| Ultra release v4.0.1+ | Ultra | Shutdown and keep-awake |
| Ultra release v4.0.0 | Ultra | Shutdown only |
| Ultra v3.1.2 or earlier; unconfirmed firmware | Ultra | Disabled |

Leave **Keep scale awake while connected** and **Power off on intentional
disconnect** on to use both. Save and reconnect if necessary. The load log reports
the selected model and effective power settings.

## Power behavior

Keep-alive resets the countdown after the first accepted weight and every 60
seconds after the prior attempt settles. Mini sends `03 0A 12 00 00 1B`; Ultra
sends `03 0A 25 00 00 2C`. The saved auto-off duration is unchanged.

For machine sleep, select Decaid's **Display Off** scale power policy or the
equivalent skin setting. Shutdown is sent before a healthy intentional disconnect:
Mini `03 0A 11 00 00 18`, Ultra `03 0A 15 00 00 1C`. This also covers manual
disconnect and switching scales. Unload/reload, link loss and connection failures
skip shutdown. With Decaid power management disabled, keep-alive can continue
while the machine sleeps. A powered-off scale may need its physical button before
reconnecting. Remote power-on and firmware updates are not included.

Mini tare/timer commands depend on its mode and timer state. Ultra shutdown is
unavailable while charging; Ultra tare is restricted while charging or during
automatic running/done, and timers require timing or ratio mode. The driver does
not change device modes, presets, calibration, powder weight or automatic settings.

Ultra BLE weights remain grams even with ounces selected on the display. Powder
and automatic settlement frames are ignored. The weight-stream watchdog defaults
to 2000 ms, adjustable to integer 1000–30000 ms; physical Ultra cadence confirmation
remains pending.

All 49 automated tests pass, including exact per-model power bytes and the
unmodified Decaid v0.9.0 JavaScript BLE bridge with simulated GATT. **The v0.3.0
power fix has not been physically verified on Mini v1.4.2 or Ultra.** Check known
weights, tare/timers, a supervised brew stop, sleep and reconnect before relying
on it. Prior Mini hardware evidence covered only a v0.1.0 connection/empty-scale
stream on Mini v1.4.1.

[Full guide, downloads and troubleshooting](https://github.com/Sabotage1/decaid-bookoo-scales-driver).
[Mini protocol](https://github.com/BooKooCode/OpenSource/blob/main/bookoo_mini_scale/protocols.md),
[Ultra protocol](https://github.com/BooKooCode/OpenSource/blob/main/bookoo_ultra_scale/protocols.md).

Community plugin. GPL-3.0-or-later; see LICENSE and COPYING.
