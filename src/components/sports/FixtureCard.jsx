import { SPORTS_CATEGORIES } from '../../constants';

const SPORT_COLORS = Object.fromEntries(SPORTS_CATEGORIES.map((c) => [c.name.toLowerCase(), c.color]));

/** Neutral dark tile tinted by sport colour (no team or tournament artwork). */
export const tileBackground = (sport) => (
  `linear-gradient(135deg, ${SPORT_COLORS[sport] || '#1492ff'}55 0%, #1a1c24 70%)`
);

function whenLabel(startsAt) {
  const d = new Date(startsAt);
  const dayDiff = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (dayDiff === 0) return `Today, ${time}`;
  if (dayDiff === 1) return `Tomorrow, ${time}`;
  if (dayDiff === -1) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })}, ${time}`;
}

function badge(ev) {
  switch (ev.status) {
    case 'live': return { text: 'LIVE', live: true };
    case 'finished': return { text: 'Full time' };
    case 'started': return { text: 'Started' };
    case 'off': return { text: 'Postponed' };
    default: return { text: whenLabel(ev.startsAt) };
  }
}

/** JioHotstar-style 16:9 card for a real fixture/result: league + teams on the tile, status bottom-right, title below. */
export default function FixtureCard({ event }) {
  const b = badge(event);
  const showScore = event.homeScore !== null && event.awayScore !== null;
  const teams = event.home && event.away ? [[event.home, event.homeScore], [event.away, event.awayScore]] : null;

  return (
    <div>
      <div
        className="relative rounded-lg overflow-hidden aspect-video p-3 sm:p-4 flex flex-col"
        style={{ background: tileBackground(event.sport) }}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider text-white/70 line-clamp-1">
          {event.league || event.sport}
        </span>
        <div className="flex-1 flex flex-col justify-center gap-1.5 pb-4">
          {teams ? teams.map(([name, pts]) => (
            <div key={name} className="flex items-center justify-between gap-3">
              <span className="text-white font-semibold text-[15px] leading-tight line-clamp-1">{name}</span>
              {showScore && <span className="text-white font-bold text-lg tabular-nums">{pts}</span>}
            </div>
          )) : (
            <span className="text-white font-semibold text-base leading-tight line-clamp-2">{event.title}</span>
          )}
        </div>
        <span
          className={`absolute right-2.5 bottom-2 text-xs font-semibold px-1.5 py-0.5 rounded ${
            b.live ? 'bg-[#eb0066] text-white' : 'text-white/90'
          }`}
        >
          {b.live && <span className="inline-block w-1.5 h-1.5 mr-1 rounded-full bg-white animate-pulse align-middle" />}
          {b.text}
        </span>
      </div>
      <p className="mt-2 px-1 sm:px-3 text-base sm:text-[17px] leading-snug text-[#e1e6f0] line-clamp-2">{event.title}</p>
      <p className="px-1 sm:px-3 text-xs text-[#a8aeba] mt-0.5 line-clamp-1">{event.venue || whenLabel(event.startsAt)}</p>
    </div>
  );
}
