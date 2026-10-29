import { createHash } from 'node:crypto';
import { env } from '../config/env.js';

const names = (list = [], n) => list.slice(0, n).map((x) => x.name).filter(Boolean);

/**
 * Turn a TMDB details payload (with credits appended) into a catalog record plus the text that gets embedded.
 * Returns null for titles with nothing worth embedding.
 */
export function toTitleRecord(mediaType, d) {
  const title = d.title || d.name;
  const overview = (d.overview || '').trim();
  if (!d.id || !title || overview.length < 20) return null;

  const date = d.release_date || d.first_air_date || '';
  const year = Number(date.slice(0, 4)) || undefined;
  const genres = names(d.genres, 6);
  const cast = names(d.credits?.cast, 8);
  const director = mediaType === 'tv'
    ? names(d.created_by, 2).join(', ')
    : (d.credits?.crew || []).find((c) => c.job === 'Director')?.name || '';
  const runtime = d.runtime || d.episode_run_time?.[0] || undefined;

  const text = [
    `${title}${year ? ` (${year})` : ''}: ${mediaType === 'tv' ? 'TV series' : 'movie'}.`,
    genres.length && `Genres: ${genres.join(', ')}.`,
    director && `${mediaType === 'tv' ? 'Created by' : 'Directed by'} ${director}.`,
    cast.length && `Starring ${cast.join(', ')}.`,
    d.original_language && `Language: ${d.original_language}.`,
    d.tagline && `Tagline: ${d.tagline}`,
    overview,
  ].filter(Boolean).join('\n');

  return {
    tmdbId: d.id, mediaType, title, year, genres, cast, director, overview,
    tagline: d.tagline || undefined, rating: d.vote_average, voteCount: d.vote_count,
    language: d.original_language, runtime, posterPath: d.poster_path, backdropPath: d.backdrop_path,
    text,
    // Model and dimensions are part of the hash: switching either re-embeds everything.
    textHash: createHash('sha256').update(`${env.gemini.embedModel}|${env.gemini.embedDims}|${text}`).digest('hex'),
  };
}
