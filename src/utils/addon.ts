export type AddonSelectionMode = 'SINGLE' | 'MULTIPLE';

export function getAddonSelectionMode(category?: string | null): AddonSelectionMode {
  const normalizedCategory = (category || '').trim().toLowerCase();

  return normalizedCategory.includes('ice') || normalizedCategory.includes('sugar')
    ? 'SINGLE'
    : 'MULTIPLE';
}
