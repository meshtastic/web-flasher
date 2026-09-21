# Device SVG Assets

Copyright © 2024 Meshtastic LLC. All Rights Reserved.

## Asset License Exception

While the code in this repository is licensed under the GNU GPLv3, the device illustrations contained in this directory are not covered by the GPLv3.

These assets are proprietary and protected by international copyright laws. Unauthorized reproduction, distribution, modification, or use of these assets is strictly prohibited except as Meshtastic LLC permits in writing.

Each file is an original illustration of a device sold by its manufacturer. The drawing is Meshtastic's work. The product it depicts, and that manufacturer's own logos, marks, and trade dress, remain theirs, and this notice grants no right to either.

## SVG Export Guidelines

When adding new device SVG assets, please follow these guidelines to ensure cross-renderer compatibility (browsers, Coil, Skiko, Desktop, Linux file managers, etc.).

### Preferred Format

Use inline SVG presentation attributes directly on elements:

```xml
<path fill="#232527" stroke="#d9ddd6" stroke-width="0.25" d="..." />
```

### Acceptable (with fallback)

CSS class-based styling is acceptable if inline fallbacks are also provided:

```xml
<style>.cls-1{fill:#232527}</style>
<path class="cls-1" fill="#232527" d="..." />
```

This approach works in both browsers (using CSS) and non-browser renderers (using inline attributes).

### Not Preferred

CSS class-based styling without inline fallbacks:

```xml
<style>.cls-1{fill:#232527}</style>
<path class="cls-1" d="..." />
```

### Export Rules

1. **Use inline attributes**: Prefer inline `fill`, `stroke`, `stroke-width`, etc. directly on SVG elements
2. **Or use fallbacks**: If using `<style>` blocks, always add corresponding inline attributes as fallbacks
3. **Avoid `style` attributes**: Inline `style="..."` attributes are less portable
4. **No CSS variables**: Avoid `currentColor`, CSS custom properties
5. **No external references**: No external fonts, images, or URL-based assets
6. **Use explicit attributes**: Prefer `fill="none"` over omitting fill for shapes that need strokes

### Automation

The `scripts/add_svg_inline_fallbacks.py` script adds inline fallbacks to SVGs that use CSS classes:

```bash
python3 scripts/add_svg_inline_fallbacks.py public/img/devices/
```

This script:
- Parses `<style>` blocks and extracts CSS rules
- Adds inline presentation attributes to elements as fallbacks
- Preserves the original `<style>` block for browser compatibility
- Works with both `class=` attributes and inline `style=` attributes