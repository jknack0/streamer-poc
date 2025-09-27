import type { Champion } from '../data/junglers';
import ChampionCard from './ChampionCard';

interface ChampionGridProps {
  champions: Champion[];
  selectedChampionSlug?: string;
  onSelect: (champion: Champion) => void;
}

const ChampionGrid = ({ champions, selectedChampionSlug, onSelect }: ChampionGridProps) => {
  return (
    <div className="champion-grid">
      {champions.map((champion) => (
        <ChampionCard
          key={champion.slug}
          champion={champion}
          onSelect={onSelect}
          isSelected={champion.slug === selectedChampionSlug}
        />
      ))}
    </div>
  );
};

export default ChampionGrid;
