"""Prepare, never execute, a test for the verified development-signed host."""
import hashlib, json, os, plistlib, subprocess, uuid
from pathlib import Path
root = Path(__file__).resolve().parents[3]
products = root / 'build-ios-device/Build/Products'
app = products / 'Debug-iphoneos/Jamloom.app'
subprocess.run(['codesign', '--verify', '--deep', '--strict', str(app)], check=True)
profile = plistlib.loads(subprocess.check_output(['security', 'cms', '-D', '-i', str(app / 'embedded.mobileprovision')], stderr=subprocess.DEVNULL))
entitlements = plistlib.loads(subprocess.check_output(['codesign', '-d', '--entitlements', ':-', str(app)], stderr=subprocess.DEVNULL))
assert entitlements['get-task-allow'] is True
assert profile['Entitlements']['get-task-allow'] is True
assert entitlements['application-identifier'] == 'BA24C6W48D.com.djayvo.app'
assert '00008120-001E28663CE3C01E' in profile['ProvisionedDevices']
info = plistlib.loads((app / 'Info.plist').read_bytes())
assert info['CFBundleIdentifier'] == 'com.djayvo.app'
digest = hashlib.sha256((app / info['CFBundleExecutable']).read_bytes()).hexdigest()
state = json.loads((root / 'build-apple-sandbox-followthrough-20261027/state.json').read_text())
assert str(uuid.UUID(state['accountToken'])) == state['accountToken'].lower()
config = plistlib.loads((products / 'JamloomAppleSandbox_iphoneos27.1-arm64.xctestrun').read_bytes())
assert not any('storekit' in k.lower() for k in config['JamloomTests'])
config.pop('JamloomUITests')
test = config['JamloomTests']
test['OnlyTestIdentifiers'] = ['PurchaseTests/testLiveSandboxReceiptWhenExplicitlyRequested']
test.setdefault('EnvironmentVariables', {}).update({
 'JAMLOOM_APPLE_SANDBOX': 'purchase', 'JAMLOOM_APPLE_ACCOUNT_TOKEN': state['accountToken'],
 'JAMLOOM_APPLE_PRODUCT': 'com.jamloom.credits.starter',
 'JAMLOOM_APPLE_DEVELOPMENT_BUILD_SHA256': digest})
output = products / 'JamloomDevelopmentSandbox.xctestrun'
with output.open('xb') as f: plistlib.dump(config, f)
os.chmod(output, 0o600)
(root / 'docs/evidence/completion-followthrough-20261027/sandbox-signing.json').write_text(json.dumps({
 'status': 'PASS', 'developmentSigned': True, 'hostSHA256': digest,
 'bundle': info['CFBundleIdentifier'], 'version': info['CFBundleShortVersionString'], 'build': info['CFBundleVersion'],
 'actualPurchase': 'NOT RUN', 'publication': False}, indent=2)+'\n')
print('Development signing verified; exact host bound to sandbox test. No purchase executed.')
