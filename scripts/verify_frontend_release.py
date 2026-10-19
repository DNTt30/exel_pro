"""Compare public GitHub Pages assets with the local build; no login or writes."""
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from concurrent.futures import ThreadPoolExecutor

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'frontend/dist'
BASE = 'https://dntt30.github.io/exel_pro/'
stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')

def fetch(path):
    request = Request(BASE + path + '?release_check=' + stamp, headers={'Cache-Control': 'no-cache'})
    with urlopen(request, timeout=30) as response:
        return response.read()

local_index = (DIST / 'index.html').read_bytes()
remote_index = fetch('index.html')
if remote_index != local_index:
    raise SystemExit('PUBLIC_INDEX_NOT_CURRENT: wait for GitHub Pages to finish publishing.')
paths = ['index.html', '404.html', 'sw.js']
paths += [p.split('/exel_pro/', 1)[-1] for p in re.findall(r'(?:src|href)="([^"]+\.(?:js|css))"', local_index.decode())]
for pattern in ['KnowledgeLibrary-*.js', 'HandbookManager-*.js', 'Handbook-*.js', 'AICopilotDrawer-*.js',
                'WorkspaceSettings-*.js', 'WorkspaceSettingsLayout-*.js', 'WorkspaceRoles-*.js']:
    paths += [path.relative_to(DIST).as_posix() for path in (DIST / 'assets').glob(pattern)]

def verify(path):
    local = (DIST / path).read_bytes()
    remote = fetch(path)
    # gh-pages commits normalize tracked text files from CRLF to LF on Windows.
    line_endings_only = remote != local and remote.replace(b'\r\n', b'\n') == local.replace(b'\r\n', b'\n')
    if remote != local and not line_endings_only:
        raise RuntimeError('PUBLIC_ASSET_MISMATCH: ' + path)
    return {'asset': path, 'sha256': hashlib.sha256(remote).hexdigest(), 'bytes': len(remote),
            'git_line_endings_only': line_endings_only}

with ThreadPoolExecutor(max_workers=4) as pool:
    verified = list(pool.map(verify, sorted(set(paths))))
report = {'verified_at': stamp, 'url': BASE, 'assets': verified}
target = ROOT / 'artifacts/release' / ('frontend-verified-' + stamp + '.json')
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(json.dumps(report, indent=2), encoding='utf-8')
print('FRONTEND_RELEASE_OK', len(verified), 'assets')
print('REPORT', target.relative_to(ROOT).as_posix())
