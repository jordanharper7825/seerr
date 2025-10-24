import Link from 'next/link';
import { useState } from 'react';
import type { MusicArtist } from '@app/hooks/useMusic';

interface ArtistCardProps {
  artist: MusicArtist;
  canExpand?: boolean;
}

const ArtistCard = ({ artist, canExpand = false }: ArtistCardProps) => {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div
      className="relative transform-gpu cursor-default rounded-lg bg-gray-800 bg-cover bg-center shadow ring-1 ring-gray-700 transition duration-300 hover:scale-105 hover:ring-gray-500"
      onMouseEnter={() => canExpand && setShowDetail(true)}
      onMouseLeave={() => setShowDetail(false)}
    >
      <div className="relative w-full" style={{ paddingBottom: '150%' }}>
        <Link href={`/music/${artist.id}`}>
          <a>
            <div className="absolute inset-0 h-full w-full rounded-lg bg-gray-700">
              {artist.images.poster ? (
                <img
                  src={artist.images.poster}
                  alt={artist.name}
                  className="h-full w-full rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <svg
                    className="h-16 w-16 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                </div>
              )}
            </div>
          </a>
        </Link>

        {/* Genre Badges */}
        {artist.genres && artist.genres.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 z-40 rounded-b-lg bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent p-2">
            <div className="flex flex-wrap gap-1">
              {artist.genres.slice(0, 2).map((genre) => (
                <span
                  key={genre}
                  className="rounded bg-indigo-600/80 px-2 py-0.5 text-xs font-medium text-white"
                >
                  {genre}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="px-2 py-2">
        <Link href={`/music/${artist.id}`}>
          <a>
            <h3 className="truncate text-sm font-bold text-white">
              {artist.name}
            </h3>
            {artist.country && (
              <p className="truncate text-xs text-gray-400">{artist.country}</p>
            )}
          </a>
        </Link>
      </div>
    </div>
  );
};

export default ArtistCard;
