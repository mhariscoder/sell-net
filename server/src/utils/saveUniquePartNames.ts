const MetaData = require('../../models/MetaData');

export const saveUniquePartNames = async (uniquePartName) => {
  try {
    const matchingPartNames = await MetaData.aggregate([
      {
        $match: {
          type: 'itemPartNames'
        }
      },
      {
        $unwind: '$config.partNames'
      },
      {
        $match: {
          'config.partNames': {
            $in: uniquePartName
          }
        }
      },
      {
        $group: {
          _id: null,
          matchingPartNames: { $addToSet: '$config.partNames' }
        }
      },
      {
        $project: {
          _id: 0,
          matchingPartNames: 1
        }
      }
    ]);

    const duplicatePartNames = matchingPartNames?.length > 0
      ? matchingPartNames[0].matchingPartNames
      : [];
    
    const partNamesToPush = uniquePartName.filter(partName => !duplicatePartNames.includes(partName));

    await MetaData.findOneAndUpdate(
      { type: 'itemPartNames' },
      { $push: { 'config.partNames': { $each: partNamesToPush } } },
      { new: true, upsert: true }
    );
    
  } catch (error) {
    console.error("module => item => func saveUniquePartNames", error);
  }
};