import { BsPlusLg, BsCheckLg, BsFilm } from 'react-icons/bs';
import { AiFillStar } from 'react-icons/ai';
import { getPosterUrl } from '../../utils/helpers';
import { useApp } from '../../context/AppContext';

function TitleCard({ title, onOpen }) {
  const { toggleWatchlist, isInWatchlist } = useApp();
  const inList = isInWatchlist(title.tmdbId, title.mediaType);

  const toggle = (e) => {
    e.stopPropagation();
    toggleWatchlist({
      id: title.tmdbId,
      media_type: title.mediaType,
      [title.mediaType === 'tv' ? 'name' : 'title']: title.title,
      poster_path: title.posterPath,
      vote_average: title.rating ?? 0,
      [title.mediaType === 'tv' ? 'first_air_date' : 'release_date']: title.year ? `${title.year}-01-01` : '',
    });
  };

  return (
    <li className="relative w-[104px] flex-shrink-0 snap-start">
      <button
        type="button"
        onClick={() => onOpen(title)}
        className="block w-full text-left group focus:outline-none"
        aria-label={`${title.title}${title.year ? `, ${title.year}` : ''}`}
      >
        <div className="aspect-[2/3] rounded-lg overflow-hidden bg-white/5 ring-1 ring-white/10 group-hover:ring-white/40 group-focus-visible:ring-2 group-focus-visible:ring-white transition">
          {title.posterPath ? (
            <img src={getPosterUrl(title.posterPath, 'md')} alt="" loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500"><BsFilm size={24} /></div>
          )}
        </div>
        <p className="mt-1.5 text-xs font-medium text-white leading-tight line-clamp-2">{title.title}</p>
        <p className="mt-0.5 text-[11px] text-hotstar-gray flex items-center gap-1">
          {title.year && <span>{title.year}</span>}
          {title.rating ? (
            <span className="inline-flex items-center gap-0.5"><AiFillStar className="text-hotstar-gold" size={11} />{title.rating.toFixed(1)}</span>
          ) : null}
        </p>
      </button>
      <button
        type="button"
        onClick={toggle}
        aria-label={inList ? `Remove ${title.title} from My List` : `Add ${title.title} to My List`}
        aria-pressed={inList}
        className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/70 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/90 focus-visible:ring-2 focus-visible:ring-white outline-none transition-colors"
      >
        {inList ? <BsCheckLg size={14} /> : <BsPlusLg size={12} />}
      </button>
    </li>
  );
}

/** Horizontally scrollable row of recommended titles under a bot message. */
export default function TitleCards({ titles, onOpen }) {
  if (!titles?.length) return null;
  return (
    <ul className="flex gap-2.5 overflow-x-auto snap-x pb-2 mt-2 -mr-1 max-w-full">
      {titles.map((t) => <TitleCard key={`${t.mediaType}:${t.tmdbId}`} title={t} onOpen={onOpen} />)}
    </ul>
  );
}
