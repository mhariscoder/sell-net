const MetaData = require('../../models/MetaData');

const customVariables = [
  "year-range",
  "set-count",
  "set-of",
  "kit-count",
  "kit-of",
];

const getYearRanges = (compatibility) => {
  const makeYearMap = {};

  compatibility.forEach(entry => {
    const make = entry.NameValueList.find(item => item.Name === 'Make').Value;
    const year = entry.NameValueList.find(item => item.Name === 'Year').Value;

    if (!makeYearMap[make]) {
      makeYearMap[make] = { minYear: year, maxYear: year };
    } else {
      makeYearMap[make].minYear = Math.min(makeYearMap[make].minYear, year);
      makeYearMap[make].maxYear = Math.max(makeYearMap[make].maxYear, year);
    }
  });

  const result = Object.keys(makeYearMap).map(make => {
    const range = `${makeYearMap[make].minYear}-${makeYearMap[make].maxYear}`;
    return { make, range };
  });

  return result;
};

export const ItemsTitleGenerator = async (items, uniqueSkus, variablesOnly = false) => {
  const titleFormatType = variablesOnly
    ? "searchTitleFormats"
    : "itemTitleFormats";
  
  const marketplaceConfig = await MetaData.aggregate([
    {
      $match: {
        type: titleFormatType
      }
    },
    {
      $project: {
        [titleFormatType]: `$config.${titleFormatType}`
      }
    }
  ]);

  const itemsGeneratedTitle = [];

  items.forEach(item => {
    const titleFormat = marketplaceConfig[0][titleFormatType]
      ?.find(obj => parseInt(obj.categoryId) === parseInt(item.categoryId))
      ?.format;

    if (!titleFormat) return;

    const regex = /\{(.*?)\}/g;
    const variables = titleFormat.match(regex)
      .map(match => match.replace(/\{|\}/g, ''));

    const variableValues = {};
    const customVariablesInFormat = variables.filter(v => customVariables.includes(v));

    let missingCustomVariable = false;
    let multiplesCustomRan = false;

    const rawItem = uniqueSkus.find(obj => obj.sku === item.sku);

    variables.forEach(variable => {
      const value = rawItem[variable];

      if (value) {
        variableValues[variable] = value;
      } else if (variable === "year-range") {
        variableValues[variable] = getYearRanges(item.compatibility)[0].range;
      } else if (/(KIT)/.test(item.sku) && variable.includes("kit") && !multiplesCustomRan) {
        multiplesCustomRan = true;
        if (variable === "kit-count") {
          variableValues[variable] = `Kit of ${item.partslink.split(" ").length}`;
        } else if (variable === "kit-of") {
          variableValues[variable] = `Kit of`;
        } else {
          missingCustomVariable = true;
        }
      } else if (/(SET)/.test(item.sku) && variable.includes("set") && !multiplesCustomRan) {
        multiplesCustomRan = true;
        if (variable === "set-count") {
          variableValues[variable] = `Set of ${item.partslink.split(" ").length}`;
        } else if (variable === "set-of") {
          variableValues[variable] = `Set of`;
        } else {
          missingCustomVariable = true;
        }
      }
    });


    if (
      (variables.length - customVariablesInFormat.length) > Object.keys(variableValues).length ||
      missingCustomVariable
    ) {
      return;
    }

    let title = titleFormat;
    let match = [];

    if (variablesOnly) {
      match = title.match(/(?<=\{)[^{}]+(?=\})/g);

      if (!match) {
        return;
      }

      title = match
        .filter(v => variableValues[v])
        .map(v => variableValues[v]).join(" ");
    } else {
      Object.keys(variableValues).forEach(variable => {
        title = title.replace(new RegExp(`\\{${variable}\\}`, 'g'), variableValues[variable]);
      });

      title = title.replace(/\{[^}]+\}\s*/g, '');
    }

    itemsGeneratedTitle.push({
      ...item,
      title
    });
  });

  return itemsGeneratedTitle;
};