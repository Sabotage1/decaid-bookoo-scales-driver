# Changelog

## 0.1.0 — 2026-10-23

Initial public release of the community BooKoo Themis Mini driver for Decaid 0.9.0.

- Signed weight, battery, flow and timer publication through Decaid's Scale API.
- Tare and timer start/stop/reset commands.
- Optional firmware v1.4.2 power-off and 60-second keep-awake commands, disabled
  until the user explicitly confirms compatible firmware in plugin settings.
- Serialized commands, bounded readiness, packet-silence reporting, cleanup GATT
  authority, session isolation and preservation of host sample provenance.
- 26 automated tests, including Decaid v0.9.0's real JavaScript BLE bridge with
  simulated GATT, plus a verified live connection and empty-scale weight/battery
  stream on Mini firmware v1.4.1. See README for the limits of that hardware check.
- Installation, migration from the native scale ID, troubleshooting, protocol
  references, acceptance checks and GPL source attribution.

Power-off is tied to intentional disconnect rather than an exclusive sleep event;
this also covers manual disconnect and switching scales. The new firmware commands
still require physical verification on Mini v1.4.2. No firmware updater or remote
power-on is included.
