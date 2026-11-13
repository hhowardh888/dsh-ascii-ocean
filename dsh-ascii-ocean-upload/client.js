(() => {
  // src/math.ts
  var TAU = Math.PI * 2;
  var clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;
  var rand = (lo, hi) => lo + Math.random() * (hi - lo);
  var randInt = (lo, hi) => Math.floor(rand(lo, hi + 1));
  function smoothstep(e0, e1, x) {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  }
  function angleDiff(a, b) {
    let d = (b - a) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return d;
  }
  function hash3(x, y, z) {
    let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1442695041);
    h = Math.imul(h ^ h >>> 13, 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  var K1 = 1 / 260;
  var K2 = 1 / 310;
  var K3 = 1 / 190;
  var CURRENT_SCALE = 3400;
  function current(x, y, t, out) {
    const a = x * K1 + t * 0.07;
    const b = y * K2 - t * 0.05;
    const c = (x + y) * K3 + t * 0.11;
    out.x = (-K2 * Math.sin(a) * Math.sin(b) + 0.5 * K3 * Math.cos(c)) * CURRENT_SCALE;
    out.y = (-K1 * Math.cos(a) * Math.cos(b) - 0.5 * K3 * Math.cos(c)) * CURRENT_SCALE;
    return out;
  }

  // src/shapes.ts
  function classicHalfWidth(s) {
    if (s < 0.13) return 0.082 * Math.pow(Math.sin(s / 0.13 * Math.PI / 2), 0.95);
    if (s < 0.3) return 0.082 + 0.016 * smoothstep(0.13, 0.3, s);
    if (s < 0.84) return 0.014 + 0.084 * Math.pow(1 - (s - 0.3) / 0.54, 1.25);
    const k = Math.min(1, (s - 0.84) / 0.16);
    return 0.014 * (1 - k) + 9e-3 * Math.sin(k * Math.PI);
  }
  var SHAPES = {
    classic: {
      halfWidth: classicHalfWidth,
      pectoral: [0.18, 0.41, 0.54, 0.225],
      falcate: true,
      pelvic: [0.57, 0.65, 0.69, 0.085],
      caudal: 0.105,
      dorsal: [0.33, 0.47],
      secondDorsal: [0.71, 0.76],
      eye: [0.1, 0.14],
      gills: [0.19, 0.29]
    },
    // Slim neck under a wide, swept-back cephalofoil (drawn in sampleShark),
    // tall first dorsal, long upper tail lobe. The narrow neck makes the head readable at ASCII resolution.
    hammerhead: {
      halfWidth: (s) => {
        if (s < 0.06) return 0.045;
        if (s < 0.3) return 0.045 + 0.061 * smoothstep(0.06, 0.3, s);
        return classicHalfWidth(s) * 0.92;
      },
      head: { span: 0.17, sweep: 0.035, depth: 0.09, notch: 0 },
      pectoral: [0.17, 0.4, 0.5, 0.22],
      falcate: true,
      pelvic: [0.56, 0.63, 0.67, 0.075],
      caudal: 0.11,
      dorsal: [0.28, 0.44],
      secondDorsal: [0.7, 0.74],
      eye: null,
      gills: [0.16, 0.26]
    },
    // Blunt, square snout on a heavy body; barred back. A heavier silhouette than the classic shark.
    tiger: {
      halfWidth: (s) => {
        if (s < 0.13) return 0.1 * Math.pow(Math.sin(s / 0.13 * Math.PI / 2), 0.45);
        if (s < 0.3) return 0.1 + 0.014 * smoothstep(0.13, 0.3, s);
        if (s < 0.84) return 0.019 + 0.095 * Math.pow(1 - (s - 0.3) / 0.54, 1.2);
        const k = Math.min(1, (s - 0.84) / 0.16);
        return 0.019 * (1 - k) + 0.012 * Math.sin(k * Math.PI);
      },
      pectoral: [0.15, 0.42, 0.53, 0.25],
      falcate: true,
      pelvic: [0.57, 0.65, 0.69, 0.085],
      caudal: 0.095,
      dorsal: [0.33, 0.46],
      secondDorsal: [0.71, 0.75],
      eye: [0.08, 0.12],
      gills: [0.19, 0.28]
    },
    // Short rounded head, body done by half-length, then a long ribbon of a
    // tail fin. Broad rounded pectorals, sparse dark markings.
    zebra: {
      halfWidth: (s) => {
        if (s < 0.1) return 0.075 * Math.pow(Math.sin(s / 0.1 * Math.PI / 2), 0.7);
        if (s < 0.28) return 0.075 + 0.025 * smoothstep(0.1, 0.28, s);
        if (s < 0.55) return 0.022 + 0.078 * Math.pow(1 - (s - 0.28) / 0.27, 1.1);
        const k = (s - 0.55) / 0.45;
        return 0.022 * (1 - k * k) + 0.012 * Math.sin(k * Math.PI);
      },
      pectoral: [0.12, 0.3, 0.36, 0.19],
      falcate: false,
      pelvic: [0.42, 0.48, 0.51, 0.065],
      caudal: 0,
      dorsal: [0.36, 0.44],
      secondDorsal: [0.49, 0.53],
      eye: [0.06, 0.09],
      gills: [0.13, 0.2]
    },
    // Great hammerhead: a broader, nearly straight-edged cephalofoil with a notch at the centre,
    // a towering sickle first dorsal (drawn long and bright from above), and an almost straight front edge.
    greathammer: {
      halfWidth: (s) => {
        if (s < 0.05) return 0.04;
        if (s < 0.3) return 0.04 + 0.07 * smoothstep(0.05, 0.3, s);
        return classicHalfWidth(s) * 0.95;
      },
      head: { span: 0.21, sweep: 6e-3, depth: 0.085, notch: 0.014 },
      pectoral: [0.16, 0.38, 0.49, 0.24],
      falcate: true,
      pelvic: [0.55, 0.62, 0.67, 0.085],
      caudal: 0.13,
      dorsal: [0.24, 0.45],
      secondDorsal: [0.68, 0.74],
      eye: null,
      gills: [0.15, 0.25]
    },
    // Shortfin mako: a long conical snout, a torpedo body that narrows hard to the tail stalk,
    // and a tall crescent tail. A narrow, firm body.
    mako: {
      halfWidth: (s) => {
        if (s < 0.17) return 0.088 * Math.pow(Math.sin(s / 0.17 * Math.PI / 2), 1.5);
        if (s < 0.32) return 0.088 + 0.012 * smoothstep(0.17, 0.32, s);
        if (s < 0.86) return 0.014 + 0.086 * Math.pow(1 - (s - 0.32) / 0.54, 1.45);
        const k = Math.min(1, (s - 0.86) / 0.14);
        return 0.014 * (1 - k) + 0.01 * Math.sin(k * Math.PI);
      },
      pectoral: [0.18, 0.4, 0.5, 0.21],
      falcate: true,
      pelvic: [0.58, 0.64, 0.68, 0.06],
      caudal: 0.13,
      dorsal: [0.34, 0.45],
      secondDorsal: [0.76, 0.79],
      eye: [0.11, 0.15],
      gills: [0.2, 0.3]
    },
    // Thresher: a compact body over the front half, then the upper tail lobe as a long whip
    // that's as long as the shark itself. Big eyes, long sickle pectorals, a very flexible tail.
    thresher: {
      halfWidth: (s) => {
        if (s < 0.08) return 0.07 * Math.pow(Math.sin(s / 0.08 * Math.PI / 2), 0.75);
        if (s < 0.2) return 0.07 + 0.02 * smoothstep(0.08, 0.2, s);
        if (s < 0.48) return 0.012 + 0.078 * Math.pow(1 - (s - 0.2) / 0.28, 1.3);
        const k = (s - 0.48) / 0.52;
        return 0.012 * (1 - k) + 6e-3 * Math.sin(k * Math.PI * 0.9) + 2e-3;
      },
      pectoral: [0.12, 0.27, 0.36, 0.2],
      falcate: true,
      pelvic: [0.37, 0.41, 0.44, 0.045],
      caudal: 0,
      dorsal: [0.24, 0.32],
      secondDorsal: [0.45, 0.47],
      eye: [0.05, 0.1],
      gills: [0.11, 0.18]
    },
    // Nurse shark: a blunt, broad head, a heavy flattened body with both dorsals set far back,
    // rounded paddle pectorals, and a long low tail with no lower lobe. A low, rounded profile.
    nurse: {
      halfWidth: (s) => {
        if (s < 0.08) return 0.085 * Math.pow(Math.sin(s / 0.08 * Math.PI / 2), 0.4);
        if (s < 0.3) return 0.085 + 0.02 * smoothstep(0.08, 0.3, s);
        if (s < 0.72) return 0.022 + 0.083 * Math.pow(1 - (s - 0.3) / 0.42, 1.1);
        const k = (s - 0.72) / 0.28;
        return 0.022 * (1 - k * k) + 0.014 * Math.sin(k * Math.PI);
      },
      pectoral: [0.16, 0.34, 0.4, 0.17],
      falcate: false,
      pelvic: [0.45, 0.52, 0.55, 0.075],
      caudal: 0,
      dorsal: [0.5, 0.58],
      secondDorsal: [0.63, 0.69],
      eye: [0.05, 0.075],
      gills: [0.14, 0.22]
    }
  };

  // src/species.ts
  var SPECIES = [
    {
      name: "sardine",
      cruise: 22,
      maxSpeed: 42,
      minSpeed: 11,
      weight: 3,
      schoolSize: [4, 7],
      spacing: [3.4, 2],
      align: 1.8,
      cohesion: 0.65,
      jitter: 6,
      mill: 0,
      verticalDrag: 0.9
    },
    {
      name: "anchovy",
      cruise: 28,
      maxSpeed: 48,
      minSpeed: 14,
      weight: 3,
      schoolSize: [4, 7],
      spacing: [3.2, 1.9],
      align: 3.2,
      cohesion: 0.3,
      jitter: 6,
      mill: 0,
      verticalDrag: 1.4
    },
    {
      name: "silverside",
      cruise: 24,
      maxSpeed: 44,
      minSpeed: 12,
      weight: 3,
      schoolSize: [3, 6],
      spacing: [3.6, 2.1],
      align: 2.4,
      cohesion: 0.55,
      jitter: 6,
      mill: 0,
      verticalDrag: 1.6
    },
    {
      name: "mackerel",
      cruise: 20,
      maxSpeed: 38,
      minSpeed: 10,
      weight: 2,
      schoolSize: [3, 5],
      spacing: [4, 2.2],
      align: 2,
      cohesion: 0.5,
      jitter: 5,
      mill: 0,
      verticalDrag: 2
    },
    {
      name: "goby",
      cruise: 16,
      maxSpeed: 34,
      minSpeed: 7,
      weight: 1,
      schoolSize: [3, 4],
      spacing: [3, 2],
      align: 0.8,
      cohesion: 0.5,
      jitter: 10,
      mill: 0,
      verticalDrag: 0.6
    }
  ];
  var TOTAL_WEIGHT = SPECIES.reduce((sum, s) => sum + s.weight, 0);
  function pickSpecies() {
    let r = Math.random() * TOTAL_WEIGHT;
    for (let i = 0; i < SPECIES.length; i++) {
      r -= SPECIES[i].weight;
      if (r <= 0) return i;
    }
    return 0;
  }

  // src/interaction.ts
  var WaterInteraction = class {
    x = 0;
    y = 0;
    active = false;
    speed = 0;
    influence = 0;
    dwell = 0;
    visited = false;
    marks = [];
    anchorX = 0;
    anchorY = 0;
    sampleAt = 0;
    markAt = -Infinity;
    markX = 0;
    markY = 0;
    sweeps = [];
    update(x, y, active, now) {
      if (!active || !Number.isFinite(x + y + now)) {
        this.active = false;
        this.dwell = 0;
        this.visited = false;
        this.speed = 0;
        this.sweeps.length = 0;
        return;
      }
      const dx = x - this.x, dy = y - this.y;
      const elapsed = now - this.sampleAt;
      if (!this.active || elapsed > 0.5 || elapsed <= 0) {
        this.anchorX = this.markX = x;
        this.anchorY = this.markY = y;
        this.dwell = 0;
        this.visited = false;
        this.speed = 0;
        this.markAt = -Infinity;
        this.sweeps.length = 0;
      } else {
        const speed = Math.min(1400, Math.hypot(dx, dy) / Math.max(0.016, elapsed));
        this.speed += (speed - this.speed) * 0.65;
        if (Math.hypot(x - this.anchorX, y - this.anchorY) > 18) {
          this.anchorX = x;
          this.anchorY = y;
          this.dwell = 0;
          this.visited = false;
        }
        if (Math.hypot(dx, dy) > 0.5 && speed > 10) {
          this.sweeps.push({ fromX: this.x, fromY: this.y, x, y, speed, time: now });
          if (this.sweeps.length > 8) this.sweeps.shift();
        }
      }
      this.x = x;
      this.y = y;
      this.active = true;
      this.sampleAt = now;
    }
    takeSweeps() {
      const sweeps = this.sweeps;
      this.sweeps = [];
      return sweeps;
    }
    contact(x, y, sweep) {
      if (sweep.time - this.markAt < 0.18 || sweep.time - this.markAt < 0.6 && Math.hypot(x - this.markX, y - this.markY) < 16) return;
      this.marks.push({
        x,
        y,
        heading: Math.atan2(sweep.y - sweep.fromY, sweep.x - sweep.fromX),
        age: 0,
        strength: clamp(sweep.speed / 500, 0.45, 1)
      });
      if (this.marks.length > 5) this.marks.shift();
      this.markAt = sweep.time;
      this.markX = x;
      this.markY = y;
    }
    step(dt) {
      this.speed *= Math.exp(-dt * 5);
      const desired = this.active ? 0.2 + clamp(this.speed / 420, 0, 1) * 0.8 : 0;
      this.influence += (desired - this.influence) * (1 - Math.exp(-dt * 16));
      if (this.active && this.speed < 35) this.dwell += dt;
      else this.dwell = 0;
      if (this.marks.length) {
        for (const mark of this.marks) mark.age += dt;
        this.marks = this.marks.filter((mark) => mark.age < 2.2);
      }
    }
    clear() {
      this.active = false;
      this.speed = this.influence = this.dwell = 0;
      this.visited = false;
      this.marks.length = 0;
      this.sweeps.length = 0;
    }
  };

  // src/world.ts
  var SHARK_NODES = 20;
  var DEFAULT_SHARKS = [
    { kind: "classic", size: 1 },
    { kind: "classic", size: 0.7 },
    { kind: "classic", size: 0.84 },
    { kind: "classic", size: 0.77 }
  ];
  var FISH_SEPARATION_K = 420;
  var FISH_ALIGN_K = 1.4;
  var FISH_COHESION_K = 1;
  var FISH_FLEE_K = 1100;
  var BLIND_COS = -0.6;
  var World = class {
    constructor(sharkSpecs = DEFAULT_SHARKS, fishCount, fishSpeed = 1) {
      this.sharkSpecs = sharkSpecs;
      this.fishCount = fishCount;
      this.fishSpeed = fishSpeed;
    }
    sharkSpecs;
    fishCount;
    width = 0;
    height = 0;
    time = 0;
    fish = [];
    sharks = [];
    visitors = [];
    moment = null;
    momentsStarted = 0;
    momentsCompleted = 0;
    events = [];
    pointer = new WaterInteraction();
    curiosity = { sharkId: null, x: 0, y: 0, age: 0, weight: 0 };
    /** Fish neighbourhood radius; the spatial hash bucket size matches it. */
    perception = 60;
    /** Per-species personal space in px (x, y). */
    sepX = [];
    sepY = [];
    foreignSep = 40;
    bucketCols = 0;
    bucketRows = 0;
    bucketHead = new Int32Array(0);
    bucketCount = new Uint16Array(0);
    bucketNext = new Int32Array(0);
    lastSpawn = 0;
    nextSchool = 1;
    nextMomentAt = Infinity;
    nextMomentKind = "crossing";
    nextVisitorID = 1e3;
    tmp = { x: 0, y: 0 };
    /** fishCount overrides the area-based population (the sidebar wants a single small school). */
    /** Fish-only speed multiplier; 1 follows the species cruise speeds. */
    fishSpeed = 1;
    resize(width, height, cellW, cellH) {
      this.clearInteraction();
      const first = this.width === 0;
      const previousWidth = this.width;
      const previousHeight = this.height;
      this.width = width;
      this.height = height;
      this.sepX = SPECIES.map((sp) => sp.spacing[0] * cellW);
      this.sepY = SPECIES.map((sp) => sp.spacing[1] * cellH);
      this.perception = Math.max(cellH * 3, cellW * 5.5);
      this.foreignSep = cellW * 4.5;
      if (first) {
        this.seed();
        return;
      }
      const scaleX = width / previousWidth;
      const scaleY = height / previousHeight;
      const lengthScale = clamp(Math.min(width, height) * 0.41, 140, 460) / clamp(Math.min(previousWidth, previousHeight) * 0.41, 140, 460);
      for (const f of this.fish) {
        f.x = clamp(f.x * scaleX, 0, width);
        f.y = clamp(f.y * scaleY, 0, height);
      }
      for (const shark of [...this.sharks, ...this.visitors]) {
        const oldHeadX = shark.nodes[0];
        const oldHeadY = shark.nodes[1];
        for (let k = 0; k < SHARK_NODES; k++) {
          shark.nodes[k * 2] = oldHeadX * scaleX + (shark.nodes[k * 2] - oldHeadX) * lengthScale;
          shark.nodes[k * 2 + 1] = oldHeadY * scaleY + (shark.nodes[k * 2 + 1] - oldHeadY) * lengthScale;
        }
        shark.length *= lengthScale;
        shark.orbitRadius *= Math.min(width, height) / Math.min(previousWidth, previousHeight);
      }
      if (this.moment?.kind === "visitor" && this.visitors[0]) {
        const visitor = this.visitors[0];
        const remaining = this.moment.direction > 0 ? width + visitor.length * 1.4 - visitor.nodes[0] : visitor.nodes[0] + visitor.length * 1.4;
        this.moment.duration = this.time - this.moment.startedAt + Math.max(6, remaining / clamp(width / 38, 24, 52) + 6);
      }
    }
    seed() {
      const { width: W, height: H } = this;
      const minSide = Math.min(W, H);
      const baseLength = clamp(minSide * 0.41, 140, 460);
      const sharkCount = this.sharkSpecs.length;
      const composition = [
        [0.7, 0.43, -0.52],
        [0.3, 0.24, -0.24],
        [0.25, 0.68, -2.65],
        [0.83, 0.76, 0.4]
      ];
      this.sharks = [];
      for (let i = 0; i < sharkCount; i++) {
        const { kind, size } = this.sharkSpecs[i];
        const length = baseLength * size;
        const orbitRadius = minSide * rand(0.27, 0.38);
        const a = i / sharkCount * TAU - 0.4 + rand(-0.16, 0.16);
        const orbitDir = i % 2 === 0 ? 1 : -1;
        const placement = sharkCount === 1 ? [0.61, 0.45, -0.4] : composition[i];
        const x = placement ? W * (placement[0] + rand(-0.018, 0.018)) : W / 2 + Math.cos(a) * orbitRadius;
        const y = placement ? H * (placement[1] + rand(-0.018, 0.018)) : H / 2 + Math.sin(a) * orbitRadius;
        let heading = placement ? placement[2] + rand(-0.08, 0.08) : a + orbitDir * Math.PI / 2;
        if (kind === "hammerhead" || kind === "greathammer") heading = Math.cos(heading) >= 0 ? -0.04 : Math.PI + 0.04;
        const nodes = new Float32Array(SHARK_NODES * 2);
        const seg = length / (SHARK_NODES - 1);
        for (let n = 0; n < SHARK_NODES; n++) {
          nodes[n * 2] = x - Math.cos(heading) * seg * n;
          nodes[n * 2 + 1] = y - Math.sin(heading) * seg * n;
        }
        this.sharks.push({
          id: i + 1,
          kind,
          length,
          nodes,
          heading,
          speed: 14 + length * 0.028,
          phase: rand(0, TAU),
          stroke: 0.82,
          turn: 0,
          hunger: rand(0.12, 0.45),
          wander: 0,
          orbitDir,
          orbitRadius,
          target: null,
          retargetAt: 0,
          depth: size,
          patrolDirection: Math.cos(heading) >= 0 ? 1 : -1,
          patrolLane: clamp(y / H, 0.28, 0.72),
          burst: 0,
          burstStartedAt: -Infinity,
          nextBurstAt: kind === "mako" ? 14 + hash3(i + 1, 37, 19) * 14 : Infinity
        });
      }
      this.sharks.sort((a, b) => a.length - b.length);
      const total = this.fishCount ?? clamp(Math.round(W * H / 18e3), 24, 72);
      this.fish = [];
      const centers = [];
      while (this.fish.length < total) {
        const species = pickSpecies();
        const sp = SPECIES[species];
        const size = Math.min(randInt(sp.schoolSize[0], sp.schoolSize[1]), total - this.fish.length);
        const millDir = Math.random() < 0.5 ? 1 : -1;
        const school = this.nextSchool++;
        const depth = rand(0.58, 0.94);
        let cx = 0, cy = 0, bestClearance = -Infinity;
        for (let attempt = 0; attempt < 12; attempt++) {
          const x = rand(W * 0.1, W * 0.9), y = rand(H * 0.12, H * 0.88);
          const central = ((x - W / 2) / (W * 0.23)) ** 2 + ((y - H / 2) / (H * 0.18)) ** 2;
          const clearance = Math.min(
            Math.min(W, H) * 0.2,
            ...centers.map((center) => Math.hypot(x - center.x, y - center.y))
          ) - (central < 1 ? 150 : 0);
          if (clearance > bestClearance) {
            cx = x;
            cy = y;
            bestClearance = clearance;
          }
          if (clearance >= Math.min(W, H) * 0.2) break;
        }
        centers.push({ x: cx, y: cy });
        const dir = (Math.random() < 0.5 ? 0 : Math.PI) + rand(-0.5, 0.5);
        for (let k = 0; k < size; k++) {
          const along = ((k - (size - 1) / 2) * 1.35 + rand(-0.2, 0.2)) * this.sepX[species];
          const across = rand(-0.9, 0.9) * this.sepY[species];
          this.fish.push({
            x: cx + Math.cos(dir) * along - Math.sin(dir) * across,
            y: cy + Math.sin(dir) * along + Math.cos(dir) * across,
            vx: Math.cos(dir) * sp.cruise * this.fishSpeed,
            vy: Math.sin(dir) * sp.cruise * this.fishSpeed,
            species,
            school,
            alarm: 0,
            alive: true,
            respawnAt: 0,
            phase: rand(0, TAU),
            turn: 0,
            depth: clamp(depth + rand(-0.035, 0.035), 0.55, 1),
            millDir
          });
        }
      }
      this.bucketNext = new Int32Array(this.fish.length);
      this.visitors = [];
      this.moment = null;
      this.momentsStarted = this.momentsCompleted = 0;
      this.nextMomentKind = "crossing";
      this.nextMomentAt = this.fishCount === void 0 && this.sharks.length ? this.time + 55 + hash3(Math.round(W), Math.round(H), sharkCount) * 30 : Infinity;
    }
    splash(x, y) {
      this.events.push({ kind: "splash", x, y });
      const r = 240;
      for (const f of this.fish) {
        if (!f.alive) continue;
        const dx = f.x - x;
        const dy = f.y - y;
        const d = Math.hypot(dx, dy);
        if (d > r || d < 1e-3) continue;
        const k = (1 - d / r) * 260;
        f.vx += dx / d * k;
        f.vy += dy / d * k;
        f.alarm = 1;
      }
    }
    clearInteraction() {
      this.pointer.clear();
      this.curiosity.sharkId = null;
      this.curiosity.weight = this.curiosity.age = 0;
    }
    stepInteraction(dt) {
      const pointer = this.pointer, visit = this.curiosity;
      pointer.step(dt);
      for (const sweep of pointer.takeSweeps()) {
        const dx = sweep.x - sweep.fromX, dy = sweep.y - sweep.fromY;
        const length2 = dx * dx + dy * dy;
        let first = Infinity;
        for (const fish of this.fish) {
          if (!fish.alive) continue;
          const t = clamp(((fish.x - sweep.fromX) * dx + (fish.y - sweep.fromY) * dy) / length2, 0, 1);
          const x = sweep.fromX + dx * t, y = sweep.fromY + dy * t;
          if ((fish.x - x) ** 2 + (fish.y - y) ** 2 <= 28 ** 2 && t < first) first = t;
        }
        if (first !== Infinity) pointer.contact(sweep.fromX + dx * first, sweep.fromY + dy * first, sweep);
      }
      const interested = pointer.active && pointer.dwell >= 0.6;
      if (interested && !pointer.visited && visit.sharkId === null) {
        let nearest;
        let distance = Infinity;
        for (const shark of this.sharks) {
          const dx = pointer.x - shark.nodes[0], dy = pointer.y - shark.nodes[1];
          const d = Math.hypot(dx, dy);
          const ahead = (dx * Math.cos(shark.heading) + dy * Math.sin(shark.heading)) / Math.max(1, d);
          if (d < Math.min(540, shark.length * 1.8) && d < distance && (ahead > -0.25 || d < shark.length * 0.5)) {
            nearest = shark;
            distance = d;
          }
        }
        if (nearest) {
          visit.sharkId = nearest.id;
          visit.x = pointer.x;
          visit.y = pointer.y;
          visit.age = 0;
          pointer.visited = true;
        }
      }
      if (visit.sharkId !== null) {
        visit.age += dt;
        const desired = interested && pointer.visited && visit.age < 12 ? 1 : 0;
        visit.weight += (desired - visit.weight) * (1 - Math.exp(-dt * (desired ? 4.5 : 2.8)));
        if (!desired && visit.weight < 0.01) {
          visit.sharkId = null;
          visit.weight = 0;
        }
      }
    }
    step(dt, interactionDt = dt) {
      this.time += dt;
      this.stepInteraction(interactionDt);
      this.stepMoments(dt);
      this.rebuildHash();
      this.stepFish(dt);
      this.stepSharks(dt);
      this.respawn();
    }
    rebuildHash() {
      const size = this.perception;
      const pad = 2;
      this.bucketCols = Math.ceil(this.width / size) + pad * 2;
      this.bucketRows = Math.ceil(this.height / size) + pad * 2;
      const n = this.bucketCols * this.bucketRows;
      if (this.bucketHead.length !== n) {
        this.bucketHead = new Int32Array(n);
        this.bucketCount = new Uint16Array(n);
      }
      this.bucketHead.fill(-1);
      this.bucketCount.fill(0);
      if (this.bucketNext.length !== this.fish.length) {
        this.bucketNext = new Int32Array(this.fish.length);
      }
      for (let i = 0; i < this.fish.length; i++) {
        const f = this.fish[i];
        if (!f.alive) continue;
        const b = this.bucketOf(f.x, f.y);
        this.bucketNext[i] = this.bucketHead[b];
        this.bucketHead[b] = i;
        this.bucketCount[b]++;
      }
    }
    bucketOf(x, y) {
      const size = this.perception;
      const c = clamp(Math.floor(x / size) + 2, 0, this.bucketCols - 1);
      const r = clamp(Math.floor(y / size) + 2, 0, this.bucketRows - 1);
      return r * this.bucketCols + c;
    }
    stepFish(dt) {
      const { fish, sharks, pointer, width: W, height: H, time } = this;
      const R = this.perception;
      const R2 = R * R;
      const foreignSep = this.foreignSep;
      const size = this.perception;
      const cols = this.bucketCols;
      const rows = this.bucketRows;
      const head = this.bucketHead;
      const next = this.bucketNext;
      const cur = this.tmp;
      const calmDecay = Math.exp(-dt * 0.7);
      const contagion = Math.min(1, dt * 6);
      const crossing = this.moment?.kind === "crossing" ? this.moment : null;
      for (let i = 0; i < fish.length; i++) {
        const f = fish[i];
        if (!f.alive) continue;
        const sp = SPECIES[f.species];
        const passing = crossing?.school === f.school;
        const spread = 1 + 1.8 * f.alarm;
        const sepX = this.sepX[f.species] * spread;
        const sepY = this.sepY[f.species] * spread;
        const speed = Math.hypot(f.vx, f.vy) || 1;
        const hx = f.vx / speed;
        const hy = f.vy / speed;
        let ax = 0;
        let ay = 0;
        let sx = 0;
        let sy = 0;
        let avx = 0;
        let avy = 0;
        let cx = 0;
        let cy = 0;
        let n = 0;
        let neighbourAlarm = 0;
        const bc = clamp(Math.floor(f.x / size) + 2, 0, cols - 1);
        const br = clamp(Math.floor(f.y / size) + 2, 0, rows - 1);
        for (let r = Math.max(0, br - 1); r <= Math.min(rows - 1, br + 1); r++) {
          for (let c = Math.max(0, bc - 1); c <= Math.min(cols - 1, bc + 1); c++) {
            let j = head[r * cols + c];
            while (j !== -1) {
              if (j !== i) {
                const o = fish[j];
                const dx = o.x - f.x;
                const dy = o.y - f.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < R2 && d2 > 1e-6) {
                  const d = Math.sqrt(d2);
                  if ((dx * hx + dy * hy) / d > BLIND_COS) {
                    const qx = dx / sepX;
                    const qy = dy / sepY;
                    const q2 = qx * qx + qy * qy;
                    if (q2 < 1) {
                      const q = Math.sqrt(q2) || 1e-3;
                      const k = (1 - q) / q;
                      sx -= qx * k;
                      sy -= qy * k;
                    }
                    if (o.school === f.school) {
                      avx += o.vx;
                      avy += o.vy;
                      cx += dx;
                      cy += dy;
                      n++;
                    } else if (d < foreignSep) {
                      const k = (1 - d / foreignSep) / d * 0.6;
                      sx -= dx * k;
                      sy -= dy * k;
                    }
                    if (o.alarm > neighbourAlarm) neighbourAlarm = o.alarm;
                  }
                }
              }
              j = next[j];
            }
          }
        }
        ax += sx * FISH_SEPARATION_K;
        ay += sy * FISH_SEPARATION_K;
        if (n > 0) {
          const alignK = FISH_ALIGN_K * sp.align;
          const cohesionK = FISH_COHESION_K * sp.cohesion * (1 - 0.8 * f.alarm);
          ax += (avx / n - f.vx) * alignK + cx / n * cohesionK;
          ay += (avy / n - f.vy) * alignK + cy / n * cohesionK;
          if (sp.mill > 0) {
            const cl = Math.hypot(cx, cy) || 1;
            ax += -cy / cl * f.millDir * sp.mill * (1 - f.alarm);
            ay += cx / cl * f.millDir * sp.mill * (1 - f.alarm);
          }
        }
        let fear = 0;
        for (const sh of sharks) {
          const fearR = sh.length * 0.6 + 60;
          let best = Infinity;
          let bx = 0;
          let by = 0;
          for (let k = 0; k <= 12; k += 3) {
            const nx = sh.nodes[k * 2];
            const ny = sh.nodes[k * 2 + 1];
            const d2 = (f.x - nx) ** 2 + (f.y - ny) ** 2;
            if (d2 < best) {
              best = d2;
              bx = nx;
              by = ny;
            }
          }
          const d = Math.sqrt(best);
          if (d >= fearR || d < 1e-3) continue;
          let w = 1 - d / fearR;
          w *= w;
          const awayX = (f.x - bx) / d;
          const awayY = (f.y - by) / d;
          const shx = Math.cos(sh.heading);
          const shy = Math.sin(sh.heading);
          const side = shx * (f.y - sh.nodes[1]) - shy * (f.x - sh.nodes[0]) >= 0 ? 1 : -1;
          ax += (awayX * 0.7 - shy * side * 0.9) * FISH_FLEE_K * w;
          ay += (awayY * 0.7 + shx * side * 0.9) * FISH_FLEE_K * w;
          fear = Math.max(fear, Math.sqrt(w));
        }
        if (pointer.influence > 5e-3) {
          const pr = 100 + pointer.influence * 140;
          const dx = f.x - pointer.x;
          const dy = f.y - pointer.y;
          const d = Math.hypot(dx, dy);
          if (d < pr && d > 1e-3) {
            const w = (1 - d / pr) ** 1.6;
            ax += dx / d * FISH_FLEE_K * w * pointer.influence * 1.1;
            ay += dy / d * FISH_FLEE_K * w * pointer.influence * 1.1;
            fear = Math.max(fear, Math.sqrt(w) * pointer.influence * 0.85);
          }
        }
        let alarm = Math.max(f.alarm * calmDecay, fear);
        const relayed = neighbourAlarm * 0.86;
        if (relayed > alarm) alarm += (relayed - alarm) * contagion;
        f.alarm = alarm;
        const m = 36;
        if (f.x < m) ax += (m - f.x) * 7;
        else if (f.x > W - m) ax -= (f.x - (W - m)) * 7;
        if (f.y < m) ay += (m - f.y) * 7;
        else if (f.y > H - m) ay -= (f.y - (H - m)) * 7;
        if (passing && crossing) {
          const tx = (crossing.crossed ? crossing.direction > 0 ? 0.9 : 0.1 : 0.5) * W - f.x;
          const ty = crossing.lane * H - f.y;
          const distance = Math.hypot(tx, ty) || 1;
          const calm = 1 - f.alarm * 0.85;
          ax += (tx / distance * sp.cruise * this.fishSpeed * 1.15 - f.vx) * 0.9 * calm;
          ay += (ty / distance * sp.cruise * this.fishSpeed * 1.15 - f.vy) * 1.3 * calm;
        }
        current(f.x, f.y, time, cur);
        ax += cur.x * 0.5 + (Math.random() - 0.5) * sp.jitter;
        ay += cur.y * 0.5 + (Math.random() - 0.5) * sp.jitter;
        ay -= f.vy * sp.verticalDrag * (1 - 0.7 * f.alarm) * (passing ? 0.35 : 1);
        const preferred = sp.cruise * this.fishSpeed * (1 + 1.3 * f.alarm);
        ax += (preferred - speed) * hx * 1.6;
        ay += (preferred - speed) * hy * 1.6;
        const before = Math.atan2(f.vy, f.vx);
        f.vx += ax * dt;
        f.vy += ay * dt;
        const maxSpeed = sp.maxSpeed * this.fishSpeed * (1 + 1.8 * f.alarm);
        const s = Math.hypot(f.vx, f.vy);
        if (s > maxSpeed) {
          f.vx *= maxSpeed / s;
          f.vy *= maxSpeed / s;
        } else if (s < sp.minSpeed * this.fishSpeed && s > 1e-3) {
          f.vx *= sp.minSpeed * this.fishSpeed / s;
          f.vy *= sp.minSpeed * this.fishSpeed / s;
        }
        f.turn += (angleDiff(before, Math.atan2(f.vy, f.vx)) / dt - f.turn) * Math.min(1, dt * 8);
        f.phase += dt * (7 + Math.hypot(f.vx, f.vy) * 0.12);
        f.x = clamp(f.x + f.vx * dt, -60, W + 60);
        f.y = clamp(f.y + f.vy * dt, -60, H + 60);
      }
    }
    stepSharks(dt) {
      const { sharks, width: W, height: H, time } = this;
      const minSide = Math.min(W, H);
      const cxW = W / 2;
      const cyW = H / 2;
      for (const sh of sharks) {
        const L = sh.length;
        const nodes = sh.nodes;
        const hx = nodes[0];
        const hy = nodes[1];
        const patrolling = sh.kind === "hammerhead" || sh.kind === "greathammer";
        const longTail = sh.kind === "thresher";
        sh.hunger = Math.min(1, sh.hunger + dt * 0.012);
        let dx = Math.cos(sh.heading);
        let dy = Math.sin(sh.heading);
        sh.wander = Math.sin(time * 0.085 + sh.id * 2.4) * 0.48 + Math.sin(time * 0.037 + sh.id) * 0.24;
        dx += Math.cos(sh.heading + sh.wander) * 0.5;
        dy += Math.sin(sh.heading + sh.wander) * 0.5;
        if (time >= sh.retargetAt) {
          sh.target = this.findPrey(sh);
          sh.retargetAt = time + 1.2;
        }
        const t = sh.target;
        const curiosity = this.curiosity.sharkId === sh.id ? this.curiosity.weight : 0;
        if (sh.kind === "mako" && time >= sh.nextBurstAt) {
          const aheadX = hx + Math.cos(sh.heading) * (14 + L * 0.028) * 7;
          const aheadY = hy + Math.sin(sh.heading) * (14 + L * 0.028) * 7;
          const clear = Math.min(hx, W - hx, hy, H - hy) > L * 0.45 && aheadX > 60 && aheadX < W - 60 && aheadY > 60 && aheadY < H - 60;
          if (clear && this.curiosity.sharkId === null && !this.moment) {
            sh.burstStartedAt = time;
            sh.nextBurstAt = time + 34 + hash3(sh.id, Math.floor(time), 71) * 24;
          } else sh.nextBurstAt = time + 2;
        }
        const burstAge = time - sh.burstStartedAt;
        sh.burst = burstAge >= 0 && burstAge < 3 ? Math.sin(burstAge / 3 * Math.PI) ** 2 : 0;
        let hunting = false;
        let closing = 0;
        if (t && t.alive && sh.hunger > 0.5) {
          const tx = t.x + t.vx * 0.35 - hx;
          const ty = t.y + t.vy * 0.35 - hy;
          const d = Math.hypot(tx, ty) || 1;
          const w = (0.65 + sh.hunger * 1.1) * (1 - curiosity);
          dx += tx / d * w;
          dy += ty / d * w;
          hunting = curiosity < 0.3;
          closing = clamp(1 - d / (L * 0.9), 0, 1);
        } else {
          const rx = (hx - cxW) / (W / minSide);
          const ry = hy - cyW;
          const r = Math.hypot(rx, ry) || 1;
          const radius = sh.orbitRadius * (1 + 0.15 * Math.sin(time * 0.05 + sh.id));
          const radial = clamp((radius - r) / radius, -1, 1);
          const orbitWeight = patrolling ? 0.18 : 0.55;
          dx += (-ry / r * sh.orbitDir + rx / r * radial * 0.9) * orbitWeight;
          dy += (rx / r * sh.orbitDir + ry / r * radial * 0.9) * orbitWeight;
        }
        if (patrolling) {
          const margin = Math.max(L * 0.6, W * 0.14);
          if (hx > W - margin) sh.patrolDirection = -1;
          else if (hx < margin) sh.patrolDirection = 1;
          const lane = H * (sh.patrolLane + Math.sin(time * 0.025 + sh.id) * 0.045);
          const weight = (1 - curiosity) * (hunting ? 0.35 : 1);
          dx += sh.patrolDirection * 2.4 * weight;
          dy += clamp((lane - hy) / (H * 0.14), -1, 1) * 1.25 * weight;
        }
        let curiousApproach = 0;
        if (curiosity > 0) {
          const tx = this.curiosity.x - hx, ty = this.curiosity.y - hy;
          const d = Math.hypot(tx, ty) || 1;
          const radius = Math.max(65, L * 0.3);
          curiousApproach = curiosity * smoothstep(radius * 0.85, radius * 2.8, d);
          const approach = clamp((d - radius) / radius, -0.8, 1);
          const tangent = 1 - smoothstep(radius, radius * 3, d);
          dx += (tx / d * approach - ty / d * sh.orbitDir * tangent) * 2.8 * curiosity;
          dy += (ty / d * approach + tx / d * sh.orbitDir * tangent) * 2.8 * curiosity;
        }
        for (const other of sharks) {
          if (other === sh) continue;
          const range = (L + other.length) * 0.58;
          let nearest = Infinity;
          let nearestX = 0;
          let nearestY = 0;
          for (let k = 0; k < SHARK_NODES; k += 2) {
            const ox = hx - other.nodes[k * 2];
            const oy = hy - other.nodes[k * 2 + 1];
            const d = Math.hypot(ox, oy);
            if (d < nearest) {
              nearest = d;
              nearestX = ox;
              nearestY = oy;
            }
          }
          if (nearest < range && nearest > 1e-3) {
            const w = Math.pow(1 - nearest / range, 1.4) * 6;
            dx += nearestX / nearest * w;
            dy += nearestY / nearest * w;
          }
          const headX = hx - other.nodes[0];
          const headY = hy - other.nodes[1];
          const headDistance = Math.hypot(headX, headY);
          const headRange = (L + other.length) * 0.5;
          if (headDistance < headRange && headDistance > 1e-3) {
            const w = (1 - headDistance / headRange) * 4;
            dx += headX / headDistance * w;
            dy += headY / headDistance * w;
          }
        }
        const ex = (hx - cxW) / (W * 0.22);
        const ey = (hy - cyW) / (H * 0.14);
        const e2 = ex * ex + ey * ey;
        if (e2 < 1) {
          const e = Math.sqrt(e2) || 1e-3;
          const w = (1 - e) * (hunting ? 0.15 : 0.5);
          dx += ex / e * w;
          dy += ey / e * w;
        }
        const lookX = hx + Math.cos(sh.heading) * L * 1.2;
        const lookY = hy + Math.sin(sh.heading) * L * 1.2;
        const over = Math.max(-lookX, lookX - W, -lookY, lookY - H, -hx, hx - W, -hy, hy - H);
        const edgeAttention = smoothstep(-L * 0.16, L * 0.3, over);
        if (over > -L * 0.16) {
          const w = clamp((over + L * 0.16) / (L * 0.42), 0, 1) * 6;
          const toX = cxW - hx;
          const toY = cyW - hy;
          const d = Math.hypot(toX, toY) || 1;
          dx += toX / d * w;
          dy += toY / d * w;
        }
        const desired = Math.atan2(dy, dx);
        const ordinaryRadius = (longTail ? 1.05 : 0.75) - curiosity * 0.35;
        const boundaryRadius = (longTail ? 1.05 : 0.75) - edgeAttention * (longTail ? 0.7 : 0.4);
        const turnRadius = Math.min(hunting ? Math.min(ordinaryRadius, 0.65) : ordinaryRadius, boundaryRadius);
        const turnLimit = longTail ? 0.13 + edgeAttention * 0.09 + curiosity * 0.1 : hunting ? 0.3 : 0.2 + curiosity * 0.18;
        const agility = Math.min(turnLimit, sh.speed / (L * turnRadius));
        const desiredTurn = clamp(angleDiff(sh.heading, desired) * (0.65 + curiosity * 0.75), -agility, agility);
        sh.turn += (desiredTurn - sh.turn) * (1 - Math.exp(-dt * ((longTail ? 1 : 1.8) + curiosity * 2.2)));
        sh.heading += sh.turn * dt;
        const cruise = (14 + L * 0.028) * (longTail ? 0.86 : 1);
        const phrase = Math.sin(time * ((longTail ? 0.115 : 0.16) + sh.id * 9e-3) + sh.id * 2.4);
        const targetStroke = hunting ? 0.96 : Math.max(0.42 + smoothstep(-0.65, 0.8, phrase) * 0.54, curiousApproach * 0.96, sh.burst);
        sh.stroke += (targetStroke - sh.stroke) * (1 - Math.exp(-dt * (0.8 + curiosity * 1.2)));
        const breath = 1 + 0.025 * Math.sin(time * 0.19 + sh.id * 1.7);
        const usualSpeed = (hunting ? 1.12 + closing * 0.22 : 0.88 + sh.stroke * 0.12) * (1 + curiousApproach * 0.7);
        const targetSpeed = cruise * breath * Math.max(usualSpeed, 0.9 + sh.burst * 0.9);
        sh.speed += (targetSpeed - sh.speed) * (1 - Math.exp(-dt * (0.48 + curiosity * 1.2 + sh.burst * 1.5)));
        const cadence = sh.kind === "mako" ? 1.08 : longTail ? 0.74 : sh.kind === "zebra" ? 0.88 : 1;
        sh.phase += dt * (0.92 + sh.speed / 58) * (0.76 + sh.stroke * 0.24) * cadence;
        this.advanceShark(sh, dt);
        if (sh.hunger > 0.15) {
          const mouthR = L * 0.05 + 8;
          const mx = nodes[0];
          const my = nodes[1];
          for (const f of this.fish) {
            if (!f.alive) continue;
            if ((f.x - mx) ** 2 + (f.y - my) ** 2 < mouthR * mouthR) {
              f.alive = false;
              f.respawnAt = time + rand(3, 8);
              sh.hunger = Math.max(0, sh.hunger - 0.16);
              this.events.push({ kind: "eat", x: f.x, y: f.y });
            }
          }
        }
      }
    }
    advanceShark(shark, dt) {
      const nodes = shark.nodes;
      nodes[0] += Math.cos(shark.heading) * shark.speed * dt;
      nodes[1] += Math.sin(shark.heading) * shark.speed * dt;
      const segment = shark.length / (SHARK_NODES - 1);
      let previousAngle = shark.heading + Math.PI;
      for (let k = 1; k < SHARK_NODES; k++) {
        const maxBend = 0.075 + k / (SHARK_NODES - 1) * 0.065;
        const px = nodes[(k - 1) * 2], py = nodes[(k - 1) * 2 + 1];
        let angle = Math.atan2(nodes[k * 2 + 1] - py, nodes[k * 2] - px);
        angle = previousAngle + clamp(angleDiff(previousAngle, angle), -maxBend, maxBend);
        nodes[k * 2] = px + Math.cos(angle) * segment;
        nodes[k * 2 + 1] = py + Math.sin(angle) * segment;
        previousAngle = angle;
      }
    }
    finishMoment() {
      this.moment = null;
      this.visitors = [];
      this.momentsCompleted++;
      this.nextMomentAt = this.time + rand(90, 150);
    }
    stepMoments(dt) {
      const { width: W, height: H, time } = this;
      if (!this.moment && time >= this.nextMomentAt) {
        if (this.curiosity.sharkId !== null || this.pointer.speed > 35 || this.sharks.some((shark) => shark.burst > 0.05)) {
          this.nextMomentAt = time + 8;
          return;
        }
        if (this.nextMomentKind === "crossing") {
          const schools = /* @__PURE__ */ new Map();
          for (const fish of this.fish) {
            if (!fish.alive) continue;
            const group = schools.get(fish.school) ?? { count: 0, x: 0, y: 0 };
            group.count++;
            group.x += fish.x;
            group.y += fish.y;
            schools.set(fish.school, group);
          }
          let choice = null, best = -Infinity;
          for (const [school, group] of schools) {
            if (group.count < 3 || group.count > 7) continue;
            const x = group.x / group.count, y = group.y / group.count;
            const score = Math.abs(x - W / 2) / W - Math.abs(y - H / 2) / H * 0.2;
            if (score > best) {
              best = score;
              choice = { school, x };
            }
          }
          if (!choice) {
            this.nextMomentAt = time + 15;
            return;
          }
          this.moment = {
            kind: "crossing",
            startedAt: time,
            school: choice.school,
            direction: choice.x < W / 2 ? 1 : -1,
            lane: rand(0.44, 0.56),
            crossed: false
          };
          this.nextMomentKind = "visitor";
        } else {
          const kinds = ["thresher", "nurse", "zebra", "greathammer"];
          const absent = kinds.filter((kind2) => !this.sharks.some((shark) => shark.kind === kind2));
          const pool = absent.length ? absent : kinds;
          const kind = pool[randInt(0, pool.length - 1)];
          const direction = Math.random() < 0.5 ? 1 : -1;
          const lane = Math.random() < 0.5 ? rand(0.2, 0.32) : rand(0.68, 0.8);
          const length = clamp(Math.min(W, H) * 0.41, 140, 460) * 0.56;
          const speed = clamp(W / 38, 24, 52), heading = direction > 0 ? 0 : Math.PI;
          const x = direction > 0 ? -length : W + length, y = H * lane;
          const nodes = new Float32Array(SHARK_NODES * 2);
          for (let k = 0; k < SHARK_NODES; k++) {
            nodes[k * 2] = x - direction * k * length / (SHARK_NODES - 1);
            nodes[k * 2 + 1] = y;
          }
          this.visitors = [{
            id: this.nextVisitorID++,
            kind,
            length,
            nodes,
            heading,
            speed,
            phase: rand(0, TAU),
            stroke: 0.55,
            turn: 0,
            hunger: 0,
            wander: 0,
            orbitDir: direction,
            orbitRadius: 0,
            target: null,
            retargetAt: Infinity,
            depth: 0.52,
            patrolDirection: direction,
            patrolLane: lane,
            burst: 0,
            burstStartedAt: -Infinity,
            nextBurstAt: Infinity
          }];
          this.moment = {
            kind: "visitor",
            startedAt: time,
            direction,
            lane,
            duration: (W + length * 2.4) / speed + 6,
            opacity: 0
          };
          this.nextMomentKind = "crossing";
        }
        this.momentsStarted++;
      }
      const moment = this.moment;
      if (!moment) return;
      const age = time - moment.startedAt;
      if (moment.kind === "crossing") {
        const group = this.fish.filter((fish) => fish.alive && fish.school === moment.school);
        if (group.length < 2 || age > 70) {
          this.finishMoment();
          return;
        }
        const x = group.reduce((sum, fish) => sum + fish.x, 0) / group.length;
        const y = group.reduce((sum, fish) => sum + fish.y, 0) / group.length;
        if (Math.hypot(x - W / 2, y - H * moment.lane) < Math.max(80, this.perception * 2)) moment.crossed = true;
        if (moment.crossed && (moment.direction > 0 ? x > W * 0.82 : x < W * 0.18)) this.finishMoment();
      } else {
        const shark = this.visitors[0];
        if (!shark || age >= moment.duration) {
          this.finishMoment();
          return;
        }
        const opacity = smoothstep(0, 4, age) * (1 - smoothstep(moment.duration - 6, moment.duration, age)) * 0.65;
        moment.opacity += (opacity - moment.opacity) * (1 - Math.exp(-dt * 3));
        const lane = H * (moment.lane + Math.sin(age / moment.duration * TAU) * 0.025);
        const desired = Math.atan2((lane - shark.nodes[1]) * 0.015, moment.direction);
        const turn = clamp(angleDiff(shark.heading, desired) * 0.65, -0.1, 0.1);
        shark.turn += (turn - shark.turn) * (1 - Math.exp(-dt));
        shark.heading += shark.turn * dt;
        shark.speed += (clamp(W / 38, 24, 52) - shark.speed) * (1 - Math.exp(-dt * 0.8));
        shark.phase += dt * (shark.kind === "thresher" ? 1 : 1.35);
        this.advanceShark(shark, dt);
      }
    }
    /**
     * Pick prey in the shark's forward cone, preferring close fish in sparse
     * buckets (stragglers) over fish buried in a dense school.
     */
    findPrey(sh) {
      const range = sh.length * 0.9 + 160;
      const hx = sh.nodes[0];
      const hy = sh.nodes[1];
      const fx = Math.cos(sh.heading);
      const fy = Math.sin(sh.heading);
      let best = null;
      let bestScore = Infinity;
      let currentScore = Infinity;
      for (const f of this.fish) {
        if (!f.alive) continue;
        if (f.x < 0 || f.x > this.width || f.y < 0 || f.y > this.height) continue;
        const dx = f.x - hx;
        const dy = f.y - hy;
        const d = Math.hypot(dx, dy);
        if (d > range || d < 1e-3) continue;
        const cos = (dx * fx + dy * fy) / d;
        if (cos < 0.2) continue;
        const crowd = this.bucketCount[this.bucketOf(f.x, f.y)];
        const score = d * (1 + (1 - cos) * 0.8) * (1 + crowd * 0.07);
        if (score < bestScore) {
          bestScore = score;
          best = f;
        }
        if (f === sh.target) currentScore = score;
      }
      if (sh.target && currentScore < bestScore * 1.3) return sh.target;
      return best;
    }
    respawn() {
      const { time, width: W, height: H } = this;
      const due = [];
      for (const f of this.fish) if (!f.alive && f.respawnAt <= time) due.push(f);
      if (due.length === 0) return;
      if (due.length < 6 && time - this.lastSpawn < 9) return;
      this.lastSpawn = time;
      const side = randInt(0, 3);
      const along = rand(0.15, 0.85);
      const x = side === 0 ? -20 : side === 1 ? W + 20 : along * W;
      const y = side === 2 ? -20 : side === 3 ? H + 20 : along * H;
      const inward = Math.atan2(H / 2 - y, W / 2 - x) + rand(-0.5, 0.5);
      const species = pickSpecies();
      const sp = SPECIES[species];
      const millDir = Math.random() < 0.5 ? 1 : -1;
      const school = this.nextSchool++;
      const depth = rand(0.58, 0.94);
      const arriving = due.slice(0, sp.schoolSize[1]);
      for (const [index, f] of arriving.entries()) {
        f.alive = true;
        f.species = species;
        f.school = school;
        f.depth = clamp(depth + rand(-0.035, 0.035), 0.55, 1);
        f.alarm = 0;
        f.turn = 0;
        f.millDir = millDir;
        const along2 = (index - (arriving.length - 1) / 2) * this.sepX[species] * 1.35;
        const across = rand(-0.9, 0.9) * this.sepY[species];
        f.x = x + Math.cos(inward) * along2 - Math.sin(inward) * across;
        f.y = y + Math.sin(inward) * along2 + Math.cos(inward) * across;
        f.vx = Math.cos(inward) * sp.cruise * this.fishSpeed * 1.4;
        f.vy = Math.sin(inward) * sp.cruise * this.fishSpeed * 1.4;
      }
    }
  };

  // src/motion.ts
  function writeSwimmingSpine(shark, out) {
    const n = shark.nodes;
    const flexible = shark.kind === "thresher" || shark.kind === "zebra" || shark.kind === "nurse";
    const effort = clamp(shark.speed / (14 + shark.length * 0.028), 0.7, 1.2) * (0.56 + shark.stroke * 0.44);
    for (let k = 0; k < SHARK_NODES; k++) {
      const s = k / (SHARK_NODES - 1);
      const a = Math.max(0, k - 1) * 2;
      const b = Math.min(SHARK_NODES - 1, k + 1) * 2;
      const tx = n[b] - n[a], ty = n[b + 1] - n[a + 1];
      const norm = Math.hypot(tx, ty) || 1;
      const envelope = Math.pow(s, flexible ? 2.2 : 2.8) * (flexible ? 0.062 : 0.048);
      const wave = Math.sin(shark.phase - s * (flexible ? 6.2 : 4.6)) * shark.length * envelope * effort;
      out[k * 2] = n[k * 2] - ty / norm * wave;
      out[k * 2 + 1] = n[k * 2 + 1] + tx / norm * wave;
    }
    const segment = shark.length / (SHARK_NODES - 1);
    for (let k = 1; k < SHARK_NODES; k++) {
      const i = k * 2;
      const dx = out[i] - out[i - 2], dy = out[i + 1] - out[i - 1];
      const length = Math.hypot(dx, dy) || 1;
      out[i] = out[i - 2] + dx / length * segment;
      out[i + 1] = out[i - 1] + dy / length * segment;
    }
  }

  // src/renderer.ts
  var GLYPHS = ".,:;itx%SX8#@o'-/\\~";
  var RAMP = ".,:;itx%SX8#@";
  var BODY = 1;
  var FIN = 2;
  var RIDGE = 3;
  var EYE = 4;
  var MARK = 5;
  var AsciiRenderer = class {
    constructor(canvas) {
      this.canvas = canvas;
      const ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) throw new Error("2D canvas unavailable");
      this.ctx = ctx;
      const style = getComputedStyle(canvas);
      const color = (name) => style.getPropertyValue(`--water-${name}`).trim();
      this.palette = { paper: color("paper"), ink: color("ink"), mist: color("mist"), clay: color("clay"), light: color("light") };
    }
    canvas;
    ctx;
    bg = document.createElement("canvas");
    atlas = document.createElement("canvas");
    dpr = 1;
    width = 0;
    height = 0;
    cw = 6;
    ch = 9;
    cols = 0;
    rows = 0;
    fontFamily = "Menlo, Monaco, monospace";
    cellDensity = 210;
    glyphW = 1;
    glyphH = 1;
    palette;
    alpha = new Float32Array(0);
    target = new Float32Array(0);
    glyph = new Uint8Array(0);
    targetGlyph = new Uint8Array(0);
    previousGlyph = new Uint8Array(0);
    glyphBlend = new Float32Array(0);
    occupied = new Uint8Array(0);
    fresh = true;
    spine = new Float32Array(SHARK_NODES * 2);
    arc = new Float32Array(SHARK_NODES);
    segmentLength = new Float32Array(SHARK_NODES - 1);
    segmentInvLength2 = new Float32Array(SHARK_NODES - 1);
    arcTotal = 1;
    shape = SHAPES.classic;
    sharkId = 0;
    finLeft = 0;
    finRight = 0;
    hitFlag = BODY;
    hitShade = 0;
    hitCoverage = 0;
    wakes = [];
    wakeAt = /* @__PURE__ */ new Map();
    get cellWidth() {
      return this.cw;
    }
    get cellHeight() {
      return this.ch;
    }
    setCellDensity(density) {
      if (Number.isFinite(density) && density >= 120 && density <= 340) this.cellDensity = density;
    }
    /** Replaces the ink colour and repaints the cached glyph atlas. */
    setInkColor(color) {
      if (!color) return;
      this.palette.ink = color;
      this.paintAtlas();
    }
    setFontFamily(family) {
      if (family) this.fontFamily = family;
    }
    resize(width, height, dpr) {
      const geometryChanged = width !== this.width || height !== this.height;
      this.width = width;
      this.height = height;
      this.dpr = dpr;
      this.cw = clamp(Math.round(width / this.cellDensity), 6, 9);
      this.ch = Math.round(this.cw * 1.45);
      this.cols = Math.ceil(width / this.cw);
      this.rows = Math.ceil(height / this.ch);
      this.canvas.width = Math.round(width * dpr);
      this.canvas.height = Math.round(height * dpr);
      const count = this.cols * this.rows;
      if (geometryChanged || this.alpha.length !== count) {
        this.alpha = new Float32Array(count);
        this.target = new Float32Array(count);
        this.glyph = new Uint8Array(count);
        this.targetGlyph = new Uint8Array(count);
        this.previousGlyph = new Uint8Array(count);
        this.glyphBlend = new Float32Array(count).fill(1);
        this.occupied = new Uint8Array(count);
        this.wakes.length = 0;
        this.wakeAt.clear();
        this.fresh = true;
      }
      this.paintAtlas();
    }
    paintBackground() {
      const g = this.bg.getContext("2d");
      const { width: W, height: H, dpr } = this;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const { paper, ink, mist, clay, light } = this.palette;
      g.fillStyle = paper;
      g.fillRect(0, 0, W, H);
      const wash = (x, y, rx, ry, color, opacity) => {
        g.save();
        g.translate(W * x, H * y);
        g.scale(W * rx, H * ry);
        const gradient = g.createRadialGradient(0, 0, 0, 0, 0, 1);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.42, `${color}a0`);
        gradient.addColorStop(1, `${color}00`);
        g.globalAlpha = opacity;
        g.fillStyle = gradient;
        g.fillRect(-1, -1, 2, 2);
        g.restore();
      };
      wash(0.04, 0.08, 0.86, 0.9, clay, 0.11);
      wash(0.94, 0.87, 0.88, 1.04, mist, 0.24);
      wash(0.4, 0.3, 0.74, 0.82, light, 0.48);
      g.fillStyle = ink;
      for (let i = 0; i < Math.round(W * H / 100); i++) {
        const x = hash3(i, 5, 11) * W;
        const y = hash3(i, 9, 14) * H;
        g.globalAlpha = 0.022 + hash3(i, 17, 3) * 0.035;
        g.fillRect(x, y, hash3(i, 4, 8) > 0.96 ? 1.8 : 0.5, 0.45);
      }
      g.globalAlpha = 1;
    }
    paintAtlas() {
      const { dpr, cw, ch } = this;
      this.glyphW = Math.ceil(cw * dpr);
      this.glyphH = Math.ceil(ch * dpr);
      this.atlas.width = this.glyphW * GLYPHS.length;
      this.atlas.height = this.glyphH;
      const g = this.atlas.getContext("2d");
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.font = `500 ${ch * 0.94}px ${this.fontFamily}`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillStyle = this.palette.ink;
      for (let i = 0; i < GLYPHS.length; i++) {
        g.fillText(GLYPHS[i], (i + 0.5) * this.glyphW / dpr, this.glyphH / dpr * 0.52);
      }
    }
    drawGlyph(index, x, y, opacity) {
      if (opacity < 8e-3 || index < 0) return;
      const { ctx, glyphW, glyphH, cw, ch } = this;
      ctx.globalAlpha = opacity;
      ctx.drawImage(this.atlas, index * glyphW, 0, glyphW, glyphH, x - cw / 2, y - ch / 2, cw, ch);
    }
    render(world, dt) {
      if (!this.cols) return;
      const { ctx, dpr } = this;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.target.fill(0);
      this.occupied.fill(0);
      if (world.moment?.kind === "visitor") {
        for (const visitor of world.visitors) this.rasterizeShark(visitor, world.time, world.moment.opacity, false);
      }
      for (const shark of world.sharks) this.rasterizeShark(shark, world.time);
      this.drawWaterMarks(world);
      this.drawWakes(world);
      this.drawFish(world);
      this.drawSharks(dt);
      ctx.globalAlpha = 1;
      this.fresh = false;
      world.events.length = 0;
    }
    prepareSpine(shark) {
      writeSwimmingSpine(shark, this.spine);
      this.arc[0] = 0;
      for (let k = 0; k < SHARK_NODES - 1; k++) {
        const dx = this.spine[(k + 1) * 2] - this.spine[k * 2];
        const dy = this.spine[(k + 1) * 2 + 1] - this.spine[k * 2 + 1];
        const length2 = Math.max(1e-4, dx * dx + dy * dy);
        const length = Math.sqrt(length2);
        this.segmentLength[k] = length;
        this.segmentInvLength2[k] = 1 / length2;
        this.arc[k + 1] = this.arc[k] + length;
      }
      this.arcTotal = this.arc[SHARK_NODES - 1];
      this.shape = SHAPES[shark.kind];
      this.sharkId = shark.id;
      const bank = clamp(shark.turn * 1.1, -0.16, 0.16);
      const flex = 1 + (1 - shark.stroke) * 0.045 + 8e-3 * Math.sin(shark.phase * 0.5);
      const reach = this.shape.pectoral[3] * shark.length * flex;
      this.finLeft = reach * (1 + bank);
      this.finRight = reach * (1 - bank);
    }
    /** Signed inside-distance for a swept, slightly concave fin. */
    finDistance(s, a, L, lead, trail, tip, reach, falcate) {
      const r = clamp(a / reach, 0, 1);
      const front = lead + (tip - lead) * Math.pow(r, 0.86);
      const back = trail + (tip - trail) * Math.pow(r, falcate ? 1.7 : 0.65);
      return Math.min((s - front) * L * 0.65, (back - s) * L * 0.65, reach - a);
    }
    /** Original nearest-spine sampling, now with continuous ink coverage at the edge. */
    sampleShark(px, py, L) {
      const { spine, arc, shape } = this;
      let best = Infinity, bestSegment = 0, bestU = 0, rawU = 0;
      for (let k = 0; k < SHARK_NODES - 1; k++) {
        const ax = spine[k * 2], ay = spine[k * 2 + 1];
        const dx2 = spine[(k + 1) * 2] - ax, dy2 = spine[(k + 1) * 2 + 1] - ay;
        const projection = ((px - ax) * dx2 + (py - ay) * dy2) * this.segmentInvLength2[k];
        const u = clamp(projection, 0, 1);
        const qx = ax + dx2 * u, qy = ay + dy2 * u;
        const distance2 = (px - qx) ** 2 + (py - qy) ** 2;
        if (distance2 < best) {
          best = distance2;
          bestSegment = k;
          bestU = u;
          rawU = projection;
        }
      }
      const i = bestSegment * 2;
      const dx = spine[i + 2] - spine[i], dy = spine[i + 3] - spine[i + 1];
      const side = dx * (py - spine[i + 1]) - dy * (px - spine[i]) >= 0 ? 1 : -1;
      const a = Math.sqrt(best);
      const s = (arc[bestSegment] + bestU * this.segmentLength[bestSegment]) / this.arcTotal;
      const edge = this.cw * 0.82;
      if (bestSegment === 0 && rawU < -edge / this.segmentLength[0]) return false;
      if (bestSegment === SHARK_NODES - 2 && rawU > 1 + edge / this.segmentLength[bestSegment]) return false;
      const v = a * side;
      let halfWidth = shape.halfWidth(s) * L;
      if (shape.caudal > 0) halfWidth *= 1 - smoothstep(0.89, 0.947, s);
      let inside = halfWidth - a;
      if (shape.caudal > 0 && s > 0.947) inside = -L;
      const across = clamp(a / (halfWidth || 1), 0, 1);
      let ink = 0.3 + 0.5 * Math.pow(1 - across, 0.7) + side * across * 0.085;
      ink += Math.sin(s * 19 + this.sharkId) * Math.sin(v / L * 32 + s * 13) * 0.065;
      let flag = BODY;
      const head = shape.head;
      if (head) {
        const r = a / (head.span * L);
        const front = head.sweep * r * r + head.notch * Math.max(0, 1 - r / 0.16);
        const back = front + head.depth * (1 - 0.2 * r ** 4);
        const headInside = Math.min((s - front) * L, (back - s) * L, (1 - r) * head.span * L);
        if (headInside > inside) {
          inside = headInside;
          ink = 0.62 - r * 0.16;
          if (r > 0.86 && s > front + head.depth * 0.23 && s < front + head.depth * 0.57) {
            flag = EYE;
            ink = 0.95;
          }
        }
      }
      if (inside > 0 && flag === BODY) {
        if (s > shape.dorsal[0] && s < shape.dorsal[1] && across < 0.22) {
          ink = 0.87;
          flag = RIDGE;
        } else if (s > shape.secondDorsal[0] && s < shape.secondDorsal[1] && across < 0.24) {
          ink = 0.72;
        } else if (shape.eye && s > shape.eye[0] && s < shape.eye[1] && across > 0.72 && across < 0.93) {
          flag = EYE;
          ink = 0.93;
        } else if (s > shape.gills[0] && s < shape.gills[1] && across > 0.62) {
          const slit = (s - shape.gills[0]) / (shape.gills[1] - shape.gills[0]) * 5 % 1;
          if (slit < 0.32) ink += 0.21;
        } else if (this.marked(s, v, L, across)) {
          flag = MARK;
          ink += 0.23;
        }
      }
      const finReach = side > 0 ? this.finRight : this.finLeft;
      const [p0, p1, p2] = shape.pectoral;
      const pectoral = this.finDistance(s, a, L, p0, p1, p2, finReach, shape.falcate);
      const [v0, v1, v2, vr] = shape.pelvic;
      const pelvic = this.finDistance(s, a, L, v0, v1, v2, vr * L, shape.falcate);
      let caudal = -L;
      if (shape.caudal > 0) {
        const reach = L * shape.caudal * (side > 0 ? 0.8 : 1.12);
        caudal = this.finDistance(s, a, L, 0.86, 0.945, 1, reach, true);
      }
      const fin = Math.max(pectoral, pelvic, caudal);
      if (fin > inside) {
        inside = fin;
        flag = FIN;
        ink = 0.42 + 0.14 * (1 - clamp(a / finReach, 0, 1));
        if (caudal === fin) ink += 0.1;
        if (this.marked(s, v, L, 0)) ink += 0.12;
      }
      this.hitCoverage = smoothstep(-edge, edge, inside);
      this.hitFlag = flag;
      this.hitShade = clamp(ink, 0, 1);
      return this.hitCoverage > 0.012;
    }
    marked(s, v, L, across) {
      if (this.shape === SHAPES.tiger) {
        if (s < 0.24 || s > 0.87 || across > 0.85) return false;
        const bar = Math.sin(s * Math.PI * 18 + 0.35 * Math.sin(v / L * 25 + s * 5));
        return bar > 0.38 + 0.3 * smoothstep(0.7, 0.9, s);
      }
      if (this.shape === SHAPES.zebra) {
        if (s < 0.07) return false;
        const gu = s / 0.06, gv = v / (L * 0.045);
        const cu = Math.floor(gu), cv = Math.floor(gv);
        const jx = hash3(cu, cv, this.sharkId) * 0.5 + 0.25;
        const jy = hash3(cu, cv, this.sharkId + 11) * 0.5 + 0.25;
        return (gu - cu - jx) ** 2 + (gv - cv - jy) ** 2 < 0.08;
      }
      return false;
    }
    rasterizeShark(shark, time, presence = 1, foreground = true) {
      if (presence < 8e-3) return;
      this.prepareSpine(shark);
      const { spine, cw, ch, cols, rows } = this;
      const L = shark.length;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (let k = 0; k < SHARK_NODES; k++) {
        minX = Math.min(minX, spine[k * 2]);
        maxX = Math.max(maxX, spine[k * 2]);
        minY = Math.min(minY, spine[k * 2 + 1]);
        maxY = Math.max(maxY, spine[k * 2 + 1]);
      }
      const reach = L * Math.max(this.shape.pectoral[3] * 1.2, this.shape.head?.span ?? 0, 0.15) + ch;
      const c0 = Math.max(0, Math.floor((minX - reach) / cw));
      const c1 = Math.min(cols - 1, Math.floor((maxX + reach) / cw));
      const r0 = Math.max(0, Math.floor((minY - reach) / ch));
      const r1 = Math.min(rows - 1, Math.floor((maxY + reach) / ch));
      const depth = clamp(shark.depth + Math.sin(time * 0.038 + shark.id * 1.6) * 0.035, 0.6, 1);
      const depthInk = (0.32 + smoothstep(0.55, 1, depth) * 0.63) * presence;
      for (let row = r0; row <= r1; row++) {
        for (let col = c0; col <= c1; col++) {
          const x = (col + 0.5) * cw, y = (row + 0.5) * ch;
          if (!this.sampleShark(x, y, L)) continue;
          const index = row * cols + col;
          const shade = this.hitShade;
          const coverage = this.hitCoverage;
          const grain = hash3(col, row, shark.id);
          const water = 0.93 + 0.07 * Math.sin(x * 6e-3 + y * 9e-3 - time * 0.12);
          const dry = grain < 0.09 && this.hitFlag === BODY ? 0.68 : 1;
          const opacity = coverage * (0.29 + shade * 0.7) * depthInk * water * dry;
          if (foreground && coverage > 0.4) this.occupied[index] = 1;
          if (opacity < this.target[index]) continue;
          let glyph;
          if (this.hitFlag === EYE) glyph = "o";
          else if (coverage < 0.36) glyph = grain > 0.5 ? "." : ",";
          else {
            const ink = shade + (grain - 0.5) * 0.22;
            const desired = ink * (RAMP.length - 1);
            const previous = this.glyph[index];
            const level = this.alpha[index] > 0.06 && previous < RAMP.length && Math.abs(desired - previous) < 0.85 ? previous : clamp(Math.round(desired), 0, RAMP.length - 1);
            glyph = RAMP[level];
          }
          this.target[index] = opacity;
          this.targetGlyph[index] = GLYPHS.indexOf(glyph);
        }
      }
      if (foreground && time - (this.wakeAt.get(shark.id) ?? -Infinity) > 0.72 + (1 - shark.stroke) * 0.65) {
        const k = (SHARK_NODES - 1) * 2;
        const side = Math.sin(shark.phase) > 0 ? 1 : -1;
        const tx = spine[k] - spine[k - 2], ty = spine[k + 1] - spine[k - 1];
        const length = Math.hypot(tx, ty) || 1;
        const nx = -ty / length * side, ny = tx / length * side;
        this.wakes.push({
          x: spine[k] + nx * cw,
          y: spine[k + 1] + ny * cw,
          vx: tx / length * 0.7 + nx * 1.4,
          vy: ty / length * 0.7 + ny * 1.4,
          born: time,
          alpha: depthInk * (0.07 + shark.stroke * 0.07),
          glyph: hash3(shark.id, Math.floor(time), 2) > 0.5 ? "." : ","
        });
        this.wakeAt.set(shark.id, time);
      }
    }
    drawSharks(dt) {
      const elapsed = Math.max(0, dt);
      const arrival = this.fresh ? 1 : 1 - Math.exp(-elapsed * 18);
      const departure = this.fresh ? 1 : 1 - Math.exp(-elapsed * 13);
      for (let i = 0; i < this.alpha.length; i++) {
        const target = this.target[i];
        if (target > 8e-3) {
          if (this.fresh || this.alpha[i] < 0.015) {
            this.glyph[i] = this.targetGlyph[i];
            this.glyphBlend[i] = 1;
          } else if (this.targetGlyph[i] !== this.glyph[i] && this.glyphBlend[i] >= 1) {
            this.previousGlyph[i] = this.glyph[i];
            this.glyph[i] = this.targetGlyph[i];
            this.glyphBlend[i] = 0;
          }
        }
        this.glyphBlend[i] = Math.min(1, this.glyphBlend[i] + elapsed / 0.18);
        this.alpha[i] += (target - this.alpha[i]) * (target > this.alpha[i] ? arrival : departure);
        if (this.alpha[i] < 8e-3) continue;
        const x = (i % this.cols + 0.5) * this.cw, y = (Math.floor(i / this.cols) + 0.5) * this.ch;
        const mix = smoothstep(0, 1, this.glyphBlend[i]);
        if (mix < 1) this.drawGlyph(this.previousGlyph[i], x, y, this.alpha[i] * (1 - mix));
        this.drawGlyph(this.glyph[i], x, y, this.alpha[i] * mix);
      }
    }
    drawFish(world) {
      const occupied = this.occupied;
      for (const fish of world.fish) {
        if (!fish.alive) continue;
        const col = Math.floor(fish.x / this.cw), row = Math.floor(fish.y / this.ch);
        if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) continue;
        const i = row * this.cols + col;
        if (occupied[i]) continue;
        occupied[i] = 1;
        const heading = Math.atan2(fish.vy, fish.vx);
        const character = Math.abs(Math.sin(heading)) < 0.38 ? "-" : Math.sin(heading) * Math.cos(heading) > 0 ? "\\" : "/";
        const pointer = world.pointer;
        const nearbyInk = pointer.influence * (1 - smoothstep(28, 90, Math.hypot(fish.x - pointer.x, fish.y - pointer.y))) * 0.12;
        const opacity = 0.3 + (fish.depth - 0.55) * 0.3 + Math.min(fish.alarm, 0.6) * 0.03 + nearbyInk;
        this.drawGlyph(GLYPHS.indexOf(character), fish.x, fish.y, opacity);
      }
    }
    drawWaterMarks(world) {
      for (const mark of world.pointer.marks) {
        const radius = 14 + mark.age * 42;
        const fade = smoothstep(0, 0.08, mark.age) * (1 - smoothstep(0.5, 2.2, mark.age));
        for (let k = 0; k < 24; k++) {
          if (k % 4 === 0) continue;
          const angle = mark.heading + k / 24 * Math.PI * 2;
          const opacity = mark.strength * fade * (0.18 + 0.07 * Math.sin(k * 2.7) ** 2);
          this.drawGlyph(
            GLYPHS.indexOf(k % 2 ? "." : ","),
            mark.x + Math.cos(angle) * radius,
            mark.y + Math.sin(angle) * radius * 0.72,
            opacity
          );
        }
      }
    }
    drawWakes(world) {
      this.wakes = this.wakes.filter((wake) => world.time - wake.born < 6.5);
      if (this.wakes.length > 64) this.wakes.splice(0, this.wakes.length - 64);
      for (const wake of this.wakes) {
        const age = world.time - wake.born;
        const fade = smoothstep(0, 0.7, age) * (1 - smoothstep(1.4, 6.5, age));
        this.drawGlyph(GLYPHS.indexOf(wake.glyph), wake.x + age * wake.vx, wake.y + age * wake.vy, wake.alpha * fade);
      }
    }
  };

  // src/engine.ts
  var STEP = 1 / 60;
  var pointerRequestID = 0;
  var OceanEngine = class {
    constructor(canvas, sharks, options, requestPointer) {
      this.canvas = canvas;
      this.requestPointer = requestPointer;
      this.options = { ...options };
      this.world = new World(sharks, options.fishCount ?? void 0, options.fishSpeed ?? 1);
      this.renderer = new AsciiRenderer(canvas);
      if (options.cellDensity !== void 0) this.renderer.setCellDensity(options.cellDensity);
      this.renderer.setFontFamily(getComputedStyle(canvas).fontFamily);
      this.resizeObserver = new ResizeObserver(this.resize);
      this.resizeObserver.observe(canvas);
      this.motion.addEventListener("change", this.restart);
      document.addEventListener("visibilitychange", this.restart);
      this.resize();
      for (let i = 0; i < 120; i++) this.world.step(STEP);
      this.draw(STEP);
      this.restart();
    }
    canvas;
    requestPointer;
    world;
    renderer;
    options;
    raf = 0;
    timer = 0;
    last = 0;
    nextFrameAt = 0;
    accumulator = 0;
    disposed = false;
    frames = 0;
    nextPointerAt = 0;
    pendingPointer = 0;
    requestedPointerAt = 0;
    pointerSamples = 0;
    motion = matchMedia("(prefers-reduced-motion: reduce)");
    resizeObserver;
    /** Replaces the ink colour used by the glyph atlas. */
    setInkColor(color) {
      this.renderer.setInkColor(color);
    }
    /** Enables or disables pointer-driven fish scattering. */
    setInteraction(enabled) {
      this.options = { ...this.options, interaction: enabled };
      if (!enabled) this.world.clearInteraction();
    }
    /** Fish-only speed multiplier, applied without replacing the school layout. */
    setFishSpeed(value) {
      if (Number.isFinite(value)) this.world.fishSpeed = Math.max(0, value);
    }
    configure(options) {
      const resized = options.pixelRatio !== this.options.pixelRatio;
      this.options = { ...options };
      if (resized) this.resize();
      this.restart();
    }
    pointer(input) {
      if (input.requestID !== void 0 && input.requestID !== this.pendingPointer) return;
      this.pendingPointer = 0;
      if (!this.canRun() || !this.options.interaction) {
        this.world.clearInteraction();
        return;
      }
      this.pointerSamples++;
      const active = input.active === true && Number.isFinite(input.x) && Number.isFinite(input.y) && input.x >= 0 && input.x <= 1 && input.y >= 0 && input.y <= 1;
      this.world.pointer.update(input.x * this.world.width, input.y * this.world.height, active, performance.now() / 1e3);
    }
    stats() {
      return {
        ...this.options,
        frames: this.frames,
        simulationTime: this.world.time,
        reducedMotion: this.motion.matches,
        hidden: document.hidden,
        sharks: this.world.sharks.length,
        visitors: this.world.visitors.length,
        moment: this.world.moment ? { ...this.world.moment, visitorKind: this.world.visitors[0]?.kind } : null,
        momentsStarted: this.world.momentsStarted,
        momentsCompleted: this.world.momentsCompleted,
        animals: this.world.sharks.map((shark) => ({
          id: shark.id,
          kind: shark.kind,
          x: shark.nodes[0],
          y: shark.nodes[1],
          heading: shark.heading,
          speed: shark.speed,
          burst: shark.burst
        })),
        fish: this.world.fish.length,
        width: this.canvas.width,
        height: this.canvas.height,
        scheduled: this.raf !== 0 || this.timer !== 0,
        disposed: this.disposed,
        pointerSamples: this.pointerSamples,
        pointer: {
          active: this.world.pointer.active,
          x: this.world.pointer.x / this.world.width,
          y: this.world.pointer.y / this.world.height,
          dwell: this.world.pointer.dwell,
          marks: this.world.pointer.marks.length,
          curiousShark: this.world.curiosity.sharkId
        }
      };
    }
    destroy() {
      this.disposed = true;
      this.cancel();
      this.resizeObserver.disconnect();
      this.motion.removeEventListener("change", this.restart);
      document.removeEventListener("visibilitychange", this.restart);
    }
    cancel() {
      cancelAnimationFrame(this.raf);
      clearTimeout(this.timer);
      this.raf = this.timer = 0;
      this.last = this.accumulator = this.nextFrameAt = 0;
      this.pendingPointer = this.nextPointerAt = 0;
      this.world.clearInteraction();
    }
    canRun() {
      return !this.disposed && !this.options.paused && !this.motion.matches && !document.hidden;
    }
    restart = () => {
      this.cancel();
      if (this.canRun()) {
        this.resize();
        this.raf = requestAnimationFrame(this.frame);
      } else if (!this.disposed && !document.hidden) this.draw(0);
    };
    resize = () => {
      if (this.disposed) return;
      const { width, height } = this.canvas.getBoundingClientRect();
      if (width < 1 || height < 1) return;
      const ratio = Math.min(devicePixelRatio || 1, this.options.pixelRatio);
      if (width === this.world.width && height === this.world.height && this.canvas.width === Math.round(width * ratio) && this.canvas.height === Math.round(height * ratio)) return;
      this.renderer.resize(width, height, ratio);
      this.world.resize(width, height, this.renderer.cellWidth, this.renderer.cellHeight);
      this.draw(STEP);
    };
    draw(dt) {
      this.renderer.render(this.world, dt);
      this.frames++;
    }
    schedule(delay) {
      this.timer = window.setTimeout(() => {
        this.timer = 0;
        if (this.canRun()) this.raf = requestAnimationFrame(this.frame);
      }, Math.max(0, delay));
    }
    frame = () => {
      this.raf = 0;
      if (!this.canRun()) return;
      const now = performance.now();
      const interval = 1e3 / this.options.frameRate;
      if (this.nextFrameAt > now + 0.5) {
        this.schedule(this.nextFrameAt - now - 2);
        return;
      }
      this.nextFrameAt = this.nextFrameAt ? this.nextFrameAt + interval : now + interval;
      if (this.nextFrameAt <= now) this.nextFrameAt = now + interval;
      const elapsed = this.last === 0 ? STEP : Math.min(0.1, (now - this.last) / 1e3);
      this.last = now;
      if (this.options.interaction && this.requestPointer && now >= this.nextPointerAt) {
        if (this.pendingPointer && now - this.requestedPointerAt > 500) {
          this.pendingPointer = 0;
          this.world.clearInteraction();
        }
        if (!this.pendingPointer) {
          this.pendingPointer = ++pointerRequestID;
          this.requestedPointerAt = now;
          this.nextPointerAt = now + 100;
          this.requestPointer(this.pendingPointer);
        }
      }
      const dt = elapsed * this.options.speed;
      this.accumulator += dt;
      let steps = 0;
      while (this.accumulator >= STEP && steps < 12) {
        this.world.step(STEP, STEP / this.options.speed);
        this.accumulator -= STEP;
        steps++;
      }
      if (steps === 12) this.accumulator = 0;
      this.draw(dt);
      this.schedule(this.nextFrameAt - performance.now() - 3);
    };
  };

  // build/entry.js
  var TUNING = {
    /** Simulation speed for everything: 0.5 is a slow drift, 1.5 is brisk. */
    speed: 0.8,
    /** Render cap. The scene is intentionally calm, so 30 is plenty. */
    frameRate: 30,
    /** Device-pixel-ratio cap; lower this on a slow machine. */
    pixelRatio: 1.5,
    /** Smaller cell = finer characters. Cell width = clamp(width / density, 6, 9). */
    cellDensity: 200,
    /** CSS blur applied to the shark canvas only (softens the ASCII edge). */
    blurPx: 0.85,
    /** Mixed-scene shark sizes, relative to the wallpaper defaults. */
    sharkScale: 0.7,
    /** Feathered paper veil that keeps text readable. `feather` is a blur radius. */
    protection: {
      chat: { strength: 0.7, feather: 64, pad: 8 },
      composer: { strength: 0.9, feather: 48, pad: 10 },
      header: { strength: 0.66, feather: 40, pad: 6 },
      minHeight: 90
    }
  };
  var SCENES = {
    classic: [
      { kind: "classic", size: 1 },
      { kind: "classic", size: 0.7 },
      { kind: "classic", size: 0.84 },
      { kind: "classic", size: 0.77 }
    ],
    mixed: [
      { kind: "hammerhead", size: 1 },
      { kind: "tiger", size: 0.84 },
      { kind: "mako", size: 0.77 },
      { kind: "thresher", size: 0.7 }
    ],
    solo: [{ kind: "classic", size: 1 }]
  };
  var SETTINGS_KEY = "dsh-ascii-sharks.settings.v1";
  var DEFAULT_SETTINGS = {
    enabled: true,
    opacity: 0.78,
    density: 1,
    inkColor: null,
    fishSpeed: 1,
    fishCount: null,
    scene: "mixed",
    fishScatter: false,
    veil: 0.7
  };
  function clampNumber(value, min, max, fallback) {
    return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  }
  function normalizeSettings(raw) {
    const out = { ...DEFAULT_SETTINGS };
    if (!raw || typeof raw !== "object") return out;
    if (typeof raw.enabled === "boolean") out.enabled = raw.enabled;
    out.opacity = clampNumber(raw.opacity, 0.05, 1, out.opacity);
    out.density = clampNumber(raw.density, 0, 1, out.density);
    if (typeof raw.inkColor === "string" && /^#[0-9a-f]{6}$/i.test(raw.inkColor)) out.inkColor = raw.inkColor;
    else if (raw.inkColor === null) out.inkColor = null;
    out.fishSpeed = clampNumber(raw.fishSpeed, 0.1, 3, out.fishSpeed);
    if (raw.fishCount === null) out.fishCount = null;
    else if (Number.isFinite(raw.fishCount)) out.fishCount = Math.max(0, Math.min(100, Math.round(raw.fishCount)));
    if (typeof raw.scene === "string" && Object.hasOwn(SCENES, raw.scene)) out.scene = raw.scene;
    if (typeof raw.fishScatter === "boolean") out.fishScatter = raw.fishScatter;
    out.veil = clampNumber(raw.veil, 0, 1, out.veil);
    return out;
  }
  function readSettings() {
    try {
      const raw = window.localStorage.getItem(SETTINGS_KEY);
      return normalizeSettings(raw ? JSON.parse(raw) : null);
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }
  var SETTINGS = readSettings();
  var settingsListeners = /* @__PURE__ */ new Set();
  function saveSettings() {
    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(SETTINGS));
    } catch {
    }
  }
  function notifySettings() {
    for (const listener of settingsListeners) {
      try {
        listener();
      } catch {
      }
    }
  }
  function applyEnabledToDom() {
    const hosts = Array.from(document.querySelectorAll(".dsh-ascii-sharks"));
    hosts.forEach((host, index) => {
      const visible = SETTINGS.enabled && index === hosts.length - 1;
      const canvas = host.querySelector(".dsh-ascii-sharks__canvas");
      if (canvas) canvas.style.setProperty("--dsh-sharks-ink", visible ? String(SETTINGS.opacity) : "0");
      if (visible) {
        delete host.dataset.dshDisabled;
        host.style.display = "";
      } else {
        host.dataset.dshDisabled = "1";
        if (!SETTINGS.enabled) host.style.display = "";
      }
    });
  }
  function updateSettings(patch) {
    Object.assign(SETTINGS, normalizeSettings({ ...SETTINGS, ...patch }));
    saveSettings();
    applyEnabledToDom();
    try {
      live?.applySettings();
    } finally {
      notifySettings();
    }
  }
  var STYLE_ID = "dsh-ascii-sharks-style";
  var CSS = `
/* Let the page background (and the ocean behind it) show through the
   conversation column. Every other panel keeps its own opaque surface. */
[data-phase]:has([data-conversation-content]) { background: transparent !important; }

.dsh-ascii-sharks {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
  contain: layout paint;
  user-select: none;
}
.dsh-ascii-sharks__paper {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: var(--dsw-alias-bg-base, #ffffff);
  pointer-events: none;
}
.dsh-ascii-sharks[data-dsh-disabled="1"] .dsh-ascii-sharks__canvas { opacity: 0 !important; }
.dsh-ascii-sharks__canvas {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
  filter: blur(var(--dsh-sharks-blur, 0.85px)) var(--dsh-sharks-glow, );
  opacity: var(--dsh-sharks-ink, 0.78);
  font-family: Menlo, Monaco, "SFMono-Regular", ui-monospace, monospace;
}
.dsh-ascii-sharks__shield {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}
.dsh-ascii-sharks__zone {
  position: absolute;
  border-radius: 64px;
  background: var(--dsw-alias-bg-base, #ffffff);
  filter: blur(var(--dsh-sharks-feather, 64px));
  pointer-events: none;
}
`;
  var SETTINGS_CSS = `
.dsh-ascii-sharks[data-dsh-disabled="1"] .dsh-ascii-sharks__canvas { opacity: 0 !important; }
.dsh-ocean-settings {
  box-sizing: border-box;
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  padding: 4px 0 48px;
  color: var(--dsw-alias-label-primary, #1f2328);
  font-size: var(--dsh-content-font-size, 14px);
  line-height: 1.5;
}
.dsh-ocean-settings__head { margin-bottom: 16px; }
.dsh-ocean-settings__title { margin: 0 0 6px; font-size: 22px; font-weight: 600; letter-spacing: -0.01em; }
.dsh-ocean-settings__lead { margin: 0; color: var(--dsw-alias-label-secondary, #6b7280); font-size: 13px; }
.dsh-ocean-settings__status { display: flex; align-items: center; gap: 8px; margin: 0 0 14px; color: var(--dsw-alias-label-secondary, #6b7280); font-size: 12px; }
.dsh-ocean-settings__dot { width: 7px; height: 7px; border-radius: 50%; background: var(--dsw-alias-state-success-primary, #16a34a); box-shadow: 0 0 0 3px color-mix(in srgb, var(--dsw-alias-state-success-primary, #16a34a) 16%, transparent); }
.dsh-ocean-settings__dot[data-warn="true"] { background: var(--dsw-alias-state-warn-primary, #d97706); box-shadow: none; }
.dsh-ocean-settings__dot[data-off="true"] { background: var(--dsw-alias-border-l3, #d4d4d8); box-shadow: none; }
.dsh-ocean-preview { position: relative; height: 190px; margin: 0 0 18px; border: 1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.12)); border-radius: 12px; overflow: hidden; background: var(--dsw-alias-bg-base, #ffffff); }
.dsh-ocean-preview__canvas { position: absolute; inset: 0; z-index: 0; display: block; width: 100%; height: 100%; filter: blur(0.6px) var(--dsh-sharks-glow, ); font-family: Menlo, Monaco, "SFMono-Regular", ui-monospace, monospace; }
.dsh-ocean-preview__veil { position: absolute; left: 20%; right: 20%; top: 10px; bottom: 10px; z-index: 1; border-radius: 22px; background: var(--dsw-alias-bg-base, #ffffff); filter: blur(24px); pointer-events: none; }
.dsh-ocean-preview__off { position: absolute; inset: 0; z-index: 2; display: flex; align-items: center; justify-content: center; font-size: 12px; color: var(--dsw-alias-label-secondary, #6b7280); background: color-mix(in srgb, var(--dsw-alias-bg-base, #fff) 55%, transparent); }
.dsh-ocean-settings__note { margin: -8px 0 16px; font-size: 12px; color: var(--dsw-alias-label-secondary, #6b7280); }
.dsh-ocean-settings__card { border: 1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.12)); border-radius: 14px; overflow: hidden; background: var(--dsw-alias-bg-layer-1, transparent); }
.dsh-ocean-row { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 16px 20px; border-top: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.08)); }
.dsh-ocean-row:first-child { border-top: 0; }
.dsh-ocean-row__copy { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.dsh-ocean-row__title { font-weight: 500; }
.dsh-ocean-row__hint { color: var(--dsw-alias-label-secondary, #6b7280); font-size: 12px; }
.dsh-ocean-row__control { display: flex; align-items: center; gap: 10px; flex: 0 1 auto; min-width: 0; }
.dsh-ocean-range { width: 300px; max-width: 36vw; accent-color: var(--dsw-alias-brand-primary, #4176e6); cursor: pointer; }
.dsh-ocean-range:disabled { opacity: .45; cursor: default; }
.dsh-ocean-value { min-width: 46px; text-align: right; font-size: 12px; font-variant-numeric: tabular-nums; color: var(--dsw-alias-label-secondary, #6b7280); }
.dsh-ocean-switch { position: relative; width: 44px; height: 26px; padding: 3px; border: none; border-radius: 999px; background: color-mix(in srgb, var(--dsw-alias-label-primary, #111) 16%, transparent); box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l2, rgba(0,0,0,.16)); cursor: pointer; transition: background .15s ease; flex: none; }
.dsh-ocean-switch[data-on="true"] { background: var(--dsw-alias-brand-primary, #4176e6); box-shadow: inset 0 0 0 1px color-mix(in srgb, #ffffff 18%, transparent); }
.dsh-ocean-switch span { display: block; width: 20px; height: 20px; border-radius: 50%; background: var(--dsw-alias-switch-thumb, var(--dsw-alias-bg-base, #ffffff)); box-shadow: 0 0 0 1px color-mix(in srgb, var(--dsw-alias-label-primary, #111) 14%, transparent), 0 1px 2px rgba(0,0,0,.25); transform: translateX(0); transition: transform .15s ease; }
.dsh-ocean-switch[data-on="true"] span { transform: translateX(18px); }
.dsh-ocean-select { min-width: 190px; padding: 6px 10px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.16)); background: var(--dsw-alias-bg-base, #fff); color: inherit; font: inherit; cursor: pointer; }
.dsh-ocean-color { width: 44px; height: 30px; padding: 2px; border: 1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.16)); border-radius: 8px; background: transparent; cursor: pointer; }
.dsh-ocean-linkbtn { border: none; background: none; color: var(--dsw-alias-brand-primary, #4176e6); font: inherit; font-size: 12px; cursor: pointer; padding: 4px 6px; border-radius: 6px; }
.dsh-ocean-linkbtn:hover { background: var(--dsw-alias-interactive-bg-hover, rgba(0,0,0,.06)); }
.dsh-ocean-check { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--dsw-alias-label-secondary, #6b7280); white-space: nowrap; }
.dsh-ocean-check input { accent-color: var(--dsw-alias-brand-primary, #4176e6); }
.dsh-ocean-footnote { margin: 14px 0 0; font-size: 12px; color: var(--dsw-alias-label-secondary, #6b7280); }
@media (max-width: 760px) {
  .dsh-ocean-row { flex-direction: column; align-items: flex-start; gap: 10px; }
  .dsh-ocean-row__control { width: 100%; }
  .dsh-ocean-range { width: 100%; max-width: none; }
  .dsh-ocean-select { width: 100%; }
}
`;
  var live = null;
  var lastFailure = null;
  var lifecycle = "idle";
  var themeRevision = 0;
  function parseColor(value) {
    if (!value) return null;
    const text = String(value).trim();
    let match = /^#([0-9a-f]{3,8})$/i.exec(text);
    if (match) {
      let hex = match[1];
      if (hex.length === 3 || hex.length === 4) hex = hex.slice(0, 3).split("").map((c) => c + c).join("");
      const n = Number.parseInt(hex.slice(0, 6), 16);
      return { r: n >> 16 & 255, g: n >> 8 & 255, b: n & 255 };
    }
    match = /^rgba?\(([^)]+)\)$/i.exec(text);
    if (match) {
      const parts = match[1].split(/[,\s/]+/).filter(Boolean).map(Number);
      if (parts.length >= 3 && parts.every(Number.isFinite)) {
        return { r: parts[0], g: parts[1], b: parts[2] };
      }
    }
    return null;
  }
  function luminance(color) {
    const channel = (v) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
  }
  function readPalette(frame) {
    const frameStyle = getComputedStyle(frame);
    const bodyStyle = getComputedStyle(document.body);
    const token = frameStyle.getPropertyValue("--dsw-alias-bg-base").trim() || bodyStyle.getPropertyValue("--dsw-alias-bg-base").trim();
    const color = parseColor(token) || parseColor(frameStyle.backgroundColor) || parseColor(bodyStyle.backgroundColor) || parseColor(getComputedStyle(document.documentElement).backgroundColor) || { r: 255, g: 255, b: 255 };
    const darkAttr = document.body.hasAttribute("data-ds-dark-theme") || document.documentElement.hasAttribute("data-ds-dark-theme");
    const dark = darkAttr || luminance(color) < 0.35;
    return {
      dark,
      paper: `rgb(${color.r}, ${color.g}, ${color.b})`,
      ink: dark ? "#eef3f7" : "#5d656c",
      glow: dark ? "drop-shadow(0 0 5px rgba(198, 228, 255, 0.45))" : "",
      mist: dark ? "#2a3238" : "#eef1f3",
      clay: dark ? "#242a2f" : "#f3efe8",
      light: dark ? "#20262c" : "#fbfaf7"
    };
  }
  function mixInk(settings, palette) {
    const paper = parseColor(palette.paper) || { r: 255, g: 255, b: 255 };
    const base = parseColor(settings.inkColor || palette.ink) || { r: 93, g: 101, b: 108 };
    const t = 1 - settings.density;
    const mix = (a, b) => Math.round(a + (b - a) * t);
    return `rgb(${mix(base.r, paper.r)}, ${mix(base.g, paper.g)}, ${mix(base.b, paper.b)})`;
  }
  function engineOptions() {
    return {
      paused: !SETTINGS.enabled,
      frameRate: TUNING.frameRate,
      speed: TUNING.speed,
      pixelRatio: Math.min(window.devicePixelRatio || 1, TUNING.pixelRatio),
      interaction: SETTINGS.fishScatter,
      cellDensity: TUNING.cellDensity,
      fishCount: SETTINGS.fishCount,
      fishSpeed: SETTINGS.fishSpeed
    };
  }
  function mount(marker) {
    const overlay = marker && marker.closest("[data-shell-overlay]");
    const frame = overlay && overlay.parentElement;
    if (!frame) return { dispose() {
    }, rebuild() {
    }, refresh() {
    } };
    const previousIsolation = frame.style.isolation;
    frame.style.isolation = "isolate";
    const host = document.createElement("div");
    host.className = "dsh-ascii-sharks";
    host.style.left = "0px";
    host.style.top = "0px";
    host.style.width = "0px";
    host.style.height = "0px";
    host.setAttribute("aria-hidden", "true");
    host.setAttribute("role", "presentation");
    const paper = document.createElement("div");
    paper.className = "dsh-ascii-sharks__paper";
    paper.setAttribute("aria-hidden", "true");
    host.appendChild(paper);
    const canvas = document.createElement("canvas");
    canvas.className = "dsh-ascii-sharks__canvas";
    canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);
    const shield = document.createElement("div");
    shield.className = "dsh-ascii-sharks__shield";
    shield.setAttribute("aria-hidden", "true");
    host.appendChild(shield);
    const zones = {};
    for (const name of ["header", "chat", "composer"]) {
      const zone = document.createElement("div");
      zone.className = "dsh-ascii-sharks__zone";
      zone.dataset.zone = name;
      zone.style.display = "none";
      shield.appendChild(zone);
      zones[name] = zone;
    }
    for (const existing of frame.querySelectorAll(".dsh-ascii-sharks")) existing.remove();
    frame.appendChild(host);
    let palette = readPalette(frame);
    canvas.style.setProperty("--water-ink", palette.ink);
    canvas.style.setProperty("--water-paper", palette.paper);
    canvas.style.setProperty("--water-mist", palette.mist);
    canvas.style.setProperty("--water-clay", palette.clay);
    canvas.style.setProperty("--water-light", palette.light);
    canvas.style.setProperty("--dsh-sharks-glow", palette.glow);
    canvas.style.setProperty("--dsh-sharks-ink", String(SETTINGS.enabled ? SETTINGS.opacity : 0));
    canvas.style.setProperty("--dsh-sharks-blur", `${TUNING.blurPx}px`);
    let options = engineOptions();
    let engine = null;
    const startEngine = () => {
      const specs = SCENES[SETTINGS.scene] || SCENES.mixed;
      const scaled = specs.map((shark) => ({ kind: shark.kind, size: shark.size * TUNING.sharkScale }));
      engine = new OceanEngine(canvas, scaled, { ...options });
    };
    startEngine();
    let frameRequest = 0;
    const scheduleRefresh = () => {
      if (frameRequest) return;
      frameRequest = requestAnimationFrame(() => {
        frameRequest = 0;
        refreshZones();
      });
    };
    let currentScene = SETTINGS.scene;
    let currentFishCount = SETTINGS.fishCount;
    function effectiveInk() {
      return mixInk(SETTINGS, palette);
    }
    function applySettings() {
      options = {
        ...options,
        paused: !SETTINGS.enabled,
        fishCount: SETTINGS.fishCount,
        fishSpeed: SETTINGS.fishSpeed,
        interaction: SETTINGS.fishScatter
      };
      canvas.style.setProperty("--dsh-sharks-ink", String(SETTINGS.enabled ? SETTINGS.opacity : 0));
      const changed = SETTINGS.scene !== currentScene || SETTINGS.fishCount !== currentFishCount;
      currentScene = SETTINGS.scene;
      currentFishCount = SETTINGS.fishCount;
      if (!SETTINGS.enabled) {
        engine?.destroy();
        engine = null;
        for (const other of document.querySelectorAll(".dsh-ascii-sharks")) {
          if (other !== host) other.style.display = "none";
        }
        scheduleRefresh();
        return;
      }
      if (!engine || changed) {
        engine?.destroy();
        startEngine();
      } else {
        engine.configure(options);
      }
      engine?.setInkColor(effectiveInk());
      engine?.setFishSpeed(SETTINGS.fishSpeed);
      engine?.setInteraction(SETTINGS.fishScatter);
      scheduleRefresh();
    }
    const zoneStyle = /* @__PURE__ */ new Map();
    const setStyle = (zone, key, value) => {
      let cache = zoneStyle.get(zone);
      if (!cache) {
        cache = {};
        zoneStyle.set(zone, cache);
      }
      if (cache[key] === value) return;
      cache[key] = value;
      zone.style[key] = value;
    };
    const applyZone = (zone, next, frameRect) => {
      if (!next) {
        setStyle(zone, "display", "none");
        return;
      }
      const { rect, config } = next;
      const width = rect.width + config.pad * 2;
      const height = rect.height + config.pad * 2;
      if (width < 8 || height < 8) {
        setStyle(zone, "display", "none");
        return;
      }
      setStyle(zone, "display", "block");
      setStyle(zone, "left", `${rect.left - frameRect.left - config.pad}px`);
      setStyle(zone, "top", `${rect.top - frameRect.top - config.pad}px`);
      setStyle(zone, "width", `${width}px`);
      setStyle(zone, "height", `${height}px`);
      setStyle(zone, "opacity", String(Math.min(1, SETTINGS.veil * (config.strength / TUNING.protection.chat.strength))));
      setStyle(zone, "filter", `blur(${config.feather}px)`);
    };
    const touchedSurfaces = /* @__PURE__ */ new Map();
    let clearedColumn = null;
    let layoutObserver = null;
    let observedAnchor = null;
    let observedSeat = null;
    function observeLayout(anchor, seat) {
      if (typeof ResizeObserver !== "function") return;
      if (!layoutObserver) layoutObserver = new ResizeObserver(() => scheduleRefresh());
      if (anchor !== observedAnchor || seat !== observedSeat) {
        layoutObserver.disconnect();
        observedAnchor = anchor;
        observedSeat = seat;
        if (anchor) layoutObserver.observe(anchor);
        if (seat) layoutObserver.observe(seat);
      }
    }
    function restoreSurface(surface) {
      if (!surface) return;
      const background = touchedSurfaces.get(surface);
      touchedSurfaces.delete(surface);
      if (!surface.isConnected) return;
      delete surface.dataset.dshSharks;
      if (background) surface.style.setProperty("background", background);
      else surface.style.removeProperty("background");
    }
    function revealOceanBehind(root, column) {
      if (clearedColumn && clearedColumn !== column) {
        restoreSurface(clearedColumn);
        clearedColumn = null;
      }
      clearedColumn = column;
      for (const surface of [root, column]) {
        if (!surface) continue;
        if (!touchedSurfaces.has(surface)) {
          touchedSurfaces.set(surface, surface.style.getPropertyValue("background"));
        }
        surface.dataset.dshSharks = "1";
        surface.style.setProperty("background", "transparent", "important");
      }
    }
    function columnOf(content) {
      let node = content;
      while (node && node.parentElement && node.parentElement !== frame) node = node.parentElement;
      return node && node.parentElement === frame ? node : frame;
    }
    function refreshZones() {
      const frameRect = frame.getBoundingClientRect();
      if (frameRect.width < 2 || frameRect.height < 2) return;
      let header = null;
      let chat = null;
      let composer = null;
      const content = findConversationContent(frame);
      if (!content && clearedColumn) {
        restoreSurface(clearedColumn);
        clearedColumn = null;
      }
      if (content) {
        const root = content.parentElement;
        const column = columnOf(content);
        revealOceanBehind(root, column);
        const anchor = root || column;
        if (anchor) {
          const columnRect = anchor.getBoundingClientRect();
          const left = Math.round(columnRect.left - frameRect.left);
          const top = Math.round(columnRect.top - frameRect.top);
          const width = Math.round(columnRect.width);
          const height = Math.round(columnRect.height);
          if (host.style.left !== `${left}px`) host.style.left = `${left}px`;
          if (host.style.top !== `${top}px`) host.style.top = `${top}px`;
          if (host.style.width !== `${width}px`) host.style.width = `${width}px`;
          if (host.style.height !== `${height}px`) host.style.height = `${height}px`;
        }
        const phase = root && root.getAttribute("data-phase");
        const seat = content.querySelector("[data-composer-seat]");
        const scroll = content.querySelector("[data-conversation-scroll]");
        const headerEl = root && (root.querySelector(":scope > header") || root.querySelector("header"));
        if (root) observeLayout(root, seat);
        if (headerEl) {
          const rect = headerEl.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) header = { rect, config: TUNING.protection.header };
        }
        if (seat) {
          const rect = seat.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) composer = { rect, config: TUNING.protection.composer };
        }
        if (phase !== "hero" && seat && scroll) {
          const scrollRect = scroll.getBoundingClientRect();
          const seatRect = seat.getBoundingClientRect();
          const flow = content.querySelector("[data-chat-flow]");
          let left;
          let width;
          if (flow) {
            const flowRect = flow.getBoundingClientRect();
            left = flowRect.left;
            width = flowRect.width;
          } else {
            width = Math.min(920, Math.max(560, scrollRect.width * 0.64));
            left = scrollRect.left + (scrollRect.width - width) / 2;
          }
          const top = Math.max(scrollRect.top, 0);
          const bottom = Math.min(scrollRect.bottom, seatRect.top);
          if (width >= 320 && bottom - top >= TUNING.protection.minHeight) {
            chat = { rect: { left, top, width, height: bottom - top }, config: TUNING.protection.chat };
          }
        }
      }
      const hostRect = host.getBoundingClientRect();
      applyZone(zones.header, header, hostRect);
      applyZone(zones.composer, composer, hostRect);
      applyZone(zones.chat, chat, hostRect);
    }
    function findConversationContent(root) {
      const candidates = root.querySelectorAll("[data-conversation-content]");
      for (const candidate of candidates) {
        const rect = candidate.getBoundingClientRect();
        if (rect.width > 240 && rect.height > 160) return candidate;
      }
      return null;
    }
    refreshZones();
    applySettings();
    const onResize = () => scheduleRefresh();
    window.addEventListener("resize", onResize);
    document.addEventListener("scroll", scheduleRefresh, true);
    const timer = window.setInterval(scheduleRefresh, 500);
    const onPointerMove = (event) => {
      if (!SETTINGS.fishScatter || !engine) return;
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return;
      engine.pointer({
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height,
        active: true
      });
    };
    const onPointerLeave = () => {
      engine?.pointer({ x: 0, y: 0, active: false });
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("blur", onPointerLeave);
    document.addEventListener("mouseleave", onPointerLeave);
    const api = {
      configure(patch = {}) {
        if (typeof patch.speed === "number") {
          TUNING.speed = patch.speed;
          options = { ...options, speed: TUNING.speed };
          engine?.configure(options);
        }
        if (typeof patch.inkOpacity === "number") updateSettings({ opacity: patch.inkOpacity });
        if (typeof patch.fishSpeed === "number") updateSettings({ fishSpeed: patch.fishSpeed });
        if ("fishCount" in patch) updateSettings({ fishCount: patch.fishCount });
        if (typeof patch.blur === "number") {
          TUNING.blurPx = patch.blur;
          canvas.style.setProperty("--dsh-sharks-blur", `${TUNING.blurPx}px`);
        }
        if (patch.protection) {
          for (const key of ["chat", "composer", "header"]) {
            if (patch.protection[key]) Object.assign(TUNING.protection[key], patch.protection[key]);
          }
          if (typeof patch.protection.minHeight === "number") {
            TUNING.protection.minHeight = patch.protection.minHeight;
          }
          scheduleRefresh();
        }
        if (typeof patch.paused === "boolean") {
          options = { ...options, paused: patch.paused };
          engine?.configure(options);
        }
      },
      refresh: scheduleRefresh,
      applySettings,
      settings: {
        get: () => ({ ...SETTINGS }),
        set: updateSettings
      },
      options: TUNING
    };
    if (window.dshAsciiSharks) delete window.dshAsciiSharks;
    window.dshAsciiSharks = api;
    function zoneSummary() {
      const out = {};
      for (const [name, zone] of Object.entries(zones)) {
        if (zone.style.display === "none") {
          out[name] = { display: "none" };
          continue;
        }
        const r = zone.getBoundingClientRect();
        out[name] = {
          display: "block",
          x: Math.round(r.left),
          y: Math.round(r.top),
          width: Math.round(r.width),
          height: Math.round(r.height),
          opacity: zone.style.opacity,
          filter: zone.style.filter
        };
      }
      return out;
    }
    function inkSample() {
      try {
        const context = canvas.getContext("2d");
        if (!context || !canvas.width || !canvas.height) return null;
        const width = Math.min(canvas.width, 900);
        const height = Math.min(canvas.height, 600);
        const data = context.getImageData(0, 0, width, height).data;
        let nonzero = 0;
        let maxAlpha = 0;
        let samples = 0;
        for (let i = 3; i < data.length; i += 4 * 11) {
          samples++;
          const alpha = data[i];
          if (alpha > 0) nonzero++;
          if (alpha > maxAlpha) maxAlpha = alpha;
        }
        return { width, height, samples, nonzero, maxAlpha };
      } catch (error) {
        return { error: String(error) };
      }
    }
    function paintChain(x, y) {
      const start = document.elementFromPoint(x, y);
      const chain = [];
      let el = start;
      while (el && chain.length < 22) {
        const cs = getComputedStyle(el);
        chain.push({
          tag: el.tagName,
          cls: String(el.className || "").slice(0, 70),
          bg: cs.backgroundColor,
          bgImage: cs.backgroundImage === "none" ? "none" : cs.backgroundImage.slice(0, 80),
          opacity: cs.opacity,
          position: cs.position,
          zIndex: cs.zIndex
        });
        el = el.parentElement;
      }
      return { top: start ? start.tagName : null, chain };
    }
    function status() {
      const frameRect = frame.getBoundingClientRect();
      const content = findConversationContent(frame);
      const root = content && content.parentElement;
      const stats = engine && typeof engine.stats === "function" ? engine.stats() : null;
      const centerX = frameRect.left + frameRect.width / 2;
      const centerY = frameRect.top + frameRect.height / 2;
      const centerStack = typeof document.elementsFromPoint === "function" ? document.elementsFromPoint(centerX, centerY).slice(0, 5).map((el) => ({
        tag: el.tagName,
        cls: String(el.className || "").slice(0, 60),
        insideOceanLayer: host.contains(el)
      })) : [];
      return {
        mounted: host.isConnected,
        url: location.href,
        title: document.title,
        viewport: { width: window.innerWidth, height: window.innerHeight, dpr: window.devicePixelRatio || 1 },
        frame: {
          width: Math.round(frameRect.width),
          height: Math.round(frameRect.height),
          isolation: getComputedStyle(frame).isolation,
          background: getComputedStyle(frame).backgroundColor
        },
        bodyBackground: getComputedStyle(document.body).backgroundColor,
        host: {
          x: Math.round(host.getBoundingClientRect().left),
          y: Math.round(host.getBoundingClientRect().top),
          width: Math.round(host.getBoundingClientRect().width),
          height: Math.round(host.getBoundingClientRect().height),
          zIndex: getComputedStyle(host).zIndex,
          pointerEvents: getComputedStyle(host).pointerEvents
        },
        canvas: { width: canvas.width, height: canvas.height, cssOpacity: getComputedStyle(canvas).opacity, filter: getComputedStyle(canvas).filter },
        engine: stats ? {
          frames: stats.frames,
          simulationTime: Math.round(stats.simulationTime),
          sharks: stats.sharks,
          fish: stats.fish,
          scheduled: stats.scheduled,
          reducedMotion: stats.reducedMotion,
          hidden: stats.hidden
        } : null,
        settings: { ...SETTINGS },
        hosts: document.querySelectorAll(".dsh-ascii-sharks").length,
        conversation: content ? {
          phase: root && root.getAttribute("data-phase"),
          rootBackground: root && getComputedStyle(root).backgroundColor
        } : null,
        layers: {
          paper: { zIndex: getComputedStyle(paper).zIndex, background: getComputedStyle(paper).backgroundColor },
          canvas: { zIndex: getComputedStyle(canvas).zIndex },
          shield: { zIndex: getComputedStyle(shield).zIndex }
        },
        zones: zoneSummary(),
        centerStack,
        htmlBackground: getComputedStyle(document.documentElement).backgroundColor,
        paintCenter: paintChain(centerX, centerY),
        paintGutter: paintChain(frameRect.left + 300, frameRect.top + 320),
        ink: inkSample()
      };
    }
    return {
      status,
      rebuild() {
        const next = readPalette(frame);
        palette = next;
        canvas.style.setProperty("--water-ink", next.ink);
        canvas.style.setProperty("--water-paper", next.paper);
        canvas.style.setProperty("--water-mist", next.mist);
        canvas.style.setProperty("--water-clay", next.clay);
        canvas.style.setProperty("--water-light", next.light);
        canvas.style.setProperty("--dsh-sharks-glow", next.glow);
        applySettings();
        scheduleRefresh();
      },
      refresh: scheduleRefresh,
      dispose() {
        window.clearInterval(timer);
        layoutObserver?.disconnect();
        layoutObserver = null;
        window.removeEventListener("resize", onResize);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("blur", onPointerLeave);
        document.removeEventListener("mouseleave", onPointerLeave);
        document.removeEventListener("scroll", scheduleRefresh, true);
        if (frameRequest) cancelAnimationFrame(frameRequest);
        engine?.destroy();
        engine = null;
        host.remove();
        frame.style.isolation = previousIsolation;
        for (const [surface, background] of touchedSurfaces) {
          if (!surface.isConnected) continue;
          delete surface.dataset.dshSharks;
          if (background) surface.style.setProperty("background", background);
          else surface.style.removeProperty("background");
        }
        touchedSurfaces.clear();
        if (window.dshAsciiSharks === api) delete window.dshAsciiSharks;
      }
    };
  }
  window.__ModuleLoader__.load({
    id: "@local/ascii-sharks",
    factory(require2) {
      const React = require2("react");
      function useSettings() {
        const [state, setState] = React.useState(() => ({ ...SETTINGS }));
        React.useEffect(() => {
          const sync = () => setState({ ...SETTINGS });
          settingsListeners.add(sync);
          return () => settingsListeners.delete(sync);
        }, []);
        return state;
      }
      function useThemeRevision() {
        const [value, setValue] = React.useState(themeRevision);
        React.useEffect(() => {
          const sync = () => setValue(themeRevision);
          settingsListeners.add(sync);
          return () => settingsListeners.delete(sync);
        }, []);
        return value;
      }
      function OceanSwitch({ checked, onChange, label }) {
        return React.createElement("button", {
          type: "button",
          role: "switch",
          "aria-checked": checked,
          "aria-label": label,
          className: "dsh-ocean-switch",
          "data-on": checked ? "true" : "false",
          onClick: () => onChange(!checked)
        }, React.createElement("span"));
      }
      function OceanRow({ title, hint, control }) {
        return React.createElement(
          "div",
          { className: "dsh-ocean-row" },
          React.createElement(
            "div",
            { className: "dsh-ocean-row__copy" },
            React.createElement("span", { className: "dsh-ocean-row__title" }, title),
            hint ? React.createElement("span", { className: "dsh-ocean-row__hint" }, hint) : null
          ),
          React.createElement("div", { className: "dsh-ocean-row__control" }, control)
        );
      }
      function OceanSlider({ value, min, max, step, onChange, format, disabled }) {
        return React.createElement(
          "div",
          { className: "dsh-ocean-row__control" },
          React.createElement("input", {
            type: "range",
            className: "dsh-ocean-range",
            min,
            max,
            step,
            value,
            disabled: disabled === true,
            onChange: (event) => onChange(Number(event.target.value))
          }),
          React.createElement("span", { className: "dsh-ocean-value" }, format(value))
        );
      }
      function OceanSettings() {
        const s = useSettings();
        const themeTick = useThemeRevision();
        const connected = Boolean(live);
        const zh = (document.documentElement.lang || navigator.language || "").toLowerCase().startsWith("zh");
        const dark = document.body.hasAttribute("data-ds-dark-theme");
        const ink = s.inkColor || (dark ? "#eef3f7" : "#5d656c");
        const set = updateSettings;
        const [countDraft, setCountDraft] = React.useState(s.fishCount === null ? 34 : s.fishCount);
        const countTimer = React.useRef(0);
        React.useEffect(() => {
          setCountDraft(s.fishCount === null ? 34 : s.fishCount);
        }, [s.fishCount]);
        React.useEffect(() => () => window.clearTimeout(countTimer.current), []);
        const commitCount = (value, immediate) => {
          window.clearTimeout(countTimer.current);
          setCountDraft(value);
          if (immediate) {
            updateSettings({ fishCount: value });
            return;
          }
          countTimer.current = window.setTimeout(() => updateSettings({ fishCount: value }), 180);
        };
        const previewRef = React.useRef(null);
        const previewEngine = React.useRef(null);
        React.useEffect(() => {
          const canvas = previewRef.current;
          if (!canvas) return void 0;
          if (!s.enabled) {
            previewEngine.current = null;
            canvas.style.opacity = "0";
            return void 0;
          }
          const palette = readPalette(document.body);
          canvas.style.setProperty("--water-ink", palette.ink);
          canvas.style.setProperty("--water-paper", palette.paper);
          canvas.style.setProperty("--water-mist", palette.mist);
          canvas.style.setProperty("--water-clay", palette.clay);
          canvas.style.setProperty("--water-light", palette.light);
          canvas.style.setProperty("--dsh-sharks-glow", palette.glow);
          const specs = (SCENES[s.scene] || SCENES.mixed).map((shark) => ({
            kind: shark.kind,
            size: shark.size * 0.55
          }));
          const engine = new OceanEngine(canvas, specs, {
            paused: !s.enabled,
            frameRate: 30,
            speed: TUNING.speed,
            pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
            interaction: false,
            cellDensity: 150,
            fishCount: s.fishCount === null ? 16 : s.fishCount,
            fishSpeed: s.fishSpeed
          });
          engine.setInkColor(mixInk(s, palette));
          previewEngine.current = engine;
          canvas.style.opacity = String(s.enabled ? s.opacity : 0);
          return () => {
            engine.destroy();
            if (previewEngine.current === engine) previewEngine.current = null;
          };
        }, [s.scene, s.fishCount, s.enabled]);
        React.useEffect(() => {
          const canvas = previewRef.current;
          const engine = previewEngine.current;
          if (!canvas || !engine) return;
          const palette = readPalette(document.body);
          canvas.style.setProperty("--dsh-sharks-glow", palette.glow);
          canvas.style.opacity = String(s.enabled ? s.opacity : 0);
          engine.setInkColor(mixInk(s, palette));
          engine.setFishSpeed(s.fishSpeed);
          engine.configure({
            paused: !s.enabled,
            frameRate: 30,
            speed: TUNING.speed,
            pixelRatio: Math.min(window.devicePixelRatio || 1, 1.5),
            interaction: false,
            cellDensity: 150,
            fishCount: s.fishCount === null ? 16 : s.fishCount,
            fishSpeed: s.fishSpeed
          });
        }, [s.enabled, s.opacity, s.density, s.inkColor, s.fishSpeed, themeTick]);
        return React.createElement(
          "section",
          { className: "dsh-ocean-settings" },
          React.createElement(
            "div",
            { className: "dsh-ocean-settings__head" },
            React.createElement("h2", { className: "dsh-ocean-settings__title" }, zh ? "ASCII 海洋" : "ASCII ocean"),
            React.createElement(
              "p",
              { className: "dsh-ocean-settings__lead" },
              zh ? "对话页背后的一片 ASCII 海。修改会立即生效。" : "An ASCII ocean behind the conversation. Changes apply immediately."
            )
          ),
          React.createElement(
            "div",
            { className: "dsh-ocean-settings__status" },
            React.createElement("span", {
              className: "dsh-ocean-settings__dot",
              "data-off": s.enabled ? void 0 : "true",
              "data-warn": s.enabled && !connected ? "true" : void 0
            }),
            React.createElement("span", null, !s.enabled ? zh ? "已关闭" : "Off" : connected ? zh ? "正在对话页背后运行" : "Running behind the conversation" : zh ? "已启用；当前页面未连接动画层，刷新一次后生效" : "Enabled; this page is not connected to the ocean layer yet")
          ),
          React.createElement(
            "div",
            { className: "dsh-ocean-preview" },
            React.createElement("canvas", {
              ref: previewRef,
              className: "dsh-ocean-preview__canvas",
              "aria-hidden": true
            }),
            React.createElement("div", {
              className: "dsh-ocean-preview__veil",
              style: { opacity: s.veil }
            }),
            s.enabled ? null : React.createElement(
              "div",
              { className: "dsh-ocean-preview__off" },
              zh ? "已关闭" : "Off"
            )
          ),
          React.createElement(
            "p",
            { className: "dsh-ocean-settings__note" },
            zh ? "预览中间的纸色带模拟阅读保护；100% 会完全盖住中间，0% 则露出原样。" : "The paper band simulates the reading veil: 100% fully covers it, 0% shows the raw ocean."
          ),
          React.createElement(
            "div",
            { className: "dsh-ocean-settings__card" },
            React.createElement(OceanRow, {
              title: zh ? "启用" : "Enabled",
              hint: zh ? "总开关；关闭后动画完全停止" : "Stops the animation completely when off",
              control: React.createElement(OceanSwitch, {
                checked: s.enabled,
                label: zh ? "启用 ASCII 海洋" : "Enable ASCII ocean",
                onChange: (value) => set({ enabled: value })
              })
            }),
            React.createElement(OceanRow, {
              title: zh ? "透明度" : "Opacity",
              hint: zh ? "整体墨迹的透明度" : "Overall ink opacity",
              control: React.createElement(OceanSlider, {
                value: s.opacity,
                min: 0.05,
                max: 1,
                step: 0.01,
                onChange: (value) => set({ opacity: value }),
                format: (value) => `${Math.round(value * 100)}%`
              })
            }),
            React.createElement(OceanRow, {
              title: zh ? "浓淡" : "Ink density",
              hint: zh ? "墨色与纸色的混合程度" : "Blend between the ink colour and the paper",
              control: React.createElement(OceanSlider, {
                value: s.density,
                min: 0,
                max: 1,
                step: 0.01,
                onChange: (value) => set({ density: value }),
                format: (value) => `${Math.round(value * 100)}%`
              })
            }),
            React.createElement(OceanRow, {
              title: zh ? "阅读保护" : "Reading veil",
              hint: zh ? "0% 露出原样，100% 完全盖住文字后的墨迹" : "0% raw ocean, 100% fully hides ink behind text",
              control: React.createElement(OceanSlider, {
                value: s.veil,
                min: 0,
                max: 1,
                step: 0.01,
                onChange: (value) => set({ veil: value }),
                format: (value) => `${Math.round(value * 100)}%`
              })
            }),
            React.createElement(OceanRow, {
              title: zh ? "鱼的速度" : "Fish speed",
              hint: zh ? "只影响鱼群；鲨鱼保持自己的节奏" : "Fish only; sharks keep their own pace",
              control: React.createElement(OceanSlider, {
                value: s.fishSpeed,
                min: 0.1,
                max: 3,
                step: 0.05,
                onChange: (value) => set({ fishSpeed: value }),
                format: (value) => `${value.toFixed(2)}×`
              })
            }),
            React.createElement(OceanRow, {
              title: zh ? "鱼的数量" : "Fish count",
              hint: zh ? "“自动”会按窗口面积计算" : "Auto derives the count from the window area",
              control: React.createElement(
                "div",
                { className: "dsh-ocean-row__control" },
                React.createElement(
                  "label",
                  { className: "dsh-ocean-check" },
                  React.createElement("input", {
                    type: "checkbox",
                    checked: s.fishCount === null,
                    onChange: (event) => {
                      if (event.target.checked) {
                        window.clearTimeout(countTimer.current);
                        updateSettings({ fishCount: null });
                      } else {
                        commitCount(34, true);
                      }
                    }
                  }),
                  zh ? "自动" : "Auto"
                ),
                React.createElement("input", {
                  type: "range",
                  className: "dsh-ocean-range",
                  min: 0,
                  max: 80,
                  step: 1,
                  value: s.fishCount === null ? 34 : countDraft,
                  disabled: s.fishCount === null,
                  onChange: (event) => commitCount(Number(event.target.value), false)
                }),
                React.createElement(
                  "span",
                  { className: "dsh-ocean-value" },
                  s.fishCount === null ? zh ? "自动" : "auto" : String(s.fishCount)
                )
              )
            }),
            React.createElement(OceanRow, {
              title: zh ? "墨色" : "Ink colour",
              hint: zh ? "选择墨水的颜色；可跟随主题" : "Pick the ink colour, or follow the theme",
              control: React.createElement(
                "div",
                { className: "dsh-ocean-row__control" },
                React.createElement("input", {
                  type: "color",
                  className: "dsh-ocean-color",
                  value: ink,
                  "aria-label": zh ? "墨色" : "Ink colour",
                  onChange: (event) => set({ inkColor: event.target.value })
                }),
                React.createElement("button", {
                  type: "button",
                  className: "dsh-ocean-linkbtn",
                  onClick: () => set({ inkColor: null })
                }, zh ? "跟随主题" : "Theme")
              )
            }),
            React.createElement(OceanRow, {
              title: zh ? "场景" : "Scene",
              hint: zh ? "混合 / 经典 / 单鲨" : "Mixed / Classic / Solo",
              control: React.createElement(
                "select",
                {
                  className: "dsh-ocean-select",
                  value: s.scene,
                  onChange: (event) => set({ scene: event.target.value })
                },
                React.createElement("option", { value: "mixed" }, zh ? "混合 · 4 种鲨鱼" : "Mixed · four species"),
                React.createElement("option", { value: "classic" }, zh ? "经典 · 4 条" : "Classic · four sharks"),
                React.createElement("option", { value: "solo" }, zh ? "单鲨" : "Solo")
              )
            }),
            React.createElement(OceanRow, {
              title: zh ? "鼠标划过时驱散鱼群" : "Scatter fish on pointer",
              hint: zh ? "鼠标经过动画区域时，鱼群会让开" : "Schools give way when the pointer crosses the water",
              control: React.createElement(OceanSwitch, {
                checked: s.fishScatter,
                label: zh ? "鼠标划过时驱散鱼群" : "Scatter fish on pointer",
                onChange: (value) => set({ fishScatter: value })
              })
            })
          ),
          React.createElement(
            "p",
            { className: "dsh-ocean-footnote" },
            zh ? "设置保存在本机；总开关关闭时动画暂停。" : "Saved on this device; the master switch pauses the animation."
          )
        );
      }
      function SharkLayer() {
        lifecycle = "render";
        const marker = React.useRef(null);
        React.useEffect(() => {
          const style = document.createElement("style");
          style.id = STYLE_ID;
          style.dataset.plugin = "@local/ascii-sharks";
          style.textContent = CSS;
          document.head.appendChild(style);
          const registryKey = "__dshAsciiSharksDisposers";
          const previous = Array.isArray(window[registryKey]) ? window[registryKey].splice(0) : [];
          for (const dispose of previous) {
            try {
              dispose();
            } catch {
            }
          }
          lifecycle = "effect-start";
          let instance = null;
          let cleaned = false;
          const cleanup = () => {
            if (cleaned) return;
            cleaned = true;
            if (live === instance) live = null;
            lifecycle = "disposed";
            instance?.dispose();
            style.remove();
          };
          try {
            instance = mount(marker.current);
            live = instance;
            lifecycle = "mounted";
            const disposers = window[registryKey] || (window[registryKey] = []);
            disposers.push(cleanup);
          } catch (error) {
            lastFailure = String(error && error.stack ? error.stack : error);
            lifecycle = "mount-failed";
            console.error("[ascii-sharks] mount failed", error);
          }
          return () => {
            const disposers = window[registryKey];
            const index = Array.isArray(disposers) ? disposers.indexOf(cleanup) : -1;
            if (index >= 0) disposers.splice(index, 1);
            cleanup();
          };
        }, []);
        return React.createElement("div", { ref: marker, hidden: true });
      }
      return {
        inject: ["slots"],
        apply(ctx) {
          const settingsStyle = document.createElement("style");
          settingsStyle.dataset.plugin = "@local/ascii-sharks";
          settingsStyle.textContent = SETTINGS_CSS;
          document.head.appendChild(settingsStyle);
          ctx.effect(() => () => settingsStyle.remove(), "ascii-sharks: settings styles");
          let themeTimer = 0;
          const syncTheme = () => {
            if (themeTimer) return;
            themeTimer = window.setTimeout(() => {
              themeTimer = 0;
              themeRevision += 1;
              live?.rebuild();
              notifySettings();
            }, 0);
          };
          ctx.on("theme/change", syncTheme);
          if (typeof MutationObserver === "function") {
            const themeObserver = new MutationObserver(syncTheme);
            themeObserver.observe(document.body, { attributes: true, attributeFilter: ["data-ds-dark-theme"] });
            ctx.effect(() => () => {
              themeObserver.disconnect();
              if (themeTimer) window.clearTimeout(themeTimer);
            }, "ascii-sharks: theme observer");
          }
          const inspect = ctx.get("cordisInspect");
          if (inspect !== void 0 && typeof inspect.register === "function") {
            ctx.effect(() => inspect.register({
              manifest: {
                id: "AsciiSharks",
                description: "Read-only diagnostics for the ASCII shark background layer.",
                methods: [{
                  name: "status",
                  description: "Return live layer geometry, animation state, protection zones and a canvas ink sample.",
                  inputSchema: { type: "object", properties: {}, additionalProperties: false },
                  outputSchema: { type: "object", additionalProperties: true }
                }]
              },
              query(method) {
                if (method !== "status") throw new Error(`unknown AsciiSharks inspect method "${method}"`);
                return live ? { ...live.status(), lifecycle, error: lastFailure } : { mounted: false, lifecycle, error: lastFailure };
              }
            }), "ascii-sharks: inspect provider");
          }
          ctx.slots.inject("shell.overlay", () => ctx.slots.register({
            name: "shell.overlay",
            id: "dsh-ascii-sharks-ocean",
            order: 50,
            label: "ASCII sharks"
          }, SharkLayer));
          ctx.slots.inject("settings.section", () => ctx.slots.register({
            name: "settings.section",
            id: "ascii-ocean",
            order: 25,
            label: () => {
              const lang = (document.documentElement.lang || navigator.language || "").toLowerCase();
              return lang.startsWith("zh") ? "ASCII 海洋" : "ASCII ocean";
            }
          }, OceanSettings));
        }
      };
    }
  });
})();
