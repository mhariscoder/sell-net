export const GetMatchingInventoryItems = (listingSku, listingIsSet, store, supplierInventoryMaps) => {
  // Create an array of SKUs based on the listingSku and listingIsSet
  const listingSkus = listingIsSet ? listingSku : [listingSku];

  // Initialize the array to hold the matched inventory items
  const inventoryItems = supplierInventoryMaps.reduce((result, { supplierId, itemMap }) => {
    if (store?.supplierIds?.map(id => id.toString()).includes(supplierId.toString())) {
      const items = listingSkus.map(sku => {
        let item = itemMap[sku];

        // If item is undefined, try to find a matching SKU
        if (!item) {
          const matchingSku = Object.keys(itemMap)
            .find((supplierSku) => supplierSku.split(',').includes(sku));

          item = itemMap[matchingSku];
        }

        return item;
      });

      // Filter out undefined items and add to result
      items
        .filter(item => item !== undefined)
        .forEach(item => {
          result.push({
            ...item,
            supplierId
          });
        });
    }

    return result;
  }, []);

  return inventoryItems;
};