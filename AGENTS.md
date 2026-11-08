# AGENTS.md

The project root is `SIMPRESO/` (the workspace opens at its parent). Run every command from `SIMPRESO/`.

## Stack

- Laravel 13 skeleton (`laravel/framework ^13.17`), PHP 8.3+, Vite 8 + Tailwind 4, PHPUnit 12 (not Pest), Pint.
- Frontend is Inertia v3 + React 19 + TypeScript (`inertiajs/inertia-laravel ^3.7`, `@inertiajs/react ^3.11`).
- Only `GET /` exists, rendering the Inertia page `resources/js/pages/welcome.tsx`. No API routes; health check is `/up`.

## Commands

- Initial setup or reset after dependency changes: `composer setup` (installs Composer deps, copies `.env`, generates key, migrates, runs `npm install --ignore-scripts`, builds assets).
- Full dev loop (HTTP server + queue listener + Vite): `composer dev` (= `php artisan dev`). On Windows this fans out with `concurrently`.
- Vite only: `npm run dev`; production assets: `npm run build`; TypeScript check: `npm run typecheck`.
- Inertia pages live in `resources/js/pages/` (kebab or PascalCase names; resolver matches `./pages/${name}.tsx`). Shared props go in `app/Http/Middleware/HandleInertiaRequests.php`.
- Tests: `composer test` (clears config, then runs `php artisan test`).
  - Single test: `php artisan test --filter=ExampleTest` or `php artisan test tests/Feature/ExampleTest.php`.
- Format: `vendor/bin/pint`; check without writing with `vendor/bin/pint --test`. No static analysis or JS test runner is configured.

## Environment quirks

- Local `.env` uses PostgreSQL (`DB_CONNECTION=pgsql`, database `db-simpreso`), while `.env.example` defaults to SQLite. `database/database.sqlite` exists but is unused under the current `.env`.
- `phpunit.xml` forces SQLite `:memory:` for tests regardless of `.env`, so keep migrations and queries portable across PostgreSQL and SQLite.
- `.npmrc` sets `ignore-scripts=true`; install Node deps with `npm install --ignore-scripts` (keep the flag).

## Conventions

- Tests are PHPUnit classes extending `Tests\TestCase` with `test_*` methods; do not add Pest unless asked.
- Models use Laravel 13 attributes: `User` declares `#[Fillable([...])]` and `#[Hidden([...])]` instead of `$fillable`/`$hidden` properties. Follow this for new models.
- `CLAUDE.md` still holds Laravel Boost bootstrap instructions. Boost is not installed in `composer.lock`; do not run `boost:install` as part of normal work.
