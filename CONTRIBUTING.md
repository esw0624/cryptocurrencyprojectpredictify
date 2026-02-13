# Contributing

Thanks for contributing to `cryptocurrencyproject`.

## Development setup

1. Install Node.js 20+.
2. Install dependencies:

```bash
npm install
```

## Local quality checks

Run all checks before opening a pull request:

```bash
npm run lint
npm run format
npm run typecheck
npm test
```

If formatting fails, run:

```bash
npm run format:write
```

## Prompt-driven iteration workflow

For prompt-assisted or model-guided changes, submit iterations as small, reviewable pull requests:

1. Capture the prompt(s) and expected outcome in the PR description.
2. Link to any issue filed via the bug report or feature prompt templates.
3. Include test evidence from lint/typecheck/test commands.
4. Add a model-impact note covering feature changes, behavior changes, or a clear statement of no impact.
5. Keep each PR scoped to one prompt-driven objective to simplify rollback and evaluation.

## Pull request checklist

- Use the repository PR template and complete all required sections.
- Ensure CI passes (lint, format check, typecheck, test).
- Update docs/tests when behavior changes.
