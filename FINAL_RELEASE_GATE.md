# Final Release Gate

Date: 2026-04-03
Workspace: `F:\GraduationProject`

This gate records the final backend release-readiness checks that were executed locally against the current codebase.

## Status

| # | Gate | Status | Evidence |
|---|------|--------|----------|
| 1 | Clean build | PASS | `dotnet build Baytology.slnx --no-restore -warnaserror -m:1` |
| 2 | Domain/unit tests | PASS | `Baytology.Domain.Tests: 34/34` |
| 3 | Application/component tests | PASS | `Baytology.Application.Tests: 39/39` |
| 4 | API integration tests | PASS | `Baytology.Api.Tests: 25/25` |
| 5 | Migration/model parity | PASS | `MigrationsParityTests` + runtime startup no longer fails with pending model changes |
| 6 | Production startup smoke | PASS | `ProductionStartupSmokeTests` |
| 7 | Real runtime HTTP smoke | PASS | Kestrel booted on local SQL Server LocalDB and completed register/login/property/booking/refresh flows |
| 8 | Lightweight load/performance smoke | PASS | 40 concurrent requests on public + authenticated endpoints with 0 failures |

## Current Automated Totals

- `Baytology.Api.Tests`: `25/25`
- `Baytology.Application.Tests`: `45/45`
- `Baytology.Domain.Tests`: `34/34`
- Total: `104/104`

## Runtime Smoke Evidence

Executed against the real API process on:

- `http://127.0.0.1:5077`
- `ASPNETCORE_ENVIRONMENT=Development`
- SQL Server LocalDB
- RabbitMQ disabled
- Paymob local simulation enabled
- property CSV seeding disabled for speed

Verified flow:

1. `POST /api/identity/register` for Agent
2. `POST /api/identity/register` for Buyer
3. `POST /api/identity/token/generate` for both users
4. `POST /api/v1/Properties` as Agent
5. `GET /api/identity/me` as Buyer
6. `POST /api/v1/Bookings` as Buyer
7. `POST /api/identity/token/refresh`

Observed successful runtime results:

- property created
- booking created
- payment created
- dev checkout redirect returned
- refresh token flow returned a fresh access token

## Load Smoke Evidence

Local load smoke results:

- `GET /api/v1/Properties`
  - requests: `40`
  - workers: `10`
  - failures: `0`
  - avg: `35.94 ms`
  - p95: `136.93 ms`
  - max: `138.37 ms`
- `GET /api/identity/me`
  - requests: `40`
  - workers: `10`
  - failures: `0`
  - avg: `23.43 ms`
  - p95: `55.52 ms`
  - max: `56.6 ms`

## Fixes Closed During Release Gate

- Added missing EF migration for `AppUser.IsDeleted`.
- Added migration parity test so model drift is caught by tests.
- Fixed SQL retry strategy incompatibility with manual transactions in `IdentityService.RegisterUserAsync`.
- Fixed the same SQL retry strategy issue in `CreateBookingCommandHandler`.
- Added explicit production startup smoke coverage.
- Disabled test parallelization in API integration assembly to remove nondeterministic host/env collisions.
- Hardened post-commit AI/conversation/payment side-effects so delivery failures do not surface as false request failures after data is already saved.
- Centralized RabbitMQ queue names in backend configuration instead of scattering hard-coded queue names through the outbox publisher path.
- Hardened the Paymob gateway call path to use per-request authorization headers and validate the shape of the gateway response before accepting it.

## Remaining Deployment-Only Considerations

The codebase release gate is green locally. The following are still environment-owned checks, not code blockers:

- real SMTP server reachability
- real RabbitMQ reachability if enabled in deployment
- real external AI/LM Studio endpoint reachability over Tailscale
- production host sizing and long-duration load testing under expected traffic
