# Contributing

## Setup
- Follow docs/TECH_SETUP.md to install dependencies and configure environment variables.

## Branching
- Create a feature branch from master.
- Keep PRs small and focused.

## Development Notes
- Prefer small, composable React components.
- Keep UI state in app/page.tsx unless it is clearly reusable.
- Add guarded fallbacks when data can be missing.

## Testing
- Run `node tests/run-tests.js` before opening a PR.

## Style
- Use the design tokens in app/globals.css and theme config.
- Avoid hard-coded colors where a token exists.
- Keep copy concise and consistent with existing tone.

## Pull Requests
- Include a short summary and screenshots for UI changes.
- Mention any tradeoffs or TODOs explicitly.
