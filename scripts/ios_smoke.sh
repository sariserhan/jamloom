#!/bin/sh
set -eu
# Accept existing local tool configuration during the brand transition.
JAMLOOM_SIMULATOR_ID="${JAMLOOM_SIMULATOR_ID-${DJAYVO_SIMULATOR_ID-}}"
JAMLOOM_IOS_OUTPUT="${JAMLOOM_IOS_OUTPUT-${DJAYVO_IOS_OUTPUT-}}"
cd "$(dirname "$0")/.."
if [ "$(uname -s)" != Darwin ]; then
    echo 'FAIL: iOS validation requires the actual Mac/Xcode.' >&2
    exit 1
fi
: "${JAMLOOM_SIMULATOR_ID:?Set JAMLOOM_SIMULATOR_ID from xcrun simctl list devices available}"
OUTPUT=${JAMLOOM_IOS_OUTPUT:-renders/ios-$(date +%Y%m%d-%H%M%S)}
if [ -e "$OUTPUT" ]; then
    echo "FAIL: preserving existing evidence: $OUTPUT" >&2
    exit 1
fi
mkdir -p "$OUTPUT"
# StoreKitTest changes a shared environment. Keep its two fixture flows in a
# fresh test host, separate from the account tests that precede them alphabetically.
run_simulator_tests() {
    lane=$1
    shift
    result=0
    xcodebuild test -project apps/ios/Jamloom.xcodeproj -scheme Jamloom \
        -destination "platform=iOS Simulator,id=$JAMLOOM_SIMULATOR_ID" \
        -derivedDataPath build-ios -parallel-testing-enabled NO \
        -resultBundlePath "$OUTPUT/$lane.xcresult" "$@" \
        CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- > "$OUTPUT/$lane.log" 2>&1 || result=$?
    if [ ! -d "$OUTPUT/$lane.xcresult" ]; then
        echo "FAIL: no result bundle for $lane; preserve its log." >&2
        return 1
    fi
    xcrun xcresulttool get test-results summary --path "$OUTPUT/$lane.xcresult" > "$OUTPUT/$lane.json" || {
        echo "FAIL: could not summarize $lane; preserve the log and result bundle." >&2
        return 1
    }
    return "$result"
}
run_simulator_tests storekit \
    -only-testing:JamloomTests/PurchaseTests/testLocalStoreKitAcknowledgmentRecoveryAndAccountBinding \
    -only-testing:JamloomTests/PurchaseTests/testSingingCourseRestoreDoesNotDeliverCreditsOrCrossAccounts
run_simulator_tests tests \
    -only-testing:JamloomTests \
    -skip-testing:JamloomTests/PurchaseTests/testLocalStoreKitAcknowledgmentRecoveryAndAccountBinding \
    -skip-testing:JamloomTests/PurchaseTests/testSingingCourseRestoreDoesNotDeliverCreditsOrCrossAccounts
run_simulator_tests ui \
    -only-testing:JamloomUITests \
    -skip-testing:JamloomUITests/FlowTests/testLiveFavoriteAutocompleteWithoutAnAccount \
    -skip-testing:JamloomUITests/FlowTests/testLiveYouTubePlaylistImportWithoutAnAccount
xcodebuild build -project apps/ios/Jamloom.xcodeproj -scheme Jamloom \
    -configuration Release -destination 'generic/platform=iOS' \
    -derivedDataPath build-ios-device CODE_SIGNING_ALLOWED=NO > "$OUTPUT/release.log" 2>&1
python3 scripts/verify_ios_bundle.py build-ios-device/Build/Products/Release-iphoneos/Jamloom.app > "$OUTPUT/bundle.json"
echo "PASS: isolated local StoreKit, simulator tests and unsigned device compilation; evidence: $OUTPUT"
echo 'Physical microphone/routes/battery, listening and production release are separate gates.'
