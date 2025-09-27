import type { Champion } from '../data/junglers';

interface ChampionCardProps {
  champion: Champion;
  isSelected?: boolean;
  onSelect: (champion: Champion) => void;
}

const ChampionCard = ({ champion, isSelected = false, onSelect }: ChampionCardProps) => {
  return (
    <button
      type="button"
      className={`champion-card${isSelected ? ' champion-card--selected' : ''}`}
      onClick={() => onSelect(champion)}
      aria-pressed={isSelected}
    >
      <div className="champion-card__image-wrapper">
        <img src={champion.image} alt={champion.name} loading="lazy" />
      </div>
      <span className="champion-card__name">{champion.name}</span>
    </button>
  );
};

export default ChampionCard;
