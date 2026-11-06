/**
 * High-quality free images (Unsplash License) for Falcon Revive.
 * Open the Unsplash page URL in Chrome → Download to save originals locally.
 * Direct URLs below are already used in Landing + Login.
 */
export const SITE_IMAGES = {
  hero: {
    src: 'https://images.unsplash.com/photo-1632605192331-085fa2082575?auto=format&fit=crop&w=2400&q=90',
    alt: 'Painter spraying a car in a paint booth',
    page: 'https://unsplash.com/photos/a-man-is-painting-a-car-with-a-spray-gun-qu9XY-kl1oU',
    credit: 'Clarity Coat / Unsplash',
  },
  masking: {
    src: 'https://images.unsplash.com/photo-1632605185825-fd583793fa73?auto=format&fit=crop&w=1800&q=90',
    alt: 'Car masked for paint in a body shop booth',
    page: 'https://unsplash.com/photos/a-man-working-on-a-car-in-a-garage-2ssdrtw07dw',
    credit: 'Clarity Coat / Unsplash',
  },
  paintDetail: {
    src: 'https://images.unsplash.com/photo-1746079074370-f03467da3394?auto=format&fit=crop&w=1800&q=90',
    alt: 'Technician working on vehicle paint finish',
    page: 'https://unsplash.com/photos/a-man-is-working-on-a-cars-paint-i-SLbh6yvw4',
    credit: 'Fine Automotive Detailing / Unsplash',
  },
  polishedCar: {
    src: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1800&q=90',
    alt: 'Glossy black sports car finish',
    page: 'https://unsplash.com/photos/black-porsche-model-parked-near-green-grass-YHdr-1kMziE',
    credit: 'Campbell / Unsplash',
  },
  redCar: {
    src: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1800&q=90',
    alt: 'Red sports car front detail',
    page: 'https://unsplash.com/photos/red-ferrari-vehicle-near-green-leafed-plants-3ZcjKQPDOoA',
    credit: 'Lance Asper / Unsplash',
  },
  detailing: {
    src: 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=1800&q=90',
    alt: 'Car detailing polish work',
    page: 'https://unsplash.com/photos/person-holding-black-and-yellow-power-tool-tRQd2xhS2Bc',
    credit: 'Erik Mclean / Unsplash',
  },
  workshop: {
    src: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1800&q=90',
    alt: 'Automotive workshop environment',
    page: 'https://unsplash.com/photos/person-using-wrench-on-car-engine-N9Q-lT62hzE',
    credit: 'Swamphogs / Unsplash',
  },
  rims: {
    src: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1800&q=90',
    alt: 'Car wheel and body shine',
    page: 'https://unsplash.com/photos/black-car-wheel-dBhusgxn6jM',
    credit: 'Tim Gouw / Unsplash',
  },
};

export const IMAGE_LINK_LIST = Object.entries(SITE_IMAGES).map(([key, img]) => ({
  key,
  use: key,
  direct: img.src,
  unsplashPage: img.page,
  credit: img.credit,
}));
