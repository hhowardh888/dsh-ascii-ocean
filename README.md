<p align="center">
  <img src="icon.svg" width="72" height="72" alt="ASCII Ocean icon">
</p>

<h1 align="center">ASCII Ocean for DeepSeek Harness</h1>

<p align="center"><strong>A quiet, real-time ASCII ocean behind your conversation.</strong></p>

A local [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) client
plugin: ink-like sharks and small fish schools drift behind the conversation, while
a feathered reading area keeps the title, transcript, composer and buttons clear.
It is a bundled Harness UI plugin — no separate web page, dev server, wallpaper
app, network request or image asset is used at runtime.

The animation is computed every frame: fish are boids, each shark is an articulated
20-node spine, and every glyph is rasterised into a Canvas. Nothing is a video or
a sprite sheet.

## Features

- **Mixed, Classic and Solo scenes** — hammerhead, tiger, mako and thresher in
  Mixed; four classic sharks; or one shark, with the original fish schools.
- **Real swimming** — stable heads, articulated tails, slow turns, stroke-and-glide
  speed changes, fish schooling, predator avoidance and a few pale fish groups.
- **Reading protection** — a blurred paper veil follows the actual transcript
  column, composer and header. It fades the ink behind text with a wide feather,
  never a hard rectangle, and can be tuned from 0–100%.
- **Light and dark themes** — light mode uses slate ink on the page white; dark
  mode uses near-white ink with a faint cool glow. Theme changes retint in place,
  so the fish keep swimming instead of restarting.
- **In-app settings** — enable/disable, opacity, ink density, reading protection,
  fish speed, fish count, ink colour, scene and optional pointer scattering.
- **Considerate runtime** — 30 FPS cap, 1.5× DPR cap, pause when the page is
  hidden, static under `prefers-reduced-motion`, and no pointer capture over the
  interface.

## Requirements

- DeepSeek Harness with local plugin bundles (Desktop or Web). Tested against
  Harness **0.2.2-rc.1**.
- No build tooling is needed to use the plugin: `client.js` is committed.
- Node.js 20+ and npm are only needed to rebuild the bundle.

## Install

1. Clone this repository:

   ```sh
   git clone https://github.com/<your-user>/dsh-ascii-ocean.git
   cd dsh-ascii-ocean
   ```

2. Install it as a Harness bundle. In the Harness UI open
   **Settings → Plugins → Install bundle** and choose this directory. From an
   agent session the same operation is:

   ```
   plugin_manager install_bundle /absolute/path/to/dsh-ascii-ocean
   ```

   The bundle is enabled automatically and is added to the active profile's
   `dsh.profile.bundles`.

3. Reload the Harness page once so the client module is loaded. Open
   **Settings → ASCII Ocean** to configure it.

The package id is `@local/ascii-sharks`; this id is also the Client module id in
`build/entry.js`, so keep all three in sync if you rename it:

- `package.json` → `name`
- `cordis.patch.yml` → `name`
- `build/entry.js` → `__ModuleLoader__.load({ id: ... })`
- rebuild `client.js`

To remove the plugin, remove `@local/ascii-sharks` in the Harness Plugin Manager.
The source directory is not deleted; the plugin's `localStorage` key becomes inert.

## Settings

Open **Settings → ASCII Ocean**. The panel is part of the plugin; it renders a
live preview at the top, including a paper band that simulates the reading veil.

| Control | Effect |
| --- | --- |
| 启用 / Enable | Stops and destroys the ocean engine; turning it back on recreates it. |
| 透明度 / Opacity | Overall ink opacity. |
| 浓淡 / Ink density | Blends ink toward the paper colour. |
| 阅读保护 / Reading veil | 0% shows the raw ocean behind text; 100% fully hides it. |
| 鱼的速度 / Fish speed | Fish-only multiplier; sharks keep their own pace. |
| 鱼的数量 / Fish count | Auto (window-area formula) or a fixed number. |
| 墨色 / Ink colour | Custom ink, or follow the theme. |
| 场景 / Scene | Mixed, Classic or Solo. |
| 鼠标划过时驱散鱼群 / Pointer scatter | Fish give way when the pointer crosses the ocean. |

Settings apply live and persist in `localStorage` under
`dsh-ascii-sharks.settings.v1` (per browser origin).

## How it works

- The Client half is registered into `shell.overlay`. It appends a host element to
  the Harness frame, gives the frame `isolation: isolate`, and places the host at
  `z-index: -1` so it sits above the frame background and below every column.
- The host contains three layers: a theme paper surface (`z-index: 0`), the ink
  canvas (`z-index: 1`) and the protection shield (`z-index: 2`). The shield is a
  set of blurred paper rectangles; the conversation remains above all three.
- The conversation root and its center-column surface are made transparent so the
  ocean shows through. Both are restored when no conversation is present, which
  keeps settings/plugins panels opaque.
- Protected geometry comes from stable Harness markers:
  `[data-conversation-content]`, `[data-conversation-scroll]`,
  `[data-chat-flow]`, `[data-composer-seat]` and the conversation header. It is
  re-measured on window resize, scroll, sidebar/composer resize and a 500 ms
  interval.
- Pointer events are passive and never intercept clicks, selection, scrolling or
  typing. The canvas layer is `pointer-events: none`.
- The theme observer waits for Harness to apply its design tokens, then retints the
  existing renderer instead of rebuilding the world.

### Source map

| Path | Responsibility |
| --- | --- |
| `build/entry.js` | Client plugin, mounting, protection geometry, settings page, persistence |
| `src/world.ts` | Fish schools, shark steering, moments, predation and respawn |
| `src/renderer.ts` | Glyph atlas, ink sampling, ASCII rendering, fish glyphs |
| `src/motion.ts` · `src/shapes.ts` | Swimming spine and species silhouettes |
| `src/engine.ts` | Fixed-step loop, frame cap, visibility and reduced motion |
| `src/species.ts` | Per-species fish cruise/school behaviour |
| `client.js` | Built browser bundle (committed) |

## Development

```sh
npm install
npm run build     # rebuild client.js from build/entry.js and src/
npm run check     # node --check client.js
```

`client.js` is generated by esbuild and committed so users do not need a build
step. After changing `src/` or `build/entry.js`, run `npm run build` and reload
the Harness page. There is no dev server and no standalone HTML preview.

The CI workflow in `.github/workflows/build.yml` builds and syntax-checks the
bundle on every push.

## Performance

The simulation is light: four sharks and the configured fish count over a spatial
hash, at a fixed 1/60 s step. Rendering is capped at 30 FPS at 1.5× DPR; only cells
touched by a shark or fish are drawn. The main per-frame costs are the Canvas draw
and the CSS `blur`/`drop-shadow` filters; the dark-mode glow is the most expensive
effect. The settings preview is a second small engine while the panel is open and
is destroyed when it closes.

For a slower machine, lower `frameRate`, `pixelRatio` or `cellDensity` in
`build/entry.js`'s `TUNING`, reduce the fish count in the settings page, or clear
the glow string in `readPalette`.

## Compatibility and caveats

- The plugin relies on the Harness slot and DOM markers above. A Harness update
  that changes `data-conversation-content`/`data-chat-flow`/composer geometry may
  need a matching update here.
- The ocean is intentionally visible behind the conversation only. Settings and
  plugin pages keep their opaque surfaces and cover it.
- The package is a local Harness bundle, not an npm package; `private` is set.
- macOS system appearance reaches the plugin while Harness Appearance is
  **System/跟随系统**. A forced Harness theme is followed instead.

## Credits and license

Released under the [MIT License](LICENSE).

The ocean simulation, ASCII renderer, shark geometry and mixed-scene behaviour are
adapted from [s1egg/ascii-sharks-wallpaper](https://github.com/s1egg/ascii-sharks-wallpaper)
and its upstream [stackedlol/ascii-sharks](https://github.com/stackedlol/ascii-sharks).
The original MIT license and adaptation notes are preserved in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

This project is not affiliated with DeepSeek. "DeepSeek Harness" is the host
application this plugin extends.
