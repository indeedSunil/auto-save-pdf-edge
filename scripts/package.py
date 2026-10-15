#!/usr/bin/env python3
"""Package only the browser extension. No installation scripts or native host."""
from pathlib import Path
import zipfile

root = Path(__file__).resolve().parents[1]
destination = root / 'dist/pdf-save-timer-extension.zip'
destination.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted((root / 'extension').rglob('*')):
        if path.is_file():
            archive.write(path, str(path.relative_to(root / 'extension')))
    archive.write(root / 'README.md', 'README.md')
print(destination)
