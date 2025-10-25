import type { User } from '@server/entity/User';
import type { PaginatedResponse } from '@server/interfaces/api/common';
import type { MediaType } from '@server/constants/media'; // ✅ add this

export interface BlacklistItem {
  tmdbId: number;
  mediaType: MediaType; // ✅ use enum instead of hardcoded strings
  title?: string;
  createdAt?: Date;
  user?: User;
  blacklistedTags?: string;
}

export interface BlacklistResultsResponse extends PaginatedResponse {
  results: BlacklistItem[];
}
