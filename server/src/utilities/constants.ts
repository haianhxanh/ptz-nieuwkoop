type TagCodesType = {
  [key: string]: {
    [key: string]: string;
  };
};

export const TAG_CODES: TagCodesType = {
  Location: {
    Indoor: "Vnitřní",
    Outdoor: "Venkovní",
  },
  Finish: {
    Natural: "Přírodní povrchová úprava",
    "High gloss": "Vysoký lesk",
    "Satin gloss": "Satinový lesk",
    Matt: "Matný",
    Metallic: "Kovový",
    Polished: "Leštěný",
    Lacquered: "Lakovaný",
    Structure: "Strukturovaný",
    Glazed: "Glazovaný",
  },
  Material: {
    "Terra Cotta": "Terra Cotta",
    Natural: "Přírodní materiál",
    Sandstone: "Pískovec",
    Metal: "Lov",
    Ficonstone: "Ficonstone",
    Polyresin: "Polyresin",
    Polystone: "Polystone",
    Fiberstone: "Fiberstone",
    Wood: "Dřevo",
    "Stainless steel": "Nerezová ocel",
    Aluminium: "Hliník",
    Composite: "Kompozit",
    Syntetic: "Syntetika",
    Ceramics: "Keramika",
    Fiberclay: "Vláknitá hlína",
  },
  MaterialProperties: {
    "Raised base": "Zvýšený základ",
    "Including wheels": "S kolečky",
    "Fire retardant": "Oheň odolný",
    "Scratch and break resistant": "Odolný proti poškrábání a lámání",
    "Recycled material": "Recyklovaný materiál",
    Handmade: "Ručně vyráběný",
    "Frost resistant": "Odolný proti mrazu",
    "UV resistant": "Odolný proti UV",
    Waterproof: "Vodotěsný",
    "With drainage hole": "S odtokovým otvorem",
  },
  Shape: {
    Cube: "Krychle",
    Boat: "Loď",
    Vulcan: "Vulkan",
    "With feet": "S nohama",
    Square: "Čtverec",
    Rectangle: "Obdélník",
    Kubis: "Kubis",
    Bowl: "Miska",
    Darcy: "Darcy",
    Coppa: "Coppa",
    Amphore: "Amfora",
    Globe: "Koule",
    Cylinder: "Válec",
    Balloon: "Balón",
    Oval: "Ovál",
    "Hanging basket": "Visací koš",
  },
  ColourPlanter: {
    White: "Bílá",
    Black: "Černá",
    Grey: "Šedá",
    Brown: "Hnědá",
    Beige: "Bežová",
    Red: "Červená",
    Orange: "Oranžová",
    Yellow: "Žlutá",
    Green: "Zelená",
    Blue: "Modrá",
    Purple: "Fialová",
    Pink: "Růžová",
    Multicolour: "Vícebarevná",
    Anthracite: "Antracit",
    Bronze: "Bronz",
    Gold: "Zlatá",
    Silver: "Stříbrná",
    Copper: "Měděná",
  },
};

export const ITEM_HEIGHTS = [
  {
    min: 0,
    max: 40,
    tag: "0 - 40 cm",
  },
  {
    min: 41,
    max: 60,
    tag: "40 - 60 cm",
  },
  {
    min: 61,
    max: 80,
    tag: "60 - 80 cm",
  },
  {
    min: 81,
    max: 120,
    tag: "80 - 120 cm",
  },
];

export const ITEM_DIAMETERS = [
  {
    min: 0,
    max: 10,
    tag: "Do 10 cm",
  },
  {
    min: 11,
    max: 20,
    tag: "11 - 20 cm",
  },
  {
    min: 21,
    max: 30,
    tag: "21 - 30 cm",
  },
  {
    min: 31,
    max: 40,
    tag: "31 - 40 cm",
  },
  {
    min: 41,
    max: 50,
    tag: "41 - 50 cm",
  },
  {
    min: 51,
    max: 60,
    tag: "51 - 60 cm",
  },
  {
    min: 61,
    max: 70,
    tag: "61 - 70 cm",
  },
  {
    min: 71,
    max: 80,
    tag: "71 - 80 cm",
  },
  {
    min: 81,
    max: 90,
    tag: "81 - 90 cm",
  },
  {
    min: 91,
    max: 100,
    tag: "91 - 100 cm",
  },
  {
    min: 101,
    max: 110,
    tag: "101 - 110 cm",
  },
  {
    min: 111,
    max: 120,
    tag: "111 - 120 cm",
  },
];
