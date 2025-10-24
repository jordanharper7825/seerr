import { Router } from 'express';
import MusicBrainzAPI from '@server/api/musicbrainz';
import LastFmAPI from '@server/api/lastfm';
import { getRepository } from '@server/datasource';
import Media from '@server/entity/Media';
import { MediaType } from '@server/constants/media';
import { isAuthenticated } from '@server/middleware/auth';
import logger from '@server/logger';

const musicRoutes = Router();

/**
 * GET /api/v1/music/search
 * Search for artists
 */
musicRoutes.get('/search', isAuthenticated(), async (req, res, next) => {
  try {
    const { query } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query parameter required' });
    }

    const musicbrainz = new MusicBrainzAPI();
    const lastfm = new LastFmAPI();

    const results = await musicbrainz.searchArtists(query);

    // Enrich with Last.fm data and check availability in database
    const enrichedResults = await Promise.all(
      results.slice(0, 20).map(async (artist) => {
        const lastfmData = await lastfm.getArtistInfo(artist.name, artist.id);

        // Check if exists in database
        const media = await getRepository(Media).findOne({
          where: {
            musicbrainzId: artist.id,
            mediaType: MediaType.MUSIC,
          },
          relations: ['requests'],
        });

        return {
          id: artist.id,
          name: artist.name,
          disambiguation: artist.disambiguation,
          type: artist.type,
          country: artist.country,
          lifeSpan: artist['life-span'],
          genres: artist.genres?.map((g) => g.name) || [],
          tags: artist.tags?.map((t) => t.name) || [],
          rating: artist.rating?.value || 0,
          images: {
            poster: lastfmData?.artist.image?.find((i) => i.size === 'mega')?.[
              '#text'
            ],
            banner: lastfmData?.artist.image?.find(
              (i) => i.size === 'extralarge'
            )?.['#text'],
          },
          mediaInfo: media
            ? {
                id: media.id,
                status: media.status,
                requests: media.requests || [],
              }
            : null,
        };
      })
    );

    return res.status(200).json({ results: enrichedResults });
  } catch (e) {
    logger.error('Music search failed', {
      label: 'Music Routes',
      errorMessage: e.message,
    });
    next({ status: 500, message: 'Search failed' });
  }
});

/**
 * GET /api/v1/music/:id
 * Get artist details by MusicBrainz ID
 */
musicRoutes.get('/:id', isAuthenticated(), async (req, res, next) => {
  try {
    const { id } = req.params;
    const musicbrainz = new MusicBrainzAPI();
    const lastfm = new LastFmAPI();

    // Get artist data from MusicBrainz
    const artist = await musicbrainz.getArtist(id);

    if (!artist) {
      return next({ status: 404, message: 'Artist not found' });
    }

    // Enrich with Last.fm data (bio, images, similar artists)
    const lastfmData = await lastfm.getArtistInfo(artist.name, artist.id);

    // Check if exists in database
    const media = await getRepository(Media).findOne({
      where: { musicbrainzId: id, mediaType: MediaType.MUSIC },
      relations: ['requests', 'artist'],
    });

    const enrichedArtist = {
      id: artist.id,
      name: artist.name,
      sortName: artist['sort-name'],
      disambiguation: artist.disambiguation,
      type: artist.type,
      country: artist.country,
      lifeSpan: artist['life-span'],
      genres: artist.genres?.map((g) => g.name) || [],
      tags: artist.tags?.map((t) => t.name) || [],
      rating: artist.rating?.value || 0,
      biography: lastfmData?.artist.bio?.content
        ?.replace(/<a[^>]*>.*?<\/a>/gi, '')
        .replace(/<[^>]+>/g, ''),
      images: {
        poster: lastfmData?.artist.image?.find((i) => i.size === 'mega')?.[
          '#text'
        ],
        banner: lastfmData?.artist.image?.find((i) => i.size === 'extralarge')?.[
          '#text'
        ],
        fanart: lastfmData?.artist.image?.find((i) => i.size === 'mega')?.[
          '#text'
        ],
      },
      links: artist.relations
        ?.filter((r) => r.url)
        .map((r) => ({
          type: r.type,
          url: r.url?.resource || '',
        })) || [],
      similarArtists: lastfmData?.artist.similar?.artist || [],
      playcount: parseInt(lastfmData?.artist.stats?.playcount || '0'),
      listeners: parseInt(lastfmData?.artist.stats?.listeners || '0'),
      mediaInfo: media
        ? {
            id: media.id,
            status: media.status,
            requests: media.requests || [],
          }
        : null,
    };

    return res.status(200).json(enrichedArtist);
  } catch (e) {
    logger.error('Failed to get artist details', {
      label: 'Music Routes',
      errorMessage: e.message,
      artistId: req.params.id,
    });
    next({ status: 500, message: 'Failed to retrieve artist' });
  }
});

/**
 * GET /api/v1/music/:id/albums
 * Get all albums for an artist
 */
musicRoutes.get('/:id/albums', isAuthenticated(), async (req, res, next) => {
  try {
    const { id } = req.params;
    const musicbrainz = new MusicBrainzAPI();

    const releaseGroups = await musicbrainz.getArtistReleaseGroups(id);

    const albums = releaseGroups.map((rg) => ({
      id: rg.id,
      title: rg.title,
      disambiguation: rg.disambiguation,
      releaseDate: rg['first-release-date'],
      albumType: rg['primary-type'],
      secondaryTypes: rg['secondary-types'] || [],
      artistCredit: rg['artist-credit']?.map((ac) => ({
        name: ac.name,
        artistId: ac.artist.id,
      })) || [],
      coverArt: musicbrainz.getCoverArtUrl(rg.id),
      trackCount: rg.releases?.[0]?.['track-count'],
      rating: rg.rating?.value || 0,
      genres: rg.genres?.map((g) => g.name) || [],
      tags: rg.tags?.map((t) => t.name) || [],
    }));

    return res.status(200).json(albums);
  } catch (e) {
    logger.error('Failed to get artist albums', {
      label: 'Music Routes',
      errorMessage: e.message,
      artistId: req.params.id,
    });
    next({ status: 500, message: 'Failed to retrieve albums' });
  }
});

/**
 * GET /api/v1/music/discover/popular
 * Get popular artists (placeholder - would integrate with Last.fm charts)
 */
musicRoutes.get('/discover/popular', isAuthenticated(), async (req, res) => {
  try {
    // This would typically fetch from Last.fm or MusicBrainz top artists
    // For now, return empty array - can be implemented with actual API
    return res.status(200).json({ results: [] });
  } catch (e) {
    logger.error('Failed to get popular artists', {
      label: 'Music Routes',
      errorMessage: e.message,
    });
    return res.status(500).json({ error: 'Failed to retrieve popular artists' });
  }
});

/**
 * GET /api/v1/music/discover/trending
 * Get trending artists (placeholder)
 */
musicRoutes.get('/discover/trending', isAuthenticated(), async (req, res) => {
  try {
    // This would typically fetch from Last.fm or similar
    return res.status(200).json({ results: [] });
  } catch (e) {
    logger.error('Failed to get trending artists', {
      label: 'Music Routes',
      errorMessage: e.message,
    });
    return res.status(500).json({ error: 'Failed to retrieve trending artists' });
  }
});

export default musicRoutes;
