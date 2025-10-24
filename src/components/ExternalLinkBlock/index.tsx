import EmbyLogo from '@app/assets/services/emby.svg';
import ImdbLogo from '@app/assets/services/imdb.svg';
import JellyfinLogo from '@app/assets/services/jellyfin.svg';
import LetterboxdLogo from '@app/assets/services/letterboxd.svg';
import PlexLogo from '@app/assets/services/plex.svg';
import RTLogo from '@app/assets/services/rt.svg';
import TmdbLogo from '@app/assets/services/tmdb.svg';
import TraktLogo from '@app/assets/services/trakt.svg';
import TvdbLogo from '@app/assets/services/tvdb.svg';
import useLocale from '@app/hooks/useLocale';
import useSettings from '@app/hooks/useSettings';
import { MediaType } from '@server/constants/media';
import { MediaServerType } from '@server/constants/server';

interface ExternalLinkBlockProps {
  mediaType: 'movie' | 'tv' | 'music';
  tmdbId?: number;
  tvdbId?: number;
  imdbId?: string;
  rtUrl?: string;
  mediaUrl?: string;
  musicbrainzId?: string;
  externalLinks?: Array<{
    type: string;
    url: string;
  }>;
}

const ExternalLinkBlock = ({
  mediaType,
  tmdbId,
  tvdbId,
  imdbId,
  rtUrl,
  mediaUrl,
  musicbrainzId,
  externalLinks = [],
}: ExternalLinkBlockProps) => {
  const settings = useSettings();
  const { locale } = useLocale();

  // For music, use external links and MusicBrainz
  if (mediaType === 'music') {
    const spotifyLink = externalLinks.find((link) =>
      link.type.toLowerCase().includes('spotify')
    );
    const appleMusicLink = externalLinks.find((link) =>
      link.type.toLowerCase().includes('apple')
    );
    const lastfmLink = externalLinks.find((link) =>
      link.type.toLowerCase().includes('last.fm')
    );

    return (
      <div className="flex w-full items-center justify-center space-x-5">
        {musicbrainzId && (
          <a
            href={`https://musicbrainz.org/artist/${musicbrainzId}`}
            className="text-xs font-medium text-gray-400 opacity-50 transition duration-300 hover:opacity-100"
            target="_blank"
            rel="noreferrer"
            title="MusicBrainz"
          >
            MB
          </a>
        )}
        {spotifyLink && (
          <a
            href={spotifyLink.url}
            className="text-xs font-medium text-gray-400 opacity-50 transition duration-300 hover:opacity-100"
            target="_blank"
            rel="noreferrer"
            title="Spotify"
          >
            Spotify
          </a>
        )}
        {appleMusicLink && (
          <a
            href={appleMusicLink.url}
            className="text-xs font-medium text-gray-400 opacity-50 transition duration-300 hover:opacity-100"
            target="_blank"
            rel="noreferrer"
            title="Apple Music"
          >
            Apple
          </a>
        )}
        {lastfmLink && (
          <a
            href={lastfmLink.url}
            className="text-xs font-medium text-gray-400 opacity-50 transition duration-300 hover:opacity-100"
            target="_blank"
            rel="noreferrer"
            title="Last.fm"
          >
            Last.fm
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="flex w-full items-center justify-center space-x-5">
      {mediaUrl && (
        <a
          href={mediaUrl}
          className="w-12 opacity-50 transition duration-300 hover:opacity-100"
          target="_blank"
          rel="noreferrer"
        >
          {settings.currentSettings.mediaServerType === MediaServerType.PLEX ? (
            <PlexLogo />
          ) : settings.currentSettings.mediaServerType ===
            MediaServerType.EMBY ? (
            <EmbyLogo />
          ) : (
            <JellyfinLogo />
          )}
        </a>
      )}
      {tmdbId && (
        <a
          href={`https://www.themoviedb.org/${mediaType}/${tmdbId}?language=${locale}`}
          className="w-8 opacity-50 transition duration-300 hover:opacity-100"
          target="_blank"
          rel="noreferrer"
        >
          <TmdbLogo />
        </a>
      )}
      {tvdbId && mediaType === MediaType.TV && (
        <a
          href={`http://www.thetvdb.com/?tab=series&id=${tvdbId}`}
          className="w-9 opacity-50 transition duration-300 hover:opacity-100"
          target="_blank"
          rel="noreferrer"
        >
          <TvdbLogo />
        </a>
      )}
      {imdbId && (
        <a
          href={`https://www.imdb.com/title/${imdbId}`}
          className="w-8 opacity-50 transition duration-300 hover:opacity-100"
          target="_blank"
          rel="noreferrer"
        >
          <ImdbLogo />
        </a>
      )}
      {rtUrl && (
        <a
          href={rtUrl}
          className="w-14 opacity-50 transition duration-300 hover:opacity-100"
          target="_blank"
          rel="noreferrer"
        >
          <RTLogo />
        </a>
      )}
      {tmdbId && (
        <a
          href={`https://trakt.tv/search/tmdb/${tmdbId}?id_type=${
            mediaType === 'movie' ? 'movie' : 'show'
          }`}
          className="w-8 opacity-50 transition duration-300 hover:opacity-100"
          target="_blank"
          rel="noreferrer"
        >
          <TraktLogo />
        </a>
      )}
      {tmdbId && mediaType === MediaType.MOVIE && (
        <a
          href={`https://letterboxd.com/tmdb/${tmdbId}`}
          className="w-8 opacity-50 transition duration-300 hover:opacity-100"
          target="_blank"
          rel="noreferrer"
        >
          <LetterboxdLogo />
        </a>
      )}
    </div>
  );
};

export default ExternalLinkBlock;
