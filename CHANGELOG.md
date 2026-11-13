# Changelog

## 1.7.0

- Theme changes retint in place; the fish and sharks keep their positions instead of reseeding.
- Theme sync now waits for the Harness tokens and updates the settings preview too.
- Dark mode uses near-white ink with a faint cool glow; light mode uses slate ink.
- The enable switch writes the disabled state and canvas opacity directly to every ocean host, so it takes effect without a restart.
- The settings page gained a live preview with a simulated reading veil, an in-app reading-protection slider, fish speed/count, ink colour, scene and pointer scatter.
- Stale ocean hosts from hot-reloaded client generations are removed; previous instances are disposed through a page-level registry.

## 1.0.0

- Initial local Harness bundle: Mixed/Classic/Solo ASCII shark scenes, fish schools, feathered reading protection, theme-aware paper and ink.
