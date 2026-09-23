"""Build an UNSIGNED candidate using Apple's Xcode packager. Never publish it."""
import json
import os
import plistlib
import shutil
import sys
from pathlib import Path
from safari_native import APP_ID, MINIMUM_OS, run, digest, check_bundle, check_entitlements, bundle_hashes

root = Path(__file__).resolve().parent.parent
os.chdir(root)
out = root / 'build/safari-macos'
if out.exists():
    sys.exit('Native output already exists. Use a fresh checkout; no output was deleted.')
xcode = run('xcodebuild', '-version')
if not xcode.startswith('Xcode 26.6\n'):
    sys.exit('Use the reviewed Xcode 26.6 toolchain')
source = root / 'build/safari'
manifest = json.loads((source / 'manifest.json').read_text())
version = manifest['version']
out.mkdir(parents=True)
try:
    packager = run('xcrun', '--find', 'safari-web-extension-packager')
except Exception:
    packager = run('xcrun', '--find', 'safari-web-extension-converter')
import subprocess
with (out / 'packager.log').open('w') as log:
    subprocess.run([packager, str(source), '--project-location', str(out / 'project'),
                    '--app-name', 'Cookie Calm', '--bundle-identifier', APP_ID,
                    '--macos-only', '--swift', '--copy-resources', '--no-open', '--no-prompt'],
                   check=True, stdout=log, stderr=subprocess.STDOUT)
projects = list((out / 'project').rglob('*.xcodeproj'))
handlers = list((out / 'project').rglob('SafariWebExtensionHandler.swift'))
if len(projects) != 1 or len(handlers) != 1:
    sys.exit('Generated project layout changed; review packager.log')
shutil.copy2(root / 'native/SafariWebExtensionHandler.swift', handlers[0])
listing = json.loads(run('xcodebuild', '-list', '-json', '-project', projects[0]))
schemes = listing.get('project', {}).get('schemes', [])
choices = [s for s in schemes if s in ['Cookie Calm', 'Cookie Calm (macOS)']]
if len(choices) != 1:
    sys.exit(f'Expected one Mac app scheme; got {schemes}')
archive = out / 'Cookie Calm.xcarchive'
with (out / 'xcodebuild.log').open('w') as log:
    subprocess.run(['xcodebuild', '-project', str(projects[0]), '-scheme', choices[0],
                    '-configuration', 'Release', '-destination', 'generic/platform=macOS',
                    '-archivePath', str(archive), '-derivedDataPath', str(out / 'DerivedData'),
                    'ARCHS=arm64 x86_64', 'ONLY_ACTIVE_ARCH=NO',
                    f'MACOSX_DEPLOYMENT_TARGET={MINIMUM_OS}', f'MARKETING_VERSION={version}',
                    f'CURRENT_PROJECT_VERSION={version}', 'CODE_SIGNING_ALLOWED=NO',
                    'CODE_SIGNING_REQUIRED=NO', 'ENABLE_HARDENED_RUNTIME=YES', 'archive'],
                   check=True, stdout=log, stderr=subprocess.STDOUT)
apps = list((archive / 'Products/Applications').glob('*.app'))
if len(apps) != 1:
    sys.exit('Archive must contain exactly one app')
check_bundle(apps[0], version, source)
candidate = out / 'unsigned-candidate'
candidate.mkdir()
app = candidate / 'Cookie Calm.app'
run('ditto', apps[0], app)
entitlements = {}
for file in (out / 'project').rglob('*.entitlements'):
    values = plistlib.loads(file.read_bytes())
    check_entitlements(values)
    kind = 'extension' if 'Extension' in file.as_posix() else 'app'
    if kind in entitlements:
        sys.exit('Ambiguous generated entitlements')
    entitlements[kind] = values
if set(entitlements) != {'app', 'extension'}:
    sys.exit('Both app and extension entitlement sources are required')
metadata = {'kind': 'unsigned-candidate', 'version': version,
            'commit': run('git', 'rev-parse', 'HEAD'), 'xcode': xcode,
            'packager': packager, 'entitlements': entitlements,
            'bundle_sha256': bundle_hashes(app)}
(candidate / 'candidate.json').write_text(json.dumps(metadata, indent=2) + '\n')
zip_path = out / f'cookie-calm-{version}-safari-UNSIGNED.zip'
run('ditto', '-c', '-k', '--sequesterRsrc', '--keepParent', candidate, zip_path)
(out / 'UNSIGNED-SHA256SUMS.txt').write_text(f'{digest(zip_path)}  {zip_path.name}\n')
print(f'UNSIGNED CANDIDATE ONLY: {zip_path.name}')
print((out / 'UNSIGNED-SHA256SUMS.txt').read_text())
