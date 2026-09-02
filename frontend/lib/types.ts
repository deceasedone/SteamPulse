// Core data types from BigQuery.

export interface Game {
  appid: number;
  name: string;
  price: number;
  is_free: boolean;
  genres: string[];
  primary_genre: string | null;
  metacritic: number | null;
  total_reviews: number;
  release_date: string | null;
  publisher: string;
  header_image?: string | null;
}

export interface GenreStats {
  genre: string;
  total_games: number;
  avg_price: number | null;
  avg_rating: number | null;
  /** Present once transform.py has rebuilt mart_trends. */
  total_reviews?: number | null;
  free_games?: number | null;
}

export interface GenreCount {
  genre: string;
  game_count: number;
}

export interface PublisherStats {
  publisher: string;
  total_games: number;
  avg_rating: number | null;
  /** Std-dev of Metacritic across the catalogue; lower means more consistent. */
  rating_stddev: number | null;
  high_quality_games: number;
  rated_games: number;
  total_reviews: number | null;
  avg_price: number | null;
}

export interface HypeScore {
  name: string;
  appid: number;
  primary_genre: string | null;
  total_reviews: number;
  release_date: string | null;
  hype_score: number;
  days_since_release: number;
  metacritic: number | null;
  header_image?: string | null;
}

export interface DashboardStats {
  total_games: number;
  avg_price: number | null;
  avg_metacritic: number | null;
  median_price: number | null;
  free_games: number;
  paid_games: number;
  total_reviews: number;
  free_percentage: number | null;
}

export interface GamesPerYear {
  year: number;
  game_count: number;
  avg_price: number | null;
  avg_rating: number | null;
}

export interface ExploreStats {
  filtered_count: number;
  avg_price: number | null;
  avg_rating: number | null;
  free_percentage: number | null;
}

export interface PaginatedGames {
  data: Game[];
  stats: ExploreStats;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardPayload {
  stats: DashboardStats;
  yearlyTrend: GamesPerYear[];
  topGenres: GenreCount[];
  lastUpdated: string;
}
