#!/bin/sh
set -eu

temporary_directory="$(mktemp -d)"
trap 'rm -rf "$temporary_directory"' EXIT

data_directory="$temporary_directory/data"
manifest_directory="$temporary_directory/manifests"
custom_directory="$temporary_directory/custom"
mkdir -p "$data_directory/baseq3" "$data_directory/cpma" "$data_directory/osp" "$data_directory/bad.name"
mkdir -p "$custom_directory/baseq3"

printf 'stock' > "$data_directory/baseq3/pak0.pk3"
: > "$data_directory/baseq3/q3js-transit-hub-v001.pk3"
printf 'cpma' > "$data_directory/cpma/z-cpma-pak153.pk3"
printf 'osp' > "$data_directory/osp/osp-pak0.pk3"
: > "$data_directory/osp/readme.txt"
: > "$data_directory/bad.name/ignored.pk3"
printf 'hub' > "$custom_directory/baseq3/q3js-transit-hub-v007.pk3"

Q3JS_DATA_DIRECTORY="$data_directory" \
Q3JS_MANIFEST_DIRECTORY="$manifest_directory" \
Q3JS_CUSTOM_DATA_DIRECTORY="$custom_directory" \
sh "$(dirname "$0")/../generate-manifests.sh"

[ "$(cat "$manifest_directory/baseq3.json")" = '{"files":["pak0.pk3","q3js-transit-hub-v007.pk3"]}' ]
[ "$(cat "$manifest_directory/cpma.json")" = '{"files":["z-cpma-pak153.pk3"]}' ]
[ "$(cat "$manifest_directory/osp.json")" = '{"files":["osp-pak0.pk3"]}' ]
[ ! -e "$manifest_directory/bad.name.json" ]
