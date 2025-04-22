// Function to format sku 
export const FormatEbaySku = (sku) => {
  const parts = sku.split(/[-_]/g);

  if (parts.length === 1) {
    return sku; // If there's only one part, return the original SKU.
  }

  for (const [index, part] of parts.entries()) {
    if (part.length === 1) {
      return `${parts[index - 1]}-${part}`
    }
  }

  // Find the longest part by character count, including numbers.
  let longestPart = '';
  let longestPartLength = 0;

  for (const part of parts) {
    const partLength = part.replace(/\D/g, '').length; // Count of numbers in the part.

    if (part.length + partLength > longestPartLength) {
      longestPart = part;
      longestPartLength = part.length + partLength;
    }
  }

  return longestPart;
};