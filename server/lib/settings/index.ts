import { MediaServerType } from '@server/constants/server';
import { Permission } from '@server/lib/permissions';
import { runMigrations } from '@server/lib/settings/migrator';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import { merge } from 'lodash';
import path from 'path';

// Type for region/country data
export interface Region {
  iso_3166_1: string;
  name: string;
}

// Type for language data
export interface Language {
  iso_639_1: string;
  english_name: string;
  name: string;
}

// Type for job IDs
export type JobId =
  | 'plex-recently-added-scan'
  | 'plex-full-scan'
  | 'plex-refresh-token'
  | 'plex-watchlist-sync'
  | 'jellyfin-recently-added-scan'
  | 'jellyfin-full-scan'
  | 'radarr-scan'
  | 'sonarr-scan'
  | 'lidarr-scan'
  | 'availability-sync'
  | 'download-sync'
  | 'download-sync-reset'
  | 'image-cache-cleanup'
  | 'process-blacklisted-tags';

export interface JobSettings {
  schedule: string;
}

export type JobsSettings = Partial<Record<JobId, JobSettings>>;

/* --------------------------------------------------------
 * NOTIFICATION AGENTS
 * ------------------------------------------------------*/

export interface NotificationAgentConfig {
  enabled: boolean;
  embedPoster: boolean;
  types?: number;
  options: Record<string, unknown>;
}

export interface NotificationAgentEmail extends NotificationAgentConfig {
  options: {
    userEmailRequired: boolean;
    emailFrom: string;
    smtpHost: string;
    smtpPort: number;
    secure: boolean;
    ignoreTls: boolean;
    requireTls: boolean;
    authUser?: string;
    authPass?: string;
    allowSelfSigned: boolean;
    senderName: string;
    pgpPrivateKey?: string;
    pgpPassword?: string;
  };
}

export interface NotificationAgentNtfy extends NotificationAgentConfig {
  options: {
    url: string;
    topic: string;
    authMethodUsernamePassword?: boolean;
    username?: string;
    password?: string;
    authMethodToken?: boolean;
    token?: string;
  };
}

export interface NotificationAgentDiscord extends NotificationAgentConfig {
  options: {
    webhookUrl: string;
    botUsername?: string;
    botAvatarUrl?: string;
    enableMentions?: boolean;
    webhookRoleId?: string;
  };
}

export interface NotificationAgentGotify extends NotificationAgentConfig {
  options: {
    url: string;
    token: string;
    priority?: number;
  };
}

export interface NotificationAgentPushbullet extends NotificationAgentConfig {
  options: {
    accessToken: string;
    channelTag?: string;
  };
}

export interface NotificationAgentPushover extends NotificationAgentConfig {
  options: {
    userToken: string;
    appToken: string;
    accessToken?: string;
    sound?: string;
  };
}

export interface NotificationAgentSlack extends NotificationAgentConfig {
  options: {
    webhookUrl: string;
  };
}

export interface NotificationAgentTelegram extends NotificationAgentConfig {
  options: {
    botAPI: string;
    chatId: string;
    sendSilently?: boolean;
    botUsername?: string;
    messageThreadId?: string;
  };
}

export interface NotificationAgentWebhook extends NotificationAgentConfig {
  options: {
    webhookUrl: string;
    authHeader?: string;
    jsonPayload?: string;
    supportVariables?: boolean;
  };
}

export enum NotificationAgentKey {
  DISCORD = 'discord',
  EMAIL = 'email',
  GOTIFY = 'gotify',
  NTFY = 'ntfy',
  PUSHBULLET = 'pushbullet',
  PUSHOVER = 'pushover',
  SLACK = 'slack',
  TELEGRAM = 'telegram',
  WEBHOOK = 'webhook',
  WEBPUSH = 'webpush',
}

/** Notification settings wrapper — all agents are strongly typed */
export interface NotificationSettings {
  agents: {
    discord: NotificationAgentDiscord;
    email: NotificationAgentEmail;
    gotify: NotificationAgentGotify;
    ntfy: NotificationAgentNtfy;
    pushbullet: NotificationAgentPushbullet;
    pushover: NotificationAgentPushover;
    slack: NotificationAgentSlack;
    telegram: NotificationAgentTelegram;
    webhook: NotificationAgentWebhook;
    webpush: NotificationAgentConfig;
  };
}

/* --------------------------------------------------------
 * CORE SETTINGS
 * ------------------------------------------------------*/

interface Quota {
  quotaLimit?: number;
  quotaDays?: number;
}

export enum MetadataProviderType {
  TMDB = 'tmdb',
  TVDB = 'tvdb',
}

export interface MetadataSettings {
  tv: MetadataProviderType;
  anime: MetadataProviderType;
}

export interface ProxySettings {
  enabled: boolean;
  hostname: string;
  port: number;
  useSsl: boolean;
  user: string;
  password: string;
  bypassFilter: string;
  bypassLocalAddresses: boolean;
}

export interface Library {
  id: string;
  name: string;
  enabled: boolean;
  type: 'show' | 'movie';
  lastScan?: number;
}

export interface PlexSettings {
  name: string;
  machineId?: string;
  ip: string;
  port: number;
  useSsl?: boolean;
  libraries: Library[];
  webAppUrl?: string;
}

export interface JellyfinSettings {
  name: string;
  ip: string;
  port: number;
  useSsl?: boolean;
  urlBase?: string;
  externalHostname?: string;
  jellyfinForgotPasswordUrl?: string;
  libraries: Library[];
  serverId: string;
  apiKey: string;
}

export interface TautulliSettings {
  hostname?: string;
  port?: number;
  useSsl?: boolean;
  urlBase?: string;
  apiKey?: string;
  externalUrl?: string;
}

export interface DVRSettings {
  id: number;
  name: string;
  hostname: string;
  port: number;
  apiKey: string;
  useSsl: boolean;
  baseUrl?: string;
  activeProfileId: number;
  activeProfileName: string;
  activeDirectory: string;
  tags: number[];
  is4k: boolean;
  isDefault: boolean;
  externalUrl?: string;
  syncEnabled: boolean;
  preventSearch: boolean;
  tagRequests: boolean;
  overrideRule: number[];
}

export interface RadarrSettings extends DVRSettings {
  minimumAvailability: string;
}

export interface SonarrSettings extends DVRSettings {
  seriesType: 'standard' | 'daily' | 'anime';
  animeSeriesType: 'standard' | 'daily' | 'anime';
  activeAnimeProfileId?: number;
  activeAnimeProfileName?: string;
  activeAnimeDirectory?: string;
  activeAnimeLanguageProfileId?: number;
  activeLanguageProfileId?: number;
  animeTags?: number[];
  enableSeasonFolders: boolean;
}

export interface LidarrSettings extends DVRSettings {
  metadataProfileId: number;
  metadataProfileName: string;
  monitorNewItems: 'all' | 'none' | 'new';
  albumFolder: boolean;
}

export interface MainSettings {
  apiKey: string;
  applicationTitle: string;
  applicationUrl: string;
  cacheImages: boolean;
  defaultPermissions: number;
  defaultQuotas: {
    movie: Quota;
    tv: Quota;
    music: Quota;
  };
  hideAvailable: boolean;
  hideBlacklisted: boolean;
  localLogin: boolean;
  mediaServerLogin: boolean;
  newPlexLogin: boolean;
  discoverRegion: string;
  streamingRegion: string;
  originalLanguage: string;
  blacklistedTags: string;
  blacklistedTagsLimit: number;
  mediaServerType: number;
  partialRequestsEnabled: boolean;
  enableSpecialEpisodes: boolean;
  locale: string;
  youtubeUrl: string;
  lastfmApiKey?: string;
}

export interface NetworkSettings {
  csrfProtection: boolean;
  forceIpv4First: boolean;
  trustProxy: boolean;
  proxy: ProxySettings;
  dnsCache: { enabled: boolean; forceMinTtl?: number; forceMaxTtl?: number };
}

interface PublicSettings {
  initialized: boolean;
}

export interface FullPublicSettings extends PublicSettings {
  main: MainSettings;
  plex: {
    name: string;
    machineId?: string;
    ip: string;
    port: number;
    useSsl?: boolean;
    webAppUrl?: string;
  };
  jellyfin: {
    name: string;
    ip: string;
    port: number;
    useSsl?: boolean;
    urlBase?: string;
    externalHostname?: string;
    jellyfinForgotPasswordUrl?: string;
  };
}

export interface AllSettings {
  clientId: string;
  vapidPublic: string;
  vapidPrivate: string;
  main: MainSettings;
  plex: PlexSettings;
  jellyfin: JellyfinSettings;
  tautulli: TautulliSettings;
  radarr: RadarrSettings[];
  sonarr: SonarrSettings[];
  lidarr: LidarrSettings[];
  public: PublicSettings;
  notifications: NotificationSettings;
  jobs: Record<string, any>;
  network: NetworkSettings;
  metadataSettings: MetadataSettings;
  migrations: string[];
}

/* --------------------------------------------------------
 * CLASS IMPLEMENTATION
 * ------------------------------------------------------*/

const SETTINGS_PATH = process.env.CONFIG_DIRECTORY
  ? `${process.env.CONFIG_DIRECTORY}/settings.json`
  : path.join(__dirname, '../../../config/settings.json');

class Settings {
  private data: AllSettings;

  constructor(initialSettings?: AllSettings) {
    const defaultDiscord: NotificationAgentDiscord = {
      enabled: false,
      embedPoster: true,
      types: 0,
      options: {
        webhookUrl: '',
      },
    };

    const defaultEmail: NotificationAgentEmail = {
      enabled: false,
      embedPoster: true,
      types: 0,
      options: {
        userEmailRequired: false,
        emailFrom: '',
        smtpHost: '',
        smtpPort: 587,
        secure: false,
        ignoreTls: false,
        requireTls: false,
        allowSelfSigned: false,
        senderName: 'Seerr',
      },
    };

    const defaultGotify: NotificationAgentGotify = {
      enabled: false,
      embedPoster: true,
      types: 0,
      options: {
        url: '',
        token: '',
      },
    };

    const defaultNtfy: NotificationAgentNtfy = {
      enabled: false,
      embedPoster: true,
      types: 0,
      options: {
        url: '',
        topic: '',
      },
    };

    const defaultPushbullet: NotificationAgentPushbullet = {
      enabled: false,
      embedPoster: true,
      types: 0,
      options: {
        accessToken: '',
      },
    };

    const defaultPushover: NotificationAgentPushover = {
      enabled: false,
      embedPoster: true,
      types: 0,
      options: {
        userToken: '',
        appToken: '',
      },
    };

    const defaultSlack: NotificationAgentSlack = {
      enabled: false,
      embedPoster: true,
      types: 0,
      options: {
        webhookUrl: '',
      },
    };

    const defaultTelegram: NotificationAgentTelegram = {
      enabled: false,
      embedPoster: true,
      types: 0,
      options: {
        botAPI: '',
        chatId: '',
      },
    };

    const defaultWebhook: NotificationAgentWebhook = {
      enabled: false,
      embedPoster: true,
      types: 0,
      options: {
        webhookUrl: '',
      },
    };

    const defaultWebpush: NotificationAgentConfig = {
      enabled: false,
      embedPoster: true,
      types: 0,
      options: {},
    };

    this.data = {
      clientId: randomUUID(),
      vapidPrivate: '',
      vapidPublic: '',
      main: {
        apiKey: '',
        applicationTitle: 'Seerr',
        applicationUrl: '',
        cacheImages: false,
        defaultPermissions: Permission.REQUEST,
        defaultQuotas: { movie: {}, tv: {}, music: {} },
        hideAvailable: false,
        hideBlacklisted: false,
        localLogin: true,
        mediaServerLogin: true,
        newPlexLogin: true,
        discoverRegion: '',
        streamingRegion: '',
        originalLanguage: '',
        blacklistedTags: '',
        blacklistedTagsLimit: 50,
        mediaServerType: MediaServerType.NOT_CONFIGURED,
        partialRequestsEnabled: true,
        enableSpecialEpisodes: false,
        locale: 'en',
        youtubeUrl: '',
      },
      plex: { name: '', ip: '', port: 32400, useSsl: false, libraries: [] },
      jellyfin: {
        name: '',
        ip: '',
        port: 8096,
        useSsl: false,
        urlBase: '',
        externalHostname: '',
        jellyfinForgotPasswordUrl: '',
        libraries: [],
        serverId: '',
        apiKey: '',
      },
      tautulli: {},
      metadataSettings: {
        tv: MetadataProviderType.TMDB,
        anime: MetadataProviderType.TMDB,
      },
      radarr: [],
      sonarr: [],
      lidarr: [],
      public: { initialized: false },
      notifications: {
        agents: {
          discord: defaultDiscord,
          gotify: defaultGotify,
          ntfy: defaultNtfy,
          pushbullet: defaultPushbullet,
          pushover: defaultPushover,
          slack: defaultSlack,
          telegram: defaultTelegram,
          webhook: defaultWebhook,
          webpush: defaultWebpush,
          email: defaultEmail,
        },
      },
      jobs: {},
      network: {
        csrfProtection: false,
        forceIpv4First: false,
        trustProxy: false,
        proxy: {
          enabled: false,
          hostname: '',
          port: 8080,
          useSsl: false,
          user: '',
          password: '',
          bypassFilter: '',
          bypassLocalAddresses: true,
        },
        dnsCache: { enabled: false, forceMinTtl: 0, forceMaxTtl: -1 },
      },
      migrations: [],
    };

    if (initialSettings) this.data = merge(this.data, initialSettings);
  }

  async load(overrideSettings?: AllSettings): Promise<Settings> {
    if (overrideSettings) {
      this.data = overrideSettings;
      return this;
    }
    try {
      const data = await fs.readFile(SETTINGS_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      const migrated = await runMigrations(parsed, SETTINGS_PATH);
      this.data = merge(this.data, migrated);
    } catch {
      await this.save();
    }
    return this;
  }

  async save(): Promise<void> {
    const tmp = SETTINGS_PATH + '.tmp';
    await fs.writeFile(tmp, JSON.stringify(this.data, undefined, 2));
    await fs.rename(tmp, SETTINGS_PATH);
  }

  get notifications(): NotificationSettings {
    return this.data.notifications;
  }
  get clientId(): string {
    return this.data.clientId;
  }
  get main(): MainSettings {
    return this.data.main;
  }
  get plex(): PlexSettings {
    return this.data.plex;
  }
  get jellyfin(): JellyfinSettings {
    return this.data.jellyfin;
  }
  get tautulli(): TautulliSettings {
    return this.data.tautulli;
  }
  get lidarr(): LidarrSettings[] {
    return this.data.lidarr;
  }
  get radarr(): RadarrSettings[] {
    return this.data.radarr;
  }
  get sonarr(): SonarrSettings[] {
    return this.data.sonarr;
  }
  get network(): NetworkSettings {
    return this.data.network;
  }
  get metadataSettings(): MetadataSettings {
    return this.data.metadataSettings;
  }
  get jobs(): JobsSettings {
    return this.data.jobs;
  }
  get public(): { initialized: boolean } {
    return this.data.public;
  }
  get vapidPublic(): string {
    return this.data.vapidPublic;
  }
  get vapidPrivate(): string {
    return this.data.vapidPrivate;
  }
  get fullPublicSettings(): FullPublicSettings {
    return {
      ...this.data.public,
      main: this.data.main,
      plex: {
        name: this.data.plex.name,
        machineId: this.data.plex.machineId,
        ip: this.data.plex.ip,
        port: this.data.plex.port,
        useSsl: this.data.plex.useSsl,
        webAppUrl: this.data.plex.webAppUrl,
      },
      jellyfin: {
        name: this.data.jellyfin.name,
        ip: this.data.jellyfin.ip,
        port: this.data.jellyfin.port,
        useSsl: this.data.jellyfin.useSsl,
        urlBase: this.data.jellyfin.urlBase,
        externalHostname: this.data.jellyfin.externalHostname,
        jellyfinForgotPasswordUrl: this.data.jellyfin.jellyfinForgotPasswordUrl,
      },
    };
  }
  async regenerateApiKey(): Promise<MainSettings> {
    const randomAPIkey = randomUUID();
    this.data.main.apiKey = randomAPIkey;
    return this.data.main;
  }

  // Setter methods for mutable settings
  setMain(data: Partial<MainSettings>): void {
    this.data.main = { ...this.data.main, ...data };
  }

  setNetwork(data: Partial<NetworkSettings>): void {
    this.data.network = { ...this.data.network, ...data };
  }

  setRadarr(data: RadarrSettings[]): void {
    this.data.radarr = data;
  }

  setSonarr(data: SonarrSettings[]): void {
    this.data.sonarr = data;
  }

  setLidarr(data: LidarrSettings[]): void {
    this.data.lidarr = data;
  }

  setMetadataSettings(data: MetadataSettings): void {
    this.data.metadataSettings = data;
  }

  setJobSchedule(jobId: JobId, schedule: string): void {
    if (!this.data.jobs[jobId]) {
      this.data.jobs[jobId] = { schedule };
    } else {
      this.data.jobs[jobId].schedule = schedule;
    }
  }
}

/* --------------------------------------------------------
 * EXPORTS
 * ------------------------------------------------------*/

let settings: Settings | undefined;
export const getSettings = (initialSettings?: AllSettings): Settings => {
  if (!settings) settings = new Settings(initialSettings);
  return settings;
};

export default Settings;
