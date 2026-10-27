# Apple catalogue isolation — 2026-10-27

**PARTIAL; real catalogue FAIL, provider receipt chain NOT RUN.** No purchase, app uninstall, submission, deployment or sales activation occurred. [Evidence](evidence/apple-catalogue-20261027/validation.json).

The physical iPhone returned just `com.jamloom.credits.starter`, named `Starter`, with description `Local test credits only`. The direct debug-app launch outside XCTest returned the same result. App Store Connect independently reports `10 Jamloom credits` / `10 credits for original Jamloom songs.` for that product. This is local-test catalogue evidence, not a successful Apple sandbox check. Repeated launch failures when the phone locked remain failed attempts.

Removed the default StoreKit configuration from the ordinary Xcode scheme and its project generator. The local tests explicitly create their own `SKTestSession`; all three pass with the default configuration removed. The opt-in real-device test is skipped in that local run. The separate Apple sandbox scheme already had no StoreKit configuration.

The catalogue test no longer treats the app-download transaction environment as the environment of an in-app purchase. It verifies catalogue IDs, exact prices and product types, while explicitly leaving receipt qualification separate. [Apple sandbox guidance](https://developer.apple.com/documentation/storekit/testing-in-app-purchases-with-sandbox), [AppTransaction](https://developer.apple.com/documentation/storekit/apptransaction), [local StoreKit configuration](https://developer.apple.com/documentation/xcode/setting-up-storekit-testing-in-xcode).

A debug-only `--apple-catalogue-check` launch writes non-secret product metadata to `Library/Caches/apple-catalogue-check.json`. It neither signs in nor purchases anything. The Release bundle audit verifies that this diagnostic flag is absent. A failed launch does not refresh the file; inspect the launch result before using it as new evidence.

The owner has been asked to restart/unlock the device to test whether local StoreKit state clears without deleting app data. This is a diagnostic next step, not a proven fix. Xcode's scripting interface timed out while opening the project, so no IDE-run success is claimed.

Apple's three credit products remain `MISSING_METADATA`; Singing remains `READY_TO_SUBMIT` at USD39. Genuine purchase-flow review screenshots, reviewer access and the real sandbox purchase/restore/refund-to-server chain remain open. Local StoreKit receipts are never accepted as proof of those gates. Existing signed build 27 remains the Release candidate; no new release behavior was added.

The exact audited Release build 27 was reinstalled after these diagnostics, preserving app data. A new successful launch after this reinstall is not claimed. The next direct catalogue probe requires the debug build again.
