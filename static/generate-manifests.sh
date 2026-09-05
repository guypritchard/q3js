#!/bin/sh
set -eu

data_directories="${Q3JS_DATA_DIRECTORY:-/data} ${Q3JS_CUSTOM_DATA_DIRECTORY:-}"
manifest_directory="${Q3JS_MANIFEST_DIRECTORY:-/tmp/q3js-manifests}"
games_path="$manifest_directory/.games"

mkdir -p "$manifest_directory"
: > "$games_path"

for data_directory in $data_directories; do
    [ -d "$data_directory" ] || continue
    for game_directory in "$data_directory"/*; do
        [ -d "$game_directory" ] || continue
        game="${game_directory##*/}"
        if ! printf '%s\n' "$game" | grep -Eq '^[A-Za-z0-9][A-Za-z0-9_-]*$'; then
            printf 'Ignoring unsupported game directory: %s\n' "$game" >&2
            continue
        fi
        printf '%s\n' "$game" >> "$games_path"
    done
done

sort -u "$games_path" -o "$games_path"
while IFS= read -r game; do
    files_path="$manifest_directory/.$game.files"
    manifest_path="$manifest_directory/$game.json"
    temporary_path="$manifest_path.tmp"
    : > "$files_path"

    for data_directory in $data_directories; do
        game_directory="$data_directory/$game"
        [ -d "$game_directory" ] || continue
        for file in "$game_directory"/*.pk3; do
            [ -s "$file" ] || continue
            filename="${file##*/}"
            if ! printf '%s\n' "$filename" | grep -Eq '^[A-Za-z0-9][A-Za-z0-9._-]*\.pk3$'; then
                printf 'Ignoring unsupported PK3 filename in %s: %s\n' "$game" "$filename" >&2
                continue
            fi
            printf '%s\n' "$filename" >> "$files_path"
        done
    done

    sort -u "$files_path" -o "$files_path"
    printf '{"files":[' > "$temporary_path"
    separator=""
    while IFS= read -r filename; do
        [ -n "$filename" ] || continue
        printf '%s"%s"' "$separator" "$filename" >> "$temporary_path"
        separator=","
    done < "$files_path"
    printf ']}\n' >> "$temporary_path"
    mv "$temporary_path" "$manifest_path"
    rm "$files_path"
done < "$games_path"

rm "$games_path"
