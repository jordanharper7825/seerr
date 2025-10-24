import ArtistDetails from '@app/components/ArtistDetails';
import type { MusicArtist } from '@app/hooks/useMusic';
import axios from 'axios';
import type { GetServerSideProps, NextPage } from 'next';

interface ArtistPageProps {
  artist?: MusicArtist;
}

const ArtistPage: NextPage<ArtistPageProps> = ({ artist }) => {
  return <ArtistDetails artist={artist} />;
};

export const getServerSideProps: GetServerSideProps<ArtistPageProps> = async (
  ctx
) => {
  try {
    const response = await axios.get<MusicArtist>(
      `http://${process.env.HOST || 'localhost'}:${
        process.env.PORT || 5055
      }/api/v1/music/${ctx.query.artistId}`,
      {
        headers: ctx.req?.headers?.cookie
          ? { cookie: ctx.req.headers.cookie }
          : undefined,
      }
    );

    return {
      props: {
        artist: response.data,
      },
    };
  } catch (error) {
    return {
      notFound: true,
    };
  }
};

export default ArtistPage;
