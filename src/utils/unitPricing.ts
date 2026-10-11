import { Product, ProductBatch } from '../types';

export interface SingleTabletPricing {
  isStripOrPack: boolean;
  stripMultiplier: number;
  stripUnitName: string;
  baseUnitName: string;
  singleSellingPrice: number;
  singleCostPrice: number;
  singleProfit: number;
  singleProfitMargin: number;
  singleSellingFormatted: string;
  singleCostFormatted: string;
}

/**
 * Calculates the exact single tablet / unit price, cost, and profit
 * by dividing the strip / pack price by the multiplier (e.g. 10, 15, 30 tablets per strip).
 */
export function getProductSingleTabletPricing(
  product: Product,
  batch?: ProductBatch
): SingleTabletPricing {
  const units = product.units || [];
  
  // Find strip or pack unit with multiplier > 1
  const stripUnit = units.find((u) => !u.isBaseUnit && u.multiplierToBase > 1) ||
    units.find((u) => u.multiplierToBase > 1);
  
  // Find base unit (e.g. Tablet, Capsule, Piece)
  const baseUnit = units.find((u) => u.isBaseUnit || u.multiplierToBase === 1) ||
    units[units.length - 1];

  const stripMultiplier = stripUnit ? Math.max(1, stripUnit.multiplierToBase) : 1;
  const isStripOrPack = stripMultiplier > 1;

  const baseUnitName = baseUnit?.name || product.baseUnit || 'Tablet';
  const stripUnitName = stripUnit?.name || 'Strip';

  // Strip selling price
  const stripSelling = stripUnit?.defaultSellingPrice && stripUnit.defaultSellingPrice > 0
    ? stripUnit.defaultSellingPrice
    : Number(product.sellingPrice || 100);

  // Strip purchase / cost
  const stripPurchase = stripUnit?.defaultPurchasePrice && stripUnit.defaultPurchasePrice > 0
    ? stripUnit.defaultPurchasePrice
    : Number(product.purchasePrice || (stripSelling * 0.75));

  // Single tablet selling price
  let singleSellingPrice = 0;
  if (isStripOrPack) {
    // If base unit has a valid divided price, use it; otherwise strictly divide strip selling by multiplier
    if (baseUnit?.defaultSellingPrice && baseUnit.defaultSellingPrice > 0 && baseUnit.defaultSellingPrice < stripSelling * 0.9) {
      singleSellingPrice = Number(baseUnit.defaultSellingPrice.toFixed(2));
    } else {
      singleSellingPrice = Number((stripSelling / stripMultiplier).toFixed(2));
    }
  } else if (batch?.sellingPricePerBaseUnit && batch.sellingPricePerBaseUnit > 0) {
    singleSellingPrice = Number(batch.sellingPricePerBaseUnit);
  } else {
    singleSellingPrice = Number(product.sellingPrice || 0);
  }

  // Single tablet purchase / cost
  let singleCostPrice = 0;
  if (isStripOrPack) {
    // If base unit has a valid divided cost, use it; otherwise strictly divide strip purchase by multiplier
    if (baseUnit?.defaultPurchasePrice && baseUnit.defaultPurchasePrice > 0 && baseUnit.defaultPurchasePrice < stripPurchase * 0.9) {
      singleCostPrice = Number(baseUnit.defaultPurchasePrice.toFixed(2));
    } else {
      singleCostPrice = Number((stripPurchase / stripMultiplier).toFixed(2));
    }
  } else if (batch?.purchasePricePerBaseUnit && batch.purchasePricePerBaseUnit > 0) {
    singleCostPrice = Number(batch.purchasePricePerBaseUnit);
  } else {
    singleCostPrice = Number(product.purchasePrice || (singleSellingPrice * 0.75));
  }

  // Fallback sanity check: if batch has purchasePricePerBaseUnit mistakenly set to the entire strip price
  if (isStripOrPack && singleCostPrice >= stripPurchase * 0.85 && singleCostPrice > 15) {
    singleCostPrice = Number((singleCostPrice / stripMultiplier).toFixed(2));
  }

  const singleProfit = Math.max(0, Number((singleSellingPrice - singleCostPrice).toFixed(2)));
  const singleProfitMargin = singleCostPrice > 0 ? (singleProfit / singleCostPrice) * 100 : 0;

  const lowerUnit = baseUnitName.toLowerCase();
  let unitShort = 'tab';
  if (lowerUnit.startsWith('tab')) unitShort = 'tab';
  else if (lowerUnit.startsWith('cap')) unitShort = 'cap';
  else if (lowerUnit.startsWith('pie') || lowerUnit.startsWith('pc')) unitShort = 'pc';
  else unitShort = lowerUnit.slice(0, 3);

  return {
    isStripOrPack,
    stripMultiplier,
    stripUnitName,
    baseUnitName,
    singleSellingPrice,
    singleCostPrice,
    singleProfit,
    singleProfitMargin,
    singleSellingFormatted: `₹${singleSellingPrice.toFixed(2)}/${unitShort}`,
    singleCostFormatted: `₹${singleCostPrice.toFixed(2)}/${unitShort}`,
  };
}
