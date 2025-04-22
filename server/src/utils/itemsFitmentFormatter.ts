export const itemsFitmentFormatter = async (uniqueSkus, items) => {
  const formattedFitment = [];
  const batchSize = 20;

  for (const chunk of chunkArray(uniqueSkus, batchSize)) {
    await Promise.all(chunk.map(async ({ sku }) => {
      const fitmentRaw = items.filter(item => item.sku === sku);
      if (fitmentRaw) {
        const skuFitment = formatter(fitmentRaw);
        formattedFitment.push({
          sku,
          ItemCompatibilityList: {
            Compatibility: skuFitment,
          },
        });
      }
    }));
  }

  return formattedFitment;
};

const formatter = (fitmentRaw) => {
  return fitmentRaw.map(item => ({
    NameValueList: [
      { Name: "Year", Value: item.year },
      { Name: "Make", Value: item.make_name },
      { Name: "Model", Value: item.model_name },
      // { Name: "Trim", Value: "" },
    ],
    CompatibilityNotes: "",
  }));
};

const chunkArray = (array, size) => {
  const chunkedArray = [];
  for (let i = 0; i < array.length; i += size) {
    chunkedArray.push(array.slice(i, i + size));
  }
  return chunkedArray;
};