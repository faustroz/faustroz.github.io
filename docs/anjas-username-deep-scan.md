# ANJAS Username Deep Scan deployment

This is the only manual deployment required for Deep Scan. It adds a separate
authenticated job endpoint; it does not modify the working synchronous
`username.py` Quick Scan endpoint.

Upload the following source files through cPanel File Manager:

- `deployment/anjas/username-job.py` to
  `/home/lookup4a/public_html/cgi-bin/username-job.py`
- `deployment/anjas/username-job-worker.py` to
  `/home/lookup4a/username-job-worker.py`

Then run:

```sh
install -m 700 -d /home/lookup4a/.username-deep-scan-jobs
chmod 700 /home/lookup4a/public_html/cgi-bin/username-job.py /home/lookup4a/username-job-worker.py
read -r -s -p 'Existing adapter token: ' TOKEN && printf '%s' "$TOKEN" > /home/lookup4a/.getcontact_adapter_token && unset TOKEN
printf '\n'
chmod 600 /home/lookup4a/.getcontact_adapter_token
```

Replace `CURRENT_ADAPTER_TOKEN` locally in the terminal with the same adapter
token used by the existing `username.py`; do not add it to this repository.
The CGI file must be installed at
`/home/lookup4a/public_html/cgi-bin/username-job.py`; the worker must be
installed at `/home/lookup4a/username-job-worker.py`.

Verify syntax without printing credentials or scan data:

```sh
/usr/bin/python3 -m py_compile /home/lookup4a/public_html/cgi-bin/username-job.py /home/lookup4a/username-job-worker.py
```

The endpoint accepts only `50`, `100`, and `200` for `topSites`. Job data is
stored at `/home/lookup4a/.username-deep-scan-jobs`, outside `public_html`,
with mode `0700`; job files are mode `0600` and are removed after 15 minutes.
At most two queued/running jobs are accepted. Each worker is capped at five
minutes and invokes Maigret through `/home/lookup4a/maigret-env/bin/maigret`.
