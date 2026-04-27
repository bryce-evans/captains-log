import { SchemaField } from './store';

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number, decimals = 0): string {
  const v = Math.random() * (max - min) + min;
  return v.toFixed(decimals);
}

const FIELD_VALUES: { [key: string]: () => string } = {
  species: () =>
    pick(['Largemouth Bass', 'Smallmouth Bass', 'Yellow Perch', 'Brown Trout',
          'Rainbow Trout', 'Walleye', 'Northern Pike', 'Bluegill', 'Channel Catfish']),

  weight_lbs: () => rand(0.4, 9.5, 1),

  length_in: () => rand(7, 28, 0),

  lure: () =>
    pick(['Plastic Worm', 'Jig', 'Spinner', 'Minnow', 'Crankbait',
          'Topwater Popper', 'Spinnerbait', 'Fly', 'Spoon']),

  location: () =>
    pick(['Lake Cayuga', 'Seneca Lake', 'Cayuga Inlet', 'Taughannock Creek',
          'Keuka Lake', 'Owasco Lake', 'Canandaigua Lake', 'Skaneateles Lake']),

  weather: () => {
    const condition = pick(['Sunny', 'Partly cloudy', 'Overcast', 'Light rain', 'Clear', 'Foggy']);
    const temp = rand(52, 84, 0);
    return `${condition}, ${temp}°F`;
  },

  notes: () =>
    pick(['Near the dock', 'Under the bridge', 'Deep water, 20 ft',
          'Shallow cove', 'Early morning bite', 'Hit on first cast',
          'Fight took 3 min', 'Released after photo', '']),

  item: () => {
    const types = ['Watercolor landscape', 'Abstract acrylic', 'Pencil sketch',
                   'Oil still life', 'Charcoal portrait', 'Ink drawing', 'Pastel study'];
    const n = Math.floor(Math.random() * 20) + 1;
    return `${pick(types)} #${n}`;
  },

  price: () => pick(['25', '35', '45', '60', '75', '85', '100', '120', '150', '200', '250']),

  buyer_name: () => {
    const first = pick(['Alex', 'Jordan', 'Morgan', 'Sam', 'Casey', 'Taylor',
                        'Jamie', 'Riley', 'Dana', 'Avery', 'Quinn', 'Sage']);
    const last = pick(['T.', 'M.', 'B.', 'R.', 'K.', 'W.', 'H.', 'L.']);
    return `${first} ${last}`;
  },

  time: () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

export const MockTranscriber = {
  getFieldValue(field: SchemaField): string {
    const generator = FIELD_VALUES[field.key];
    if (generator) return generator();

    // Fallbacks by field type
    if (field.options && field.options.length > 0) return pick(field.options);
    if (field.type === 'number') return rand(1, 100, 0);
    return 'N/A';
  },
};
