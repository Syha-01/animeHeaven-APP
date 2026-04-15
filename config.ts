
// ===========================================
// API CONFIGURATION
// ===========================================

// API Port


// Toggle this when you deploy to production
const IS_PRODUCTION = false;

// Production URL (update this when you deploy)
const PRODUCTION_URL = '';

// ===========================================
// Automatic URL Selection
// ===========================================
// - Web browser: uses localhost (same machine)
// - Native: uses EMPTY string (forces user input in Settings)
// - Production: uses your production URL

const getBaseUrl = () => {
    return '';
};

export const API_BASE_URL = getBaseUrl();

// ===========================================
// API Endpoints
// ===========================================
export const API_ENDPOINTS = {
    home: '/api/v1/home',
    spotlight: '/api/v1/spotlight',
    topten: '/api/v1/topten',
    anime: '/api/v1/anime',
    random: '/api/v1/anime/random',
    search: '/api/v1/search',
    suggestion: '/api/v1/suggestion',
    characters: '/api/v1/characters',
    character: '/api/v1/character',
    actor: '/api/v1/actor',
    genre: '/api/v1/genre',
    azList: '/api/v1/az-list',
    producer: '/api/v1/producer',
    filter: '/api/v1/filter',
    episodes: '/api/v1/episodes',
    servers: '/api/v1/servers',
    stream: '/api/v1/stream',
    schedule: '/api/v1/schedule',
    scheduleNext: '/api/v1/schedule/next',
    meta: '/api/v1/meta',
} as const;

// ===========================================
// App Configuration
// ===========================================
export const APP_CONFIG = {
    name: 'AniView',
    version: '2.1.0',
    spotlightAutoScrollInterval: 5000, // 5 seconds
    searchDebounceMs: 300,
    itemsPerPage: 20,
} as const;
