import { Image } from 'expo-image';

import type { Category } from '@/domain/types';
import { radius } from '@/theme/tokens';

/**
 * The team's own category illustrations (mobile/assets/images/categories). Each image already
 * includes its soft tile background, so the icon is simply shown with rounded corners.
 */
const sources: Record<Category, number> = {
  food: require('@/assets/images/categories/food.png'),
  transport: require('@/assets/images/categories/transport.png'),
  activities: require('@/assets/images/categories/activities.png'),
  shopping: require('@/assets/images/categories/shopping.png'),
};

export interface CategoryIconProps {
  category: Category;
  size?: number;
}

/** Decorative: the category name is always shown as text next to it, so screen readers skip the picture. */
export function CategoryIcon({ category, size = 48 }: CategoryIconProps) {
  return (
    <Image
      source={sources[category]}
      style={{ width: size, height: size, borderRadius: Math.min(radius.tile, size * 0.32) }}
      contentFit="cover"
      accessible={false}
      alt=""
    />
  );
}
