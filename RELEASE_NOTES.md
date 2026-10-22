Community BooKoo Themis Mini scale driver for **Decaid 0.9.0**.

Download **bookoo-mini-0.1.0.zip** below and install it from Decaid's
**Plugins → cogwheel → Install plugin → ZIP file** menu. No build is required.
`SHA256SUMS` records the plugin ZIP checksum.

After loading the plugin, disconnect the native BooKoo session, scan, select the
plugin scale as **primary**, and save it as the **preferred scale**. The old native
Bluetooth-address preference does not automatically migrate to the plugin ID.
Keep BOOKOO N and other Bluetooth clients disconnected during setup.

Supports weight, battery, flow, timer readings, tare and timer controls through
Decaid's standard scale interface. Existing skin scale integrations can use that
interface without a BooKoo-specific code change.

**Firmware v1.4.1:** use the defaults; firmware v1.4.2 power commands stay off.
**After installing v1.4.2:** enable the firmware setting for optional keep-awake
(connection plus every 60 seconds) and shutdown before intentional disconnect.
Shutdown also covers manual disconnect and switching scales. A powered-off Mini
may need to be turned back on manually.

Validation: 26 automated tests passed. An Android tablet running Decaid 0.9.0
received 178 samples over 18 seconds from a Mini on v1.4.1, with live battery
publication and no disconnect during that capture. This was an empty-scale test;
it does not verify tare, loaded-weight accuracy, timer controls, automatic brew
stopping, long-session stability or sleep/wake. The v1.4.2 commands have not been
physically tested. See README for the full installation and hardware checks.

GPL-3.0-or-later; derived from Decaid's BooKoo reference plugin and attributed in
THIRD_PARTY.md. Community plugin, not an official Decent Espresso or BooKoo release.
