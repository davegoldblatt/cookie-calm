"""Reject unsafe or mismatched release inputs before any signing or submission."""
import importlib.util
import json
import plistlib
import stat
import sys
import tempfile
import unittest
import zipfile
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

    def test_archive_paths_symlinks_duplicates_and_size(self):
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


if __name__ == '__main__':
    unittest.main()
