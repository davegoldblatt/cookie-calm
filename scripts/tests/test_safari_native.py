"""Reject unsafe or mismatched release inputs before any signing or submission."""
import importlib.util
import json
import plistlib
import shutil
import stat
import subprocess
import sys
import tempfile
import unittest
import zipfile
from unittest.mock import patch
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from safari_native import APP_ID, EXTENSION_ID, check_bundle, check_entitlements, bundle_hashes

spec = importlib.util.spec_from_file_location('release', Path(__file__).resolve().parents[1] / 'release-safari-app.py')
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class ReleaseBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.app = self.root / 'Cookie Calm.app'
        self.extension = self.app / 'Contents/PlugIns/Cookie Calm Extension.appex'
        for bundle, identifier in [(self.app, APP_ID), (self.extension, EXTENSION_ID)]:
            (bundle / 'Contents/MacOS').mkdir(parents=True)
            (bundle / 'Contents/MacOS/Executable').write_bytes(b'fixture')
            info = dict(CFBundleIdentifier=identifier, CFBundleExecutable='Executable',
                        CFBundleShortVersionString='1.2.6', CFBundleVersion='1.2.6', LSMinimumSystemVersion='26.0')
            if bundle == self.extension:
                info['NSExtension'] = dict(NSExtensionPointIdentifier='com.apple.Safari.web-extension',
                                          NSExtensionPrincipalClass='Cookie_Calm_Extension.SafariWebExtensionHandler')
            (bundle / 'Contents/Info.plist').write_bytes(plistlib.dumps(info))
        self.resources = self.extension / 'Contents/Resources'
        self.resources.mkdir()
        self.manifest = dict(version='1.2.6', permissions=['storage', 'scripting'],
                             browser_specific_settings={'safari': {'strict_min_version': '26.0'}})
        (self.resources / 'manifest.json').write_text(json.dumps(self.manifest))

    def test_reviewed_bundle_structure(self):
        self.assertEqual(check_bundle(self.app, '1.2.6', native=False), self.extension)

    def test_wrong_identity_version_os_and_entrypoint(self):
        for bundle in [self.app, self.extension]:
            path = bundle / 'Contents/Info.plist'
            original = plistlib.loads(path.read_bytes())
            for key, value in [('CFBundleIdentifier', 'other.app'), ('CFBundleVersion', '1'),
                               ('CFBundleShortVersionString', '1.2.5'), ('LSMinimumSystemVersion', '15.0'),
                               ('CFBundleExecutable', '../outside')]:
                with self.subTest(bundle=bundle.name, field=key):
                    path.write_bytes(plistlib.dumps({**original, key: value}))
                    with self.assertRaises(ValueError):
                        check_bundle(self.app, '1.2.6', native=False)
            path.write_bytes(plistlib.dumps(original))
        original['NSExtension']['NSExtensionPointIdentifier'] = 'other.extension'
        path.write_bytes(plistlib.dumps(original))
        with self.assertRaises(ValueError):
            check_bundle(self.app, '1.2.6', native=False)

    def test_resource_mismatch_and_extra_permission(self):
        source = self.root / 'source'
        source.mkdir()
        (source / 'content.js').write_text('reviewed')
        (self.resources / 'content.js').write_text('different')
        with self.assertRaises(ValueError):
            check_bundle(self.app, '1.2.6', source, native=False)
        self.manifest['permissions'].append('nativeMessaging')
        (self.resources / 'manifest.json').write_text(json.dumps(self.manifest))
        with self.assertRaises(ValueError):
            check_bundle(self.app, '1.2.6', native=False)

    def test_extra_bundled_script_is_rejected(self):
        source = self.root / 'source'
        shutil.copytree(self.resources, source)
        check_bundle(self.app, '1.2.6', source, native=False)
        (self.resources / 'extra.js').write_text('unreviewed()')
        with self.assertRaisesRegex(ValueError, 'file set'):
            check_bundle(self.app, '1.2.6', source, native=False)

    def test_entitlements_require_sandbox_and_reject_debug_or_unknown_access(self):
        check_entitlements({'com.apple.security.app-sandbox': True})
        for values in [{}, {'com.apple.security.app-sandbox': False},
                       {'com.apple.security.app-sandbox': True, 'com.apple.security.get-task-allow': True},
                       {'com.apple.security.app-sandbox': True, 'com.apple.security.network.server': True}]:
            with self.subTest(values=values), self.assertRaises(ValueError):
                check_entitlements(values)

    def test_bundle_hashes_reject_symlinks(self):
        (self.resources / 'outside').symlink_to('/etc/passwd')
        with self.assertRaises(ValueError):
            bundle_hashes(self.app)

    def test_archive_paths_symlinks_and_duplicates(self):
        for name, mode, twice in [('unsigned-candidate/../escape', 0, False),
                                 ('/absolute', 0, False), ('unexpected/file', 0, False),
                                 ('unsigned-candidate/link', stat.S_IFLNK | 0o777, False),
                                 ('unsigned-candidate/file', 0, True)]:
            with self.subTest(name=name):
                path = self.root / 'candidate.zip'
                with zipfile.ZipFile(path, 'w') as archive:
                    member = zipfile.ZipInfo(name)
                    member.external_attr = mode << 16
                    archive.writestr(member, b'payload')
                    if twice:
                        archive.writestr(member, b'different')
                with self.assertRaises(ValueError):
                    release.validate_zip(path)

    def test_ci_provenance_rejects_pr_fork_wrong_commit_and_failed_run(self):
        valid = {'repository': {'full_name': 'davegoldblatt/cookie-calm'},
                 'head_repository': {'full_name': 'davegoldblatt/cookie-calm'},
                 'head_sha': 'abc', 'event': 'workflow_dispatch',
                 'path': '.github/workflows/safari-macos.yml', 'status': 'completed',
                 'conclusion': 'success', 'html_url': 'https://github.com/verified-run'}
        with patch.object(release, 'run', side_effect=[json.dumps(valid), 'abc123 candidate.zip']):
            self.assertEqual(release.check_ci_run(1, 'abc', 'abc123'), valid['html_url'])
        for key, value in [('event', 'pull_request'), ('head_sha', 'other'), ('conclusion', 'failure'),
                           ('path', '.github/workflows/other.yml'), ('repository', {'full_name': 'other/repo'}),
                           ('head_repository', {'full_name': 'other/fork'})]:
            with self.subTest(field=key), patch.object(release, 'run', return_value=json.dumps({**valid, key: value})):
                with self.assertRaises(ValueError):
                    release.check_ci_run(1, 'abc', 'abc123')
        with patch.object(release, 'run', side_effect=[json.dumps(valid), 'different hash']):
            with self.assertRaisesRegex(ValueError, 'absent'):
                release.check_ci_run(1, 'abc', 'abc123')

    def test_runtime_and_timestamp_must_be_signature_metadata(self):
        entitlements = {'com.apple.security.app-sandbox': True}
        valid = ('Executable=/Applications/runtime.app\nIdentifier=com.example.app\n'
                 'CodeDirectory v=20500 size=512 flags=0x10000(runtime) hashes=12+7 location=embedded\n'
                 'Authority=Developer ID Application: Example (ABCDEFGHIJ)\n'
                 'Timestamp=Sep 22, 2026 at 8:00:00 PM\nTeamIdentifier=ABCDEFGHIJ\n')
        for info, passes in [(valid, True), (valid.replace('0x10000(runtime)', '0x0(none)'), False),
                             (valid.replace('Timestamp=', 'Signed Time='), False)]:
            with self.subTest(info=info), patch.object(release, 'run', return_value=plistlib.dumps(entitlements).decode()), \
                    patch.object(release.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0, '', info)):
                if passes:
                    release.verify_signature(self.app, 'ABCDEFGHIJ', '0' * 40, 'com.example.app', entitlements)
                else:
                    with self.assertRaises(ValueError):
                        release.verify_signature(self.app, 'ABCDEFGHIJ', '0' * 40, 'com.example.app', entitlements)

    @unittest.skipUnless(sys.platform == 'darwin', 'Apple requirement compiler is macOS-only')
    def test_signing_requirement_compiles_with_apple_tool(self):
        requirement = release.signature_requirement('ABCDEFGHIJ', '0' * 40, APP_ID)
        subprocess.run(['csreq', '-r', requirement, '-t'], check=True, capture_output=True)
        subprocess.run(['csreq', '-r', release.signature_requirement('ABCDEFGHIJ', '0' * 40), '-t'],
                       check=True, capture_output=True)

    def test_notary_resume_never_resubmits_known_or_ambiguous_submission(self):
        artifact = self.root / 'submission.zip'
        artifact.write_bytes(b'immutable submission')
        state = {}
        saved = []
        calls = []
        waiting = True

        def tool(*args):
            calls.append(args[2])
            if args[2] == 'submit':
                self.assertTrue(saved[-1]['app']['submitting'])
                return json.dumps({'id': 'submission-123'})
            if args[2] == 'info':
                return json.dumps({'status': 'In Progress' if waiting else 'Accepted'})
            if args[2] == 'wait':
                raise subprocess.CalledProcessError(1, args)
            if args[2] == 'log':
                return json.dumps({'issues': None})
            self.fail('Unexpected notarization operation')

        save = lambda: saved.append(json.loads(json.dumps(state)))
        with patch.object(release, 'run', side_effect=tool):
            with self.assertRaisesRegex(RuntimeError, 'did not finish'):
                release.notarize(artifact, 'app', state, save, self.root, 'profile')
            waiting = False
            release.notarize(artifact, 'app', state, save, self.root, 'profile')
            self.assertEqual(calls.count('submit'), 1)
            self.assertTrue(state['app']['accepted'])
            artifact.write_bytes(b'changed submission')
            with self.assertRaises(ValueError):
                release.notarize(artifact, 'app', state, save, self.root, 'profile')
            state = {'app': {'submitting': True}}
            with self.assertRaisesRegex(RuntimeError, 'Recover its ID'):
                release.notarize(artifact, 'app', state, save, self.root, 'profile')
            self.assertEqual(calls.count('submit'), 1)

    def test_accepted_notary_result_with_warnings_still_blocks_release(self):
        artifact = self.root / 'submission.zip'
        artifact.write_bytes(b'payload')
        responses = [{'id': 'id'}, {'status': 'Accepted'}, {'issues': [{'severity': 'warning'}]}]
        with patch.object(release, 'run', side_effect=[json.dumps(r) for r in responses]):
            with self.assertRaisesRegex(RuntimeError, 'reported issues'):
                release.notarize(artifact, 'app', {}, lambda: None, self.root, 'profile')


if __name__ == '__main__':
    unittest.main()
