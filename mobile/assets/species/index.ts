import { ImageSourcePropType } from 'react-native';

const SPECIES_IMAGES: { [key: string]: ImageSourcePropType } = {
  'largemouth bass':  require('./largemouth_bass.jpg'),
  'smallmouth bass':  require('./smallmouth_bass.jpg'),
  'yellow perch':     require('./yellow_perch.jpg'),
  'brown trout':      require('./brown_trout.jpg'),
  'rainbow trout':    require('./rainbow_trout.jpg'),
  'walleye':          require('./walleye.jpg'),
  'northern pike':    require('./northern_pike.jpg'),
  'bluegill':         require('./bluegill.png'),
  'channel catfish':  require('./channel_catfish.png'),
};

export function getSpeciesImage(species: string): ImageSourcePropType | null {
  return SPECIES_IMAGES[species.toLowerCase()] ?? null;
}
