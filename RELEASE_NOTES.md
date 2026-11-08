# BooKoo Scales Driver v0.3.0 — Mini v1.4.2 power fix

Fixes Mini shutdown and keep-alive on **public firmware v1.4.2**, and enables both
features by default for Mini. Existing Mini and Ultra weight, battery, flow, tare
and timer support continues through Decaid's standard Scale interface.

**November 8 setup/validation update:** public Mini firmware **v1.4.2 is available
and required** for the new Mini power features. After updating the scale firmware
and plugin, open **Plugins → BooKoo Scales Driver → three-dot menu → Settings**,
select **Scale model for power commands → Mini**, choose **Shutdown and
keep-awake**, and leave both power toggles on. Save and reconnect if needed. For
machine-sleep shutdown, also select Decaid's **Display Off** scale power policy.
The maintainer has now reported this setup working on his physical Mini with
firmware v1.4.2 and Decaid 0.9.1.

## What failed and what changed

Previous releases incorrectly reused the Ultra's **0x15/0x25** power commands on
Mini. BooKoo's released Mini protocol specifies different bytes:

| Device | Shutdown | Keep-alive |
| --- | --- | --- |
| Mini public v1.4.2+ | `03 0A 11 00 00 18` | `03 0A 12 00 00 1B` |
| Ultra, compatible firmware | `03 0A 15 00 00 1C` | `03 0A 25 00 00 2C` |

The new **Scale model for power commands** setting selects the correct command
set. **Mini is the default. Shutdown and keep-awake compatibility and both power
toggles are enabled by default.** The old firmware checkbox is removed. A saved
legacy false or Legacy Mini setting no longer silently disables the feature.
Explicit Disabled choices and saved off toggles are preserved.

## Install or update

1. Download [bookoo-scales-0.3.0.zip](https://github.com/Sabotage1/decaid-bookoo-scales-driver/releases/download/v0.3.0/bookoo-scales-0.3.0.zip).
2. In Decaid 0.9.0, open **Plugins → cogwheel → Install plugin → ZIP file**, select
   the ZIP and load/enable **BooKoo Scales Driver**. Tracked GitHub installations
   can use **Check for updates**; ZIP/folder snapshots need manual installation.
3. **Mini public v1.4.2+:** the defaults enable keep-alive and shutdown. If you
   previously selected Disabled or turned either toggle off, enable those settings.
4. **Ultra users upgrading from any previous release must select Ultra in the new
   Scale model for power commands setting.** Use Shutdown only for Ultra v4.0.0,
   or Shutdown and keep-awake for Ultra v4.0.1+. Save and reconnect if needed.
5. For shutdown when the espresso machine sleeps, select Decaid's **Display Off**
   scale power-management mode or the equivalent skin setting.

On first installation, disconnect the native BooKoo session and other Bluetooth
clients such as BOOKOO N, rescan, then select the plugin scale as primary and
preferred. The plugin ID/folder remains `bookoo-mini.reaplugin` and the driver ID
remains `bookoo`; install as an update to preserve settings and device identity.

For tracked installation choose **Install plugin → GitHub Release** and enter
`Sabotage1/decaid-bookoo-scales-driver`. Download the named installation asset,
rather than GitHub's generated source archive.

If the GitHub Release download fails with HTTP 504, use **GitHub Branch** with the
same repository and branch **main**, or download the ZIP manually. Branch
installation was verified on Decaid 0.9.1 after correcting the repository layout.
It tracks future branch commits through Check for updates. ZIP installs are
snapshots; installing through GitHub later enables tracked updates.

## Compatibility and behavior

Power commands require **public Mini v1.4.2+**. On Mini v1.4.1 or earlier, beta
v1.5.0.0806, or unconfirmed firmware, select **Disabled**. Ultra shutdown requires
release v4.0.0+; Ultra keep-alive requires release v4.0.1+. Neither model nor
firmware is automatically detected. All active scales share these settings;
disable power commands for mixed Mini/Ultra connections.

Keep-alive starts after the first accepted weight and repeats every **60 seconds**
after the preceding attempt finishes. It resets the countdown without changing
the configured auto-off duration. Shutdown is sent through cleanup GATT authority
before a healthy intentional disconnect, including machine sleep, manual
disconnect or switching scales. Unload/reload, link loss, initialization failure
and protocol silence skip shutdown. Ultra shutdown is unavailable while charging.

With Decaid scale power management disabled, keep-alive may continue during
machine sleep. Plugin defaults do not change that host policy. A powered-off scale
may need its physical button before reconnecting. No remote power-on or firmware
updater is included. Existing mode/state restrictions on tare and timers apply.

The load log reports effective settings, for example:

```text
[bookoo-scales] Power protocol: Mini; keep-alive on; shutdown on
```

## Validation

**49 automated tests pass**, including exact golden Mini and Ultra frames,
repeated keep-alive, legacy-setting upgrades, preserved opt-outs, readiness,
serialized writes and the unmodified Decaid v0.9.0 JavaScript BLE bridge with
simulated Dart/GATT. Packaging verifies archive contents against source.

**Physical Mini check:** on November 8, 2026, the maintainer reported that the
updated driver worked on his Mini with public firmware v1.4.2 after checking the
power behavior on Decaid 0.9.1. This supplements the protocol/automated checks;
accuracy, brew stopping and long-session reliability are not established by that
report. Prior Mini evidence covered a v0.1.0 empty-scale stream on v1.4.1.

See the [full guide](https://github.com/Sabotage1/decaid-bookoo-scales-driver#readme),
[BooKoo Mini protocol](https://github.com/BooKooCode/OpenSource/blob/main/bookoo_mini_scale/protocols.md)
(updated October 30, 2026) and
[Ultra protocol](https://github.com/BooKooCode/OpenSource/blob/main/bookoo_ultra_scale/protocols.md).
The release includes one installation ZIP and
[SHA256SUMS](https://github.com/Sabotage1/decaid-bookoo-scales-driver/releases/download/v0.3.0/SHA256SUMS).
Community plugin, GPL-3.0-or-later.
