from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json

root = Path(__file__).resolve().parent.parent
with ZipFile(root / 'cookie-calm.zip', 'w', ZIP_DEFLATED) as archive:
    for file in sorted((root / 'extension').rglob('*')):
        if file.is_file():
            archive.write(file, Path('cookie-calm') / file.relative_to(root / 'extension'))
print(root / 'cookie-calm.zip')

version = json.loads((root / 'extension/manifest.json').read_text())['version']
dist = root / 'dist'
dist.mkdir(exist_ok=True)
store = dist / f'cookie-calm-{version}-chrome-web-store.zip'
with ZipFile(store, 'w', ZIP_DEFLATED) as archive:
    for file in sorted((root / 'extension').rglob('*')):
        if file.is_file():
            archive.write(file, file.relative_to(root / 'extension'))
with ZipFile(store) as archive:
    assert 'manifest.json' in archive.namelist()
    assert archive.testzip() is None
checksum = hashlib.sha256(store.read_bytes()).hexdigest()
(dist / 'SHA256SUMS.txt').write_text(f'{checksum}  {store.name}\n')
print(store)
