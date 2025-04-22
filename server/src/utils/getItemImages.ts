const axios = require('axios');

export const GetItemImages = async (items) => {
  const itemsFetchedImages = [];

  await Promise.all(items.map(async (item) => {
    const images = [];

    let id = 1;
    let imageExists = true;

    while (imageExists) {
      const imageUrl = `https://res.cloudinary.com/us-auto-parts-network-inc/image/upload/images/${item.sku}_${id}`;

      try {
        await axios.head(imageUrl);
        images.push(imageUrl);
        id++;
      } catch (error) {
        imageExists = false;
      }
    };

    itemsFetchedImages.push({
      ...item,
      images
    });
  }));

  return itemsFetchedImages;
};