import Slider from '@app/components/Slider';
import TmdbTitleCard from '@app/components/TitleCard/TmdbTitleCard';
import { Permission, useUser } from '@app/hooks/useUser';
import defineMessages from '@app/utils/defineMessages';
import type { MediaResultsResponse } from '@server/interfaces/api/mediaInterfaces';
import { useIntl } from 'react-intl';
import useSWR from 'swr';

const messages = defineMessages('components.Discover.RecentlyAddedSlider', {
  recentlyAdded: 'Recently Added',
});

// Normalize any incoming mediaType to the strict literal union that TmdbTitleCard expects
const toLiteralType = (mt: unknown): 'movie' | 'tv' =>
  String(mt).toLowerCase() === 'movie' ? 'movie' : 'tv';

// Ensure tmdbId is a definite number; fall back to id if needed
const toTmdbId = (item: { tmdbId?: number; id: number }): number =>
  typeof item.tmdbId === 'number' ? item.tmdbId : item.id;

const RecentlyAddedSlider = () => {
  const intl = useIntl();
  const { hasPermission } = useUser();

  const { data: media, error: mediaError } = useSWR<MediaResultsResponse>(
    '/api/v1/media?filter=allavailable&take=20&sort=mediaAdded',
    { revalidateOnMount: true }
  );

  if (
    (media && !media.results.length && !mediaError) ||
    !hasPermission([Permission.MANAGE_REQUESTS, Permission.RECENT_VIEW], {
      type: 'or',
    })
  ) {
    return null;
  }

  return (
    <>
      <div className="slider-header">
        <div className="slider-title">
          <span>{intl.formatMessage(messages.recentlyAdded)}</span>
        </div>
      </div>
      <Slider
        sliderKey="media"
        isLoading={!media}
        items={(media?.results ?? []).map((item) => (
          <TmdbTitleCard
            key={`media-slider-item-${item.id}`}
            id={item.id}
            tmdbId={toTmdbId(item)}
            tvdbId={item.tvdbId}
            type={toLiteralType(item.mediaType)}
          />
        ))}
      />
    </>
  );
};

export default RecentlyAddedSlider;
