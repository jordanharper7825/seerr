import ExternalAPI from '@server/api/externalapi';
import cacheManager from '@server/lib/cache';
import { getSettings } from '@server/lib/settings';
import logger from '@server/logger';

interface LastFmArtistInfo {
  artist: {
    name: string;
    mbid: string;
    url: string;
    image: Array<{
      '#text': string;
      size: 'small' | 'medium' | 'large' | 'extralarge' | 'mega';
    }>;
    streamable: string;
    ontour: string;
    stats: {
      listeners: string;
      playcount: string;
    };
    similar: {
      artist: Array<{
        name: string;
        url: string;
        image: Array<{
          '#text': string;
          size: string;
        }>;
      }>;
    };
    tags: {
      tag: Array<{
        name: string;
        url: string;
      }>;
    };
    bio: {
      links: {
        link: {
          '#text': string;
          rel: string;
          href: string;
        };
      };
      published: string;
      summary: string;
      content: string;
    };
  };
}

interface LastFmAlbumInfo {
  album: {
    name: string;
    artist: string;
    mbid: string;
    url: string;
    image: Array<{
      '#text': string;
      size: string;
    }>;
    listeners: string;
    playcount: string;
    tracks: {
      track: Array<{
        name: string;
        url: string;
        duration: string;
        '@attr': {
          rank: number;
        };
        streamable: {
          '#text': string;
          fulltrack: string;
        };
      }>;
    };
    tags: {
      tag: Array<{
        name: string;
        url: string;
      }>;
    };
    wiki?: {
      published: string;
      summary: string;
      content: string;
    };
  };
}

class LastFmAPI extends ExternalAPI {
  private apiKey: string;

  constructor() {
    super(
      'https://ws.audioscrobbler.com/2.0',
      {},
      {
        nodeCache: cacheManager.getCache('lastfm').data,
      }
    );

    const settings = getSettings();
    this.apiKey = settings.main.lastfmApiKey || '';

    if (!this.apiKey) {
      logger.warn('Last.fm API key not configured. Enrichment will be limited', {
        label: 'Last.fm API',
      });
    }
  }

  /**
   * Get artist information from Last.fm
   */
  public async getArtistInfo(
    artistName: string,
    mbid?: string
  ): Promise<LastFmArtistInfo | null> {
    if (!this.apiKey) {
      logger.debug('Last.fm API key not available, skipping enrichment', {
        label: 'Last.fm API',
      });
      return null;
    }

    try {
      const response = await this.axios.get<LastFmArtistInfo>('/', {
        params: {
          method: 'artist.getinfo',
          artist: artistName,
          mbid: mbid,
          api_key: this.apiKey,
          format: 'json',
          autocorrect: 1,
        },
      });

      return response.data;
    } catch (e) {
      logger.warn('Failed to get artist info from Last.fm', {
        label: 'Last.fm API',
        errorMessage: e.message,
        artistName,
      });
      return null;
    }
  }

  /**
   * Get album information from Last.fm
   */
  public async getAlbumInfo(
    artistName: string,
    albumName: string,
    mbid?: string
  ): Promise<LastFmAlbumInfo | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const response = await this.axios.get<LastFmAlbumInfo>('/', {
        params: {
          method: 'album.getinfo',
          artist: artistName,
          album: albumName,
          mbid: mbid,
          api_key: this.apiKey,
          format: 'json',
          autocorrect: 1,
        },
      });

      return response.data;
    } catch (e) {
      logger.warn('Failed to get album info from Last.fm', {
        label: 'Last.fm API',
        errorMessage: e.message,
        artistName,
        albumName,
      });
      return null;
    }
  }

  /**
   * Enrich MusicBrainz artist data with Last.fm data
   */
  public async enrichArtist(musicbrainzData: any): Promise<any> {
    if (!this.apiKey) {
      return musicbrainzData;
    }

    try {
      const lastfmData = await this.getArtistInfo(
        musicbrainzData.name,
        musicbrainzData.id
      );

      if (!lastfmData) {
        return musicbrainzData;
      }

      const lastfmArtist = lastfmData.artist;

      return {
        ...musicbrainzData,
        biography:
          this.cleanHtmlTags(lastfmArtist.bio?.content) ||
          musicbrainzData.biography,
        images: {
          poster: lastfmArtist.image?.find((i) => i.size === 'mega')?.[
            '#text'
          ],
          banner: lastfmArtist.image?.find((i) => i.size === 'extralarge')?.[
            '#text'
          ],
          fanart: lastfmArtist.image?.find((i) => i.size === 'mega')?.[
            '#text'
          ],
        },
        similarArtists: lastfmArtist.similar?.artist || [],
        playcount: parseInt(lastfmArtist.stats?.playcount || '0'),
        listeners: parseInt(lastfmArtist.stats?.listeners || '0'),
        tags: [
          ...(musicbrainzData.tags || []),
          ...(lastfmArtist.tags?.tag?.map((t) => t.name) || []),
        ],
      };
    } catch (e) {
      logger.warn('Failed to enrich artist with Last.fm data', {
        label: 'Last.fm API',
        error: e.message,
      });
      return musicbrainzData;
    }
  }

  /**
   * Clean HTML tags from Last.fm bio text
   */
  private cleanHtmlTags(html: string): string {
    if (!html) return '';

    return html
      .replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2')
      .replace(/<[^>]+>/g, '')
      .trim();
  }
}

export default LastFmAPI;
