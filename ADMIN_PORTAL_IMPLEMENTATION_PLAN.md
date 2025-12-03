# jeetSocial Admin Portal Implementation Plan

Version: 1.1  
Updated: 2025-12-01  
Estimated Duration: 7–8 weeks  
Constitution Compliance: v2.1.2

Executive Summary

This implementation plan delivers a secure, privacy-first admin portal for jeetSocial with explicit staging configuration, feature flag control, MFA, JWT with httpOnly cookies and CSRF defenses, robust auditing with tamper resistance, performance testing, OpenAPI contract testing, accessibility checks, and production monitoring. It operationalizes mandatory TDD (failing tests first), flake8/ESLint gates in CI, and aligns all E2E tests with e2e/AGENTS.md.

Constitution Check

Compliance Status: PASSED
- Privacy-first: No PII stored; admin identities minimized to security-only metadata. Randomized user identifiers remain anonymous. Data minimization applied in all endpoints.
- TDD enforced: Every task specifies failing tests to create first; Red-Green-Refactor.
- Branching & PR rules: Work on feature/ branches; PR with all tests passing and docs updated.
- Moderation & kindness: Admin tooling focused on uplifting platform safety; no deanonymization.
- Security-by-default: JWT httpOnly cookies, CSRF double-submit + SameSite=strict, MFA (TOTP/WebAuthn), rate limiting, secret management via env.
- Observability: Structured logs, append-only audit log with hash chain, monitoring/alerting.
- Governance: No constitution changes proposed.

External References and Best Practices (Pulled via docs search)

- Flask Web Security: CSRF, cookies, headers — flask.palletsprojects.com/en/stable/web-security/
- JWT + Cookies patterns (general best practices): httpOnly, Secure, SameSite=strict; short-lived access token + refresh rotation; server-side CSRF token with double-submit cookie.
- TOTP MFA: pyotp (RFC 6238), QR provisioning (otpauth://), time-step 30s, 6 digits.
- WebAuthn MFA: FIDO2 via python-fido2 or webauthn-rp; store credentialId + publicKey, challenge per login, verify assertions server-side.
- Flask-SocketIO scaling: Message queue with Redis (socketio = SocketIO(app, message_queue="redis://...")); use eventlet/gevent; multiple workers subscribe to Redis.
- Security Scanning: Trivy (image/filesystem), CodeQL (GH Actions), Bandit (Python SAST).
- OpenAPI contract testing: Dredd or Schemathesis against OpenAPI spec.
- Playwright accessibility testing: @axe-core/playwright or expect(accessibilitySnapshot()) checks; ARIA roles, labels.
- Monitoring: Prometheus client in Flask (prometheus_client) + Grafana dashboards.
- Performance testing: Locust (Python) or k6 (JS) for API + WebSocket.

New Global Config and Feature Flags

- ENABLE_ADMIN_PORTAL: 0/1; default 0.
- ADMIN_REQUIRE_MFA: 1 (enforce TOTP/WebAuthn on admin accounts).
- JWT_ACCESS_TTL: default 900 seconds (15m).
- JWT_REFRESH_TTL: default 86400 seconds (24h).
- CSRF_COOKIE_NAME: "csrf_token"; CSRF_HEADER_NAME: "X-CSRF-Token".
- SOCKETIO_REDIS_URL: redis://redis:6379/0.
- PROMETHEUS_ENABLED: 1.
- STAGING=true in staging env; separate secrets and DB.

Staging Environment Configuration

- Separate compose file: docker-compose.staging.yml
- Separate env: .env.staging (never committed; documented in .env.example)
- Runtime config: config/staging.py (SECURE_COOKIES, CSRF on, rate limiting on, logging to JSON)
- Data: isolated Postgres schema; no production data. Seed with synthetic data only.
- Access: restricted to maintainers; behind VPN or allowlist.
- CI: deploy-to-staging job gated by tests, flake8, ESLint, security scans (Trivy, Bandit, CodeQL).

Security Architecture

- JWT lifecycle: access token (short-lived) in httpOnly, Secure, SameSite=strict cookie; refresh token in httpOnly cookie with rotation and revocation list in DB. jti stored; on refresh, rotate jti and blacklist old.
- CSRF strategy: double-submit cookie (CSRF token stored in non-httpOnly cookie and sent in X-CSRF-Token header) combined with SameSite=strict. For unsafe methods (POST/PUT/DELETE), require header token match.
- MFA: TOTP (pyotp) with backup codes; WebAuthn via python-fido2; enforce per admin.
- Rate limiting: per-IP and per-admin user for sensitive endpoints.
- Session fixation & replay defenses: rotate tokens on privilege changes and login; store device fingerprint hash (non-PII, derived from UA) only for anomaly detection.
- Audit log tamper resistance: append-only table with SHA-256 hash chain (prev_hash, curr_hash = sha256(prev_hash || record_json)); periodic signed snapshots using local GPG; encrypted, integrity-verified archives stored on maintainer-controlled storage; write-once S3-compatible bucket optional.
- Privacy minimization: never store content, only post IDs and minimal context; no IPs unless strictly necessary for security; purge logs per retention policy.

Final Decisions and Implementation Details (Cost-Optimized)

1) WebAuthn Library Choice: python-fido2
- Rationale: Mature, actively maintained by Yubico; robust server-side helpers; widely adopted; MIT license ($0); works cleanly in Flask without heavy abstractions.
- Alternatives considered: webauthn (webauthn-rp) is lighter but less active; python-fido2 has broader device coverage and examples.
- Implementation Outline (Flask):
  - Dependencies: requirements-runtime.txt -> python-fido2
  - Server endpoints:
    - POST /admin/webauthn/challenge (registration): issue challenge via FIDO2Server; store challenge in server-side session keyed by admin_id.
    - POST /admin/webauthn/register: verify attestation; persist credential_id (base64url), public_key, sign_count.
    - POST /admin/webauthn/challenge (login): issue assertion challenge.
    - POST /admin/webauthn/verify: verify assertion; check sign_count increments; complete MFA.
  - Storage: admin_webauthn_credentials table with admin_id, credential_id (unique), public_key, sign_count, created_at.
  - Config: WEBAUTHN_RP_ID, WEBAUTHN_RP_NAME via env.
  - Fallback: TOTP remains default; WebAuthn optional per admin (ADMIN_REQUIRE_MFA=1 covers either).

2) Audit Snapshot Storage: Local GPG + PostgreSQL (no cloud KMS)
- Rationale: $0 cost using existing infra; gpg is available in Debian/Ubuntu images; avoids paid KMS and object storage.
- Design:
  - Append-only audit table with hash chain guarantees integrity in DB.
  - Periodic snapshot job (daily/weekly) exports SELECT * FROM admin_actions ORDER BY created_at to JSON (or CSV), computes SHA-256 of file, and GPG-signs + optionally encrypts archive.
  - Store signed files on maintainer-controlled storage (e.g., bind-mounted host directory or separate repo with LFS disabled; never public). Optionally push to an S3-compatible write-once bucket when available.
- Implementation:
  - Docker: install gnupg in Dockerfile (runtime) or a slim sidecar image for signing.
  - Keys: generate offline maintainer GPG key; import public key into container for signature verification; private key for signing used only in secure environment (staging/prod runner). Never commit keys.
  - Script: scripts/audit-snapshot.sh
    - pg_dump --table=admin_actions to JSON via psql + COPY or SELECT to file
    - sha256sum file > file.sha256
    - gpg --sign --armor --local-user "$GPG_KEY_ID" --output file.asc file
  - Verification: scripts/audit-verify.sh — gpg --verify file.asc; compare sha256; ensure chain continuity via a check query.
  - CI: optional scheduled verification using GitHub Actions with maintainer-provided key via secrets (free tier), or run locally with act.

3) Staging Hosting Environment: Docker + Basic Auth + HTTPS + IP Allowlist (optional VPN)
- Rationale: $0 where possible; leverage existing Docker; Nginx reverse proxy provides TLS (Let’s Encrypt on public staging) and Basic Auth; IP allowlist via Nginx; VPN optional for enhanced security.
- Design:
  - docker-compose.staging.yml includes nginx reverse proxy + certbot (or Caddy) for HTTPS; upstream to Flask app service.
  - Basic Auth: htpasswd file mounted; restrict /admin paths.
  - IP Allowlist: allow only maintainer IP ranges in Nginx; fallback to Basic Auth if IP changes.
  - Rate limiting: Nginx limit_req for /admin.
- Implementation Examples:
  - Nginx location block:
    location /admin {
      auth_basic "Restricted";
      auth_basic_user_file /etc/nginx/.htpasswd;
      limit_req zone=admin burst=10 nodelay;
      allow 203.0.113.0/24;  # maintainer office
      deny all;
      proxy_pass http://web:5000;
      proxy_set_header X-Forwarded-Proto $scheme;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
  - Compose services:
    - nginx with volumes: certs, .htpasswd, nginx.conf
    - web (Flask) with ENV STAGING=true, SECURE_COOKIES=1
  - Certificates: Let’s Encrypt via certbot container or Caddy (auto TLS) — both $0.
  - Basic Auth management: scripts/staging-auth.sh to add/remove users (htpasswd -B).

Configuration Examples

- .env.staging additions:
  ENABLE_ADMIN_PORTAL=1
  ADMIN_REQUIRE_MFA=1
  WEBAUTHN_RP_ID=staging.jeetsocial.local
  WEBAUTHN_RP_NAME=jeetSocial Admin
  JWT_ACCESS_TTL=900
  JWT_REFRESH_TTL=86400
  CSRF_COOKIE_NAME=csrf_token
  CSRF_HEADER_NAME=X-CSRF-Token
  PROMETHEUS_ENABLED=1
  STAGING=true

- Dockerfile (runtime additions):
  RUN apt-get update && apt-get install -y gnupg && rm -rf /var/lib/apt/lists/*
  RUN pip install --no-cache-dir pyotp python-fido2 prometheus-client

- requirements-runtime.txt:
  pyotp
  python-fido2
  prometheus-client

Production-Readiness Notes (Cost-Aware)
- WebAuthn and TOTP both enabled; admins can enroll either/both.
- Audit snapshots are GPG-signed; verification documented; keys kept offline, never in repo.
- Staging hardened with HTTPS, Basic Auth, CSRF, rate limiting, and optional IP allowlist/VPN; zero-cost with Let’s Encrypt.
- All changes respect Constitution v2.1.2: TDD first, privacy-first, no PII, feature flags, CI gates.

Concrete Code Examples (ready-to-implement snippets)

JWT with httpOnly cookies + CSRF token (Flask)

- app/admin/auth_service.py

from datetime import datetime, timedelta, timezone
import os
import secrets
import jwt
from flask import make_response

JWT_ALG = "HS256"
SECRET_KEY = os.environ.get("SECRET_KEY", "change-me")
ACCESS_TTL = int(os.environ.get("JWT_ACCESS_TTL", "900"))
REFRESH_TTL = int(os.environ.get("JWT_REFRESH_TTL", "86400"))
CSRF_COOKIE_NAME = os.environ.get("CSRF_COOKIE_NAME", "csrf_token")
CSRF_HEADER_NAME = os.environ.get("CSRF_HEADER_NAME", "X-CSRF-Token")


def _issue_token(sub: str, ttl: int, token_type: str) -> dict:
    now = datetime.now(timezone.utc)
    jti = secrets.token_urlsafe(16)
    payload = {"sub": sub, "iat": int(now.timestamp()), "exp": int((now + timedelta(seconds=ttl)).timestamp()), "jti": jti, "typ": token_type}
    token = jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALG)
    return {"token": token, "jti": jti}


def issue_login_tokens(admin_id: str):
    access = _issue_token(admin_id, ACCESS_TTL, "access")
    refresh = _issue_token(admin_id, REFRESH_TTL, "refresh")
    csrf_token = secrets.token_urlsafe(24)
    resp = make_response({"ok": True})
    resp.set_cookie("access_token", access["token"], httponly=True, secure=True, samesite="Strict", max_age=ACCESS_TTL)
    resp.set_cookie("refresh_token", refresh["token"], httponly=True, secure=True, samesite="Strict", max_age=REFRESH_TTL)
    resp.set_cookie(CSRF_COOKIE_NAME, csrf_token, httponly=False, secure=True, samesite="Strict", max_age=ACCESS_TTL)
    # persist refresh jti in DB for rotation; blacklist old on use
    return resp

- app/admin/middleware.py (CSRF check)

from flask import request, abort
from app.admin.auth_service import CSRF_HEADER_NAME, CSRF_COOKIE_NAME

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}

def verify_csrf():
    if request.method in SAFE_METHODS:
        return
    header = request.headers.get(CSRF_HEADER_NAME)
    cookie = request.cookies.get(CSRF_COOKIE_NAME)
    if not header or not cookie or header != cookie:
        abort(403)

MFA (TOTP)

- app/admin/mfa_service.py

import pyotp
import secrets

BACKUP_CODE_COUNT = 10


def generate_totp_secret():
    return pyotp.random_base32()


def totp_uri(secret: str, account_name: str, issuer: str = "jeetSocial"):
    return pyotp.totp.TOTP(secret).provisioning_uri(name=account_name, issuer_name=issuer)


def verify_totp(secret: str, code: str):
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)


def generate_backup_codes():
    return [secrets.token_hex(4) for _ in range(BACKUP_CODE_COUNT)]

WebAuthn (server-side outline)

- app/admin/webauthn_service.py

# Pseudocode outline using python-fido2 or webauthn packages
# store: credential_id (base64url), public_key, sign_count
# flow: create challenge -> send to client -> verify assertion -> update sign_count

Flask-SocketIO with Redis scaling

- run_socketio.py (existing)

from flask_socketio import SocketIO
import os

socketio = SocketIO(app, message_queue=os.environ.get("SOCKETIO_REDIS_URL", "redis://redis:6379/0"), cors_allowed_origins=[])
# Use eventlet/gevent workers; run multiple replicas – Redis fanout handles scale

Docker Security Scanning (CI snippets)

- .github/workflows/ci.yml

- name: Bandit SAST
  run: bandit -r app -ll

- name: Trivy FS scan
  uses: aquasecurity/trivy-action@v0.14.0
  with:
    scan-type: fs
    scan-ref: .

- name: Trivy Image scan
  uses: aquasecurity/trivy-action@v0.14.0
  with:
    scan-type: image
    image-ref: jeet-social:latest

- name: CodeQL Init
  uses: github/codeql-action/init@v3
  with:
    languages: python, javascript

OpenAPI Contract Testing

- specs/admin-openapi.yaml
- Dredd: dredd specs/admin-openapi.yaml http://localhost:5000
- Schemathesis (pytest): schemathesis run specs/admin-openapi.yaml --checks=all

Playwright Accessibility Testing

- e2e/test_admin_accessibility.spec.js

const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test('admin dashboard is accessible', async ({ page }) => {
  await page.goto('/admin');
  const accessibilityScanResults = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});

Prometheus/Grafana Monitoring

- app/metrics.py

from prometheus_client import Counter, Histogram, generate_latest
from flask import Blueprint, Response

metrics_bp = Blueprint('metrics', __name__)
api_requests = Counter('jeet_api_requests_total', 'Total API requests', ['endpoint', 'method', 'status'])
latency = Histogram('jeet_api_latency_seconds', 'API latency', ['endpoint'])

@metrics_bp.route('/metrics')
def metrics():
    return Response(generate_latest(), mimetype='text/plain')

Performance Testing

- Locust: locustfile.py defines admin endpoints; ramp users; assert p95 < 200ms
- k6: script.js for report list/create; thresholds: http_req_duration{p(95)} < 200

Phase 1: Database Foundation (Week 1)

1.1 Database Schema Design

Task 1.1.1: Design admin_reports table
- Time: 2h
- Deps: None
- Files: migrations/versions/
- Failing tests first: tests/unit/test_admin_models.py::test_admin_reports_schema_constraints_fails_on_missing_required_fields
- Security: minimal fields (post_id, reason, created_at); NO reporter PII; index on created_at, post_id
- Privacy: store only post_id and normalized reason category
- Success: migration with constraints and indexes

Task 1.1.2: Design admin_actions (audit) table with hash chain
- Time: 3h
- Deps: 1.1.1
- Files: migrations/versions/
- Failing tests first: tests/unit/test_admin_models.py::test_audit_hash_chain_integrity_requires_prev_hash
- Security: append-only, prev_hash, curr_hash, actor_id (admin id), action_type, action_payload (JSON), created_at
- Privacy: actor_id stored as admin internal id; no user PII in payload
- Success: migration supports hash chaining + NOT NULL + index on created_at

Task 1.1.3: Design admin_sessions table
- Time: 2h
- Deps: 1.1.2
- Files: migrations/versions/
- Failing tests first: tests/unit/test_admin_models.py::test_session_expiry_and_revocation
- Security: store refresh jti, admin_id, issued_at, expires_at, revoked(bool), device_hash(optional)
- Privacy: device_hash derived, non-PII
- Success: secure schema; unique(refresh_jti)

Task 1.1.4: Create migrations
- Time: 3h
- Deps: 1.1.1–1.1.3
- Files: migrations/versions/
- Failing tests first: tests/integration/test_admin_database.py::test_migrations_apply_and_rollback_cleanly
- Success: upgrade/downgrade runs clean

1.2 Model Implementation

Task 1.2.1: AdminReport model
- Time: 2h
- Deps: 1.1.4
- Files: app/models.py
- Failing tests: tests/unit/test_admin_models.py::test_admin_report_validations
- Success: validations pass

Task 1.2.2: AdminAction model (audit)
- Time: 2h
- Deps: 1.2.1
- Files: app/models.py
- Failing tests: tests/unit/test_admin_models.py::test_audit_hash_linking
- Success: curr_hash = sha256(prev_hash || record)

Task 1.2.3: AdminSession model
- Time: 1.5h
- Deps: 1.2.2
- Files: app/models.py
- Failing tests: tests/unit/test_admin_models.py::test_session_revocation_and_unique_jti

Task 1.2.4: Relationships & constraints
- Time: 2h
- Deps: 1.2.3
- Files: app/models.py
- Failing tests: tests/unit/test_admin_models.py::test_relationship_integrity

1.3 Database Service Layer

Task 1.3.1: report_service.py
- Time: 3h
- Deps: 1.2.4
- Files: app/admin/report_service.py
- Failing tests: tests/unit/test_admin_services.py::test_report_create_validate_reason_category
- Integration: with post_service; ensure post exists

Task 1.3.2: audit_service.py (hash chain write)
- Time: 3h
- Deps: 1.3.1
- Files: app/admin/audit_service.py
- Failing tests: tests/unit/test_admin_services.py::test_audit_append_updates_chain

Task 1.3.3: auth_service.py (JWT+CSRF, refresh rotation)
- Time: 4h
- Deps: 1.3.2
- Files: app/admin/auth_service.py
- Failing tests: tests/unit/test_admin_auth.py::test_httpOnly_cookie_flags_and_samesite_strict
- Security: short-lived access; rotation on refresh; blacklist old jti

Task 1.3.4: Add DB indexes
- Time: 1.5h
- Deps: 1.3.3
- Files: migrations/versions/
- Failing tests: tests/performance/test_admin_database.py::test_query_plans_use_indexes

Phase 2: Backend API Development (Week 2)

2.1 Authentication & Authorization

Task 2.1.1: JWT token generation
- Time: 2h
- Deps: 1.3.3
- Files: app/admin/auth_service.py
- Failing tests: tests/unit/test_admin_auth.py::test_jwt_exp_and_jti_present

Task 2.1.2: Admin login endpoint (MFA)
- Time: 3h
- Deps: 2.1.1
- Files: app/admin/routes.py
- Failing tests: tests/integration/test_admin_api_integration.py::test_login_requires_mfa_totp_or_webauthn
- Security: rate limit /admin/login; lockout after N failures

Task 2.1.3: JWT middleware + CSRF
- Time: 2.5h
- Deps: 2.1.2
- Files: app/admin/middleware.py
- Failing tests: tests/integration/test_admin_security.py::test_csrf_block_on_missing_or_mismatch

Task 2.1.4: RBAC decorators
- Time: 1.5h
- Deps: 2.1.3
- Files: app/admin/decorators.py
- Failing tests: tests/unit/test_admin_api.py::test_rbac_blocks_non_admin

2.2 Reporting System API

Task 2.2.1: Post reporting endpoint
- Time: 2h
- Deps: 2.1.4
- Files: app/routes.py
- Failing tests: tests/contract/test_posts_get_contract.py (ensure not broken) + tests/unit/test_admin_api.py::test_report_create_anonymous
- Privacy: no reporter info stored

Task 2.2.2: Report validation
- Time: 1.5h
- Deps: 2.2.1
- Files: app/admin/report_service.py
- Failing tests: tests/unit/test_admin_services.py::test_report_reason_category_validation

Task 2.2.3: Rate limiting
- Time: 1h
- Deps: 2.2.2
- Files: app/routes.py
- Failing tests: tests/integration/test_admin_security.py::test_report_rate_limit_enforced

Task 2.2.4: Admin report listing
- Time: 2.5h
- Deps: 2.2.3
- Files: app/admin/routes.py
- Failing tests: tests/integration/test_admin_api_integration.py::test_admin_can_list_reports

2.3 Review Workflow API

Task 2.3.1: Review endpoint
- Time: 3h
- Deps: 2.2.4
- Files: app/admin/routes.py
- Failing tests: tests/integration/test_admin_api_integration.py::test_review_creates_audit_log_entry

Task 2.3.2: Post deletion
- Time: 2.5h
- Deps: 2.3.1
- Files: app/admin/moderation_service.py
- Failing tests: tests/integration/test_admin_api_integration.py::test_delete_post_preserves_audit_log_and_consistency

Task 2.3.3: Dismiss report
- Time: 1.5h
- Deps: 2.3.2
- Files: app/admin/moderation_service.py
- Failing tests: tests/integration/test_admin_api_integration.py::test_dismiss_updates_status_and_audit

Task 2.3.4: Bulk actions
- Time: 2h
- Deps: 2.3.3
- Files: app/admin/routes.py
- Failing tests: tests/integration/test_admin_api_integration.py::test_bulk_actions_respect_rbac_and_audit

2.4 WebSocket Integration

Task 2.4.1: Admin WebSocket events
- Time: 2h
- Deps: 2.3.4
- Files: app/admin/websocket.py
- Failing tests: tests/integration/test_admin_websocket.py::test_admin_event_broadcast

Task 2.4.2: Report status updates
- Time: 1.5h
- Deps: 2.4.1
- Files: app/admin/websocket.py
- Failing tests: tests/integration/test_admin_websocket.py::test_status_sync

Task 2.4.3: Presence tracking
- Time: 1h
- Deps: 2.4.2
- Files: app/admin/websocket.py
- Failing tests: tests/integration/test_admin_websocket.py::test_presence_rooms

Task 2.4.4: Integrate with existing WebSocket
- Time: 1.5h
- Deps: 2.4.3
- Files: app/websocket.py
- Failing tests: e2e/test_admin_realtime.spec.js::admin_sees_live_updates

Phase 3: Frontend Development (Week 3)

3.1 Admin Dashboard Structure

Task 3.1.1: dashboard.html
- Time: 3h
- Deps: 2.4.4
- Files: static/admin/dashboard.html
- Failing tests: e2e/test_admin_accessibility.spec.js::admin_dashboard_is_accessible

Task 3.1.2: navigation.js
- Time: 2h
- Deps: 3.1.1
- Files: static/admin/components/navigation.js
- Failing tests: e2e/test_admin_login.spec.js::nav_requires_auth_to_access_pages

Task 3.1.3: admin.css
- Time: 4h
- Deps: 3.1.2
- Files: static/admin/css/admin.css
- Failing tests: e2e/test_admin_accessibility.spec.js::contrast_and_focus_visible

Task 3.1.4: responsive.css
- Time: 2h
- Deps: 3.1.3
- Files: static/admin/css/responsive.css
- Failing tests: e2e/test_admin_frontend.spec.js::layout_adapts_to_mobile

3.2 Authentication Interface

Task 3.2.1: login.html
- Time: 2h
- Deps: 3.1.4
- Files: static/admin/login.html
- Failing tests: e2e/test_admin_login.spec.js::login_flow_with_totp

Task 3.2.2: auth.js (CSRF header injection)
- Time: 2.5h
- Deps: 3.2.1
- Files: static/admin/js/auth.js
- Failing tests: e2e/test_admin_login.spec.js::csrf_header_mandatory_on_post

Task 3.2.3: session-manager.js
- Time: 1.5h
- Deps: 3.2.2
- Files: static/admin/components/session-manager.js
- Failing tests: e2e/test_admin_login.spec.js::logout_clears_tokens

Task 3.2.4: logout
- Time: 1h
- Deps: 3.2.3
- Files: static/admin/js/auth.js
- Failing tests: e2e/test_admin_login.spec.js::refresh_rotation_and_logout_revocation

3.3 Report Management Interface

Task 3.3.1: report-list.js
- Time: 3h
- Deps: 3.2.4
- Files: static/admin/components/report-list.js
- Failing tests: e2e/test_admin_reports.spec.js::list_reports_pagination

Task 3.3.2: report-filter.js
- Time: 2.5h
- Deps: 3.3.1
- Files: static/admin/components/report-filter.js
- Failing tests: e2e/test_admin_reports.spec.js::filter_by_reason_and_status

Task 3.3.3: report-review.js
- Time: 3h
- Deps: 3.3.2
- Files: static/admin/components/report-review.js
- Failing tests: e2e/test_admin_moderation.spec.js::review_actions_create_audit

Task 3.3.4: bulk-actions.js
- Time: 2h
- Deps: 3.3.3
- Files: static/admin/components/bulk-actions.js
- Failing tests: e2e/test_admin_moderation.spec.js::bulk_respects_rbac_and_csrf

3.4 Real-time Updates

Task 3.4.1: websocket-client.js
- Time: 2h
- Deps: 3.3.4
- Files: static/admin/js/websocket-client.js
- Failing tests: e2e/test_admin_realtime.spec.js::socket_auth_and_subscribe

Task 3.4.2: live-updates.js
- Time: 1.5h
- Deps: 3.4.1
- Files: static/admin/components/live-updates.js
- Failing tests: e2e/test_admin_realtime.spec.js::status_updates_render

Task 3.4.3: presence-indicators.js
- Time: 1h
- Deps: 3.4.2
- Files: static/admin/components/presence-indicators.js
- Failing tests: e2e/test_admin_realtime.spec.js::presence_room_counts

Task 3.4.4: notifications.js
- Time: 1.5h
- Deps: 3.4.3
- Files: static/admin/components/notifications.js
- Failing tests: e2e/test_admin_frontend.spec.js::non_intrusive_notifications

Phase 4: Testing & Quality Assurance (Week 4)

4.1 Unit Testing

- Maintain flake8 gate; fix all lint before passing.

Task 4.1.1: Model unit tests
- Time: 4h
- Deps: 3.4.4
- Files: tests/unit/test_admin_models.py
- Requirements: >95% coverage

Task 4.1.2: Service unit tests
- Time: 5h
- Deps: 4.1.1
- Files: tests/unit/test_admin_services.py

Task 4.1.3: API unit tests
- Time: 4h
- Deps: 4.1.2
- Files: tests/unit/test_admin_api.py

Task 4.1.4: Auth unit tests
- Time: 3h
- Deps: 4.1.3
- Files: tests/unit/test_admin_auth.py

4.2 Integration Testing

Task 4.2.1: DB integration
- Time: 3h
- Deps: 4.1.4
- Files: tests/integration/test_admin_database.py

Task 4.2.2: API integration
- Time: 4h
- Deps: 4.2.1
- Files: tests/integration/test_admin_api_integration.py

Task 4.2.3: WebSocket integration
- Time: 3h
- Deps: 4.2.2
- Files: tests/integration/test_admin_websocket.py

Task 4.2.4: Security integration
- Time: 3h
- Deps: 4.2.3
- Files: tests/integration/test_admin_security.py

4.3 End-to-End Testing (Aligned with e2e/AGENTS.md)

- Follow mandatory process in e2e/AGENTS.md.
- Use Playwright + axe-core plugin for a11y.

Task 4.3.1: Admin login E2E
- Time: 3h
- Deps: 4.2.4
- Files: e2e/test_admin_login.spec.js

Task 4.3.2: Reports E2E
- Time: 4h
- Deps: 4.3.1
- Files: e2e/test_admin_reports.spec.js

Task 4.3.3: Moderation E2E
- Time: 3h
- Deps: 4.3.2
- Files: e2e/test_admin_moderation.spec.js

Task 4.3.4: Real-time E2E
- Time: 3h
- Deps: 4.3.3
- Files: e2e/test_admin_realtime.spec.js

Task 4.3.5: Accessibility E2E
- Time: 2h
- Deps: 4.3.4
- Files: e2e/test_admin_accessibility.spec.js
- Success: axe-core violations == []

4.4 Performance Testing (Locust/K6)

Task 4.4.1: Locust setup
- Time: 2h
- Deps: 4.3.5
- Files: tests/performance/locustfile.py
- Benchmarks: p95 < 200ms for admin APIs; WS latency < 50ms

Task 4.4.2: k6 scripts
- Time: 2h
- Deps: 4.4.1
- Files: tests/performance/k6/admin.js
- Thresholds: http_req_duration{p(95)} < 200

Task 4.4.3: Frontend perf
- Time: 1.5h
- Deps: 4.4.2
- Files: tests/performance/test_admin_frontend.py

Task 4.4.4: WebSocket perf
- Time: 1.5h
- Deps: 4.4.3
- Files: tests/performance/test_admin_websocket.py

Phase 5: DevOps & Deployment (Week 5)

5.1 Docker Configuration

Task 5.1.1: Dockerfile admin deps
- Time: 2h
- Deps: 4.4.4
- Files: Dockerfile
- Add: pyotp, python-fido2/web-authn libs, prometheus_client

Task 5.1.2: docker-compose.yml
- Time: 1.5h
- Deps: 5.1.1
- Files: docker-compose.yml + docker-compose.staging.yml
- Add: redis service; PROMETHEUS_ENABLED

Task 5.1.3: Env variables
- Time: 1h
- Deps: 5.1.2
- Files: .env.example
- Add flags listed above; no secrets committed

Task 5.1.4: deploy-admin.sh
- Time: 2h
- Deps: 5.1.3
- Files: scripts/deploy-admin.sh

5.2 CI/CD Pipeline Updates (flake8/ESLint gates)

Task 5.2.1: CI admin tests
- Time: 2h
- Deps: 5.1.4
- Files: .github/workflows/ci.yml
- Add jobs: flake8 ., eslint ., pytest, playwright (headless); act-local testing

Task 5.2.2: Security tooling (Trivy, Bandit, CodeQL)
- Time: 2h
- Deps: 5.2.1
- Files: .github/workflows/ci.yml or security.yml
- Add steps from snippets; fail on HIGH/CRITICAL

Task 5.2.3: OpenAPI contract (Dredd/Schemathesis)
- Time: 2h
- Deps: 5.2.2
- Files: .github/workflows/ci.yml
- Add: dredd run, schemathesis run --checks=all

Task 5.2.4: Monitoring & alerting
- Time: 1.5h
- Deps: 5.2.3
- Files: monitoring/admin-dashboard.json; workflows

5.3 Production Deployment

Task 5.3.1: Migrations
- Time: 2h
- Deps: 5.2.4
- Files: migrations/versions/

Task 5.3.2: Production security
- Time: 2h
- Deps: 5.3.1
- Files: config/production.py
- Enforce: HSTS, secure cookies, CSRF required, rate limiting

Task 5.3.3: Monitoring
- Time: 1.5h
- Deps: 5.3.2
- Files: monitoring/admin-dashboard.json

Task 5.3.4: Deploy
- Time: 3h
- Deps: 5.3.3
- Files: Production deployment; smoke tests

5.4 Backup and Recovery (with encryption)

Task 5.4.1: Backup strategy with encryption
- Time: 2h
- Deps: 5.3.4
- Files: scripts/backup-admin-data.sh
- Use: pg_dump | gpg (or KMS) encrypt; store offsite; verify integrity

Task 5.4.2: Disaster recovery runbook
- Time: 1.5h
- Deps: 5.4.1
- Files: docs/disaster-recovery.md

Task 5.4.3: Recovery tests
- Time: 2h
- Deps: 5.4.2
- Files: tests/integration/test_backup_recovery.py

Task 5.4.4: Backup monitoring
- Time: 1h
- Deps: 5.4.3
- Files: monitoring/backup-alerts.yml

Phase 6: Documentation & Training (Week 6)

6.1 Technical Docs

Task 6.1.1: Admin API docs
- Time: 4h
- Deps: 5.4.4
- Files: docs/admin-api.md
- Include: OpenAPI spec reference

Task 6.1.2: DB schema docs
- Time: 2h
- Deps: 6.1.1
- Files: docs/admin-database-schema.md

Task 6.1.3: Security docs (MFA, JWT, CSRF)
- Time: 3h
- Deps: 6.1.2
- Files: docs/admin-security.md

Task 6.1.4: Deployment guide
- Time: 2h
- Deps: 6.1.3
- Files: docs/admin-deployment-guide.md

6.2 User Docs

Task 6.2.1: Admin user guide
- Time: 3h
- Deps: 6.1.4
- Files: docs/admin-user-guide.md

Task 6.2.2: Moderation guidelines
- Time: 2.5h
- Deps: 6.2.1
- Files: docs/moderation-guidelines.md

Task 6.2.3: Troubleshooting guide
- Time: 2h
- Deps: 6.2.2
- Files: docs/admin-troubleshooting.md

Task 6.2.4: FAQ
- Time: 1.5h
- Deps: 6.2.3
- Files: docs/admin-faq.md

6.3 Training

Task 6.3.1: Training videos
- Time: 6h
- Deps: 6.2.4
- Files: training/videos/

Task 6.3.2: Interactive tutorials
- Time: 4h
- Deps: 6.3.1
- Files: training/interactive/

Task 6.3.3: Certification
- Time: 3h
- Deps: 6.3.2
- Files: training/certification/

Task 6.3.4: Onboarding checklist
- Time: 1.5h
- Deps: 6.3.3
- Files: training/onboarding-checklist.md

6.4 Maintenance Docs

Task 6.4.1: Maintenance procedures
- Time: 2h
- Deps: 6.3.4
- Files: docs/admin-maintenance.md

Task 6.4.2: Monitoring guide
- Time: 1.5h
- Deps: 6.4.1
- Files: docs/admin-monitoring.md

Task 6.4.3: Update procedures
- Time: 2h
- Deps: 6.4.2
- Files: docs/admin-updates.md

Task 6.4.4: Knowledge base
- Time: 2.5h
- Deps: 6.4.3
- Files: docs/knowledge-base/

Admin Provisioning Lifecycle

- Request approval workflow documented; least-privilege roles; MFA enrollment before activation.
- Periodic access review; auto-disable inactive accounts; audit trail for all changes.

Data Retention Policies

- Reports: 180 days
- Audit logs: 1 year (hash chain preserved); offsite signed snapshots
- Backups: 30 days (encrypted)
- Logs: 30 days (anonymized, no IP unless security incident)

Incident Response Runbooks

- docs/incident-response.md: triage, containment, eradication, recovery, postmortem; contacts; on-call rotation; escalation matrix.
- Tests: tests/integration/test_incident_response_docs.py ensures presence of steps.

CI/CD Gates and Commands

- flake8 . (Python) — mandatory pass
- eslint . (JS) — mandatory pass
- pytest tests -q — all unit/integration
- docker compose run web pytest (backend)
- playwright test (E2E) — aligned with e2e/AGENTS.md
- schemathesis run specs/admin-openapi.yaml --checks=all
- dredd specs/admin-openapi.yaml $BASE_URL
- bandit -r app -ll
- trivy fs . && trivy image jeet-social:latest
- codeql analyze — scheduled and on PR
- act -W .github/workflows/ci.yml — local CI test

Success Metrics

Technical
- Coverage: >95%
- API p95: <200ms
- UI load: <2s
- WS latency: <50ms
- Security: zero critical vulns
- Accessibility: axe violations == []

Business
- Report response <24h
- Moderation accuracy >95%
- Admin workflow time -50%

Risks & Mitigations

- Security breach: MFA+JWT+CSRF, scans, audits
- Performance: Locust/k6 + profiling
- Privacy: strict minimization; periodic purges
- Abuse: RBAC, audit trails, 4-eyes on destructive actions

Notes

- All code must pass flake8.
- Use feature/enable-admin-portal branch; submit PR with all gates passing.
- Do not commit secrets; use env vars.
