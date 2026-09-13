# Q3JS original game overlay sources

This tree contains only original Q3JS material and references to resources supplied by an
operator's licensed base game. GUY keeps its Q3JS bot identity and trusted gameplay marker,
but uses the installed stock `sarge/default` player resources. The overlay does not bundle
or generate a GUY player model.

From `game/server`, `node scripts/package-game.mjs` builds a deterministic,
content-addressed PK3 in `dist/game/baseq3`. Set `QAGAME_QVM` to select the qagame QVM;
otherwise the local map build output is used. This overlay is not a standalone game:
operator-provided Quake III base assets remain required.
