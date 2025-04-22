
const MarketplaceConfig = require('../../models/MarketplaceConfig');

export const MapPartNameToCategories = async (items) => {
  try {
    const uniquePartNames = items.map(item => item.part_name);

    const mappings = await MarketplaceConfig.aggregate([
      {
        $match: {
          marketplace: "ebay"
        }
      },
      {
        $unwind: "$config.partNamesToCategoryMapping"
      },
      {
        $match: {
          "config.partNamesToCategoryMapping.partNames": {
            $in: uniquePartNames
          }
        }
      },
      {
        $group: {
          _id: "$_id",
          mappings: { $push: "$config.partNamesToCategoryMapping" }
        }
      },
      {
        $project: {
          _id: 0,
          mappings: 1
        }
      }
    ]);

    const partNameMappings = mappings?.length > 0
      ? mappings[0].mappings
      : [];

    return uniquePartNames
      .map(partName => {
        const categoryId = partNameMappings
          .find(obj => obj?.partNames?.includes(partName))?.category;
        
        return {
          categoryId,
          partName
        }
      })
      .filter(obj => obj.categoryId);
  } catch (error) {
    console.error("module => ebay => func mapPartNameToCategories", error);
  }
};