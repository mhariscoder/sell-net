const MetaData = require('../../models/MetaData');

export const ItemSkuMapping = async (skus, search, map) => {
  try {
    return (await MetaData.aggregate([
      {
        $match: {
          [`config.skuMapping.${search}`]: { $in: skus }
        }
      },
      {
        $unwind: '$config.skuMapping'
      },
      {
        $match: {
          [`config.skuMapping.${search}`]: { $in: skus }
        }
      },
      {
        $group: {
          _id: null,
          mapping: {
            $addToSet: {
              [search]: `$config.skuMapping.${search}`,
              [map]: `$config.skuMapping.${map}`,
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          mapping: 1
        }
      }
    ]))[0]?.mapping || [];
  } catch (error) {
    console.error("module => item => func itemSkuMapping", error);
  }
};