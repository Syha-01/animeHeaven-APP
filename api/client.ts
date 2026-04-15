import { API_BASE_URL, API_ENDPOINTS } from '../config';
import type {
    ActorDetails,
    AnimeBasic,
    AnimeDetails,
    ApiResponse,
    Character,
    CharacterDetails,
    Episode,
    FilterParams,
    HomeData,
    MetaData,
    PaginatedResponse,
    ScheduleResponse,
    ServersResponse,
    SpotlightAnime,
    StreamData,
    Suggestion,
    TopTenData,
} from '../types';

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    setBaseUrl(url: string) {
        this.baseUrl = url;
    }

    private async fetch<T>(endpoint: string, params?: Record<string, string | number | undefined>): Promise<T> {
        let url = `${this.baseUrl}${endpoint}`;

        if (params) {
            const searchParams = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    searchParams.append(key, String(value));
                }
            });
            const queryString = searchParams.toString();
            if (queryString) {
                url += `?${queryString}`;
            }
        }

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`API Error fetching ${url}:`, error);
            throw error;
        }
    }

    // Homepage data
    async getHome(): Promise<HomeData> {
        const response = await this.fetch<ApiResponse<HomeData>>(API_ENDPOINTS.home);
        return response.data;
    }

    // Spotlight carousel
    async getSpotlight(): Promise<SpotlightAnime[]> {
        const response = await this.fetch<ApiResponse<SpotlightAnime[]>>(API_ENDPOINTS.spotlight);
        return response.data;
    }

    // Top 10 lists
    async getTopTen(): Promise<TopTenData> {
        const response = await this.fetch<ApiResponse<TopTenData>>(API_ENDPOINTS.topten);
        return response.data;
    }

    // Get anime details by ID
    async getAnime(id: string): Promise<AnimeDetails> {
        const response = await this.fetch<ApiResponse<AnimeDetails>>(`${API_ENDPOINTS.anime}/${id}`);
        return response.data;
    }

    // Get random anime
    async getRandomAnime(): Promise<AnimeDetails> {
        const response = await this.fetch<ApiResponse<AnimeDetails>>(API_ENDPOINTS.random);
        return response.data;
    }

    // Search anime
    async search(keyword: string, page: number = 1): Promise<PaginatedResponse<AnimeBasic>> {
        const response = await this.fetch<ApiResponse<PaginatedResponse<AnimeBasic>>>(
            API_ENDPOINTS.search,
            { keyword, page }
        );
        return response.data;
    }

    // Get search suggestions
    async getSuggestions(keyword: string): Promise<Suggestion[]> {
        try {
            const response = await this.fetch<ApiResponse<PaginatedResponse<AnimeBasic>>>(
                API_ENDPOINTS.search,
                { keyword }
            );
            return (response.data?.response as unknown as Suggestion[]) || [];
        } catch (error) {
            console.error('getSuggestions error:', error);
            return [];
        }
    }

    // Get anime characters
    async getCharacters(id: string, page: number = 1): Promise<PaginatedResponse<Character>> {
        const response = await this.fetch<ApiResponse<PaginatedResponse<Character>>>(
            `${API_ENDPOINTS.characters}/${id}`,
            { page }
        );
        return response.data;
    }

    // Get character details
    async getCharacter(id: string): Promise<CharacterDetails> {
        const response = await this.fetch<ApiResponse<CharacterDetails>>(`${API_ENDPOINTS.character}/${id}`);
        return response.data;
    }

    // Get voice actor details
    async getActor(id: string): Promise<ActorDetails> {
        const response = await this.fetch<ApiResponse<ActorDetails>>(`${API_ENDPOINTS.actor}/${id}`);
        return response.data;
    }

    // Get anime by genre
    async getGenre(genre: string, page: number = 1): Promise<PaginatedResponse<AnimeBasic>> {
        const response = await this.fetch<ApiResponse<PaginatedResponse<AnimeBasic>>>(
            `${API_ENDPOINTS.genre}/${genre}`,
            { page }
        );
        return response.data;
    }

    // Get anime by letter (A-Z list)
    async getAZList(letter: string, page: number = 1): Promise<PaginatedResponse<AnimeBasic>> {
        const response = await this.fetch<ApiResponse<PaginatedResponse<AnimeBasic>>>(
            `${API_ENDPOINTS.azList}/${letter}`,
            { page }
        );
        return response.data;
    }

    // Get anime by producer
    async getProducer(id: string, page: number = 1): Promise<PaginatedResponse<AnimeBasic>> {
        const response = await this.fetch<ApiResponse<PaginatedResponse<AnimeBasic>>>(
            `${API_ENDPOINTS.producer}/${id}`,
            { page }
        );
        return response.data;
    }

    // Filter anime
    async filter(params: FilterParams): Promise<PaginatedResponse<AnimeBasic>> {
        const response = await this.fetch<ApiResponse<PaginatedResponse<AnimeBasic>>>(
            API_ENDPOINTS.filter,
            params as Record<string, string | number | undefined>
        );
        return response.data;
    }

    // Get episodes for an anime
    async getEpisodes(id: string): Promise<Episode[]> {
        const response = await this.fetch<ApiResponse<Episode[]>>(`${API_ENDPOINTS.episodes}/${id}`);
        return response.data;
    }

    // Get servers for an episode
    async getServers(episodeId: string): Promise<ServersResponse> {
        const response = await this.fetch<ApiResponse<ServersResponse>>(`${API_ENDPOINTS.servers}/${episodeId}`);
        return response.data;
    }

    // Get stream URL
    async getStream(id: string, server: string = 'hd-1', type: 'sub' | 'dub' = 'sub'): Promise<StreamData | null> {
        const response = await this.fetch<ApiResponse<StreamData[] | StreamData>>(
            API_ENDPOINTS.stream,
            { id, server, type }
        );

        const data = response.data;
        if (Array.isArray(data)) {
            return data.length > 0 ? data[0] : null;
        }
        return data as StreamData;
    }

    // Get schedule
    async getSchedule(): Promise<ScheduleResponse> {
        const response = await this.fetch<ApiResponse<ScheduleResponse>>(
            API_ENDPOINTS.schedule
        );
        return response.data;
    }

    // Get next episode schedule for an anime
    async getNextSchedule(id: string): Promise<{ time: string }> {
        const response = await this.fetch<ApiResponse<{ time: string }>>(`${API_ENDPOINTS.scheduleNext}/${id}`);
        return response.data;
    }

    // Get meta data (genres, filter options, etc)
    async getMeta(): Promise<MetaData> {
        try {
            const response = await this.fetch<ApiResponse<MetaData>>(API_ENDPOINTS.meta);
            return response.data;
        } catch (error) {
            return {
                genres: ['Action', 'Adventure', 'Cars', 'Comedy', 'Dementia', 'Demons', 'Drama', 'Ecchi', 'Fantasy', 'Game', 'Harem', 'Historical', 'Horror', 'Josei', 'Kids', 'Magic', 'Martial Arts', 'Mecha', 'Military', 'Music', 'Mystery', 'Parody', 'Police', 'Psychological', 'Romance', 'Samurai', 'School', 'Sci-Fi', 'Seinen', 'Shoujo', 'Shoujo Ai', 'Shounen', 'Shounen Ai', 'Slice of Life', 'Space', 'Sports', 'Super Power', 'Supernatural', 'Thriller', 'Vampire', 'Yaoi', 'Yuri']
            } as MetaData;
        }
    }

    // Query endpoints (top-airing, most-popular, etc)
    async getQuery(query: string, page: number = 1): Promise<PaginatedResponse<AnimeBasic>> {
        const response = await this.fetch<ApiResponse<PaginatedResponse<AnimeBasic>>>(
            `/api/v1/${query}`,
            { page }
        );
        return response.data;
    }
}

// Export singleton instance
export const apiClient = new ApiClient();

export default apiClient;
