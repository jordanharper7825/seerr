import Button from '@app/components/Common/Button';
import Header from '@app/components/Common/Header';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import PageTitle from '@app/components/Common/PageTitle';
import ArtistCard from '@app/components/ArtistCard';
import { searchArtists } from '@app/hooks/useMusic';
import type { MusicArtist } from '@app/hooks/useMusic';
import defineMessages from '@app/utils/defineMessages';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.Discover.DiscoverMusic', {
  discovermusic: 'Music',
  searchPlaceholder: 'Search for artists...',
  search: 'Search',
  noResults: 'No artists found',
  searchPrompt: 'Search for artists to get started',
});

const DiscoverMusic = () => {
  const intl = useIntl();
  const [searchQuery, setSearchQuery] = useState('');
  const [artists, setArtists] = useState<MusicArtist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const response = await searchArtists(searchQuery);
      setArtists(response.results);
    } catch (error) {
      console.error('Failed to search artists:', error);
      setArtists([]);
    } finally {
      setIsLoading(false);
    }
  };

  const title = intl.formatMessage(messages.discovermusic);

  return (
    <>
      <PageTitle title={title} />
      <div className="mb-4">
        <Header>{title}</Header>
      </div>

      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full rounded-md border border-gray-500 bg-gray-700 py-3 pl-10 pr-3 text-white placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder={intl.formatMessage(messages.searchPlaceholder)}
              />
            </div>
          </div>
          <Button
            buttonType="primary"
            type="submit"
            disabled={isLoading || !searchQuery.trim()}
          >
            <MagnifyingGlassIcon />
            <span>{intl.formatMessage(messages.search)}</span>
          </Button>
        </form>
      </div>

      {isLoading && (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      )}

      {!isLoading && !hasSearched && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <MagnifyingGlassIcon className="mb-4 h-16 w-16" />
          <p className="text-lg">{intl.formatMessage(messages.searchPrompt)}</p>
        </div>
      )}

      {!isLoading && hasSearched && artists.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <p className="text-lg">{intl.formatMessage(messages.noResults)}</p>
        </div>
      )}

      {!isLoading && artists.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
          {artists.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>
      )}
    </>
  );
};

export default DiscoverMusic;
