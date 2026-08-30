#!/usr/bin/env python3
"""Temporary, authenticated CGI endpoint for asynchronous Maigret scans."""
import hmac
import json
import os
import re
import secrets
import subprocess
import sys
import time
from pathlib import Path
from urllib.parse import parse_qs

HOME = Path("/home/lookup4a")
JOB_DIR = HOME / ".username-deep-scan-jobs"
WORKER = HOME / "username-job-worker.py"
TOKEN_FILE = HOME / ".getcontact_adapter_token"
TTL_SECONDS = 15 * 60
MAX_ACTIVE_JOBS = 2
JOB_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{32,64}$")
USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,62}[A-Za-z0-9])?$")
ALLOWED_SITE_COUNTS = {50, 100, 200}


def respond(status, payload):
    print(f"Status: {status}")
    print("Content-Type: application/json")
    print("Cache-Control: no-store")
    print("X-Content-Type-Options: nosniff")
    print()
    print(json.dumps(payload, separators=(",", ":")))


def secret_token():
    value = os.environ.get("GETCONTACT_ADAPTER_TOKEN", "")
    if value:
        return value.strip()
    try:
        return TOKEN_FILE.read_text(encoding="utf-8").strip()
    except OSError:
        return ""


def authorized():
    expected = secret_token()
    supplied = os.environ.get("HTTP_X_ADAPTER_TOKEN", "")
    return bool(expected) and hmac.compare_digest(supplied, expected)


def job_path(job_id):
    if not JOB_ID_PATTERN.fullmatch(job_id):
        return None
    return JOB_DIR / f"{job_id}.json"


def write_job(path, job):
    temporary = path.with_suffix(".tmp")
    with open(temporary, "w", encoding="utf-8") as handle:
        os.fchmod(handle.fileno(), 0o600)
        json.dump(job, handle, separators=(",", ":"))
    os.replace(temporary, path)


def read_job(path):
    try:
        with open(path, encoding="utf-8") as handle:
            job = json.load(handle)
        return job if isinstance(job, dict) else None
    except (OSError, json.JSONDecodeError):
        return None


def cleanup():
    JOB_DIR.mkdir(mode=0o700, parents=True, exist_ok=True)
    try:
        os.chmod(JOB_DIR, 0o700)
    except OSError:
        pass
    threshold = time.time() - TTL_SECONDS
    for path in JOB_DIR.glob("*.json"):
        if not JOB_ID_PATTERN.fullmatch(path.stem):
            continue
        try:
            if path.stat().st_mtime < threshold:
                path.unlink()
        except OSError:
            pass


def active_job_count():
    count = 0
    for path in JOB_DIR.glob("*.json"):
        job = read_job(path)
        if job and job.get("status") in {"queued", "running"}:
            count += 1
    return count


def read_json_body():
    length = os.environ.get("CONTENT_LENGTH", "0")
    try:
        size = int(length)
    except ValueError:
        return None
    if size < 1 or size > 64 * 1024:
        return None
    try:
        payload = json.loads(sys.stdin.read(size))
    except (json.JSONDecodeError, OSError):
        return None
    return payload if isinstance(payload, dict) else None


def start_job():
    payload = read_json_body()
    if payload is None:
        return respond("400 Bad Request", {"error": "Invalid JSON"})
    username = payload.get("username")
    top_sites = payload.get("topSites")
    if not isinstance(username, str) or not USERNAME_PATTERN.fullmatch(username.strip()):
        return respond("400 Bad Request", {"error": "Invalid username"})
    if type(top_sites) is not int or top_sites not in ALLOWED_SITE_COUNTS:
        return respond("400 Bad Request", {"error": "topSites must be 50, 100, or 200"})
    if active_job_count() >= MAX_ACTIVE_JOBS:
        return respond("429 Too Many Requests", {"error": "Too many Deep Scan jobs. Try again shortly."})

    job_id = secrets.token_urlsafe(24)
    path = job_path(job_id)
    job = {"jobId": job_id, "status": "queued", "username": username.strip(), "topSites": top_sites, "createdAt": int(time.time())}
    write_job(path, job)
    try:
        subprocess.Popen([sys.executable, str(WORKER), job_id], stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, close_fds=True, start_new_session=True)
    except OSError:
        try:
            path.unlink()
        except OSError:
            pass
        return respond("503 Service Unavailable", {"error": "Unable to queue Deep Scan"})
    return respond("202 Accepted", {"jobId": job_id, "status": "queued"})


def status_job():
    query = parse_qs(os.environ.get("QUERY_STRING", ""), keep_blank_values=True)
    values = query.get("id", [])
    job_id = values[0] if len(values) == 1 else ""
    path = job_path(job_id)
    if path is None:
        return respond("400 Bad Request", {"error": "Invalid job ID"})
    job = read_job(path)
    if not job:
        return respond("404 Not Found", {"error": "Job not found or expired"})
    result = {"jobId": job_id, "status": job.get("status", "failed")}
    if result["status"] == "complete":
        result.update({key: job.get(key) for key in ("username", "found", "checked", "results")})
    elif result["status"] == "failed":
        result["error"] = "Deep Scan failed"
    return respond("200 OK", result)


def main():
    if not authorized():
        return respond("401 Unauthorized", {"error": "Unauthorized"})
    cleanup()
    method = os.environ.get("REQUEST_METHOD", "")
    if method == "POST":
        return start_job()
    if method == "GET":
        return status_job()
    return respond("405 Method Not Allowed", {"error": "Method not allowed"})


if __name__ == "__main__":
    main()
