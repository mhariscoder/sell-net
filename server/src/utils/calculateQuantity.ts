// Function to calculate quantity
export const CalculateQuantity = (inventoryQuantity, startPrice, quantitySetup) => {
  let quantity = inventoryQuantity;
  let priceRangeUpdated = false;
  let thresholdAdjusted = false;

  // Apply quantity offset if needed
  if (quantitySetup.quantityOffset) {
    const { value, percentage } = quantitySetup.quantityOffset;

    if (percentage) {
      // Apply percentage-based offset
      quantity *= (1 - value / 100);
      quantity = Math.round(quantity);
    } else {
      // Apply unit-based offset
      quantity -= value;
    }

    // Ensure quantity doesn't go below 0
    quantity = Math.max(quantity, 0); 
  }

  // Apply allowed quantity based on price range
  for (const range of quantitySetup.quantitiesByPriceRange) {
    if (startPrice >= range.minPrice && startPrice <= range.maxPrice) {
      quantity = Math.min(quantity, range.allowedQuantity);
      priceRangeUpdated = true;
      break; // No further updates needed
    }
  }

  // Apply max quantity limit if enabled
  if (!priceRangeUpdated && quantitySetup.defaultMaxQuantityLimitEnabled && quantitySetup.defaultMaxQuantityLimit) {
    quantity = Math.min(quantity, quantitySetup.defaultMaxQuantityLimit);
  }

  // Apply quantity threshold adjustments
  for (const adjustment of quantitySetup.quantityThresholdAdjustments) {
    if (adjustment.comparisonOperator === '>') {
      if (quantity > adjustment.thresholdValue) {
        quantity = adjustment.adjustedValue;
        thresholdAdjusted = true;
        break; // No further updates needed
      }
    } else if (adjustment.comparisonOperator === '<') {
      if (quantity < adjustment.thresholdValue) {
        quantity = adjustment.adjustedValue;
        thresholdAdjusted = true;
        break; // No further updates needed
      }
    } else if (adjustment.comparisonOperator === '=') {
      if (quantity === adjustment.thresholdValue) {
        quantity = adjustment.adjustedValue;
        thresholdAdjusted = true;
        break; // No further updates needed
      }
    }
  }

  return quantity;
};