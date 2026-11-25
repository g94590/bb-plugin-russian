/** A translation may fill text slots, but must never rearrange or inject DOM. */
export function inlineMarkers(source: string): string[] {
  return source.match(/__BB_(?:NODE|FIXED)_[A-Z]+__/g) ?? [];
}
export function decodeInline(translation: string, markers: string[]): string[] | null {
  if (!markers.length) return null;
  let rest = translation;
  const slots: string[] = [];
  for (const marker of markers) {
    if (rest.split(marker).length !== 2) return null;
    const index = rest.indexOf(marker);
    const slot = rest.slice(0, index);
    if (!slots.length && slot.trim()) return null;
    slots.push(slot);
    rest = rest.slice(index + marker.length);
  }
  if (rest.trim()) return null;
  const result = slots.slice(1);
  for (let i = 0; i < result.length; i++) if (markers[i]!.startsWith('__BB_FIXED_') && result[i]!.trim()) return null;
  return result;
}
