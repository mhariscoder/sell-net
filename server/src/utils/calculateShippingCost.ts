// Function to calculate the shipping cost based on supplier configuration and inventory item
export const CalculateShippingCost = async (shippingInfo, inventoryItem, sku) => {
  // Get the shipping cost from the supplier configuration for the inventory item"s SKU
  let shippingCost = (shippingInfo && shippingInfo.fixedShippingCost && shippingInfo.fixedShippingCost[sku]) || 0;

  // If no specific shipping cost is available for the SKU, find appropriate shipping cost based on weight
  if (!shippingCost && shippingInfo?.weightShippingCost && inventoryItem.weightLb) {
    const itemWeight = inventoryItem.weightLb; // weight of the item in pounds

    // Find the appropriate shipping cost based on the item's weight
    let applicableShippingCost = null;
    for (const costInfo of shippingInfo.weightShippingCost) {
      if (itemWeight >= costInfo.minWeight && itemWeight <= costInfo.maxWeight) {
        applicableShippingCost = costInfo.cost;
        break;  // Found the applicable cost, no need to continue the loop
      }
    }

    if (applicableShippingCost !== null) {
      // Shipping cost based on weight is available
      shippingCost = applicableShippingCost;
    } else {
      // console.log('No specific shipping cost available for the SKU. Unable to calculate shipping cost based on weight.');
    }
  }

  if (!shippingCost && sku.includes(" ") && shippingInfo?.fixedShippingCost) {
    if (shippingInfo.fixedShippingCost[sku]) {
      shippingCost = shippingInfo.fixedShippingCost[sku] || 0;
    }

    if (!shippingCost && shippingInfo.fixedShippingCost[sku.split(" ")[0]] && shippingInfo.fixedShippingCost[sku.split(" ")[1]]) {
      shippingCost = (shippingInfo.fixedShippingCost[sku.split(" ")[0]] + shippingInfo.fixedShippingCost[sku.split(" ")[1]]) || 0;
    }
}

  return shippingCost;
};