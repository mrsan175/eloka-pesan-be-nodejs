import type { AddonCategory } from '@prisma/client';

export type AddonSelectionMode = 'SINGLE' | 'MULTIPLE';

export function getAddonSelectionMode(category?: Pick<AddonCategory, 'selectionMode'> | null): AddonSelectionMode {
  return category?.selectionMode === 'SINGLE' ? 'SINGLE' : 'MULTIPLE';
}
