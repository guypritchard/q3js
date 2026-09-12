# Q3JS original game overlay sources

This tree contains only original Q3JS material and references to resources supplied by an
operator's licensed base game. Run `node generate-guy-model.mjs` to reproduce the static,
segmented GUY hover-android model. The generated MD3/TGA files are intentionally not hand
edited; every animation maps to its single valid frame. After regeneration, copy
`lower.md3`, `upper.md3`, `head.md3`, and `guy.tga` to
`../../website/public/models/players/guy/`; the Bot Lab model test enforces byte equality.

From `game/server`, `node scripts/package-game.mjs` builds a deterministic,
content-addressed PK3 in `dist/game/baseq3`. Set `QAGAME_QVM` to select the qagame QVM;
otherwise the local map build output is used. This overlay is not a standalone game:
operator-provided Quake III base assets remain required.
