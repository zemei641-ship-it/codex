# Project instructions

- Read HANDOFF.md and docs/GDD.md before changing gameplay. docs/IMPLEMENTATION.md separates prototype configuration from source requirements.
- Keep the playable portrait scene and magnetic docking. Do not replace the game with a form/grid dashboard.
- Use the current source GDD, not earlier auto-cooking or coin-selling prototypes. Preserve human art decisions; no automatic image generation.
- Run npm run check and npm test after rule changes. Current baseline is 15 passing tests. Validate important interactions in a browser when supported, and clearly report any unavailable check.
- No runtime dependencies or backend are required. Preview with python3 -m http.server 8765 --bind 0.0.0.0.
- Keep secrets, machine files and browser save data out of commits. The user has explicitly authorized this source and supplied GDD in the public repository zemei641-ship-it/codex.
- Keep updates concise. Do not add new gameplay without user direction, or alter the source GDD to excuse implementation differences.
