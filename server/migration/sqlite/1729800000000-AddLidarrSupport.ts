import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLidarrSupport1729800000000 implements MigrationInterface {
  name = 'AddLidarrSupport1729800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create artist table
    await queryRunner.query(
      `CREATE TABLE "artist" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "musicbrainzId" varchar, "foreignArtistId" varchar, "overview" text, "posterPath" varchar, "backdropPath" varchar, "lastSeasonUpdate" datetime, "mediaId" integer, CONSTRAINT "FK_artist_media" FOREIGN KEY ("mediaId") REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`
    );

    // Create album_request table
    await queryRunner.query(
      `CREATE TABLE "album_request" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "status" integer NOT NULL DEFAULT (1), "requestId" integer NOT NULL, "albumId" varchar NOT NULL, "albumName" varchar NOT NULL, "artistName" varchar, "releaseDate" varchar, "totalTracks" integer, CONSTRAINT "FK_album_request_request" FOREIGN KEY ("requestId") REFERENCES "media_request" ("id") ON DELETE CASCADE ON UPDATE NO ACTION)`
    );

    // Add music quota columns to user table
    await queryRunner.query(
      `CREATE TABLE "temporary_user" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "email" varchar NOT NULL, "plexUsername" varchar, "username" varchar, "password" varchar, "resetPasswordGuid" varchar, "userType" integer NOT NULL DEFAULT (1), "plexId" varchar, "plexToken" varchar, "permissions" integer NOT NULL DEFAULT (0), "avatar" varchar NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "requestCount" integer NOT NULL DEFAULT (0), "movieQuotaLimit" integer, "movieQuotaDays" integer, "tvQuotaLimit" integer, "tvQuotaDays" integer, "musicQuotaLimit" integer, "musicQuotaDays" integer, "jellyfinUserId" varchar, "jellyfinDeviceId" varchar, "jellyfinAuthToken" varchar, CONSTRAINT "UQ_user_plexId" UNIQUE ("plexId"), CONSTRAINT "UQ_user_email" UNIQUE ("email"))`
    );
    await queryRunner.query(
      `INSERT INTO "temporary_user" SELECT "id", "email", "plexUsername", "username", "password", "resetPasswordGuid", "userType", "plexId", "plexToken", "permissions", "avatar", "createdAt", "updatedAt", "requestCount", "movieQuotaLimit", "movieQuotaDays", "tvQuotaLimit", "tvQuotaDays", NULL, NULL, "jellyfinUserId", "jellyfinDeviceId", "jellyfinAuthToken" FROM "user"`
    );
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`ALTER TABLE "temporary_user" RENAME TO "user"`);

    // Add music fields to media table
    await queryRunner.query(
      `CREATE TABLE "temporary_media" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "mediaType" varchar NOT NULL, "tmdbId" integer, "tvdbId" integer, "imdbId" varchar, "musicbrainzId" varchar, "artistName" varchar, "status" integer NOT NULL DEFAULT (1), "status4k" integer NOT NULL DEFAULT (1), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "lastSeasonChange" datetime, "mediaAddedAt" datetime, "serviceId" integer, "serviceId4k" integer, "externalServiceId" integer, "externalServiceId4k" integer, "externalServiceSlug" varchar, "externalServiceSlug4k" varchar, "ratingKey" varchar, "ratingKey4k" varchar, CONSTRAINT "UQ_media_tvdbId" UNIQUE ("tvdbId"))`
    );
    await queryRunner.query(
      `INSERT INTO "temporary_media" SELECT "id", "mediaType", "tmdbId", "tvdbId", "imdbId", NULL, NULL, "status", "status4k", "createdAt", "updatedAt", "lastSeasonChange", "mediaAddedAt", "serviceId", "serviceId4k", "externalServiceId", "externalServiceId4k", "externalServiceSlug", "externalServiceSlug4k", "ratingKey", "ratingKey4k" FROM "media"`
    );
    await queryRunner.query(`DROP TABLE "media"`);
    await queryRunner.query(`ALTER TABLE "temporary_media" RENAME TO "media"`);

    // Create indices
    await queryRunner.query(
      `CREATE INDEX "IDX_artist_musicbrainzId" ON "artist" ("musicbrainzId")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_media_musicbrainzId" ON "media" ("musicbrainzId")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indices
    await queryRunner.query(`DROP INDEX "IDX_media_musicbrainzId"`);
    await queryRunner.query(`DROP INDEX "IDX_artist_musicbrainzId"`);

    // Remove music fields from media table
    await queryRunner.query(
      `CREATE TABLE "temporary_media" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "mediaType" varchar NOT NULL, "tmdbId" integer NOT NULL, "tvdbId" integer, "imdbId" varchar, "status" integer NOT NULL DEFAULT (1), "status4k" integer NOT NULL DEFAULT (1), "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "lastSeasonChange" datetime, "mediaAddedAt" datetime, "serviceId" integer, "serviceId4k" integer, "externalServiceId" integer, "externalServiceId4k" integer, "externalServiceSlug" varchar, "externalServiceSlug4k" varchar, "ratingKey" varchar, "ratingKey4k" varchar, CONSTRAINT "UQ_media_tvdbId" UNIQUE ("tvdbId"))`
    );
    await queryRunner.query(
      `INSERT INTO "temporary_media" SELECT "id", "mediaType", "tmdbId", "tvdbId", "imdbId", "status", "status4k", "createdAt", "updatedAt", "lastSeasonChange", "mediaAddedAt", "serviceId", "serviceId4k", "externalServiceId", "externalServiceId4k", "externalServiceSlug", "externalServiceSlug4k", "ratingKey", "ratingKey4k" FROM "media" WHERE "tmdbId" IS NOT NULL`
    );
    await queryRunner.query(`DROP TABLE "media"`);
    await queryRunner.query(`ALTER TABLE "temporary_media" RENAME TO "media"`);

    // Remove music quota columns from user table
    await queryRunner.query(
      `CREATE TABLE "temporary_user" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "email" varchar NOT NULL, "plexUsername" varchar, "username" varchar, "password" varchar, "resetPasswordGuid" varchar, "userType" integer NOT NULL DEFAULT (1), "plexId" varchar, "plexToken" varchar, "permissions" integer NOT NULL DEFAULT (0), "avatar" varchar NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), "requestCount" integer NOT NULL DEFAULT (0), "movieQuotaLimit" integer, "movieQuotaDays" integer, "tvQuotaLimit" integer, "tvQuotaDays" integer, "jellyfinUserId" varchar, "jellyfinDeviceId" varchar, "jellyfinAuthToken" varchar, CONSTRAINT "UQ_user_plexId" UNIQUE ("plexId"), CONSTRAINT "UQ_user_email" UNIQUE ("email"))`
    );
    await queryRunner.query(
      `INSERT INTO "temporary_user" SELECT "id", "email", "plexUsername", "username", "password", "resetPasswordGuid", "userType", "plexId", "plexToken", "permissions", "avatar", "createdAt", "updatedAt", "requestCount", "movieQuotaLimit", "movieQuotaDays", "tvQuotaLimit", "tvQuotaDays", "jellyfinUserId", "jellyfinDeviceId", "jellyfinAuthToken" FROM "user"`
    );
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`ALTER TABLE "temporary_user" RENAME TO "user"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "album_request"`);
    await queryRunner.query(`DROP TABLE "artist"`);
  }
}
