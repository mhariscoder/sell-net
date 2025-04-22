// Function to check if inventory has changed
export const HasInventoryChanged = (listing, inventoryItem) => {
  const isQuantityEqual =
    typeof listing.inventoryInfo?.quantity === 'number' &&
    listing.inventoryInfo.quantity === inventoryItem.quantity;
  const arePricesEqual = listing.inventoryInfo ? JSON.stringify(listing.inventoryInfo.prices) === JSON.stringify(inventoryItem.prices) : false;
  const isUpdateTypeNotReSync = listing.updateType !== 'reSync';

  return !(isQuantityEqual && arePricesEqual && isUpdateTypeNotReSync);
};