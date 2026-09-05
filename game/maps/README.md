# Q3JS Transit Hub

`generate-map.mjs` creates the 16-bay, skybox-backed, damage-free Transit Hub used for live arena handoffs.
It uses stock Quake III textures and includes the repository-built game and cgame QVMs.

Build it with a current `q3map2` and legally obtained Quake III data:

```sh
Q3MAP2=/path/to/q3map2 \
Q3JS_DATA_DIR=/path/to/Quake\ 3\ Arena \
Q3JS_QVM_DIR=/path/to/baseq3/vm \
./game/maps/build.sh
```

The output is `game/maps/dist/q3js-transit-hub-v007.pk3`. Increment the filename for
each published revision because static PK3 responses are immutable. Bot navigation is intentionally
not included; the hub server runs with `bot_enable 0` and `bot_minplayers 0`.
