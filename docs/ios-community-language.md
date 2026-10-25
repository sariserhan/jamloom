# Community language filtering — 2026-10-25

**PASS implementation, simulator checks, signed Release build, physical installation and launch.** Jamloom 0.9.3 (16) is installed on the connected iPhone 14 Pro. Owner interaction acceptance is PASS on the subsequent 0.9.4 build (“Everything works”); no App Store upload or website deployment.

Community has a separate globe-labelled Language menu beneath Product and Genre, preserving comfortable widths. All languages resets the selection. The filter combines with existing product, genre and text filters and also works in Favorites. Empty matches offer Clear filters. Tracks and full DJ sets without language metadata remain visible under All languages; no language or instrumental status is guessed from their audio.

Public and My songs queries include the selected language before pagination, so filtering reaches beyond the currently loaded page. The menu combines API-wide language options with curated samples. Load more and refresh retain the selected language; changing language resets the cursor. Older example metadata such as “English” and “Turkish” maps to the same codes as new songs, without rewriting saved favorites.

Validation:

- Final targeted simulator run: 18 passed, 2 environment-gated live tests skipped, 0 failures. Covers server-side filter transport, metadata beyond the first page, filtered pagination, cursor reset, malformed input rejection, legacy language names, menu selection, Favorites and clearing filters. Existing Favorites/playback UI also passed in the first run. A final UI rerun passed after retaining the selected genre in the menu during language refreshes, avoiding an invalid picker selection when the resulting catalogue has no matches.
- An intermediate simultaneous simulator/device build raced in the shared studio-preparation directory. Preserved failed evidence; sequential rerun passed. No product failure or source workaround was inferred from that build race.
- Read-only production Turkish queries returned successful empty public pages; these do not establish real multilingual production coverage. Curated and paginated multilingual behavior is covered by isolated fixtures.
- Signed Release bundle audit passed, including privacy manifest, licenses and absence of private audio/Debug controls. Physical install initially encountered a transient connection reset; a retry and launch succeeded.

[Tests](evidence/ios-community-language-20261025/tests.json), [bundle audit](evidence/ios-community-language-20261025/bundle.json), [device result](evidence/ios-community-language-20261025/device.json), [simulator screenshot](evidence/ios-community-language-20261025/community-language.png).

Reproduce with `xcodebuild test` on the Jamloom scheme, selecting `JamloomTests/AccountTests` and `JamloomUITests/FlowTests/testCommunityLanguageFilterAndFavorites`. Use `build-ios` and a fresh result bundle. Run device builds after the simulator build finishes because both prepare the shared studio directory.
