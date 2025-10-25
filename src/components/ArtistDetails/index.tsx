import { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useIntl } from 'react-intl';
import useSWR from 'swr';
import type { MusicArtist, MusicAlbum } from '@app/hooks/useMusic';
import CachedImage from '@app/components/Common/CachedImage';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import PageTitle from '@app/components/Common/PageTitle';
import Button from '@app/components/Common/Button';
import Tag from '@app/components/Common/Tag';
import Tooltip from '@app/components/Common/Tooltip';
import ExternalLinkBlock from '@app/components/ExternalLinkBlock';
import RequestButton from '@app/components/RequestButton';
import StatusBadge from '@app/components/StatusBadge';
import { Permission, useUser } from '@app/hooks/useUser';
import defineMessages from '@app/utils/defineMessages';
import ErrorPage from '@app/pages/_error';
import { MediaStatus, MediaType } from '@server/constants/media';
import { CogIcon, MusicalNoteIcon, StarIcon } from '@heroicons/react/24/outline';
import { ChevronDownIcon } from '@heroicons/react/24/solid';

const messages = defineMessages('components.ArtistDetails', {
  biography: 'Biography',
  biographyUnavailable: 'Biography unavailable.',
  country: 'Country',
  formed: 'Formed',
  disbanded: 'Disbanded',
  active: 'Active',
  genres: 'Genres',
  albums: 'Albums',
  eps: 'EPs',
  singles: 'Singles',
  compilations: 'Compilations',
  soundtracks: 'Soundtracks',
  discography: 'Discography',
  listeners: 'Monthly Listeners',
  playcount: 'Total Plays',
  requestArtist: 'Request Artist',
  manageArtist: 'Manage Artist',
  viewAll: 'View All',
  released: 'Released',
  trackCount: '{count, plural, one {# track} other {# tracks}}',
  noAlbums: 'No albums found',
  externalLinks: 'External Links',
});

interface ArtistDetailsProps {
  artist?: MusicArtist;
}

interface AlbumListProps {
  albums: MusicAlbum[];
  title: string;
  emptyMessage: string;
}

const AlbumList = ({ albums, title, emptyMessage }: AlbumListProps) => {
  const intl = useIntl();
  const [showAll, setShowAll] = useState(false);
  const displayAlbums = showAll ? albums : albums.slice(0, 6);

  if (albums.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <h3 className="mb-4 text-xl font-bold text-white">{title}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {displayAlbums.map((album) => (
          <div
            key={album.id}
            className="flex gap-3 rounded-lg bg-gray-800 p-3 ring-1 ring-gray-700 transition duration-200 hover:bg-gray-750"
          >
            <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded">
              {album.coverArt ? (
                <img
                  src={album.coverArt}
                  alt={album.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gray-700">
                  <MusicalNoteIcon className="h-8 w-8 text-gray-600" />
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <div className="truncate font-semibold text-white">
                {album.title}
              </div>
              {album.releaseDate && (
                <div className="text-sm text-gray-400">
                  {new Date(album.releaseDate).getFullYear()}
                </div>
              )}
              {album.trackCount && (
                <div className="text-xs text-gray-500">
                  {intl.formatMessage(messages.trackCount, {
                    count: album.trackCount,
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {albums.length > 6 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="mt-4 flex items-center gap-2 text-sm text-gray-400 transition hover:text-white"
        >
          <span>{showAll ? 'Show Less' : intl.formatMessage(messages.viewAll)}</span>
          <ChevronDownIcon
            className={`h-4 w-4 transition-transform ${showAll ? 'rotate-180' : ''}`}
          />
        </button>
      )}
    </div>
  );
};

const ArtistDetails = ({ artist }: ArtistDetailsProps) => {
  const { hasPermission } = useUser();
  const router = useRouter();
  const intl = useIntl();
  const [showManager, setShowManager] = useState(false);

  const {
    data: artistData,
    error: artistError,
    mutate: revalidate,
  } = useSWR<MusicArtist>(`/api/v1/music/${router.query.artistId}`, {
    fallbackData: artist,
  });

  const { data: albums } = useSWR<MusicAlbum[]>(
    artistData ? `/api/v1/music/${artistData.id}/albums` : null
  );

  const closeManager = useCallback(() => setShowManager(false), []);

  if (!artistData && !artistError) {
    return <LoadingSpinner />;
  }

  if (!artistData) {
    return <ErrorPage statusCode={404} />;
  }

  // Organize albums by type
  const albumsByType = {
    album: albums?.filter((a) => a.albumType === 'Album') ?? [],
    ep: albums?.filter((a) => a.albumType === 'EP') ?? [],
    single: albums?.filter((a) => a.albumType === 'Single') ?? [],
    compilation: albums?.filter((a) => a.albumType === 'Compilation') ?? [],
    soundtrack: albums?.filter((a) => a.albumType === 'Soundtrack') ?? [],
  };

  const lifeSpanText = artistData.lifeSpan?.begin
    ? artistData.lifeSpan.ended && artistData.lifeSpan.end
      ? `${artistData.lifeSpan.begin} - ${artistData.lifeSpan.end}`
      : artistData.lifeSpan.begin
    : undefined;

  return (
    <div
      className="media-page"
      style={{
        height: 493,
      }}
    >
      {artistData.images.fanart && (
        <div className="media-page-bg-image">
          <CachedImage
            type="tmdb"
            alt=""
            src={artistData.images.fanart}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            fill
            priority
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(180deg, rgba(17, 24, 39, 0.47) 0%, rgba(17, 24, 39, 1) 100%)',
            }}
          />
        </div>
      )}
      <PageTitle title={artistData.name} />
      <div className="media-header">
        <div className="media-poster">
          <CachedImage
            type="tmdb"
            src={
              artistData.images.poster ||
              '/images/jellyseerr_poster_not_found.png'
            }
            alt=""
            sizes="100vw"
            style={{ width: '100%', height: 'auto' }}
            width={600}
            height={900}
            priority
          />
        </div>
        <div className="media-title">
          <div className="media-status">
            {artistData.mediaInfo && (
              <StatusBadge
                status={artistData.mediaInfo.status}
                title={artistData.name}
                inProgress={false}
                tmdbId={Number(artistData.mediaInfo.id)}
                // TODO: widen StatusBadge prop to MediaType and remove cast
                mediaType={MediaType.MUSIC as any}
              />
            )}
          </div>
          <h1 data-testid="artist-title">{artistData.name}</h1>
          {artistData.disambiguation && (
            <p className="text-sm text-gray-400">{artistData.disambiguation}</p>
          )}
          <span className="media-attributes">
            {artistData.type && <span>{artistData.type}</span>}
            {artistData.country && (
              <>
                {artistData.type && <span>|</span>}
                <span>{artistData.country}</span>
              </>
            )}
            {artistData.genres.length > 0 && (
              <>
                {(artistData.type || artistData.country) && <span>|</span>}
                <span>{artistData.genres.slice(0, 3).join(', ')}</span>
              </>
            )}
          </span>
        </div>
        <div className="media-actions">
          <RequestButton
            // TODO: widen RequestButton prop to MediaType and remove cast
            mediaType={MediaType.MUSIC as any}
            media={artistData.mediaInfo as any}
            tmdbId={Number(artistData.mediaInfo?.id ?? 0)}
            onUpdate={() => revalidate()}
          />
          {hasPermission(Permission.MANAGE_REQUESTS) &&
            artistData.mediaInfo &&
            artistData.mediaInfo.status !== MediaStatus.UNKNOWN && (
              <Tooltip content={intl.formatMessage(messages.manageArtist)}>
                <Button
                  buttonType="ghost"
                  onClick={() => setShowManager(true)}
                  className="relative ml-2 first:ml-0"
                >
                  <CogIcon className="!mr-0" />
                </Button>
              </Tooltip>
            )}
        </div>
      </div>
      <div className="media-overview">
        <div className="media-overview-left">
          <h2>{intl.formatMessage(messages.biography)}</h2>
          <p className="whitespace-pre-wrap">
            {artistData.biography
              ? artistData.biography
              : intl.formatMessage(messages.biographyUnavailable)}
          </p>
          {artistData.tags && artistData.tags.length > 0 && (
            <div className="mt-6">
              {artistData.tags.slice(0, 10).map((tag) => (
                <span key={`tag-${tag}`} className="mb-2 mr-2 inline-flex last:mr-0">
                  <Tag>{tag}</Tag>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="media-overview-right">
          <div className="media-facts">
            {artistData.rating && (
              <div className="media-ratings">
                <div className="media-rating">
                  <StarIcon className="h-6 w-6 text-yellow-400" />
                  <span>{artistData.rating.toFixed(1)}/5</span>
                </div>
              </div>
            )}
            {artistData.type && (
              <div className="media-fact">
                <span>Type</span>
                <span className="media-fact-value">{artistData.type}</span>
              </div>
            )}
            {artistData.country && (
              <div className="media-fact">
                <span>{intl.formatMessage(messages.country)}</span>
                <span className="media-fact-value">{artistData.country}</span>
              </div>
            )}
            {lifeSpanText && (
              <div className="media-fact">
                <span>
                  {artistData.lifeSpan?.ended
                    ? intl.formatMessage(messages.disbanded)
                    : intl.formatMessage(messages.formed)}
                </span>
                <span className="media-fact-value">{lifeSpanText}</span>
              </div>
            )}
            {artistData.genres.length > 0 && (
              <div className="media-fact">
                <span>{intl.formatMessage(messages.genres)}</span>
                <span className="media-fact-value">
                  {artistData.genres.map((genre, i) => (
                    <span key={`genre-${i}`} className="block">
                      {genre}
                    </span>
                  ))}
                </span>
              </div>
            )}
            {artistData.listeners && (
              <div className="media-fact">
                <span>{intl.formatMessage(messages.listeners)}</span>
                <span className="media-fact-value">
                  {intl.formatNumber(artistData.listeners, {
                    notation: 'compact',
                    compactDisplay: 'short',
                    maximumFractionDigits: 1,
                  })}
                </span>
              </div>
            )}
            {artistData.playcount && (
              <div className="media-fact">
                <span>{intl.formatMessage(messages.playcount)}</span>
                <span className="media-fact-value">
                  {intl.formatNumber(artistData.playcount, {
                    notation: 'compact',
                    compactDisplay: 'short',
                    maximumFractionDigits: 1,
                  })}
                </span>
              </div>
            )}
            <div className="media-fact">
              <ExternalLinkBlock
                // TODO: widen ExternalLinkBlock prop to include 'music' and remove cast
                mediaType={MediaType.MUSIC as any}
                musicbrainzId={artistData.id}
                externalLinks={artistData.links}
              />
            </div>
          </div>
        </div>
      </div>
      {albums && albums.length > 0 && (
        <div className="mt-8 px-4 md:px-8">
          <h2 className="mb-6 text-2xl font-bold text-white">
            {intl.formatMessage(messages.discography)}
          </h2>
          <AlbumList
            albums={albumsByType.album}
            title={intl.formatMessage(messages.albums)}
            emptyMessage={intl.formatMessage(messages.noAlbums)}
          />
          <AlbumList
            albums={albumsByType.ep}
            title={intl.formatMessage(messages.eps)}
            emptyMessage={intl.formatMessage(messages.noAlbums)}
          />
          <AlbumList
            albums={albumsByType.single}
            title={intl.formatMessage(messages.singles)}
            emptyMessage={intl.formatMessage(messages.noAlbums)}
          />
          <AlbumList
            albums={albumsByType.compilation}
            title={intl.formatMessage(messages.compilations)}
            emptyMessage={intl.formatMessage(messages.noAlbums)}
          />
          <AlbumList
            albums={albumsByType.soundtrack}
            title={intl.formatMessage(messages.soundtracks)}
            emptyMessage={intl.formatMessage(messages.noAlbums)}
          />
        </div>
      )}
      <div className="extra-bottom-space relative" />
    </div>
  );
};

export default ArtistDetails;
