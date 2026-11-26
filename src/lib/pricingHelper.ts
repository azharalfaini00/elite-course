import { Discount } from '../types/elite';
import { formatRupiah } from './format';

export interface EffectiveDiscount {
  hasDiscount: boolean;
  originalPrice: number;
  finalPrice: number;
  discountAmount: number;
  discountLabel: string;
  discountName?: string;
  discountType?: 'percentage' | 'fixed';
}

/**
 * Calculates effective automatic discount for a given program and base price.
 * Automatic discounts are those where `code` is empty or not set.
 */
export function calculateEffectiveDiscount(
  programId: string,
  basePrice: number,
  discounts: Discount[],
  levelId?: string
): EffectiveDiscount {
  if (!discounts || discounts.length === 0 || basePrice <= 0) {
    return {
      hasDiscount: false,
      originalPrice: basePrice,
      finalPrice: basePrice,
      discountAmount: 0,
      discountLabel: '',
    };
  }

  let todayWIB = '';
  try {
    todayWIB = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  } catch {
    todayWIB = new Date().toISOString().slice(0, 10);
  }
  const todayUTC = new Date().toISOString().slice(0, 10);

  const activeAutoDiscounts = discounts.filter((d) => {
    if (d.isActive !== true) return false;
    // Automatic discount: code is empty
    if (typeof d.code === 'string' && d.code.trim().length > 0) return false;

    const start = String(d.startDate || '').trim();
    const end = String(d.endDate || '').trim();
    if (start && todayWIB < start && todayUTC < start) return false;
    if (end && todayWIB > end && todayUTC > end) return false;

    const applicableLevels = Array.isArray(d.applicableLevelIds) ? d.applicableLevelIds : [];
    if (applicableLevels.length > 0) {
      if (!levelId || !applicableLevels.includes(levelId)) return false;
    } else {
      const applicable = Array.isArray(d.applicableProgramIds) ? d.applicableProgramIds : [];
      if (applicable.length > 0 && !applicable.includes(programId)) return false;
    }

    return true;
  });

  if (activeAutoDiscounts.length === 0) {
    return {
      hasDiscount: false,
      originalPrice: basePrice,
      finalPrice: basePrice,
      discountAmount: 0,
      discountLabel: '',
    };
  }

  let bestDiscount: Discount | null = null;
  let maxDiscountAmount = 0;

  for (const d of activeAutoDiscounts) {
    const dVal = Number(d.value || 0);
    let amount = 0;
    if (d.discountType === 'percentage') {
      amount = Math.round((basePrice * Math.min(dVal, 100)) / 100);
    } else {
      amount = Math.round(Math.min(dVal, basePrice));
    }
    if (amount > maxDiscountAmount) {
      maxDiscountAmount = amount;
      bestDiscount = d;
    }
  }

  if (!bestDiscount || maxDiscountAmount <= 0) {
    return {
      hasDiscount: false,
      originalPrice: basePrice,
      finalPrice: basePrice,
      discountAmount: 0,
      discountLabel: '',
    };
  }

  const finalPrice = Math.max(0, basePrice - maxDiscountAmount);
  const discountLabel =
    bestDiscount.discountType === 'percentage'
      ? `-${bestDiscount.value}%`
      : `-${formatRupiah(bestDiscount.value)}`;

  return {
    hasDiscount: true,
    originalPrice: basePrice,
    finalPrice,
    discountAmount: maxDiscountAmount,
    discountLabel,
    discountName: bestDiscount.name,
    discountType: bestDiscount.discountType,
  };
}
