import ExternalAPI from '@server/api/externalapi';
import cacheManager from '@server/lib/cache';
import logger from '@server/logger';
import rateLimit from 'axios-rate-limit';

export interface MusicBrainzArtist {
  id: string;
  name: string;
  'sort-name': string;
  disambiguation?: string;
  type?: string;
  'type-id'?: string;
  country?: string;
  'life-span'?: {
    begin?: string;
    end?: string;
    ended?: boolean;
  };
  aliases?: Array<{
    name: string;
    'sort-name': string;
    locale?: string;
    type?: string;
    primary?: boolean;
  }>;
  tags?: Array<{
    count: number;
    name: string;
  }>;
  genres?: Array<{
    count: number;
    name: string;
  }>;
  relations?: Array<{
    type: string;
    'type-id': string;
    url?: {
      resource: string;
      id: string;
    };
  }>;
  rating?: {
    value: number;
    'votes-count': number;
  };
}

export interface MusicBrainzReleaseGroup {
  id: string;
  title: string;
  disambiguation?: string;
  'first-release-date'?: string;
  'primary-type'?: string;
  'primary-type-id'?: string;
  'secondary-types'?: string[];
  'secondary-type-ids'?: string[];
  'artist-credit'?: Array<{
    name: string;
    artist: {
      id: string;
      name: string;
      'sort-name': string;
    };
  }>;
  releases?: Array<{
    id: string;
    title: string;
    status?: string;
    date?: string;
    country?: string;
    'track-count'?: number;
    media?: Array<{
      format?: string;
      'disc-count': number;
      'track-count': number;
    }>;
  }>;
  tags?: Array<{
    count: number;
    name: string;
  }>;
  genres?: Array<{
    count: number;
    name: string;
  }>;
  rating?: {
    value: number;
    'votes-count': number;
  };
}

class MusicBrainzAPI extends ExternalAPI {
  constructor() {
    super(
      'https://musicbrainz.org/ws/2',
      {},
      {
        headers: {
          'User-Agent': 'Seerr/1.0.0 (https://github.com/seerr-team/seerr)',
          Accept: 'application/json',
        },
        nodeCache: cacheManager.getCache('musicbrainz').data,
      }
    );

    // MusicBrainz requires 1 request per second
    this.axios = rateLimit(this.axios, {
      maxRequests: 1,
      perMilliseconds: 1000,
    });
  }

  /**
   * Search for artists by name
   */
  public async searchArtists(
    query: string,
    limit = 25
  ): Promise<MusicBrainzArtist[]> {
    try {
      const response = await this.axios.get<{
        artists: MusicBrainzArtist[];
        count: number;
        offset: number;
      }>('/artist', {
        params: {
          query,
          limit,
          fmt: 'json',
        },
      });

      return response.data.artists || [];
    } catch (e) {
      logger.error('Failed to search artists on MusicBrainz', {
        label: 'MusicBrainz API',
        errorMessage: e.message,
        query,
      });
      return [];
    }
  }

  /**
   * Get artist details by MusicBrainz ID
   */
  public async getArtist(mbid: string): Promise<MusicBrainzArtist | null> {
    try {
      const response = await this.axios.get<MusicBrainzArtist>(
        `/artist/${mbid}`,
        {
          params: {
            inc: 'aliases+tags+genres+ratings+url-rels+release-groups',
            fmt: 'json',
          },
        }
      );

      return response.data;
    } catch (e) {
      logger.error('Failed to get artist from MusicBrainz', {
        label: 'MusicBrainz API',
        errorMessage: e.message,
        mbid,
      });
      return null;
    }
  }

  /**
   * Get artist's release groups (albums, EPs, singles, etc.)
   */
  public async getArtistReleaseGroups(
    mbid: string,
    types: string[] = ['album', 'ep', 'single']
  ): Promise<MusicBrainzReleaseGroup[]> {
    try {
      const response = await this.axios.get<{
        'release-groups': MusicBrainzReleaseGroup[];
        'release-group-count': number;
        'release-group-offset': number;
      }>('/release-group', {
        params: {
          artist: mbid,
          type: types.join('|'),
          limit: 100,
          fmt: 'json',
          inc: 'artist-credits+tags+genres+ratings',
        },
      });

      return response.data['release-groups'] || [];
    } catch (e) {
      logger.error('Failed to get release groups from MusicBrainz', {
        label: 'MusicBrainz API',
        errorMessage: e.message,
        mbid,
      });
      return [];
    }
  }

  /**
   * Get release group details
   */
  public async getReleaseGroup(
    releaseGroupId: string
  ): Promise<MusicBrainzReleaseGroup | null> {
    try {
      const response = await this.axios.get<MusicBrainzReleaseGroup>(
        `/release-group/${releaseGroupId}`,
        {
          params: {
            inc: 'artist-credits+tags+genres+ratings+releases',
            fmt: 'json',
          },
        }
      );

      return response.data;
    } catch (e) {
      logger.error('Failed to get release group from MusicBrainz', {
        label: 'MusicBrainz API',
        errorMessage: e.message,
        releaseGroupId,
      });
      return null;
    }
  }

  /**
   * Get Cover Art Archive image URL for a release group
   */
  public getCoverArtUrl(
    releaseGroupId: string,
    size: 250 | 500 | 1200 = 500
  ): string {
    return `https://coverartarchive.org/release-group/${releaseGroupId}/front-${size}`;
  }

  /**
   * Check if cover art exists for a release group
   */
  public async hasCoverArt(releaseGroupId: string): Promise<boolean> {
    try {
      const response = await this.axios.head(
        `https://coverartarchive.org/release-group/${releaseGroupId}`
      );
      return response.status === 200;
    } catch (e) {
      return false;
    }
  }
}

export default MusicBrainzAPI;
