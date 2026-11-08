/**
 * A device's `images` in the hardware list also carries its 3D model files
 * (`<name>.usdz`, `<name>.glb`) after its illustrations. Those are served from
 * `/models/devices/`, not `/img/devices/`, so everything here that draws or
 * counts a device's images works from the illustrations alone.
 */
const MODEL_EXTENSIONS = ['.usdz', '.glb']

export function deviceIllustrations(images?: string[]): string[] | undefined {
  return images?.filter(image => !MODEL_EXTENSIONS.some(ext => image.toLowerCase().endsWith(ext)))
}
