"""Locally sign and notarize an inspected CI candidate. This does not publish it."""
import argparse
import json
import plistlib
import re
import stat
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path, PurePosixPath
from safari_native import run, digest, check_bundle, check_entitlements, bundle_hashes


def identity_available(fingerprint, team):
    listing = run('security', 'find-identity', '-v', '-p', 'codesigning')
    return any(re.search(rf'\b{re.escape(fingerprint)}\s+"Developer ID Application: .+ \({re.escape(team)}\)"', line)
               for line in listing.splitlines())


def validate_zip(path):
    with zipfile.ZipFile(path) as archive:
        names = set()
        total = 0
        for item in archive.infolist():
            parts = PurePosixPath(item.filename).parts
            if not parts or item.filename.startswith('/') or '..' in parts or '\\' in item.filename or parts[0] not in {'unsigned-candidate', '__MACOSX'}:
                raise ValueError('Unsafe archive path')
            if stat.S_ISLNK(item.external_attr >> 16):
                raise ValueError('Unexpected archive symlink')
            normalized = '/'.join(parts)
            if normalized in names:
                raise ValueError('Duplicate archive member')
            names.add(normalized)
            total += item.file_size
            if total > 200_000_000 or len(names) > 2000:
                raise ValueError('Candidate exceeds the reviewed size limit')


def verify_signature(bundle, team, entitlements):
    run('codesign', '--verify', '--deep', '--strict', '--all-architectures', bundle)
    info = subprocess.run(['codesign', '-d', '--verbose=4', str(bundle)], check=True,
                          capture_output=True, text=True).stderr
    if f'TeamIdentifier={team}\n' not in info or 'Authority=Developer ID Application:' not in info or 'runtime' not in info or 'Timestamp=' not in info:
        raise ValueError('Developer ID, team, hardened runtime, or secure timestamp mismatch')
    actual = plistlib.loads(run('codesign', '-d', '--entitlements', '-', '--xml', bundle).encode())
    if actual != entitlements:
        raise ValueError('Signed entitlements differ from the reviewed entitlements')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--candidate', type=Path, required=True)
    parser.add_argument('--sha256', required=True, help='Expected CI ZIP hash, checked against the build log')
    parser.add_argument('--source-commit', required=True)
    parser.add_argument('--identity', required=True, help='Full SHA-1 of the Developer ID Application certificate')
    parser.add_argument('--team-id', required=True)
    parser.add_argument('--notary-profile', required=True, help='Name of credentials already stored by notarytool in Keychain')
    parser.add_argument('--work-dir', type=Path, required=True, help='Private persistent staging directory; reuse it to resume')
    args = parser.parse_args()
    if not re.fullmatch(r'[a-f0-9]{64}', args.sha256) or not re.fullmatch(r'[a-f0-9]{40}', args.source_commit) or not re.fullmatch(r'[A-Fa-f0-9]{40}', args.identity) or not re.fullmatch(r'[A-Z0-9]{10}', args.team_id):
        parser.error('Invalid checksum, commit, identity, or team format')
    args.identity = args.identity.upper()
    if digest(args.candidate) != args.sha256:
        sys.exit('Candidate checksum does not match the CI evidence')
    validate_zip(args.candidate)
    if not identity_available(args.identity, args.team_id):
        sys.exit('No matching valid Developer ID Application identity. Nothing was signed or submitted.')
    root = Path(__file__).resolve().parent.parent
    source = root / 'build/safari'
    if run('git', '-C', root, 'rev-parse', 'HEAD') != args.source_commit:
        sys.exit('Check out the exact reviewed candidate commit before signing')
    if run('git', '-C', root, 'status', '--porcelain', '--untracked-files=no'):
        sys.exit('Tracked source changes must be committed before signing')
    # Build our own reviewed resources; do not trust an arbitrary old output folder.
    run('node', root / 'scripts/build.mjs', '--browser=safari')
    work = args.work_dir.resolve()
    work.mkdir(parents=True, exist_ok=True, mode=0o700)
    state_path = work / 'state.json'
    expected = {'candidate_sha256': args.sha256, 'commit': args.source_commit,
                'identity': args.identity, 'team': args.team_id}
    state = json.loads(state_path.read_text()) if state_path.exists() else expected.copy()
    if any(state.get(key) != value for key, value in expected.items()):
        sys.exit('This staging directory belongs to a different candidate or signing identity')

    def save():
        pending = work / 'state.tmp'
        pending.write_text(json.dumps(state, indent=2) + '\n')
        pending.replace(state_path)

    def notarize(path, phase):
        record = state.setdefault(phase, {})
        if record.get('sha256') and digest(path) != record['sha256']:
            raise ValueError('Submitted artifact changed; refusing to reuse its notarization')
        if not record.get('id'):
            result = json.loads(run('xcrun', 'notarytool', 'submit', path,
                                    '--keychain-profile', args.notary_profile, '--output-format', 'json'))
            record.update(id=result['id'], sha256=digest(path))
            save()
        print(f'{phase} notarization: {record["id"]}', flush=True)
        result = json.loads(run('xcrun', 'notarytool', 'info', record['id'],
                                '--keychain-profile', args.notary_profile, '--output-format', 'json'))
        if result['status'] == 'In Progress':
            try:
                result = json.loads(run('xcrun', 'notarytool', 'wait', record['id'], '--timeout', '10m',
                                        '--keychain-profile', args.notary_profile, '--output-format', 'json'))
            except subprocess.CalledProcessError:
                raise RuntimeError(f'Notarization did not finish. Resume with this same staging directory; submission {record["id"]} is preserved.')
        log = json.loads(run('xcrun', 'notarytool', 'log', record['id'],
                             '--keychain-profile', args.notary_profile))
        (work / f'{phase}-notary-log.json').write_text(json.dumps(log, indent=2) + '\n')
        if result['status'] != 'Accepted' or log.get('issues'):
            raise RuntimeError(f'Apple returned {result["status"]} or reported issues; inspect {phase}-notary-log.json before release')
        record['accepted'] = True
        save()

    with tempfile.TemporaryDirectory(prefix='native-', dir=work) as temporary:
        scratch = Path(temporary)
        run('ditto', '-x', '-k', args.candidate.resolve(), scratch)
        candidate = scratch / 'unsigned-candidate'
        metadata = json.loads((candidate / 'candidate.json').read_text())
        app = candidate / 'Cookie Calm.app'
        version = metadata['version']
        if metadata.get('kind') != 'unsigned-candidate' or metadata.get('commit') != args.source_commit:
            raise ValueError('Candidate provenance mismatch')
        if metadata.get('bundle_sha256') != bundle_hashes(app):
            raise ValueError('Unsigned app contents differ from CI metadata')
        extension = check_bundle(app, version, source)
        entitlements = metadata['entitlements']
        if set(entitlements) != {'app', 'extension'}:
            raise ValueError('Missing entitlement sources')
        for kind, values in entitlements.items():
            check_entitlements(values)
            (scratch / f'{kind}.plist').write_bytes(plistlib.dumps(values))
        signed_zip = work / 'application-for-notary.zip'
        if not state.get('signed_zip_sha256'):
            if signed_zip.exists():
                raise ValueError('Untracked signed ZIP exists; inspect it before continuing')
            for bundle, kind in [(extension, 'extension'), (app, 'app')]:
                run('codesign', '--force', '--sign', args.identity, '--timestamp', '--options', 'runtime',
                    '--entitlements', scratch / f'{kind}.plist', bundle)
                verify_signature(bundle, args.team_id, entitlements[kind])
            run('ditto', '-c', '-k', '--sequesterRsrc', '--keepParent', app, signed_zip)
            state['signed_zip_sha256'] = digest(signed_zip)
            save()
        if digest(signed_zip) != state['signed_zip_sha256']:
            raise ValueError('Signed submission ZIP changed')
        notarize(signed_zip, 'app')
        # Restore the immutable, actually submitted app even when resuming.
        signed = scratch / 'signed'
        run('ditto', '-x', '-k', signed_zip, signed)
        app = signed / 'Cookie Calm.app'
        extension = check_bundle(app, version, source)
        for bundle, kind in [(extension, 'extension'), (app, 'app')]:
            verify_signature(bundle, args.team_id, entitlements[kind])
        run('xcrun', 'stapler', 'staple', app)
        run('xcrun', 'stapler', 'validate', app)
        run('spctl', '--assess', '--type', 'execute', '--verbose=2', app)
        dmg = work / f'cookie-calm-{version}-macos-universal.dmg'
        if not state.get('dmg_sha256'):
            if dmg.exists():
                raise ValueError('Untracked DMG exists; inspect it before continuing')
            contents = scratch / 'disk'
            contents.mkdir()
            run('ditto', app, contents / app.name)
            (contents / 'Applications').symlink_to('/Applications')
            (contents / 'INSTALL.txt').write_text('Cookie Calm for Safari — macOS 26 or later\n\nDrag Cookie Calm to Applications and open it.\nEnable it in Safari > Settings > Extensions, then allow website access.\nQuit the setup app when done; Safari runs the extension.\nKeep the app in Applications. Download later updates from the GitHub Releases page.\nhttps://github.com/davegoldblatt/cookie-calm/releases\n')
            run('hdiutil', 'create', '-volname', 'Cookie Calm', '-srcfolder', contents,
                '-format', 'UDZO', '-ov', dmg)
            run('codesign', '--force', '--sign', args.identity, '--timestamp', dmg)
            state['dmg_sha256'] = digest(dmg)
            save()
        if digest(dmg) != state['dmg_sha256']:
            raise ValueError('DMG changed outside the signing workflow')
        if not state.get('dmg_stapled'):
            notarize(dmg, 'dmg')
            run('xcrun', 'stapler', 'staple', dmg)
            state['dmg_stapled'] = True
            state['dmg_sha256'] = digest(dmg)
            save()
        run('xcrun', 'stapler', 'validate', dmg)
        run('codesign', '--verify', '--strict', dmg)
        run('spctl', '--assess', '--type', 'open', '--context', 'context:primary-signature', '--verbose=2', dmg)
        evidence = {**expected, 'version': version, 'dmg_sha256': digest(dmg),
                    'app_notarization': state['app']['id'], 'dmg_notarization': state['dmg']['id'],
                    'native_installation_verified': False}
        (work / 'release-evidence.json').write_text(json.dumps(evidence, indent=2) + '\n')
        (work / 'MACOS-SHA256SUMS.txt').write_text(f'{digest(dmg)}  {dmg.name}\n')
        print(f'Signed and notarized candidate: {dmg}\nVerify native installation before publishing to GitHub.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, RuntimeError, subprocess.CalledProcessError) as error:
        sys.exit(f'Release stopped: {error}')
