import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import Media from './Media';
import { AlbumRequest } from './AlbumRequest';
import { DbAwareColumn } from '@server/utils/DbColumnHelper';

@Entity()
class Artist {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  @Index()
  public musicbrainzId: string; // MusicBrainz Artist ID

  @Column()
  public artistName: string;

  @Column({ type: 'text', nullable: true })
  public biography?: string;

  @Column({ type: 'simple-array', nullable: true })
  public genres?: string[];

  @Column({ nullable: true })
  public poster?: string; // Artist image URL

  @Column({ nullable: true })
  public lidarrId?: number; // Lidarr's internal artist ID

  @Column({ nullable: true })
  public lidarrServerId?: number; // Which Lidarr instance

  @ManyToOne(() => Media, (media) => media.artist, { onDelete: 'CASCADE' })
  public media: Media;

  @OneToMany(() => AlbumRequest, (albumRequest) => albumRequest.artist)
  public albumRequests: AlbumRequest[];

  @DbAwareColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt: Date;

  @DbAwareColumn({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  public updatedAt: Date;
}

export default Artist;
