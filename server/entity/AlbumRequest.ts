import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Index,
} from 'typeorm';
import { MediaRequest } from './MediaRequest';
import Artist from './Artist';
import { DbAwareColumn } from '@server/utils/DbColumnHelper';
import { MediaRequestStatus } from '@server/constants/media';

@Entity()
export class AlbumRequest {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  @Index()
  public musicbrainzReleaseGroupId: string; // MusicBrainz Release Group ID

  @Column()
  public albumTitle: string;

  @Column({ nullable: true })
  public releaseDate?: string;

  @Column({ nullable: true })
  public albumType?: string; // Album, EP, Single, Compilation, etc.

  @Column({ type: 'int', default: MediaRequestStatus.PENDING })
  public status: MediaRequestStatus;

  @ManyToOne(() => MediaRequest, (request) => request.albumRequests, {
    onDelete: 'CASCADE',
  })
  public request: MediaRequest;

  @ManyToOne(() => Artist, (artist) => artist.albumRequests, {
    onDelete: 'CASCADE',
  })
  public artist: Artist;

  @DbAwareColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt: Date;

  @DbAwareColumn({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  public updatedAt: Date;
}
