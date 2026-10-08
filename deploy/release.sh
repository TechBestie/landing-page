#!/usr/bin/env bash
# Runs on the target server (piped over SSH by GitHub Actions) after the new image
# has been `docker load`ed as $IMAGE:$TAG and docker-compose.yml copied to $DIR.
#
# Switches $IMAGE:current to the new build, waits for the container health check
# and rolls back to the previous build if it never becomes healthy.
#
#   TAG        commit sha (image tag)
#   IMAGE      techbestie-dev | techbestie
#   CONTAINER  techbestie-dev-app | techbestie-app
#   DIR        /opt/techbestie-dev | /opt/techbestie
set -euo pipefail

: "${TAG:?}" "${IMAGE:?}" "${CONTAINER:?}" "${DIR:?}"
cd "$DIR"

[ -f .env ] || { echo "::error::$DIR/.env is missing (see .env.example)" >&2; exit 1; }
docker image inspect "$IMAGE:$TAG" >/dev/null

# The app runs as the image's "node" user (uid 1000) and writes uploads here.
install -d -o 1000 -g 1000 uploads

PREV="$(docker image inspect "$IMAGE:current" --format '{{.Id}}' 2>/dev/null || true)"

docker tag "$IMAGE:$TAG" "$IMAGE:current"
docker compose up -d --remove-orphans
docker compose up -d --force-recreate --no-deps app

status=starting
for _ in $(seq 1 40); do
  status="$(docker inspect -f '{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null || echo missing)"
  [ "$status" = healthy ] && break
  [ "$status" = unhealthy ] && break
  sleep 3
done

if [ "$status" != healthy ]; then
  echo "::error::$CONTAINER is $status, rolling back" >&2
  docker logs --tail 100 "$CONTAINER" >&2 || true
  if [ -n "$PREV" ]; then
    docker tag "$PREV" "$IMAGE:current"
    docker compose up -d --force-recreate --no-deps app
  fi
  exit 1
fi

echo "$TAG" > RELEASE
echo "Released $TAG"

# Keep the three most recent builds for manual rollback, drop older ones.
docker image ls "$IMAGE" --format '{{.CreatedAt}}\t{{.Repository}}:{{.Tag}}' \
  | grep -v ':current$' | sort -r | tail -n +4 | cut -f2 \
  | xargs -r docker rmi >/dev/null 2>&1 || true
