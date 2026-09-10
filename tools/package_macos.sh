#!/bin/zsh
# Local preview package using the already-installed official Godot binary.
# This is larger than a release-template export and is ad-hoc signed for local testing.
set -eu
task_root="$(cd -- "$(dirname -- "$0")/.." && pwd)"
task_project="$task_root/fate_reborn_game"
task_app="$task_project/builds/Fate Reborn.app"
mkdir -p "$task_app/Contents/MacOS" "$task_app/Contents/Resources"
"$task_root/Godot.app/Contents/MacOS/Godot" --headless --path "$task_project" --export-pack 'Windows Desktop' "$task_project/builds/FateReborn.pck"
cp "$task_root/Godot.app/Contents/MacOS/Godot" "$task_app/Contents/MacOS/FateReborn"
cp "$task_root/Godot.app/Contents/Resources/GodotLG.icns" "$task_app/Contents/Resources/Game.icns"
cp "$task_project/builds/FateReborn.pck" "$task_app/Contents/Resources/FateReborn.pck"
cp "$task_root/tools/macos_info.plist" "$task_app/Contents/Info.plist"
codesign --force --deep --sign - "$task_app"
codesign --verify --deep --strict "$task_app"
