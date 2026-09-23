"""Package web resources, not a signed Apple app. Never touch Chrome artifacts."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import hashlib
import json

root = Path(__file__).resolve().parent.parent
source = root / 'build' / 'safari'
manifest = json.loads((source / 'manifest.json').read_text())
assert manifest['browser_specific_settings']['safari']['strict_min_version'] == '26.0'
assert 'minimum_chrome_version' not in manifest
dist = root / 'dist'
dist.mkdir(exist_ok=True)
archive_path = dist / f"cookie-calm-{manifest['version']}-safari-preview.zip"
with ZipFile(archive_path, 'w', ZIP_DEFLATED, compresslevel=9) as archive:
    for file in sorted(source.rglob('*')):
        if file.is_file() and not any(part.startswith('.') for part in file.relative_to(source).parts):
            info = ZipInfo(file.relative_to(source).as_posix(), (2026, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            archive.writestr(info, file.read_bytes(), compresslevel=9)
with ZipFile(archive_path) as archive:
    assert 'manifest.json' in archive.namelist()
    assert archive.testzip() is None
checksum = hashlib.sha256(archive_path.read_bytes()).hexdigest()
(dist / 'SAFARI-SHA256SUMS.txt').write_text(f'{checksum}  {archive_path.name}\n')
print(archive_path)
print('Safari preview resources only. Apple packaging and Safari validation remain separate steps.')
