#!/usr/bin/env bash
# Usage: bench/docker_measure.sh <git-ref> <out-file> [runs]
# Builds backend/ from a CLEAN checkout of <git-ref> (no local .venv/.env leaks), --no-cache,
# and records build seconds and image size.
set -u
ref=$1; out=$2; runs=${3:-3}
repo=$(git rev-parse --show-toplevel)
tmp=$(mktemp -d)
git -C "$repo" worktree add -q --detach "$tmp" "$ref" || exit 1
tag="acg-measure"
{
  echo "# docker build measurement: ref=$ref ($(git -C "$tmp" rev-parse --short HEAD)) date=$(date -Iseconds)"
  echo "# cmd: docker build --no-cache -t $tag backend   (clean worktree checkout)"
  for i in $(seq 1 "$runs"); do
    s=$(date +%s)
    docker build --no-cache -t "$tag" "$tmp/backend" >/dev/null 2>&1; rc=$?
    e=$(date +%s)
    echo "run$i exit=$rc build_seconds=$((e-s))"
  done
  docker image inspect "$tag" --format 'inspect_Size_bytes: {{.Size}}'
  docker images "$tag" --format 'docker_images_SIZE: {{.Size}}'
  echo "app_dir_contents: $(docker run --rm --entrypoint sh "$tag" -c 'ls -A /app | tr "\n" " "')"
} | tee "$out"
git -C "$repo" worktree remove --force "$tmp"
