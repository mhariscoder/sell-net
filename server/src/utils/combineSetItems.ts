const nonCombinablePricesForSet = ['shipping'];

export const CombineSetItems = (inventoryItems, listingSkus, suppliers) => {
  let combinedSetItems = [];

  const suppliersConfigs = Object.keys(suppliers)
    .filter((key) => key.includes('config'))
    .map((key) => suppliers[key]);

  for (const supplier of suppliersConfigs) {
    const supplierItems = inventoryItems
      .filter((item) => item.supplierId.toString() === supplier._id.toString());

    if (supplierItems?.length < 2) {
      continue;
    }

    const includesFullSet = supplierItems
      .filter((item) => listingSkus.includes(item[`${supplier.itemIdentifier}`]));

    if (includesFullSet.length === 0) continue;

    const combinedSet = supplierItems.reduce((set, item, index) => {
      if (index === 0) {
        set = item;
        return set;
      }

      const setPrices = set.prices;
      const itemPrices = item.prices;

      Object.keys(setPrices).forEach(priceType => {
        if (!nonCombinablePricesForSet.includes(priceType)) {
          set.prices[priceType] += itemPrices[priceType];
        }
        else if (set.prices[priceType] < itemPrices[priceType]) {
          set.prices[priceType] = itemPrices[priceType];
        }
      });

      if (item.quantity < set.quantity) {
        set.quantity = item.quantity;
      }

      set.description = `${set.description},\n${item.description}`
      if (set?.weightLb) {
        set.weightLb += item.weightLb;
      }

      return set;  // Return the updated set for the next iteration
    }, {});  // Initial value for the reduce function

    if (combinedSet) {
      combinedSetItems = [
        ...combinedSetItems,
        combinedSet
      ];
    }
  }

  return combinedSetItems;
};