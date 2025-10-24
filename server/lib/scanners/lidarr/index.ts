import type { LidarrArtist } from '@server/api/servarr/lidarr';
import LidarrAPI from '@server/api/servarr/lidarr';
import { MediaStatus, MediaType } from '@server/constants/media';
import { getRepository } from '@server/datasource';
import Artist from '@server/entity/Artist';
import Media from '@server/entity/Media';
import type {
  RunnableScanner,
  StatusBase,
} from '@server/lib/scanners/baseScanner';
import BaseScanner from '@server/lib/scanners/baseScanner';
import type { LidarrSettings } from '@server/lib/settings';
import { getSettings } from '@server/lib/settings';
import logger from '@server/logger';
import { uniqWith } from 'lodash';

type SyncStatus = StatusBase & {
  currentServer: LidarrSettings;
  servers: LidarrSettings[];
};

class LidarrScanner
  extends BaseScanner<LidarrArtist>
  implements RunnableScanner<SyncStatus>
{
  private servers: LidarrSettings[];
  private currentServer: LidarrSettings;
  private lidarrApi: LidarrAPI;

  constructor() {
    super('Lidarr Scan', { bundleSize: 50 });
  }

  public status(): SyncStatus {
    return {
      running: this.running,
      progress: this.progress,
      total: this.items.length,
      currentServer: this.currentServer,
      servers: this.servers,
    };
  }

  public async run(): Promise<void> {
    const settings = getSettings();
    const sessionId = this.startRun();

    try {
      this.servers = uniqWith(settings.lidarr || [], (lidarrA, lidarrB) => {
        return (
          lidarrA.hostname === lidarrB.hostname &&
          lidarrA.port === lidarrB.port &&
          lidarrA.baseUrl === lidarrB.baseUrl
        );
      });

      for (const server of this.servers) {
        this.currentServer = server;
        if (server.syncEnabled) {
          this.log(
            `Beginning to process Lidarr server: ${server.name}`,
            'info'
          );

          this.lidarrApi = new LidarrAPI({
            apiKey: server.apiKey,
            url: LidarrAPI.buildUrl(server, '/api/v1'),
          });

          this.items = await this.lidarrApi.getArtists();

          await this.loop(this.processLidarrArtist.bind(this), { sessionId });
        } else {
          this.log(`Sync not enabled. Skipping Lidarr server: ${server.name}`);
        }
      }

      this.log('Lidarr scan complete', 'info');
    } catch (e) {
      this.log('Scan interrupted', 'error', { errorMessage: e.message });
    } finally {
      this.endRun(sessionId);
    }
  }

  private async processLidarrArtist(lidarrArtist: LidarrArtist): Promise<void> {
    if (!lidarrArtist.monitored && lidarrArtist.statistics.trackFileCount === 0) {
      this.log(
        'Artist is unmonitored and has no tracks. Skipping item.',
        'debug',
        {
          artist: lidarrArtist.artistName,
        }
      );
      return;
    }

    try {
      await this.processArtist(lidarrArtist);
    } catch (e) {
      this.log('Failed to process Lidarr artist', 'error', {
        errorMessage: e.message,
        artist: lidarrArtist.artistName,
      });
    }
  }

  private async processArtist(lidarrArtist: LidarrArtist): Promise<void> {
    const mediaRepository = getRepository(Media);
    const artistRepository = getRepository(Artist);

    // Check if media entity exists for this artist
    let media = await mediaRepository.findOne({
      where: {
        musicbrainzId: lidarrArtist.foreignArtistId,
        mediaType: MediaType.MUSIC,
      },
      relations: ['artist'],
    });

    if (!media) {
      // Create new media entity for this artist
      media = new Media();
      media.mediaType = MediaType.MUSIC;
      media.musicbrainzId = lidarrArtist.foreignArtistId;
      media.artistName = lidarrArtist.artistName;
      media.tmdbId = null;
    }

    // Determine availability status
    const hasMusic =
      lidarrArtist.statistics && lidarrArtist.statistics.trackFileCount > 0;

    if (hasMusic) {
      media.status = MediaStatus.AVAILABLE;
      media.mediaAddedAt = new Date(lidarrArtist.added);
    } else if (lidarrArtist.monitored) {
      media.status = MediaStatus.PROCESSING;
    } else {
      media.status = MediaStatus.UNKNOWN;
    }

    media.serviceId = this.currentServer.id;

    // Save media first
    await mediaRepository.save(media);

    // Check if artist entity exists
    let artist: Artist | null = null;
    if (media.artist && media.artist.length > 0) {
      artist = media.artist[0];
    } else {
      artist = await artistRepository.findOne({
        where: {
          musicbrainzId: lidarrArtist.foreignArtistId,
        },
      });
    }

    if (!artist) {
      // Create new artist entity
      artist = new Artist();
      artist.musicbrainzId = lidarrArtist.foreignArtistId;
      artist.artistName = lidarrArtist.artistName;
      artist.media = media;
    }

    // Update artist details
    artist.lidarrId = lidarrArtist.id;
    artist.lidarrServerId = this.currentServer.id;
    artist.biography = lidarrArtist.overview;
    artist.genres = lidarrArtist.genres;
    artist.poster =
      lidarrArtist.images.find((i) => i.coverType === 'poster')?.remoteUrl ||
      null;

    await artistRepository.save(artist);

    this.log('Processed artist from Lidarr', 'debug', {
      artistName: lidarrArtist.artistName,
      musicbrainzId: lidarrArtist.foreignArtistId,
      status: media.status,
      trackCount: lidarrArtist.statistics?.trackFileCount || 0,
    });
  }
}

export const lidarrScanner = new LidarrScanner();
