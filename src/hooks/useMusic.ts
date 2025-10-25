import axios from 'axios';
import useSWR from 'swr';

export interface MusicArtist {
  id: string; // MusicBrainz ID
  name: string;
  sortName?: string;
  disambiguation?: string;
  type?: string;
  country?: string;
  lifeSpan?: {
    begin?: string;
    end?: string;
    ended?: boolean;
  };
  genres: string[];
  tags: string[];
  biography?: string;
  images: {
    poster?: string;
    banner?: string;
    fanart?: string;
  };
  rating?: number;
  links: {
    type: string;
    url: string;
  }[];
  similarArtists?: unknown[];
  playcount?: number;
  listeners?: number;
  mediaInfo?: {
    id: number;
    status: number;
    requests?: unknown[];
  };
}

export interface MusicAlbum {
  id: string; // MusicBrainz Release Group ID
  title: string;
  disambiguation?: string;
  releaseDate?: string;
  albumType: string; // Album, EP, Single, Compilation, Soundtrack
  secondaryTypes?: string[];
  artistCredit: {
    name: string;
    artistId: string;
  }[];
  coverArt?: string;
  trackCount?: number;
  rating?: number;
  genres: string[];
  tags: string[];
}

export const useArtist = (artistId: string) => {
  const { data, error, mutate } = useSWR<MusicArtist>(
    artistId ? `/api/v1/music/${artistId}` : null,
    (url: string) => axios.get(url).then((res) => res.data)
  );

  return {
    artist: data,
    error,
    isLoading: !data && !error,
    revalidate: mutate,
  };
};

export const useArtistAlbums = (artistId: string) => {
  const { data, error, mutate } = useSWR<MusicAlbum[]>(
    artistId ? `/api/v1/music/${artistId}/albums` : null,
    (url: string) => axios.get(url).then((res) => res.data)
  );

  return {
    albums: data,
    error,
    isLoading: !data && !error,
    revalidate: mutate,
  };
};

export const searchArtists = async (
  query: string
): Promise<{ results: MusicArtist[] }> => {
  const response = await axios.get(`/api/v1/music/search`, {
    params: { query },
  });
  return response.data;
};
