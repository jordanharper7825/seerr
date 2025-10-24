import logger from '@server/logger';
import ServarrBase from './base';

// Lidarr-specific interfaces
export interface LidarrArtistOptions {
  artistName: string;
  foreignArtistId: string; // MusicBrainz ID
  qualityProfileId: number;
  metadataProfileId: number;
  rootFolderPath: string;
  tags: number[];
  monitored?: boolean;
  searchNow?: boolean;
  monitorNewItems: 'all' | 'none' | 'new'; // Albums to monitor
}

export interface LidarrAlbum {
  id: number;
  title: string;
  disambiguation?: string;
  overview?: string;
  artistId: number;
  foreignAlbumId: string; // MusicBrainz Release Group ID
  monitored: boolean;
  anyReleaseOk: boolean;
  profileId: number;
  duration: number;
  albumType: string; // Album, EP, Single, Broadcast, Other
  releases: LidarrRelease[];
  genres: string[];
  media: LidarrMedia[];
  artist: LidarrArtist;
  images: Array<{
    url: string;
    coverType: 'poster' | 'banner' | 'fanart' | 'cover' | 'disc' | 'logo';
    remoteUrl: string;
  }>;
  links: Array<{
    url: string;
    name: string;
  }>;
  statistics: {
    trackFileCount: number;
    trackCount: number;
    totalTrackCount: number;
    sizeOnDisk: number;
    percentOfTracks: number;
  };
  releaseDate?: string;
  ratings: {
    votes: number;
    value: number;
  };
  grabbed: boolean;
}

export interface LidarrRelease {
  id: number;
  albumId: number;
  foreignReleaseId: string; // MusicBrainz Release ID
  title: string;
  status: string;
  duration: number;
  trackCount: number;
  media: LidarrMedia[];
  mediumFormat: string; // CD, Digital Media, Vinyl, etc.
  disambiguation?: string;
  country: string[];
  label: string[];
  monitored: boolean;
}

export interface LidarrMedia {
  mediumNumber: number;
  mediumName: string;
  mediumFormat: string;
}

export interface LidarrArtist {
  id: number;
  artistMetadataId: number;
  status: string;
  ended: boolean;
  artistName: string;
  foreignArtistId: string; // MusicBrainz Artist ID
  tadbId: number; // The Audio DB ID
  discogsId: number;
  overview?: string;
  artistType?: string;
  disambiguation?: string;
  links: Array<{
    url: string;
    name: string;
  }>;
  images: Array<{
    url: string;
    coverType: 'poster' | 'banner' | 'fanart' | 'cover' | 'disc' | 'logo';
    remoteUrl: string;
  }>;
  path: string;
  qualityProfileId: number;
  metadataProfileId: number;
  monitored: boolean;
  monitorNewItems: 'all' | 'none' | 'new';
  rootFolderPath?: string;
  genres: string[];
  cleanName: string;
  sortName: string;
  tags: number[];
  added: string;
  ratings: {
    votes: number;
    value: number;
  };
  statistics: {
    albumCount: number;
    trackFileCount: number;
    trackCount: number;
    totalTrackCount: number;
    sizeOnDisk: number;
    percentOfTracks: number;
  };
}

export interface LidarrMetadataProfile {
  id: number;
  name: string;
  primaryAlbumTypes: Array<{
    albumType: { name: string };
    allowed: boolean;
  }>;
  secondaryAlbumTypes: Array<{
    albumType: { name: string };
    allowed: boolean;
  }>;
  releaseStatuses: Array<{
    releaseStatus: { name: string };
    allowed: boolean;
  }>;
}

class LidarrAPI extends ServarrBase<{ artistId: number; albumId?: number }> {
  constructor({ url, apiKey }: { url: string; apiKey: string }) {
    super({ url, apiKey, cacheName: 'lidarr', apiName: 'Lidarr' });
  }

  /**
   * Get all artists from Lidarr
   */
  public getArtists = async (): Promise<LidarrArtist[]> => {
    try {
      const response = await this.axios.get<LidarrArtist[]>('/artist');
      return response.data;
    } catch (e) {
      throw new Error(`[Lidarr] Failed to retrieve artists: ${e.message}`);
    }
  };

  /**
   * Get a single artist by Lidarr ID
   */
  public getArtist = async ({ id }: { id: number }): Promise<LidarrArtist> => {
    try {
      const response = await this.axios.get<LidarrArtist>(`/artist/${id}`);
      return response.data;
    } catch (e) {
      throw new Error(`[Lidarr] Failed to retrieve artist: ${e.message}`);
    }
  };

  /**
   * Lookup artist by MusicBrainz ID
   */
  public async getArtistByMusicBrainzId(
    id: string
  ): Promise<LidarrArtist | undefined> {
    try {
      const response = await this.axios.get<LidarrArtist[]>('/artist/lookup', {
        params: {
          term: `lidarr:${id}`, // Lidarr uses 'lidarr:' prefix for MusicBrainz IDs
        },
      });

      if (!response.data || response.data.length === 0) {
        return undefined;
      }

      return response.data[0];
    } catch (e) {
      logger.error('Error retrieving artist by MusicBrainz ID', {
        label: 'Lidarr API',
        errorMessage: e.message,
        musicBrainzId: id,
      });
      return undefined;
    }
  }

  /**
   * Search for artists by name
   */
  public async searchArtists(term: string): Promise<LidarrArtist[]> {
    try {
      const response = await this.axios.get<LidarrArtist[]>('/artist/lookup', {
        params: { term },
      });

      return response.data || [];
    } catch (e) {
      logger.error('Error searching artists', {
        label: 'Lidarr API',
        errorMessage: e.message,
        searchTerm: term,
      });
      return [];
    }
  }

  /**
   * Add artist to Lidarr
   */
  public addArtist = async (
    options: LidarrArtistOptions
  ): Promise<LidarrArtist> => {
    try {
      // First check if artist already exists
      const existingArtist = await this.getArtistByMusicBrainzId(
        options.foreignArtistId
      );

      if (existingArtist) {
        // Artist exists, check if it has tracks
        if (
          existingArtist.statistics &&
          existingArtist.statistics.trackFileCount > 0
        ) {
          logger.info(
            'Artist already exists and has tracks. Skipping add and returning success',
            {
              label: 'Lidarr',
              artist: existingArtist.artistName,
            }
          );
          return existingArtist;
        }

        // Artist exists but not monitored - update it
        if (existingArtist.id && !existingArtist.monitored) {
          const response = await this.axios.put<LidarrArtist>('/artist', {
            ...existingArtist,
            qualityProfileId: options.qualityProfileId,
            metadataProfileId: options.metadataProfileId,
            rootFolderPath: options.rootFolderPath,
            monitored: options.monitored,
            monitorNewItems: options.monitorNewItems || 'all',
            tags: Array.from(
              new Set([...existingArtist.tags, ...options.tags])
            ),
            addOptions: {
              searchForMissingAlbums: options.searchNow,
            },
          });

          if (response.data.monitored) {
            logger.info(
              'Found existing artist in Lidarr and set it to monitored.',
              {
                label: 'Lidarr',
                artistId: response.data.id,
                artistName: response.data.artistName,
              }
            );

            if (options.searchNow) {
              await this.searchArtist(response.data.id);
            }

            return response.data;
          } else {
            logger.error('Failed to update existing artist in Lidarr.', {
              label: 'Lidarr',
              options,
            });
            throw new Error('Failed to update existing artist in Lidarr');
          }
        }

        if (existingArtist.id && existingArtist.monitored) {
          logger.info(
            'Artist is already monitored in Lidarr. Skipping add and returning success',
            { label: 'Lidarr' }
          );
          return existingArtist;
        }
      }

      // Artist doesn't exist, add it
      const response = await this.axios.post<LidarrArtist>('/artist', {
        artistName: options.artistName,
        foreignArtistId: options.foreignArtistId,
        qualityProfileId: options.qualityProfileId,
        metadataProfileId: options.metadataProfileId,
        rootFolderPath: options.rootFolderPath,
        monitored: options.monitored ?? true,
        monitorNewItems: options.monitorNewItems || 'all',
        tags: options.tags,
        addOptions: {
          searchForMissingAlbums: options.searchNow ?? false,
        },
      });

      logger.info('Added artist to Lidarr', {
        label: 'Lidarr',
        artistId: response.data.id,
        artistName: response.data.artistName,
      });

      return response.data;
    } catch (e) {
      logger.error('Failed to add artist to Lidarr', {
        label: 'Lidarr',
        errorMessage: e.message,
        options,
      });
      throw new Error('Failed to add artist to Lidarr');
    }
  };

  /**
   * Trigger search for artist's missing albums
   */
  public searchArtist = async (artistId: number): Promise<void> => {
    try {
      await this.axios.post('/command', {
        name: 'ArtistSearch',
        artistId,
      });

      logger.info('Triggered search for artist', {
        label: 'Lidarr',
        artistId,
      });
    } catch (e) {
      logger.error('Failed to trigger artist search', {
        label: 'Lidarr',
        errorMessage: e.message,
        artistId,
      });
    }
  };

  /**
   * Get all albums for an artist
   */
  public getAlbumsByArtist = async (
    artistId: number
  ): Promise<LidarrAlbum[]> => {
    try {
      const response = await this.axios.get<LidarrAlbum[]>('/album', {
        params: { artistId },
      });

      return response.data;
    } catch (e) {
      logger.error('Failed to get albums for artist', {
        label: 'Lidarr',
        errorMessage: e.message,
        artistId,
      });
      return [];
    }
  };

  /**
   * Get metadata profiles (album types to download)
   */
  public getMetadataProfiles = async (): Promise<LidarrMetadataProfile[]> => {
    try {
      const response = await this.axios.get<LidarrMetadataProfile[]>(
        '/metadataprofile'
      );

      return response.data;
    } catch (e) {
      throw new Error(
        `[Lidarr] Failed to retrieve metadata profiles: ${e.message}`
      );
    }
  };

  /**
   * Monitor/unmonitor specific albums
   */
  public updateAlbums = async (
    albums: Array<{ id: number; monitored: boolean }>
  ): Promise<void> => {
    try {
      await this.axios.put('/album/monitor', {
        albumIds: albums.map((a) => a.id),
        monitored: albums[0]?.monitored ?? true,
      });

      logger.info('Updated album monitoring', {
        label: 'Lidarr',
        albumCount: albums.length,
      });
    } catch (e) {
      logger.error('Failed to update albums', {
        label: 'Lidarr',
        errorMessage: e.message,
      });
      throw new Error('Failed to update albums in Lidarr');
    }
  };
}

export default LidarrAPI;
