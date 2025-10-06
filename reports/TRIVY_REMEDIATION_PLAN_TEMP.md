# Trivy Remediation Plan (Temporary Tracking File)

This temporary file tracks the phased remediation plan and checkpoints for addressing Trivy findings in the `jeetSocial` repository. It is intentionally concise and actionable so each phase can be implemented in a small PR and verified with a build + Trivy scan.

---

## Metadata
- Created by: assistant
- Date: 2025-10-06
- Purpose: Track phases, tasks, verification steps and artifacts for vulnerability remediation

---

## Baseline
- Baseline Trivy summary: `jeetsocial_web:latest (debian 12.1)` — 958 Debian vulnerabilities, 2 Python package vulnerabilities (HIGH: setuptools CVEs). Kernel CVEs found (likely host/kernel-level; to be marked N/A).
- Baseline artifact path: `reports/trivy/baseline.json` (to be created)

---

## Phases & Tasks

### Phase 0 — Baseline & Tests-First
- [ ] Task 0.1: Capture Trivy JSON baseline and save as `reports/trivy/baseline.json`.
- [ ] Task 0.2: Add a CI job that uploads Trivy JSON as an artifact for every PR/run (non-blocking at first).
- Verification: baseline JSON artifact present.

### Phase 1 — Remove dev deps from runtime (small)
- [x] Task 1.1: Split `requirements.txt` into `requirements-runtime.txt` and `requirements-dev.txt`.
  - `requirements-runtime.txt`: flask, flask_sqlalchemy, psycopg2-binary, flask-limiter, requests, python-dotenv, flask-migrate, alembic
  - `requirements-dev.txt`: pytest, pytest-cov, black==24.3.0, setuptools==78.1.1
- [x] Task 1.2: Update `Dockerfile` to install only runtime deps into the final image (install dev deps only in CI/test stage, not copied into runtime).
- Verification: unit tests pass locally (75 passed).  Changes are committed on branch `fix/pr-14` (commit `ab30a16`).  Next: run Trivy scans to verify Python-package vulnerabilities are reduced in the runtime image.

### Phase 2 — Ensure pip/setuptools upgrade in builder (small)
- [ ] Task 2.1: Add `RUN python -m pip install --upgrade pip setuptools` in builder prior to installing requirements.
- Verification: `setuptools` vulnerabilities no longer present in Trivy report.

### Phase 3 — Update base image to patched tag (moderate)
- [ ] Task 3.1: Update `FROM python:3.10.12-slim` to `FROM python:3.10.16-slim` (or latest patch tag).
- Verification: rebuild and Trivy scan; expect a significant reduction of Debian CVEs.

### Phase 4 — Harden apt usage & minimize runtime surface
- [ ] Task 4.1: Use `apt-get install -y --no-install-recommends` and remove unnecessary packages from runtime (e.g., `curl` if not needed).
- [ ] Task 4.2: Use `--only-upgrade` for critical packages when needed.
- Verification: rebuild + Trivy -> OS CVEs reduced; app behavior unchanged.

### Phase 5 — Adopt wheel-based deterministic installs (best practice)
- [ ] Task 5.1: In `builder`, run `pip wheel --wheel-dir=/wheels -r requirements-runtime.txt`.
- [ ] Task 5.2: In `final`, copy wheels and `pip install --no-index --find-links=/wheels -r requirements-runtime.txt`.
- Verification: deterministic builds; Trivy/Python dependency parity validated.

### Phase 6 — Triage remaining CVEs & targeted fixes
- [ ] Task 6.1: Parse Trivy JSON into a table of (CVE, package, installed, fixed, fix action).
- [ ] Task 6.2: Mark kernel-level CVEs as N/A in tracker with justification.
- [ ] Task 6.3: Apply targeted upgrades/pins for critical runtime packages.
- Verification: re-scan until no unmitigated CRITICALs; document mitigations for accepted HIGHs.

### Phase 7 — CI automation & monitoring
- [ ] Task 7.1: Upload Trivy JSON artifacts from CI on PRs.
- [ ] Task 7.2: Add a vulnerability gate to fail builds on `CRITICAL` (ignore kernel CVEs via filter), and optionally warn on HIGH.
- [ ] Task 7.3: Enable Dependabot/Renovate for Python dependencies and Docker base image updates.
- Verification: PR runs include Trivy artifact; vulnerability gate enforces policy.

---

## Safety & Rollback
- Each phase implemented as a small PR with tests and flake8 passing.
- Revert PR if tests fail; keep builds reproducible; attach before/after Trivy JSON to PR.

---

## Next actionable step
- Implement Phase 1 changes (split requirements, update Dockerfile to only install runtime deps, add pip upgrade in builder).
- I will create small PRs for each phase and run builds/Trivy scans after each change.


---

(Temporary file — will not be committed to main branch permanently unless you request.)
