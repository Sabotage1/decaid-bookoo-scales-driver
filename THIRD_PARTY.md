# Source attribution

The driver is derived from `examples/plugins/bookoo-mini.reaplugin/plugin.js`
in [decentespresso/decaid](https://github.com/decentespresso/decaid), distributed
under GPL-3.0-or-later by Decent Espresso. Original packet decoding, BLE UUIDs,
command framing, readiness and watchdog structure informed this implementation.
Modifications add configurable firmware gating, power commands, command
serialization, cleanup handling, lifecycle fencing, flow/timer publication,
tests and packaging. Original notices are retained in LICENSE and the source.

`test/fixtures/decaid-v0.9.0-ble-bridge.js` is the JavaScript string extracted
without modification from `lib/src/plugins/plugin_ble_bridge.dart` at Decaid
tag **v0.9.0**, commit **b9f9d0559106809a70dea2023f6bce34b5bdd3ca**:
[pinned source](https://github.com/decentespresso/decaid/blob/b9f9d0559106809a70dea2023f6bce34b5bdd3ca/lib/src/plugins/plugin_ble_bridge.dart).
Copyright (C) 2025-2026 Decent Espresso, GPL-3.0-or-later. The fixture is used
only in tests and is not included in the installable plugin ZIP.

Protocol facts were checked against BooKoo's public Mini and Ultra protocol
documents, available under the MIT license in
[BooKooCode/OpenSource](https://github.com/BooKooCode/OpenSource).
No BooKoo SDK implementation code is included.

Version 0.2.0 also targets the published Themis Ultra protocol, including its
weight-in-grams rule, non-weight packet types and separate shutdown/keep-awake
firmware thresholds. The Mini and Ultra protocol documents were inspected on
October 27, 2026. No additional SDK code is included; the existing GPL attribution
and the unmodified Decaid bridge test fixture remain applicable.
