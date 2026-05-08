"""Parallel RDAP domain availability check with progress streaming."""
import sys
import truststore; truststore.inject_into_ssl()
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

DOMAINS = [
    'trainerpro.com', 'trainerpro.app', 'trainerpro.io', 'trainerpro.fit',
    'trainerpro.coach', 'trainerpro.studio', 'trainerpro.dev', 'trainerpro.co',
    'trainerpro.training', 'trainerpro.pro',
    'repset.app', 'repset.io', 'repset.com',
    'trainerstack.com', 'trainerstack.app', 'trainerstack.io',
    'coachkit.app', 'coachkit.io', 'coachops.app',
    'floorops.com', 'bookrun.app', 'trainerhub.app',
    'mytrainerpro.com', 'jointrainerpro.com', 'trytrainerpro.com', 'gettrainerpro.com',
    'liftd.app', 'reppt.com', 'byreps.com', 'byreps.app',
    'studiokit.app', 'sessionspro.app', 'fitops.app',
]


def check(d: str) -> str:
    try:
        r = requests.get(f'https://rdap.org/domain/{d}', timeout=8, allow_redirects=True)
        if r.status_code == 404:
            return f'AVAIL  {d}'
        if r.status_code == 200:
            return f'taken  {d}'
        return f'?{r.status_code:>3}  {d}'
    except Exception as e:
        return f'ERR    {d}: {type(e).__name__}'


with ThreadPoolExecutor(max_workers=8) as ex:
    futures = {ex.submit(check, d): d for d in DOMAINS}
    for f in as_completed(futures):
        print(f.result(), flush=True)
