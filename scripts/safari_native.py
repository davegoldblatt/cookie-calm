"""Shared checks for the native Safari candidate and its local signing pipeline."""
import hashlib
import json
import plistlib
import re
import subprocess
from pathlib import Path

APP_ID = 'com.davegoldblatt.cookiecalm.direct'
EXTENSION_ID = APP_ID + '.Extension'
MINIMUM_OS = '26.0'
ALLOWED_ENTITLEMENTS = {'com.apple.security.app-sandbox', 'com.apple.security.network.client'}


def run(*args, **kwargs):
    return subprocess.run([str(arg) for arg in args], check=True, text=True,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE, **kwargs).stdout.strip()


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def read_plist(path):
    return plistlib.loads(Path(path).read_bytes())


def check_entitlements(values):
    if values.get('com.apple.security.app-sandbox') is not True:
        raise ValueError('App Sandbox must be enabled on both bundles')
    if set(values) - ALLOWED_ENTITLEMENTS or any(value is not True for value in values.values()):
        raise ValueError('Unexpected entitlement; review it before signing')


def check_bundle(app, version, source=None, native=True):
    app = Path(app)
    plugins = list((app / 'Contents/PlugIns').glob('*.appex'))
    if len(plugins) != 1:
        raise ValueError('Expected exactly one Safari extension')
    extension = plugins[0]
    for bundle, expected in [(app, APP_ID), (extension, EXTENSION_ID)]:
        info = read_plist(bundle / 'Contents/Info.plist')
        if info.get('CFBundleIdentifier') != expected:
            raise ValueError('Unexpected bundle identifier')
        if info.get('CFBundleShortVersionString') != version or info.get('CFBundleVersion') != version:
            raise ValueError('App and extension versions must match the web manifest')
        if info.get('LSMinimumSystemVersion') != MINIMUM_OS:
            raise ValueError('Unexpected minimum macOS version')
        name = info['CFBundleExecutable']
        if Path(name).name != name:
            raise ValueError('Executable must be inside Contents/MacOS')
        binary = bundle / 'Contents/MacOS' / name
        if not binary.is_file():
            raise ValueError('Missing executable')
        if native:
            if set(run('lipo', '-archs', binary).split()) != {'arm64', 'x86_64'}:
                raise ValueError('Both Intel and Apple silicon executables are required')
            for arch in ['arm64', 'x86_64']:
                load = run('otool', '-l', '-arch', arch, binary)
                if re.findall(r'\bminos\s+(\S+)', load) != [MINIMUM_OS]:
                    raise ValueError('Executable deployment target does not match the bundle')
    info = read_plist(extension / 'Contents/Info.plist')['NSExtension']
    if info.get('NSExtensionPointIdentifier') != 'com.apple.Safari.web-extension' or not info.get('NSExtensionPrincipalClass', '').endswith('.SafariWebExtensionHandler'):
        raise ValueError('Invalid Safari extension entry point')
    manifests = list((extension / 'Contents/Resources').rglob('manifest.json'))
    if len(manifests) != 1:
        raise ValueError('Expected one web extension manifest')
    manifest = json.loads(manifests[0].read_text())
    if manifest.get('version') != version or manifest.get('browser_specific_settings', {}).get('safari', {}).get('strict_min_version') != '26.0':
        raise ValueError('Wrong Safari resources')
    if set(manifest.get('permissions', [])) != {'storage', 'scripting'}:
        raise ValueError('Unexpected web extension permission')
    if source is not None:
        source = Path(source)
        for file in source.rglob('*'):
            if file.is_file():
                embedded = manifests[0].parent / file.relative_to(source)
                if not embedded.is_file() or digest(file) != digest(embedded):
                    raise ValueError(f'Embedded resource differs: {file.relative_to(source)}')
    return extension


def bundle_hashes(app):
    app = Path(app)
    if any(p.is_symlink() for p in app.rglob('*')):
        raise ValueError('Unexpected symlink in the app bundle')
    return {p.relative_to(app).as_posix(): digest(p) for p in sorted(app.rglob('*')) if p.is_file()}
