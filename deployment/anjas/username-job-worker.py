#!/usr/bin/env python3
"""Private worker for username-job.py. It never writes scan data under public_html."""
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

HOME = Path("/home/lookup4a")
JOB_DIR = HOME / ".username-deep-scan-jobs"
MAIGRET_BIN = HOME / "maigret-env" / "bin" / "maigret"
MAX_RUNTIME_SECONDS = 5 * 60
TTL_SECONDS = 15 * 60
JOB_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{32,64}$")


def path_for(job_id):
    return JOB_DIR / f"{job_id}.json" if JOB_ID_PATTERN.fullmatch(job_id) else None


def read_job(path):
    try:
        with open(path, encoding="utf-8") as handle:
            job = json.load(handle)
        return job if isinstance(job, dict) else None
    except (OSError, json.JSONDecodeError):
        return None


def write_job(path, job):
    temporary = path.with_suffix(".tmp")
    with open(temporary, "w", encoding="utf-8") as handle:
        os.fchmod(handle.fileno(), 0o600)
        json.dump(job, handle, separators=(",", ":"))
    os.replace(temporary, path)


def normalize(raw, username, checked):
    entries = raw.get("sites", raw) if isinstance(raw, dict) else raw
    entries = entries if isinstance(entries, list) else []
    results = []
    for item in entries:
        if not isinstance(item, dict):
            continue
        status = item.get("status") if isinstance(item.get("status"), dict) else {}
        if not status.get("ids") and str(status.get("status", "")).lower() not in {"claimed", "found"}:
            continue
        results.append({
            "site": str(item.get("sitename") or item.get("site_name") or ""),
            "url": str(item.get("url_user") or ""),
            "status": str(status.get("status") or "").lower(),
            "httpStatus": item.get("http_status"),
            "tags": status.get("tags") if isinstance(status.get("tags"), list) else [],
            "rank": item.get("rank") if isinstance(item.get("rank"), int) else 999999,
        })
    results.sort(key=lambda item: item["rank"])
    return {"username": username, "found": len(results), "checked": checked, "results": results}


def fail(path, job):
    job["status"] = "failed"
    job.pop("resultPath", None)
    write_job(path, job)


def main():
    if len(sys.argv) != 2:
        return
    path = path_for(sys.argv[1])
    if path is None:
        return
    job = read_job(path)
    if not job or time.time() - job.get("createdAt", 0) > 15 * 60:
        return
    username, top_sites = job.get("username"), job.get("topSites")
    if not isinstance(username, str) or top_sites not in {50, 100, 200} or not MAIGRET_BIN.is_file():
        return fail(path, job)
    job["status"] = "running"
    write_job(path, job)
    raw_path = JOB_DIR / f"{job['jobId']}.maigret.json"
    try:
        subprocess.run([str(MAIGRET_BIN), username, "--top-sites", str(top_sites), "--json", str(raw_path)], cwd=str(HOME / "maigret-env"), stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=MAX_RUNTIME_SECONDS, check=False, start_new_session=True)
        with open(raw_path, encoding="utf-8") as handle:
            raw = json.load(handle)
        job.update(normalize(raw, username, top_sites))
        job["status"] = "complete"
        write_job(path, job)
    except (OSError, ValueError, json.JSONDecodeError, subprocess.TimeoutExpired):
        fail(path, job)
    finally:
        try:
            raw_path.unlink()
        except OSError:
            pass
        # The request endpoint also removes stale files, but this sleeping
        # worker guarantees expiry even when no client polls again.
        delay = job.get("createdAt", time.time()) + TTL_SECONDS - time.time()
        if delay > 0:
            time.sleep(delay)
        try:
            path.unlink()
        except OSError:
            pass


if __name__ == "__main__":
    main()
