const PriceCalculatorSupplier = require("./priceCalculatorSupplier");
const { calculateShippingCost } = require("./calculateShippingCost");
const { calculateQuantity } = require("./calculateQuantity");

export const BestSupplierItemOption = async (inventoryItems, listing, store, suppliers) => {
  if (inventoryItems.length === 1) return inventoryItems[0];

  const sourcingSetup = store.sourcingSetup;

  // Sort inventory items by supplier priority
  inventoryItems.sort((a, b) => {
    const priorityA = sourcingSetup.supplierSourcingPriority.find(
      (supplier) => supplier.supplierId.toString() === a.supplierId.toString()
    ).priority;
    const priorityB = sourcingSetup.supplierSourcingPriority.find(
      (supplier) => supplier.supplierId.toString() === b.supplierId.toString()
    ).priority;
    return priorityA - priorityB;
  });

  // Initialize best option variables
  let bestOption = null;
  let highestPriorityTolerance = null;
  let nextBestOptionSupplierId = null;

  let supplierNotTake = [];

  priorityLoop: for (let i = 0; i < inventoryItems.length; i++) {
    const inventoryItemA = inventoryItems[i];
    const supplierIdA = inventoryItemA.supplierId;

    // console.log("Main", supplierIdA)

    if (nextBestOptionSupplierId && nextBestOptionSupplierId !== supplierIdA.toString()) {
      // console.log("lock 1")
      continue priorityLoop;
    }

    // Get the offset tolerance for the current supplier based on priority
    const supplierToleranceA = sourcingSetup.supplierTolerance.find(
      (tolerance) => tolerance.supplierId.toString() === supplierIdA.toString()
    );

    // Store the highest priority supplier and its tolerance
    highestPriorityTolerance = supplierToleranceA;

    // Calculate selling price for the first inventory item
    const supplierConfigA = suppliers[`${supplierIdA}-config`];
    const shippingInfoA = suppliers[`${supplierIdA}-shipping`];
    const shippingCostA = await calculateShippingCost(
      shippingInfoA,
      inventoryItemA,
      listing.sku
    );

    const calculatorA = PriceCalculatorSupplier.getCalculator(
      supplierConfigA.supplier,
      1,
      inventoryItemA.prices,
      supplierConfigA.priceFormulas,
      shippingCostA
    );

    let { price: sellingPriceA, formula: priceFormulaA } = calculatorA.calculate();

    // Check for errors
    if (!sellingPriceA) {
      // console.log("lock 2")
      continue; // Skip to the next item in case of an error
    }

    const quantitySetup = sourcingSetup.quantitySetup
      .find((supplier) => supplier.supplierId.toString() === supplierIdA.toString());

    const calculatedQuantity = calculateQuantity(
      inventoryItemA.quantity,
      sellingPriceA * (store.supplierMarkUps.find(obj => obj.supplierId.toString() === supplierIdA.toString()).markUpPercent / 100) + 1,
      quantitySetup
    );

    // Check if stockAvailabilityFallback is enabled and item has no stock
    if (highestPriorityTolerance.stockAvailabilityFallback && calculatedQuantity <= 0) {
      // console.log("lock 3")
      supplierNotTake.push(supplierIdA.toString())
      continue priorityLoop; // Skip to the next item
    }

    // Create a new inventoryItems array for the inner loop
    const innerInventoryItems = [...inventoryItems]
      .filter((item) => item.supplierId.toString() !== inventoryItemA.supplierId.toString())
      .filter((item) => !supplierNotTake.includes(item.supplierId.toString()));

    let optionSupplierIds = [];
    let highestPriceDifference = -Infinity;

    for (let j = 0; j < innerInventoryItems.length; j++) {
      const inventoryItemB = innerInventoryItems[j];
      const supplierIdB = inventoryItemB.supplierId;

      // console.log(supplierIdB)

      const supplierToleranceB = sourcingSetup.supplierTolerance.find(
        (tolerance) => tolerance.supplierId.toString() === supplierIdB.toString()
      );

      const supplierConfigB = suppliers[`${supplierIdB}-config`];

      if (supplierToleranceB.stockAvailabilityFallback && inventoryItemB.quantity <= 0) {
        optionSupplierIds.push(supplierIdB.toString());
        continue; // Skip to the next item
      }

      // Calculate selling price for the second inventory item
      const shippingInfoB = suppliers[`${supplierIdB}-shipping`];
      const shippingCostB = await calculateShippingCost(
        shippingInfoB,
        inventoryItemB,
        listing.sku
      );

      const calculatorB = PriceCalculatorSupplier.getCalculator(
        supplierConfigB.supplier,
        1,
        inventoryItemB.prices,
        supplierConfigB.priceFormulas,
        shippingCostB
      );

      let { price: sellingPriceB, formula: priceFormulaB } = calculatorB.calculate();

      // Check for errors
      if (!sellingPriceB) {
        continue; // Skip to the next item in case of an error
      }

      // Calculate price differences between suppliers
      const priceDifference = sellingPriceA - sellingPriceB;

      // console.log(priceDifference)
      // console.log(highestPriceDifference)

      if (priceDifference > highestPriceDifference) {
        highestPriceDifference = priceDifference;
        nextBestOptionSupplierId = supplierIdB.toString();
      }

      // Use the price tolerance of the highest priority supplier
      const priceTolerance = highestPriorityTolerance.priceOffsetTolerance.percentage
        ? sellingPriceA * (highestPriorityTolerance.priceOffsetTolerance.value / 100)
        : highestPriorityTolerance.priceOffsetTolerance.value;

      // Check if both items meet tolerance criteria
      if (priceDifference <= priceTolerance || i === (inventoryItems.length - 1)) {
        bestOption = inventoryItemA;
        optionSupplierIds.push(supplierIdB.toString());
      }
    }

    if (optionSupplierIds.length === innerInventoryItems.length) {
      break priorityLoop;
    }
  }

  // If no option meets the tolerance, return the best option found
  if (bestOption) {
    return bestOption;
  }

  // If no option meets the tolerance, return the lowest-priced item
  return inventoryItems[0];
};