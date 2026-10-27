# Changelog

## 0.2.0 — 2026-10-27

- Rename the visible plugin to **BooKoo Scales Driver** and add explicit Themis
  Ultra support using the shared standard weight and command protocol.
- Add firmware compatibility choices: Ultra v4.0.0 shutdown only, Ultra v4.0.1+
  and Mini v1.4.2+ shutdown plus keep-awake, or neither for older/unknown firmware.
- Keep the internal plugin/driver IDs and legacy Mini setting, preserving saved
  preferences and power behavior on upgrade. Explicit compatibility overrides
  the old Mini checkbox.
- Verify that Ultra ounce display selections do not convert BLE gram readings,
  and that powder/settlement frames cannot become beverage samples or liveness.
- Rename the public repository to `Sabotage1/decaid-bookoo-scales-driver`.
- Package `bookoo-scales-0.2.0.zip` with SHA-256 checksums; document ZIP installation,
  tracked GitHub releases, Ultra power setup and upgrades from v0.1.0.
- Pass all 38 automated tests, including the unmodified Decaid v0.9.0 JavaScript
  BLE bridge with simulated GATT. Ultra hardware and power commands remain
  physically unverified.

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
