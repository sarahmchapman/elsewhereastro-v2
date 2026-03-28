// ═══════════════════════════════════════════════════════════
// WORLD MAP — Tile-based slippy map + ACG line overlay
// Tiles load from CartoDB/OSM. No external dependencies.
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// WORLD MAP — Canvas, inline polygon data, no CDN
// ═══════════════════════════════════════════════════════════


var ltypeState={MC:true,IC:true,ASC:true,DSC:true};
var toggleState={};


// ── SLIPPY MAP ENGINE ─────────────────────────────────────────────────────────
// A complete tile-based world map — no external dependencies.
// Tiles load from OpenStreetMap in the user's browser.
// Overlay canvas renders ACG lines + markers on top.

var _map = {
  // State
  canvas: null,      // tile canvas element
  overlay: null,     // ACG line canvas element  
  ctx: null,
  octx: null,
  wrap: null,
  W: 0, H: 0,
  zoom: 2,           // current zoom level (integer for tiles, float for display)
  zoomF: 2.0,        // fractional zoom for smooth pinch
  cx: 0,             // center longitude
  cy: 0,             // center latitude
  dragging: false,
  lastX: 0, lastY: 0,
  pinchDist: 0,
  tileCache: {},
  animFrame: null,
  ready: false
};


var MAP_CITIES=[
  {n:'New York',lat:40.71,lng:-74.01},
  {n:'Los Angeles',lat:34.05,lng:-118.24},
  {n:'Chicago',lat:41.88,lng:-87.63},
  {n:'Houston',lat:29.76,lng:-95.37},
  {n:'Phoenix',lat:33.45,lng:-112.07},
  {n:'Philadelphia',lat:39.95,lng:-75.17},
  {n:'San Antonio',lat:29.42,lng:-98.49},
  {n:'San Diego',lat:32.72,lng:-117.16},
  {n:'Dallas',lat:32.78,lng:-96.8},
  {n:'San Jose',lat:37.34,lng:-121.89},
  {n:'Austin',lat:30.27,lng:-97.74},
  {n:'San Francisco',lat:37.77,lng:-122.42},
  {n:'Seattle',lat:47.61,lng:-122.33},
  {n:'Denver',lat:39.74,lng:-104.99},
  {n:'Nashville',lat:36.16,lng:-86.78},
  {n:'Washington DC',lat:38.91,lng:-77.04},
  {n:'Las Vegas',lat:36.17,lng:-115.14},
  {n:'Miami',lat:25.76,lng:-80.19},
  {n:'Atlanta',lat:33.75,lng:-84.39},
  {n:'Boston',lat:42.36,lng:-71.06},
  {n:'Portland',lat:45.51,lng:-122.68},
  {n:'Minneapolis',lat:44.98,lng:-93.27},
  {n:'New Orleans',lat:29.95,lng:-90.07},
  {n:'Baltimore',lat:39.29,lng:-76.61},
  {n:'Salt Lake City',lat:40.76,lng:-111.89},
  {n:'Charlotte',lat:35.23,lng:-80.84},
  {n:'Raleigh',lat:35.78,lng:-78.64},
  {n:'Tampa',lat:27.95,lng:-82.46},
  {n:'Orlando',lat:28.54,lng:-81.38},
  {n:'Kansas City',lat:39.1,lng:-94.58},
  {n:'Memphis',lat:35.15,lng:-90.05},
  {n:'Richmond',lat:37.54,lng:-77.44},
  {n:'Buffalo',lat:42.89,lng:-78.88},
  {n:'Pittsburgh',lat:40.44,lng:-79.99},
  {n:'Cincinnati',lat:39.1,lng:-84.51},
  {n:'Indianapolis',lat:39.77,lng:-86.16},
  {n:'Columbus',lat:39.96,lng:-82.99},
  {n:'Detroit',lat:42.33,lng:-83.05},
  {n:'Milwaukee',lat:43.04,lng:-87.91},
  {n:'Albuquerque',lat:35.08,lng:-106.65},
  {n:'Tucson',lat:32.22,lng:-110.97},
  {n:'Sacramento',lat:38.58,lng:-121.49},
  {n:'Colorado Springs',lat:38.83,lng:-104.82},
  {n:'Honolulu',lat:21.31,lng:-157.86},
  {n:'Anchorage',lat:61.22,lng:-149.9},
  {n:'Boise',lat:43.62,lng:-116.2},
  {n:'Spokane',lat:47.66,lng:-117.43},
  {n:'El Paso',lat:31.76,lng:-106.49},
  {n:'Tulsa',lat:36.15,lng:-95.99},
  {n:'Oklahoma City',lat:35.47,lng:-97.52},
  {n:'Omaha',lat:41.26,lng:-95.93},
  {n:'Fargo',lat:46.88,lng:-96.79},
  {n:'Sioux Falls',lat:43.54,lng:-96.73},
  {n:'Billings',lat:45.78,lng:-108.5},
  {n:'Cheyenne',lat:41.14,lng:-104.82},
  {n:'Hartford',lat:41.77,lng:-72.69},
  {n:'Providence',lat:41.82,lng:-71.41},
  {n:'Charleston',lat:32.78,lng:-79.93},
  {n:'Savannah',lat:32.08,lng:-81.09},
  {n:'Jacksonville',lat:30.33,lng:-81.66},
  {n:'Fort Lauderdale',lat:26.12,lng:-80.14},
  {n:'Fort Worth',lat:32.75,lng:-97.33},
  {n:'Toronto',lat:43.65,lng:-79.38},
  {n:'Montreal',lat:45.5,lng:-73.57},
  {n:'Vancouver',lat:49.28,lng:-123.12},
  {n:'Calgary',lat:51.04,lng:-114.07},
  {n:'Edmonton',lat:53.55,lng:-113.49},
  {n:'Ottawa',lat:45.42,lng:-75.7},
  {n:'Winnipeg',lat:49.9,lng:-97.14},
  {n:'Quebec City',lat:46.81,lng:-71.21},
  {n:'Halifax',lat:44.65,lng:-63.58},
  {n:'Victoria',lat:48.43,lng:-123.37},
  {n:'Saskatoon',lat:52.13,lng:-106.67},
  {n:'Regina',lat:50.45,lng:-104.62},
  {n:'St John\'s',lat:47.56,lng:-52.71},
  {n:'Fredericton',lat:45.96,lng:-66.64},
  {n:'Whitehorse',lat:60.72,lng:-135.06},
  {n:'Mexico City',lat:19.43,lng:-99.13},
  {n:'Guadalajara',lat:20.66,lng:-103.35},
  {n:'Monterrey',lat:25.69,lng:-100.32},
  {n:'Puebla',lat:19.04,lng:-98.21},
  {n:'Tijuana',lat:32.51,lng:-117.04},
  {n:'Cancún',lat:21.16,lng:-86.85},
  {n:'Mérida',lat:20.97,lng:-89.59},
  {n:'Acapulco',lat:16.85,lng:-99.82},
  {n:'Veracruz',lat:19.17,lng:-96.13},
  {n:'Chihuahua',lat:28.63,lng:-106.07},
  {n:'Oaxaca',lat:17.06,lng:-96.72},
  {n:'Mazatlán',lat:23.25,lng:-106.41},
  {n:'Guatemala City',lat:14.63,lng:-90.51},
  {n:'San José',lat:9.93,lng:-84.09},
  {n:'Panama City',lat:8.99,lng:-79.52},
  {n:'Managua',lat:12.14,lng:-86.25},
  {n:'San Salvador',lat:13.69,lng:-89.22},
  {n:'Tegucigalpa',lat:14.08,lng:-87.21},
  {n:'Havana',lat:23.11,lng:-82.37},
  {n:'Santo Domingo',lat:18.49,lng:-69.93},
  {n:'Port-au-Prince',lat:18.54,lng:-72.34},
  {n:'Kingston',lat:17.99,lng:-76.79},
  {n:'San Juan',lat:18.47,lng:-66.11},
  {n:'Nassau',lat:25.05,lng:-77.36},
  {n:'Port of Spain',lat:10.65,lng:-61.5},
  {n:'Bridgetown',lat:13.1,lng:-59.62},
  {n:'São Paulo',lat:-23.55,lng:-46.63},
  {n:'Rio de Janeiro',lat:-22.91,lng:-43.17},
  {n:'Brasília',lat:-15.79,lng:-47.88},
  {n:'Salvador',lat:-12.97,lng:-38.5},
  {n:'Fortaleza',lat:-3.72,lng:-38.54},
  {n:'Belo Horizonte',lat:-19.92,lng:-43.94},
  {n:'Manaus',lat:-3.12,lng:-60.02},
  {n:'Curitiba',lat:-25.43,lng:-49.27},
  {n:'Recife',lat:-8.06,lng:-34.88},
  {n:'Porto Alegre',lat:-30.03,lng:-51.22},
  {n:'Belém',lat:-1.46,lng:-48.5},
  {n:'Goiânia',lat:-16.69,lng:-49.26},
  {n:'Buenos Aires',lat:-34.6,lng:-58.38},
  {n:'Córdoba',lat:-31.42,lng:-64.19},
  {n:'Rosario',lat:-32.96,lng:-60.69},
  {n:'Mendoza',lat:-32.89,lng:-68.83},
  {n:'Mar del Plata',lat:-38.0,lng:-57.56},
  {n:'Bariloche',lat:-41.13,lng:-71.31},
  {n:'Ushuaia',lat:-54.8,lng:-68.3},
  {n:'Santiago',lat:-33.45,lng:-70.67},
  {n:'Valparaíso',lat:-33.05,lng:-71.61},
  {n:'Concepción',lat:-36.83,lng:-73.05},
  {n:'Antofagasta',lat:-23.65,lng:-70.4},
  {n:'Punta Arenas',lat:-53.16,lng:-70.92},
  {n:'Lima',lat:-12.05,lng:-77.04},
  {n:'Arequipa',lat:-16.4,lng:-71.54},
  {n:'Cusco',lat:-13.53,lng:-71.97},
  {n:'Iquitos',lat:-3.74,lng:-73.25},
  {n:'Bogotá',lat:4.71,lng:-74.07},
  {n:'Medellín',lat:6.24,lng:-75.58},
  {n:'Cali',lat:3.45,lng:-76.53},
  {n:'Barranquilla',lat:10.97,lng:-74.78},
  {n:'Cartagena',lat:10.39,lng:-75.48},
  {n:'Caracas',lat:10.48,lng:-66.9},
  {n:'Maracaibo',lat:10.67,lng:-71.61},
  {n:'Quito',lat:-0.18,lng:-78.47},
  {n:'Guayaquil',lat:-2.2,lng:-79.89},
  {n:'La Paz',lat:-16.5,lng:-68.15},
  {n:'Santa Cruz',lat:-17.8,lng:-63.18},
  {n:'Montevideo',lat:-34.9,lng:-56.16},
  {n:'Asunción',lat:-25.29,lng:-57.65},
  {n:'Georgetown',lat:6.8,lng:-58.16},
  {n:'London',lat:51.51,lng:-0.13},
  {n:'Birmingham',lat:52.49,lng:-1.89},
  {n:'Manchester',lat:53.48,lng:-2.24},
  {n:'Glasgow',lat:55.86,lng:-4.25},
  {n:'Edinburgh',lat:55.95,lng:-3.19},
  {n:'Liverpool',lat:53.41,lng:-2.99},
  {n:'Bristol',lat:51.45,lng:-2.59},
  {n:'Leeds',lat:53.8,lng:-1.55},
  {n:'Cardiff',lat:51.48,lng:-3.18},
  {n:'Belfast',lat:54.6,lng:-5.93},
  {n:'Newcastle',lat:54.98,lng:-1.62},
  {n:'Sheffield',lat:53.38,lng:-1.47},
  {n:'Dublin',lat:53.35,lng:-6.26},
  {n:'Cork',lat:51.9,lng:-8.48},
  {n:'Galway',lat:53.27,lng:-9.06},
  {n:'Paris',lat:48.86,lng:2.35},
  {n:'Marseille',lat:43.3,lng:5.37},
  {n:'Lyon',lat:45.76,lng:4.84},
  {n:'Toulouse',lat:43.6,lng:1.44},
  {n:'Nice',lat:43.71,lng:7.26},
  {n:'Nantes',lat:47.22,lng:-1.55},
  {n:'Strasbourg',lat:48.57,lng:7.75},
  {n:'Bordeaux',lat:44.84,lng:-0.58},
  {n:'Lille',lat:50.63,lng:3.06},
  {n:'Rennes',lat:48.12,lng:-1.68},
  {n:'Grenoble',lat:45.19,lng:5.72},
  {n:'Cannes',lat:43.55,lng:7.02},
  {n:'Berlin',lat:52.52,lng:13.41},
  {n:'Hamburg',lat:53.58,lng:10.02},
  {n:'Munich',lat:48.14,lng:11.58},
  {n:'Cologne',lat:50.93,lng:6.95},
  {n:'Frankfurt',lat:50.11,lng:8.68},
  {n:'Stuttgart',lat:48.78,lng:9.18},
  {n:'Düsseldorf',lat:51.22,lng:6.78},
  {n:'Leipzig',lat:51.34,lng:12.37},
  {n:'Dresden',lat:51.05,lng:13.74},
  {n:'Bremen',lat:53.08,lng:8.8},
  {n:'Hanover',lat:52.38,lng:9.73},
  {n:'Nuremberg',lat:49.45,lng:11.08},
  {n:'Freiburg',lat:47.99,lng:7.84},
  {n:'Aachen',lat:50.78,lng:6.08},
  {n:'Kiel',lat:54.32,lng:10.12},
  {n:'Madrid',lat:40.42,lng:-3.7},
  {n:'Barcelona',lat:41.39,lng:2.17},
  {n:'Valencia',lat:39.47,lng:-0.38},
  {n:'Seville',lat:37.39,lng:-5.98},
  {n:'Zaragoza',lat:41.65,lng:-0.89},
  {n:'Málaga',lat:36.72,lng:-4.42},
  {n:'Bilbao',lat:43.26,lng:-2.94},
  {n:'Granada',lat:37.18,lng:-3.6},
  {n:'San Sebastián',lat:43.32,lng:-1.98},
  {n:'Rome',lat:41.9,lng:12.5},
  {n:'Milan',lat:45.47,lng:9.19},
  {n:'Naples',lat:40.85,lng:14.27},
  {n:'Turin',lat:45.07,lng:7.69},
  {n:'Palermo',lat:38.12,lng:13.36},
  {n:'Bologna',lat:44.49,lng:11.34},
  {n:'Florence',lat:43.77,lng:11.26},
  {n:'Venice',lat:45.44,lng:12.32},
  {n:'Bari',lat:41.12,lng:16.87},
  {n:'Catania',lat:37.51,lng:15.08},
  {n:'Trieste',lat:45.65,lng:13.78},
  {n:'Verona',lat:45.44,lng:10.99},
  {n:'Lisbon',lat:38.72,lng:-9.14},
  {n:'Porto',lat:41.16,lng:-8.63},
  {n:'Braga',lat:41.55,lng:-8.43},
  {n:'Funchal',lat:32.67,lng:-16.92},
  {n:'Faro',lat:37.02,lng:-7.93},
  {n:'Amsterdam',lat:52.37,lng:4.9},
  {n:'Rotterdam',lat:51.92,lng:4.48},
  {n:'The Hague',lat:52.07,lng:4.3},
  {n:'Utrecht',lat:52.09,lng:5.12},
  {n:'Eindhoven',lat:51.44,lng:5.47},
  {n:'Brussels',lat:50.85,lng:4.35},
  {n:'Antwerp',lat:51.22,lng:4.4},
  {n:'Ghent',lat:51.05,lng:3.72},
  {n:'Zurich',lat:47.38,lng:8.54},
  {n:'Geneva',lat:46.2,lng:6.14},
  {n:'Basel',lat:47.56,lng:7.59},
  {n:'Bern',lat:46.95,lng:7.45},
  {n:'Lausanne',lat:46.52,lng:6.63},
  {n:'Vienna',lat:48.21,lng:16.37},
  {n:'Graz',lat:47.07,lng:15.44},
  {n:'Salzburg',lat:47.81,lng:13.06},
  {n:'Innsbruck',lat:47.27,lng:11.39},
  {n:'Luxembourg City',lat:49.61,lng:6.13},
  {n:'Monaco',lat:43.74,lng:7.42},
  {n:'Stockholm',lat:59.33,lng:18.07},
  {n:'Gothenburg',lat:57.71,lng:11.97},
  {n:'Malmö',lat:55.61,lng:13.0},
  {n:'Uppsala',lat:59.86,lng:17.64},
  {n:'Oslo',lat:59.91,lng:10.75},
  {n:'Bergen',lat:60.39,lng:5.32},
  {n:'Trondheim',lat:63.43,lng:10.4},
  {n:'Stavanger',lat:58.97,lng:5.73},
  {n:'Tromsø',lat:69.65,lng:18.96},
  {n:'Copenhagen',lat:55.68,lng:12.57},
  {n:'Aarhus',lat:56.16,lng:10.2},
  {n:'Odense',lat:55.4,lng:10.39},
  {n:'Helsinki',lat:60.17,lng:24.94},
  {n:'Tampere',lat:61.5,lng:23.76},
  {n:'Turku',lat:60.45,lng:22.27},
  {n:'Oulu',lat:65.01,lng:25.47},
  {n:'Reykjavik',lat:64.14,lng:-21.9},
  {n:'Warsaw',lat:52.23,lng:21.01},
  {n:'Kraków',lat:50.06,lng:19.94},
  {n:'Wrocław',lat:51.11,lng:17.04},
  {n:'Gdańsk',lat:54.35,lng:18.65},
  {n:'Poznań',lat:52.41,lng:16.93},
  {n:'Łódź',lat:51.76,lng:19.46},
  {n:'Prague',lat:50.08,lng:14.44},
  {n:'Brno',lat:49.2,lng:16.61},
  {n:'Bratislava',lat:48.15,lng:17.11},
  {n:'Košice',lat:48.72,lng:21.26},
  {n:'Budapest',lat:47.5,lng:19.04},
  {n:'Debrecen',lat:47.53,lng:21.63},
  {n:'Bucharest',lat:44.43,lng:26.1},
  {n:'Cluj-Napoca',lat:46.77,lng:23.62},
  {n:'Timișoara',lat:45.75,lng:21.21},
  {n:'Iași',lat:47.16,lng:27.6},
  {n:'Sofia',lat:42.7,lng:23.32},
  {n:'Plovdiv',lat:42.14,lng:24.75},
  {n:'Athens',lat:37.98,lng:23.73},
  {n:'Thessaloniki',lat:40.64,lng:22.94},
  {n:'Heraklion',lat:35.34,lng:25.14},
  {n:'Belgrade',lat:44.79,lng:20.45},
  {n:'Novi Sad',lat:45.27,lng:19.83},
  {n:'Zagreb',lat:45.81,lng:15.98},
  {n:'Split',lat:43.51,lng:16.44},
  {n:'Sarajevo',lat:43.85,lng:18.36},
  {n:'Ljubljana',lat:46.06,lng:14.51},
  {n:'Skopje',lat:41.99,lng:21.43},
  {n:'Tirana',lat:41.33,lng:19.82},
  {n:'Podgorica',lat:42.44,lng:19.26},
  {n:'Nicosia',lat:35.19,lng:33.38},
  {n:'Valletta',lat:35.9,lng:14.51},
  {n:'Tallinn',lat:59.44,lng:24.75},
  {n:'Riga',lat:56.95,lng:24.11},
  {n:'Vilnius',lat:54.69,lng:25.28},
  {n:'Kyiv',lat:50.45,lng:30.52},
  {n:'Kharkiv',lat:49.99,lng:36.23},
  {n:'Odessa',lat:46.48,lng:30.72},
  {n:'Lviv',lat:49.84,lng:24.03},
  {n:'Minsk',lat:53.9,lng:27.56},
  {n:'Chișinău',lat:47.01,lng:28.86},
  {n:'Moscow',lat:55.76,lng:37.62},
  {n:'Saint Petersburg',lat:59.93,lng:30.36},
  {n:'Novosibirsk',lat:55.01,lng:82.94},
  {n:'Yekaterinburg',lat:56.84,lng:60.61},
  {n:'Kazan',lat:55.79,lng:49.12},
  {n:'Nizhny Novgorod',lat:56.3,lng:43.94},
  {n:'Chelyabinsk',lat:55.16,lng:61.44},
  {n:'Samara',lat:53.2,lng:50.14},
  {n:'Omsk',lat:54.99,lng:73.32},
  {n:'Rostov-on-Don',lat:47.24,lng:39.7},
  {n:'Krasnoyarsk',lat:56.02,lng:92.89},
  {n:'Voronezh',lat:51.67,lng:39.18},
  {n:'Perm',lat:58.03,lng:56.26},
  {n:'Volgograd',lat:48.71,lng:44.51},
  {n:'Sochi',lat:43.6,lng:39.73},
  {n:'Vladivostok',lat:43.13,lng:131.91},
  {n:'Irkutsk',lat:52.3,lng:104.3},
  {n:'Murmansk',lat:68.96,lng:33.08},
  {n:'Istanbul',lat:41.01,lng:28.98},
  {n:'Ankara',lat:39.93,lng:32.86},
  {n:'Izmir',lat:38.42,lng:27.13},
  {n:'Bursa',lat:40.18,lng:29.07},
  {n:'Antalya',lat:36.9,lng:30.71},
  {n:'Adana',lat:37.0,lng:35.32},
  {n:'Gaziantep',lat:37.07,lng:37.38},
  {n:'Konya',lat:37.87,lng:32.49},
  {n:'Trabzon',lat:41.0,lng:39.72},
  {n:'Tbilisi',lat:41.69,lng:44.8},
  {n:'Yerevan',lat:40.18,lng:44.51},
  {n:'Baku',lat:40.41,lng:49.87},
  {n:'Dubai',lat:25.2,lng:55.27},
  {n:'Abu Dhabi',lat:24.45,lng:54.38},
  {n:'Sharjah',lat:25.35,lng:55.42},
  {n:'Doha',lat:25.29,lng:51.53},
  {n:'Kuwait City',lat:29.38,lng:47.98},
  {n:'Muscat',lat:23.61,lng:58.59},
  {n:'Manama',lat:26.22,lng:50.58},
  {n:'Riyadh',lat:24.71,lng:46.68},
  {n:'Jeddah',lat:21.49,lng:39.19},
  {n:'Mecca',lat:21.39,lng:39.86},
  {n:'Medina',lat:24.47,lng:39.61},
  {n:'Dammam',lat:26.43,lng:50.1},
  {n:'Beirut',lat:33.89,lng:35.5},
  {n:'Damascus',lat:33.51,lng:36.28},
  {n:'Amman',lat:31.95,lng:35.93},
  {n:'Tel Aviv',lat:32.09,lng:34.78},
  {n:'Jerusalem',lat:31.77,lng:35.21},
  {n:'Haifa',lat:32.82,lng:34.99},
  {n:'Baghdad',lat:33.32,lng:44.37},
  {n:'Basra',lat:30.51,lng:47.82},
  {n:'Mosul',lat:36.34,lng:43.14},
  {n:'Tehran',lat:35.69,lng:51.39},
  {n:'Isfahan',lat:32.65,lng:51.67},
  {n:'Mashhad',lat:36.26,lng:59.62},
  {n:'Tabriz',lat:38.08,lng:46.29},
  {n:'Shiraz',lat:29.61,lng:52.54},
  {n:'Kabul',lat:34.56,lng:69.21},
  {n:'Sanaa',lat:15.37,lng:44.19},
  {n:'Aden',lat:12.78,lng:45.04},
  {n:'Muscat',lat:23.61,lng:58.59},
  {n:'Tashkent',lat:41.3,lng:69.24},
  {n:'Samarkand',lat:39.65,lng:66.96},
  {n:'Bukhara',lat:39.77,lng:64.42},
  {n:'Almaty',lat:43.22,lng:76.85},
  {n:'Nur-Sultan',lat:51.18,lng:71.45},
  {n:'Shymkent',lat:42.32,lng:69.59},
  {n:'Bishkek',lat:42.87,lng:74.57},
  {n:'Dushanbe',lat:38.56,lng:68.77},
  {n:'Ashgabat',lat:37.96,lng:58.33},
  {n:'Mumbai',lat:19.08,lng:72.88},
  {n:'Delhi',lat:28.7,lng:77.1},
  {n:'Bangalore',lat:12.97,lng:77.59},
  {n:'Hyderabad',lat:17.39,lng:78.49},
  {n:'Chennai',lat:13.08,lng:80.27},
  {n:'Kolkata',lat:22.57,lng:88.36},
  {n:'Pune',lat:18.52,lng:73.86},
  {n:'Ahmedabad',lat:23.02,lng:72.57},
  {n:'Surat',lat:21.17,lng:72.83},
  {n:'Jaipur',lat:26.91,lng:75.79},
  {n:'Lucknow',lat:26.85,lng:80.95},
  {n:'Kanpur',lat:26.45,lng:80.33},
  {n:'Nagpur',lat:21.15,lng:79.09},
  {n:'Indore',lat:22.72,lng:75.86},
  {n:'Bhopal',lat:23.26,lng:77.41},
  {n:'Patna',lat:25.59,lng:85.14},
  {n:'Agra',lat:27.18,lng:78.02},
  {n:'Varanasi',lat:25.32,lng:83.01},
  {n:'Srinagar',lat:34.08,lng:74.8},
  {n:'Chandigarh',lat:30.73,lng:76.78},
  {n:'Amritsar',lat:31.64,lng:74.87},
  {n:'Kochi',lat:9.94,lng:76.26},
  {n:'Coimbatore',lat:11.02,lng:76.96},
  {n:'Visakhapatnam',lat:17.69,lng:83.22},
  {n:'Karachi',lat:24.86,lng:67.01},
  {n:'Lahore',lat:31.55,lng:74.34},
  {n:'Islamabad',lat:33.73,lng:73.05},
  {n:'Faisalabad',lat:31.55,lng:73.14},
  {n:'Rawalpindi',lat:33.57,lng:73.07},
  {n:'Peshawar',lat:34.01,lng:71.57},
  {n:'Quetta',lat:30.18,lng:67.01},
  {n:'Multan',lat:30.19,lng:71.47},
  {n:'Dhaka',lat:23.81,lng:90.41},
  {n:'Chittagong',lat:22.36,lng:91.78},
  {n:'Colombo',lat:6.93,lng:79.86},
  {n:'Kathmandu',lat:27.72,lng:85.32},
  {n:'Thimphu',lat:27.47,lng:89.64},
  {n:'Malé',lat:4.18,lng:73.51},
  {n:'Tokyo',lat:35.68,lng:139.69},
  {n:'Osaka',lat:34.69,lng:135.5},
  {n:'Nagoya',lat:35.18,lng:136.91},
  {n:'Yokohama',lat:35.44,lng:139.64},
  {n:'Kyoto',lat:35.01,lng:135.77},
  {n:'Kobe',lat:34.69,lng:135.18},
  {n:'Sapporo',lat:43.06,lng:141.35},
  {n:'Fukuoka',lat:33.59,lng:130.4},
  {n:'Hiroshima',lat:34.39,lng:132.45},
  {n:'Sendai',lat:38.27,lng:140.87},
  {n:'Naha',lat:26.21,lng:127.68},
  {n:'Seoul',lat:37.57,lng:126.98},
  {n:'Busan',lat:35.18,lng:129.08},
  {n:'Incheon',lat:37.46,lng:126.71},
  {n:'Daegu',lat:35.87,lng:128.6},
  {n:'Daejeon',lat:36.35,lng:127.38},
  {n:'Beijing',lat:39.9,lng:116.41},
  {n:'Shanghai',lat:31.23,lng:121.47},
  {n:'Guangzhou',lat:23.13,lng:113.26},
  {n:'Shenzhen',lat:22.54,lng:114.06},
  {n:'Chengdu',lat:30.57,lng:104.07},
  {n:'Chongqing',lat:29.43,lng:106.91},
  {n:'Wuhan',lat:30.59,lng:114.31},
  {n:'Xi\'an',lat:34.27,lng:108.95},
  {n:'Tianjin',lat:39.08,lng:117.2},
  {n:'Nanjing',lat:32.06,lng:118.8},
  {n:'Hangzhou',lat:30.27,lng:120.15},
  {n:'Shenyang',lat:41.8,lng:123.43},
  {n:'Harbin',lat:45.8,lng:126.53},
  {n:'Kunming',lat:24.88,lng:102.83},
  {n:'Zhengzhou',lat:34.75,lng:113.63},
  {n:'Changsha',lat:28.23,lng:112.94},
  {n:'Qingdao',lat:36.07,lng:120.38},
  {n:'Dalian',lat:38.91,lng:121.61},
  {n:'Urumqi',lat:43.83,lng:87.62},
  {n:'Lhasa',lat:29.65,lng:91.08},
  {n:'Hong Kong',lat:22.32,lng:114.17},
  {n:'Macau',lat:22.2,lng:113.54},
  {n:'Taipei',lat:25.03,lng:121.57},
  {n:'Kaohsiung',lat:22.63,lng:120.3},
  {n:'Ulaanbaatar',lat:47.91,lng:106.88},
  {n:'Pyongyang',lat:39.03,lng:125.75},
  {n:'Bangkok',lat:13.76,lng:100.5},
  {n:'Chiang Mai',lat:18.79,lng:98.99},
  {n:'Phuket',lat:7.88,lng:98.39},
  {n:'Pattaya',lat:12.92,lng:100.88},
  {n:'Hat Yai',lat:7.01,lng:100.47},
  {n:'Singapore',lat:1.35,lng:103.82},
  {n:'Kuala Lumpur',lat:3.14,lng:101.69},
  {n:'George Town',lat:5.41,lng:100.33},
  {n:'Johor Bahru',lat:1.49,lng:103.74},
  {n:'Jakarta',lat:-6.21,lng:106.85},
  {n:'Surabaya',lat:-7.26,lng:112.75},
  {n:'Bandung',lat:-6.92,lng:107.62},
  {n:'Medan',lat:3.6,lng:98.67},
  {n:'Makassar',lat:-5.15,lng:119.43},
  {n:'Bali',lat:-8.34,lng:115.09},
  {n:'Yogyakarta',lat:-7.8,lng:110.37},
  {n:'Semarang',lat:-6.97,lng:110.42},
  {n:'Palembang',lat:-2.99,lng:104.76},
  {n:'Manila',lat:14.6,lng:120.98},
  {n:'Quezon City',lat:14.68,lng:121.04},
  {n:'Cebu',lat:10.32,lng:123.89},
  {n:'Davao',lat:7.19,lng:125.46},
  {n:'Ho Chi Minh City',lat:10.82,lng:106.63},
  {n:'Hanoi',lat:21.03,lng:105.83},
  {n:'Da Nang',lat:16.05,lng:108.2},
  {n:'Hue',lat:16.46,lng:107.6},
  {n:'Can Tho',lat:10.04,lng:105.79},
  {n:'Phnom Penh',lat:11.56,lng:104.93},
  {n:'Siem Reap',lat:13.36,lng:103.86},
  {n:'Vientiane',lat:17.97,lng:102.63},
  {n:'Luang Prabang',lat:19.89,lng:102.13},
  {n:'Yangon',lat:16.87,lng:96.2},
  {n:'Naypyidaw',lat:19.76,lng:96.08},
  {n:'Mandalay',lat:21.97,lng:96.08},
  {n:'Dili',lat:-8.56,lng:125.57},
  {n:'Brunei',lat:4.94,lng:114.95},
  {n:'Male',lat:4.18,lng:73.51},
  {n:'Colombo',lat:6.93,lng:79.86},
  {n:'Cairo',lat:30.04,lng:31.24},
  {n:'Alexandria',lat:31.2,lng:29.92},
  {n:'Giza',lat:30.01,lng:31.21},
  {n:'Luxor',lat:25.69,lng:32.64},
  {n:'Aswan',lat:24.09,lng:32.91},
  {n:'Casablanca',lat:33.57,lng:-7.59},
  {n:'Rabat',lat:33.97,lng:-6.85},
  {n:'Marrakech',lat:31.63,lng:-7.98},
  {n:'Fez',lat:34.04,lng:-5.0},
  {n:'Tangier',lat:35.77,lng:-5.8},
  {n:'Agadir',lat:30.43,lng:-9.61},
  {n:'Algiers',lat:36.74,lng:3.09},
  {n:'Oran',lat:35.7,lng:-0.63},
  {n:'Constantine',lat:36.37,lng:6.61},
  {n:'Tunis',lat:36.82,lng:10.17},
  {n:'Sfax',lat:34.74,lng:10.76},
  {n:'Sousse',lat:35.83,lng:10.64},
  {n:'Tripoli',lat:32.91,lng:13.2},
  {n:'Benghazi',lat:32.12,lng:20.07},
  {n:'Khartoum',lat:15.5,lng:32.56},
  {n:'Omdurman',lat:15.64,lng:32.48},
  {n:'Port Sudan',lat:19.61,lng:37.22},
  {n:'Lagos',lat:6.52,lng:3.38},
  {n:'Abuja',lat:9.06,lng:7.5},
  {n:'Kano',lat:12.0,lng:8.59},
  {n:'Ibadan',lat:7.38,lng:3.95},
  {n:'Benin City',lat:6.34,lng:5.63},
  {n:'Port Harcourt',lat:4.82,lng:7.04},
  {n:'Accra',lat:5.6,lng:-0.19},
  {n:'Kumasi',lat:6.69,lng:-1.62},
  {n:'Tamale',lat:9.4,lng:-0.84},
  {n:'Dakar',lat:14.72,lng:-17.47},
  {n:'Touba',lat:14.85,lng:-15.88},
  {n:'Abidjan',lat:5.36,lng:-4.01},
  {n:'Yamoussoukro',lat:6.83,lng:-5.29},
  {n:'Bouaké',lat:7.69,lng:-5.03},
  {n:'Bamako',lat:12.64,lng:-8.0},
  {n:'Ouagadougou',lat:12.36,lng:-1.54},
  {n:'Niamey',lat:13.51,lng:2.11},
  {n:'Conakry',lat:9.7,lng:-13.58},
  {n:'Freetown',lat:8.47,lng:-13.23},
  {n:'Monrovia',lat:6.29,lng:-10.76},
  {n:'Lomé',lat:6.14,lng:1.22},
  {n:'Cotonou',lat:6.37,lng:2.42},
  {n:'Porto-Novo',lat:6.5,lng:2.6},
  {n:'Accra',lat:5.6,lng:-0.19},
  {n:'Kumasi',lat:6.69,lng:-1.62},
  {n:'N\'Djamena',lat:12.13,lng:15.06},
  {n:'Douala',lat:4.05,lng:9.77},
  {n:'Yaoundé',lat:3.85,lng:11.5},
  {n:'Bangui',lat:4.36,lng:18.56},
  {n:'Libreville',lat:-0.39,lng:9.45},
  {n:'Malabo',lat:3.75,lng:8.77},
  {n:'Brazzaville',lat:-4.27,lng:15.27},
  {n:'Pointe-Noire',lat:-4.76,lng:11.86},
  {n:'Addis Ababa',lat:9.03,lng:38.75},
  {n:'Dire Dawa',lat:9.59,lng:41.87},
  {n:'Nairobi',lat:-1.29,lng:36.82},
  {n:'Mombasa',lat:-4.04,lng:39.67},
  {n:'Kisumu',lat:-0.1,lng:34.76},
  {n:'Kampala',lat:0.35,lng:32.58},
  {n:'Entebbe',lat:0.05,lng:32.46},
  {n:'Kigali',lat:-1.95,lng:30.06},
  {n:'Bujumbura',lat:-3.39,lng:29.36},
  {n:'Dar es Salaam',lat:-6.79,lng:39.21},
  {n:'Dodoma',lat:-6.17,lng:35.74},
  {n:'Zanzibar',lat:-6.16,lng:39.19},
  {n:'Arusha',lat:-3.37,lng:36.68},
  {n:'Mwanza',lat:-2.52,lng:32.9},
  {n:'Djibouti',lat:11.59,lng:43.15},
  {n:'Asmara',lat:15.34,lng:38.93},
  {n:'Mogadishu',lat:2.05,lng:45.34},
  {n:'Hargeisa',lat:9.56,lng:44.07},
  {n:'Juba',lat:4.85,lng:31.62},
  {n:'Khartoum',lat:15.5,lng:32.56},
  {n:'Kinshasa',lat:-4.32,lng:15.32},
  {n:'Lubumbashi',lat:-11.66,lng:27.48},
  {n:'Kisangani',lat:0.52,lng:25.18},
  {n:'Luanda',lat:-8.84,lng:13.23},
  {n:'Huambo',lat:-12.78,lng:15.74},
  {n:'Lusaka',lat:-15.42,lng:28.28},
  {n:'Ndola',lat:-12.97,lng:28.64},
  {n:'Kitwe',lat:-12.82,lng:28.21},
  {n:'Harare',lat:-17.83,lng:31.03},
  {n:'Bulawayo',lat:-20.15,lng:28.58},
  {n:'Lilongwe',lat:-13.97,lng:33.79},
  {n:'Blantyre',lat:-15.79,lng:35.0},
  {n:'Maputo',lat:-25.97,lng:32.57},
  {n:'Beira',lat:-19.84,lng:34.84},
  {n:'Windhoek',lat:-22.56,lng:17.08},
  {n:'Walvis Bay',lat:-22.96,lng:14.51},
  {n:'Gaborone',lat:-24.63,lng:25.92},
  {n:'Francistown',lat:-21.17,lng:27.52},
  {n:'Antananarivo',lat:-18.91,lng:47.54},
  {n:'Toamasina',lat:-18.15,lng:49.4},
  {n:'Port Louis',lat:-20.16,lng:57.49},
  {n:'Victoria',lat:-4.62,lng:55.45},
  {n:'Johannesburg',lat:-26.2,lng:28.05},
  {n:'Cape Town',lat:-33.92,lng:18.42},
  {n:'Durban',lat:-29.86,lng:31.02},
  {n:'Pretoria',lat:-25.75,lng:28.23},
  {n:'Port Elizabeth',lat:-33.96,lng:25.6},
  {n:'Bloemfontein',lat:-29.12,lng:26.21},
  {n:'East London',lat:-33.02,lng:27.91},
  {n:'Pietermaritzburg',lat:-29.62,lng:30.38},
  {n:'Nelspruit',lat:-25.47,lng:30.97},
  {n:'Polokwane',lat:-23.9,lng:29.45},
  {n:'Sydney',lat:-33.87,lng:151.21},
  {n:'Melbourne',lat:-37.81,lng:144.96},
  {n:'Brisbane',lat:-27.47,lng:153.03},
  {n:'Perth',lat:-31.95,lng:115.86},
  {n:'Adelaide',lat:-34.93,lng:138.6},
  {n:'Canberra',lat:-35.28,lng:149.13},
  {n:'Darwin',lat:-12.46,lng:130.85},
  {n:'Hobart',lat:-42.88,lng:147.33},
  {n:'Gold Coast',lat:-27.98,lng:153.38},
  {n:'Newcastle',lat:-32.93,lng:151.78},
  {n:'Auckland',lat:-36.85,lng:174.76},
  {n:'Wellington',lat:-41.29,lng:174.78},
  {n:'Christchurch',lat:-43.53,lng:172.64},
  {n:'Hamilton',lat:-37.79,lng:175.28},
  {n:'Tauranga',lat:-37.69,lng:176.17},
  {n:'Dunedin',lat:-45.87,lng:170.5},
  {n:'Suva',lat:-18.12,lng:178.45},
  {n:'Port Moresby',lat:-9.44,lng:147.18},
  {n:'Honiara',lat:-9.45,lng:159.97},
  {n:'Port Vila',lat:-17.73,lng:168.32},
  {n:'Honolulu',lat:21.31,lng:-157.86},
  {n:'Guam',lat:13.44,lng:144.79},
  {n:'Noumea',lat:-22.27,lng:166.46},
  {n:'Papeete',lat:-17.53,lng:-149.57},
  {n:'Apia',lat:-13.83,lng:-171.77},
  {n:'Nuku\'alofa',lat:-21.14,lng:-175.22},
  {n:'Funafuti',lat:-8.52,lng:179.2},
  {n:'South Tarawa',lat:1.33,lng:173.0},
  {n:'Easter Island',lat:-27.11,lng:-109.36},
  {n:'Tahiti',lat:-17.53,lng:-149.57},
];

function _tileUrl(z, x, y) {
  var n = 1 << z;
  x = ((x % n) + n) % n;
  // Try CartoDB first (beautiful), fall back to OSM (always works)
  var s = ['a','b','c','d'][(Math.abs(x + y)) % 4];
  return 'https://' + s + '.basemaps.cartocdn.com/rastertiles/voyager/' + z + '/' + x + '/' + y + '.png';
}

// Projection: lat/lng ↔ tile pixel coords at zoom level z
function _lngToTileX(lng, z) { return (lng + 180) / 360 * Math.pow(2, z); }
function _latToTileY(lat, z) {
  var lr = Math.max(-85.05, Math.min(85.05, lat)) * Math.PI / 180;
  return (1 - Math.log(Math.tan(lr) + 1/Math.cos(lr)) / Math.PI) / 2 * Math.pow(2, z);
}
function _tileXToLng(tx, z) { return tx / Math.pow(2, z) * 360 - 180; }
function _tileYToLat(ty, z) {
  var n = Math.PI - 2 * Math.PI * ty / Math.pow(2, z);
  return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

// Convert lat/lng to canvas pixel
function _ll2px(lat, lng) {
  var z = _map.zoomF;
  var tileSize = 256;
  var cx = _lngToTileX(_map.cx, z) * tileSize;
  var cy = _latToTileY(_map.cy, z) * tileSize;
  var px = _lngToTileX(lng, z) * tileSize - cx + _map.W / 2;
  var py = _latToTileY(lat, z) * tileSize - cy + _map.H / 2;
  return { x: px, y: py };
}

// Convert canvas pixel to lat/lng
function _px2ll(x, y) {
  var z = _map.zoomF;
  var tileSize = 256;
  var cx = _lngToTileX(_map.cx, z) * tileSize;
  var cy = _latToTileY(_map.cy, z) * tileSize;
  var tx = (x - _map.W / 2 + cx) / tileSize;
  var ty = (y - _map.H / 2 + cy) / tileSize;
  return { lat: _tileYToLat(ty, z), lng: _tileXToLng(tx, z) };
}

function _loadTile(z, x, y) {
  var key = z + '/' + x + '/' + y;
  if (_map.tileCache[key]) return _map.tileCache[key];
  var img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function() { img._loaded = true; _renderTiles(); };
  img.onerror = function() {
    // Fallback to OSM if CartoDB fails
    if (img.src.indexOf('openstreetmap') < 0) {
      var n = 1 << z, xi = ((x % n) + n) % n;
      var subs = ['a','b','c'];
      img.src = 'https://' + subs[xi % 3] + '.tile.openstreetmap.org/' + z + '/' + xi + '/' + y + '.png';
    }
  };
  img.src = _tileUrl(z, x, y);
  _map.tileCache[key] = img;
  var keys = Object.keys(_map.tileCache);
  if (keys.length > 600) { delete _map.tileCache[keys[0]]; }
  return img;
}

function _renderTiles() {
  var m = _map;
  if (!m.ctx) return;
  var ctx = m.ctx, W = m.W, H = m.H;
  var z = Math.round(m.zoomF);
  var tileSize = 256;
  // Scale factor for fractional zoom
  var scale = Math.pow(2, m.zoomF - z);
  var scaledTile = tileSize * scale;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#ddeef7';
  ctx.fillRect(0, 0, W, H);

  // Center tile coordinates
  var cTX = _lngToTileX(m.cx, z);
  var cTY = _latToTileY(m.cy, z);

  // How many tiles fit
  var tilesX = Math.ceil(W / scaledTile) + 2;
  var tilesY = Math.ceil(H / scaledTile) + 2;

  var startTX = Math.floor(cTX - tilesX / 2);
  var startTY = Math.floor(cTY - tilesY / 2);

  for (var ty = startTY; ty <= startTY + tilesY; ty++) {
    for (var tx = startTX; tx <= startTX + tilesX; tx++) {
      if (ty < 0 || ty >= Math.pow(2, z)) continue;
      var img = _loadTile(z, tx, ty);
      var px = (tx - cTX) * scaledTile + W / 2;
      var py = (ty - cTY) * scaledTile + H / 2;
      if (img._loaded) {
        ctx.drawImage(img, px, py, scaledTile + 1, scaledTile + 1);
      } else {
        ctx.fillStyle = '#ddeef7';
        ctx.fillRect(px, py, scaledTile, scaledTile);
      }
    }
  }
}

function _renderOverlay() {
  var m = _map;
  if (!m.octx || !acgData || !activeChart) {
    if (m.octx) m.octx.clearRect(0, 0, m.W, m.H);
    return;
  }
  var ctx = m.octx, W = m.W, H = m.H;
  ctx.clearRect(0, 0, W, H);

  var PALL = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
  var lw = Math.max(1.2, Math.min(2.8, m.zoomF * 0.5));

  PALL.forEach(function(p) {
    if (!toggleState[p] || !acgData[p]) return;
    var col = PCOL[p];
    ['MC','IC','ASC','DSC'].forEach(function(lt) {
      if (!ltypeState[lt]) return;
      var pts = acgData[p][lt];
      if (!pts || pts.length < 2) return;
      var isDash = (lt === 'IC' || lt === 'DSC');
      ctx.strokeStyle = col;
      ctx.globalAlpha = isDash ? 0.45 : 0.88;
      ctx.lineWidth = lw * (isDash ? 0.7 : 1);
      ctx.setLineDash(isDash ? [7, 5] : []);
      ctx.beginPath();
      var started = false, prevX = null;
      for (var i = 0; i < pts.length; i++) {
        var pp = _ll2px(pts[i][0], pts[i][1]);
        if (prevX !== null && Math.abs(pp.x - prevX) > W * 0.5) {
          ctx.stroke(); ctx.beginPath(); started = false;
        }
        if (!started) { ctx.moveTo(pp.x, pp.y); started = true; }
        else ctx.lineTo(pp.x, pp.y);
        prevX = pp.x;
      }
      ctx.stroke();
      ctx.setLineDash([]);
    });
    ctx.globalAlpha = 1;

    // Planet glyph at equator
    if (ltypeState.MC && acgData[p].mcLon != null) {
      var gp = _ll2px(8, acgData[p].mcLon); // slightly above equator
      if (gp.x > 0 && gp.x < W && gp.y > 0 && gp.y < H) {
        ctx.font = Math.round(Math.max(10, Math.min(16, m.zoomF * 2.5))) + 'px serif';
        ctx.fillStyle = col; ctx.textAlign = 'center';
        ctx.fillText(PSYM[p], gp.x, gp.y);
      }
    }
  });
  ctx.globalAlpha = 1;



  // Birth marker
  if (activeChart.geo && activeChart.geo.lat != null) {
    var bp = _ll2px(activeChart.geo.lat, activeChart.geo.lng);
    ctx.beginPath(); ctx.arc(bp.x, bp.y, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#c9973f'; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = '10px Jost,sans-serif'; ctx.fillStyle = '#1a1714'; ctx.textAlign = 'center';
    ctx.fillText('Birth', bp.x, bp.y - 11);
  }
}

var _rafPending = false;
function _redraw() {
  if (_rafPending) return;
  _rafPending = true;
  requestAnimationFrame(function() {
    _rafPending = false;
    _renderTiles();
    _renderOverlay();
  });
}
function _redrawNow() {
  _renderTiles();
  _renderOverlay();
}

function _handleMapClick(lat, lng) {
  if (!acgData || !activeChart) return;
  var PALL = ['Sun','Moon','Mercury','Venus','Mars','Jupiter','Saturn','Uranus','Neptune','Pluto'];
  var bestP = null, bestLT = 'MC', bestD = Infinity;
  PALL.forEach(function(p) {
    if (!toggleState[p] || !acgData[p]) return;
    ['MC','IC','ASC','DSC'].forEach(function(lt) {
      if (!ltypeState[lt]) return;
      var pts = acgData[p][lt]; if (!pts) return;
      for (var i = 0; i < pts.length; i++) {
        var dlat = pts[i][0] - lat;
        var dlng = pts[i][1] - lng;
        if (dlng > 180) dlng -= 360;
        if (dlng < -180) dlng += 360;
        var d = Math.sqrt(dlat*dlat + dlng*dlng);
        if (d < bestD) { bestD = d; bestP = p; bestLT = lt; }
      }
    });
  });
  // Always show something — even if far from a line, show nearest with distance context
  if (!bestP) {
    // All lines toggled off — just pick Sun MC
    bestP = 'Sun'; bestLT = 'MC';
  }
  // Find nearest MAP_CITIES entry as instant placeholder (always a real place name)
  var nearCity='', bestCD=Infinity;
  MAP_CITIES.forEach(function(city){
    var dlat=city.lat-lat, dlng=city.lng-lng;
    if(dlng>180)dlng-=360; if(dlng<-180)dlng+=360;
    var d=Math.sqrt(dlat*dlat+dlng*dlng);
    if(d<bestCD){bestCD=d; nearCity=city.n+(city.c?' — '+city.c:'');}
  });
  openCard(nearCity||'This location', bestP, bestLT, lat, lng);

  // Nominatim reverse at zoom=10 → returns city/town level only
  // zoom=10 deliberately excludes streets, buildings, restaurants, POIs
  fetch('https://nominatim.openstreetmap.org/reverse'
    +'?lat='+lat.toFixed(5)+'&lon='+lng.toFixed(5)
    +'&format=json&zoom=10&addressdetails=1&accept-language=en')
    .then(function(r){return r.json();})
    .then(function(data){
      if(!data||!data.address)return;
      var a=data.address;
      // At zoom=10 this is always a city/town/village — never a street or POI
      var name=a.city||a.town||a.village||a.hamlet||a.municipality||a.county||'';
      var region=a.state||a.county||'';
      var country=a.country||'';
      if(!name)return;
      var label=name;
      if(region&&region!==name)label+=', '+region;
      if(country)label+=' — '+country;
      var el=document.getElementById('rcCity');
      if(el&&document.getElementById('readingCard').classList.contains('open')){
        var parts=el.innerHTML.split('<br>');
        el.innerHTML=label+(parts[1]?'<br>'+parts[1]:'');
      }
    })
    .catch(function(){});
}

function mapZoom(delta) {
  _map.zoomF = Math.max(1, Math.min(17, _map.zoomF + delta));
  _redraw();
}
function mapZoomTo(lat, lng, z) {
  _map.cx = lng; _map.cy = lat; _map.zoomF = z; _redraw();
}
function mapReset() {
  if (activeChart && activeChart.geo && activeChart.geo.lat != null) {
    _map.cx = activeChart.geo.lng;
    _map.cy = activeChart.geo.lat;
  } else {
    _map.cx = 0; _map.cy = 20;
  }
  _map.zoomF = 2;
  _redraw();
}

function drawMap() {
  var wrap = document.getElementById('mapWrap');
  if (!wrap) return;

  var tileCanvas = document.getElementById('mapTiles');
  var overlayCanvas = document.getElementById('lineCanvas');
  if (!tileCanvas || !overlayCanvas) return;

  var W = wrap.clientWidth || 800;
  var H = parseInt(getComputedStyle(tileCanvas).height) || 520;

  tileCanvas.width = W; tileCanvas.height = H;
  overlayCanvas.width = W; overlayCanvas.height = H;
  _map.W = W; _map.H = H;
  _map.canvas = tileCanvas; _map.overlay = overlayCanvas;
  _map.ctx = tileCanvas.getContext('2d');
  _map.octx = overlayCanvas.getContext('2d');

  if (!_map.ready) {
    _map.ready = true;
    _map.cx = (activeChart && activeChart.geo && activeChart.geo.lat != null) ? activeChart.geo.lng : 0;
    _map.cy = (activeChart && activeChart.geo && activeChart.geo.lat != null) ? activeChart.geo.lat : 20;
    _map.zoomF = 2;
    _setupMapEvents();
  }
  _redraw();
  window.addEventListener('resize', function() {
    var nW = wrap.clientWidth || 800;
    tileCanvas.width = nW; overlayCanvas.width = nW;
    _map.W = nW;
    _redraw();
  });
}
function drawLines() { _renderOverlay(); }

