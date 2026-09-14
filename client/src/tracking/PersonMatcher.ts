export interface TrackCenter {
  x: number;
  y: number;
}

const MATCH_RADIUS = 0.32;
const STALE_MS = 900;

interface Track {
  x: number;
  y: number;
  lastSeen: number;
}

export class PersonMatcher {
  private readonly tracks = new Map<number, Track>();

  assign(centers: TrackCenter[], now: number, maxPersons: 1 | 2): number[] {
    for (const [id, track] of this.tracks) {
      if (now - track.lastSeen > STALE_MS || id > maxPersons) {
        this.tracks.delete(id);
      }
    }

    if (centers.length === 0) {
      return [];
    }

    if (this.tracks.size === 0) {
      const order = centers
        .map((center, index) => ({ index, x: center.x }))
        .sort((a, b) => a.x - b.x);
      const ids = new Array<number>(centers.length).fill(1);
      order.forEach((item, rank) => {
        const id = Math.min(maxPersons, rank + 1) as 1 | 2;
        ids[item.index] = id;
        const center = centers[item.index];
        this.tracks.set(id, { x: center.x, y: center.y, lastSeen: now });
      });
      return ids;
    }

    const used = new Set<number>();
    const ids = new Array<number>(centers.length).fill(0);
    const remaining = centers.map((center, index) => ({ center, index }));

    remaining.sort((a, b) => {
      return nearestDistance(a.center, this.tracks) - nearestDistance(b.center, this.tracks);
    });

    for (const item of remaining) {
      let bestId = 0;
      let bestDist = MATCH_RADIUS;
      for (const [id, track] of this.tracks) {
        if (used.has(id)) {
          continue;
        }
        const dist = hypot(item.center, track);
        if (dist < bestDist) {
          bestDist = dist;
          bestId = id;
        }
      }
      if (bestId === 0) {
        bestId = firstFreeId(this.tracks, used, maxPersons);
      }
      if (bestId === 0) {
        continue;
      }
      used.add(bestId);
      ids[item.index] = bestId;
      this.tracks.set(bestId, { x: item.center.x, y: item.center.y, lastSeen: now });
    }

    return ids.map((id) => (id === 0 ? 1 : id));
  }

  reset(): void {
    this.tracks.clear();
  }
}

function nearestDistance(center: TrackCenter, tracks: Map<number, Track>): number {
  let best = Number.POSITIVE_INFINITY;
  for (const track of tracks.values()) {
    best = Math.min(best, hypot(center, track));
  }
  return best;
}

function firstFreeId(tracks: Map<number, Track>, used: Set<number>, maxPersons: 1 | 2): number {
  for (let id = 1; id <= maxPersons; id += 1) {
    if (!tracks.has(id) && !used.has(id)) {
      return id;
    }
  }
  for (let id = 1; id <= maxPersons; id += 1) {
    if (!used.has(id)) {
      return id;
    }
  }
  return 0;
}

function hypot(a: TrackCenter, b: TrackCenter): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}
