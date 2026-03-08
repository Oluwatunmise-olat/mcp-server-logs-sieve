# Contributing

Thanks for considering a contribution.

## Quick start

```bash
npm install
npm run build
npm run test
```

## Local development

Run TypeScript build in watch mode:

```bash
npm run dev
```

For one-off checks:

```bash
npm run typecheck
npm run lint
npm run test
```

## Project shape

- `src/index.ts`: MCP server bootstrap and tool registration
- `src/tools/`: tool schemas and handlers
- `src/providers/`: provider adapters
- `src/utils/`: parsing, formatting, sanitization helpers
- `tests/`: unit tests

## Contribution guidelines

- Keep changes focused and small.
- Add tests when behavior changes.
- Update docs for user facing changes.
- Avoid provider specific behavior leaking into generic tool contracts.

## Commit and PR

A good PR should include:

- what changed
- why it changed
- how it was tested
- any provider-specific caveats
