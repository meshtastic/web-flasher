#!/usr/bin/env python3
"""
SVG Style Flattener - Keep style block, add inline fallbacks

Strategy: Add inline fill/stroke as FALLBACKS (not overrides), so both
browsers and non-browser renderers work.
"""

import os
import re
import sys
from pathlib import Path


def parse_css(style_text):
    """Parse CSS text into rules dict."""
    rules = {}
    css = re.sub(r'/\*.*?\*/', '', style_text, flags=re.DOTALL)
    
    for match in re.finditer(r'([^{]+)\{([^}]*)\}', css):
        selectors = match.group(1).strip()
        props = {}
        for prop in match.group(2).split(';'):
            prop = prop.strip()
            if ':' in prop:
                k, v = prop.split(':', 1)
                props[k.strip()] = v.strip()
        
        for sel in selectors.split(','):
            sel = sel.strip()
            if sel.startswith('.'):
                rules[sel[1:]] = props
    
    return rules


def flatten_svg(svg_path):
    """Add inline attrs as fallbacks, keep style block."""
    try:
        with open(svg_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Find style block
        style_match = re.search(r'<style[^>]*>(.*?)</style>', content, re.DOTALL)
        if not style_match:
            return False
        
        rules = parse_css(style_match.group(1))
        if not rules:
            return False
        
        # Replace class="cls" with inline fallbacks (but keep class)
        def replace_class(match):
            class_value = match.group(1)
            classes = class_value.split()
            
            # Collect CSS properties from all classes
            combined = {}
            for c in classes:
                if c in rules:
                    combined.update(rules[c])
            
            if not combined:
                return match.group(0)  # Keep original if no presentation attrs
            
            # Build inline attrs as fallbacks
            attrs = []
            for prop in ('fill', 'stroke', 'stroke-width', 'stroke-miterlimit',
                        'stroke-linecap', 'stroke-linejoin', 'fill-rule'):
                if prop in combined:
                    attrs.append(f'{prop}="{combined[prop]}"')
            
            if not attrs:
                return match.group(0)
            
            # Keep the class, add inline attrs AFTER class
            return f'class="{class_value}" {" ".join(attrs)}'
        
        # Replace class="..." with class + inline fallbacks
        content = re.sub(r'class="([^"]*)"', replace_class, content)
        
        with open(svg_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        return True
    
    except Exception as e:
        print(f"Error {svg_path.name}: {e}")
        return False


def main():
    if len(sys.argv) != 2:
        print("Usage: python3 flatten_fallback.py <dir>")
        sys.exit(1)
    
    dir_path = sys.argv[1]
    files = sorted(Path(dir_path).glob("*.svg"))
    
    processed = 0
    for f in files:
        if flatten_svg(f):
            processed += 1
            print(f"  {f.name}")
    
    print(f"\nProcessed: {processed}/{len(files)}")


if __name__ == "__main__":
    main()