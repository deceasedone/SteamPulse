// Core data types from BigQuery
export interface Game {
  appid: number;
  name: string;
  price: number;
  is_free: boolean;
  genres: string[];
  primary_genre: string;
  metacritic: number | null;
  total_reviews: number;
  release_date: string;
  publisher: string;
  header_image?: string;
}

export interface GenreStats {
  genre: string;
  total_games: number;
  avg_price: number;
  avg_rating: number;
}

export interface PublisherStats {
  publisher: string;
  total_games: number;
  avg_rating: number;
  total_reviews: number;
  avg_price: number;
  high_quality_games: number; // Games with rating >= 75
}

export interface HypeScore {
  name: string;
  appid: number;
  primary_genre: string;
  total_reviews: number;
  release_date: string;
  hype_score: number;
  days_since_release: number;
  metacritic: number | null;
}

export interface DashboardStats {
  total_games: number;
  avg_price: number;
  avg_metacritic: number;
  median_price: number;
  free_games: number;
  paid_games: number;
  total_reviews: number;
  free_percentage: number;
}

export interface GamesPerYear {
  year: number;
  game_count: number;
  avg_price: number;
  avg_rating: number;
}

export interface PriceDistribution {
  price_bucket: string;
  game_count: number;
}

// API Response wrapper
export interface APIResponse<T> {
  data: T | null;
  error: string | null;
  lastUpdated?: string;
}

// Filter types for Game Explorer
export interface GameFilters {
  search?: string;
  genre?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  isFree?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}