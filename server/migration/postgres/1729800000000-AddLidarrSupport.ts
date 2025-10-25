import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLidarrSupport1729800000000 implements MigrationInterface {
  name = 'AddLidarrSupport1729800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create artist table
    await queryRunner.query(
      `CREATE TABLE "artist" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "musicbrainzId" character varying, "foreignArtistId" character varying, "overview" text, "posterPath" character varying, "backdropPath" character varying, "lastSeasonUpdate" TIMESTAMP, "mediaId" integer, CONSTRAINT "PK_artist" PRIMARY KEY ("id"), CONSTRAINT "FK_artist_media" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE CASCADE ON UPDATE NO ACTION)`
    );

    // Create album_request table
    await queryRunner.query(
      `CREATE TABLE "album_request" ("id" SERIAL NOT NULL, "status" integer NOT NULL DEFAULT '1', "requestId" integer NOT NULL, "albumId" character varying NOT NULL, "albumName" character varying NOT NULL, "artistName" character varying, "releaseDate" character varying, "totalTracks" integer, CONSTRAINT "PK_album_request" PRIMARY KEY ("id"), CONSTRAINT "FK_album_request_request" FOREIGN KEY ("requestId") REFERENCES "media_request"("id") ON DELETE CASCADE ON UPDATE NO ACTION)`
    );

    // Add music quota columns to user table
    await queryRunner.query(`ALTER TABLE "user" ADD "musicQuotaLimit" integer`);
    await queryRunner.query(`ALTER TABLE "user" ADD "musicQuotaDays" integer`);

    // Add music fields to media table
    await queryRunner.query(
      `ALTER TABLE "media" ALTER COLUMN "tmdbId" DROP NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "media" ADD "musicbrainzId" character varying(36)`
    );
    await queryRunner.query(
      `ALTER TABLE "media" ADD "artistName" character varying`
    );

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
    await queryRunner.query(`ALTER TABLE "media" DROP COLUMN "artistName"`);
    await queryRunner.query(`ALTER TABLE "media" DROP COLUMN "musicbrainzId"`);
    await queryRunner.query(
      `ALTER TABLE "media" ALTER COLUMN "tmdbId" SET NOT NULL`
    );

    // Remove music quota columns from user table
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "musicQuotaDays"`);
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "musicQuotaLimit"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "album_request"`);
    await queryRunner.query(`DROP TABLE "artist"`);
  }
}
