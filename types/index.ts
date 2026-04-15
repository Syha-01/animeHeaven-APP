// Episode counts
export interface EpisodeCount {
    sub: number;
    dub: number;
    eps: number;
}

// Base anime interface for lists
export interface AnimeBasic {
    title: string;
    alternativeTitle: string;
    id: string;
    poster: string;
    episodes?: EpisodeCount;
    type?: string;
    duration?: string;
    rank?: number;
}

// Spotlight anime with extra details
export interface SpotlightAnime extends AnimeBasic {
    quality: string;
    aired: string;
    synopsis: string;
}

// Full anime details
export interface AnimeDetails extends AnimeBasic {
    rating: string;
    is18Plus: boolean;
    synopsis: string;
    synonyms: string;
    aired: {
        from: string;
        to: string;
    };
    premiered: string;
    status: string;
    MAL_score: string;
    genres: string[];
    studios: string[];
    producers: string[];
    related: AnimeBasic[];
    mostPopular: AnimeBasic[];
    recommended: AnimeBasic[];
}

// Episode
export interface Episode {
    title: string;
    alternativeTitle: string;
    id: string;
    isFiller: boolean;
    episodeNumber: number;
}

// Server info
export interface Server {
    index: number;
    type: 'sub' | 'dub';
    id: number;
    name: string;
}

export interface ServersResponse {
    episode: number;
    sub: Server[];
    dub: Server[];
}

// Stream data
export interface StreamTrack {
    file: string;
    label: string;
    kind: string;
    default?: boolean;
}

export interface StreamData {
    id: string;
    type: 'sub' | 'dub';
    link: {
        file: string;
        type: string;
    };
    tracks: StreamTrack[];
    intro: {
        start: number;
        end: number;
    };
    outro: {
        start: number;
        end: number;
    };
    server: string;
    referer: string;
}

// Character
export interface VoiceActor {
    name: string;
    id: string;
    imageUrl: string;
    cast: string | null;
}

export interface Character {
    name: string;
    id: string;
    imageUrl: string;
    role: string;
    voiceActors: VoiceActor[];
}

export interface CharacterDetails {
    name: string;
    type: string;
    japanese: string;
    imageUrl: string;
    bio: string;
    animeApearances: Array<{
        title: string;
        alternativeTitle: string;
        id: string;
        poster: string;
        role: string;
        type: string;
    }>;
}

// Actor
export interface ActorDetails {
    name: string;
    type: string;
    japanese: string;
    imageUrl: string;
    bio: string;
    voiceActingRoles: Array<{
        title: string;
        poster: string;
        id: string;
        typeAndYear: string;
    }>;
}

// Schedule
export interface ScheduleItem {
    title: string;
    alternativeTitle: string;
    id: string;
    time: string;
    episode: number;
}

export interface ScheduleResponse {
    meta: {
        date: string;
        currentDate: string;
        lastDate: string;
    };
    response: ScheduleItem[];
}

// Suggestion
export interface Suggestion {
    title: string;
    alternativeTitle: string;
    id: string;
    poster: string;
    aired: string;
    type: string;
    duration: string;
}

// Page info
export interface PageInfo {
    currentPage: number;
    hasNextPage: boolean;
    totalPages: number;
}

// Home page data
export interface HomeData {
    spotlight: SpotlightAnime[];
    trending: AnimeBasic[];
    topAiring: AnimeBasic[];
    mostPopular: AnimeBasic[];
    mostFavorite: AnimeBasic[];
    latestCompleted: AnimeBasic[];
    latestEpisode: AnimeBasic[];
    newAdded: AnimeBasic[];
    topUpcoming: AnimeBasic[];
    topTen: {
        today: AnimeBasic[];
        week: AnimeBasic[];
        month: AnimeBasic[];
    };
    genres: string[];
}

// Top ten response
export interface TopTenData {
    today: AnimeBasic[];
    week: AnimeBasic[];
    month: AnimeBasic[];
}

// Meta data
export interface MetaData {
    genres: string[];
    azList: string[];
    exploreRoutes: string[];
    filterOptions: {
        type: string[];
        status: string[];
        rated: string[];
        score: string[];
        season: string[];
        language: string[];
        sort: string[];
        genres: string[];
    };
}

// API Response wrapper
export interface ApiResponse<T> {
    status: boolean;
    data: T;
}

// Paginated response
export interface PaginatedResponse<T> {
    pageInfo: PageInfo;
    response: T[];
}

// Watch status for saved anime
export type WatchStatus = 'watching' | 'watch_later' | 'completed' | 'dropped';

// Saved anime with status
export interface SavedAnime extends AnimeBasic {
    status: WatchStatus;
    savedAt: number;
}

// Filter params
export interface FilterParams {
    keyword?: string;
    type?: string;
    status?: string;
    rated?: string;
    score?: string;
    season?: string;
    language?: string;
    sort?: string;
    genres?: string;
    page?: number;
}
