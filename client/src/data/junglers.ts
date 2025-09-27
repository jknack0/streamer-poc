export interface Champion {
  name: string;
  slug: string;
  image: string;
}

const DDRAGON_VERSION = '14.19.1';

const createChampion = (name: string, slug: string): Champion => ({
  name,
  slug,
  image: `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${slug}.png`,
});

export const junglers: Champion[] = [
  createChampion('Amumu', 'Amumu'),
  createChampion("Bel'Veth", 'Belveth'),
  createChampion('Briar', 'Briar'),
  createChampion('Diana', 'Diana'),
  createChampion('Ekko', 'Ekko'),
  createChampion('Elise', 'Elise'),
  createChampion('Evelynn', 'Evelynn'),
  createChampion('Fiddlesticks', 'Fiddlesticks'),
  createChampion('Gragas', 'Gragas'),
  createChampion('Graves', 'Graves'),
  createChampion('Hecarim', 'Hecarim'),
  createChampion('Ivern', 'Ivern'),
  createChampion('Jarvan IV', 'JarvanIV'),
  createChampion('Jax', 'Jax'),
  createChampion('Karthus', 'Karthus'),
  createChampion('Kayn', 'Kayn'),
  createChampion("Kha'Zix", 'Khazix'),
  createChampion('Kindred', 'Kindred'),
  createChampion('Lee Sin', 'LeeSin'),
  createChampion('Lillia', 'Lillia'),
  createChampion('Maokai', 'Maokai'),
  createChampion('Master Yi', 'MasterYi'),
  createChampion('Nidalee', 'Nidalee'),
  createChampion('Nocturne', 'Nocturne'),
  createChampion('Nunu & Willump', 'Nunu'),
  createChampion('Olaf', 'Olaf'),
  createChampion('Poppy', 'Poppy'),
  createChampion('Rammus', 'Rammus'),
  createChampion("Rek'Sai", 'RekSai'),
  createChampion('Rengar', 'Rengar'),
  createChampion('Sejuani', 'Sejuani'),
  createChampion('Shaco', 'Shaco'),
  createChampion('Shyvana', 'Shyvana'),
  createChampion('Skarner', 'Skarner'),
  createChampion('Sylas', 'Sylas'),
  createChampion('Taliyah', 'Taliyah'),
  createChampion('Trundle', 'Trundle'),
  createChampion('Udyr', 'Udyr'),
  createChampion('Vi', 'Vi'),
  createChampion('Viego', 'Viego'),
  createChampion('Volibear', 'Volibear'),
  createChampion('Warwick', 'Warwick'),
  createChampion('Wukong', 'MonkeyKing'),
  createChampion('Xin Zhao', 'XinZhao'),
  createChampion('Zac', 'Zac'),
];
