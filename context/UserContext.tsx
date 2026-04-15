import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { API_BASE_URL } from '../config';
import { AnimeBasic, SavedAnime, WatchStatus } from '../types';

export interface EpisodeProgress {
    episodeId: string;
    episodeNumber: number;
    timestamp: number;
    progress: number; // 0-1
    duration: number;
    watched?: boolean; // true if episode was completed
}

export interface AnimeHistory {
    animeId: string;
    lastEpisodeId: string; // The ID of the last watched episode
    episodes: Record<string, EpisodeProgress>; // Map of episodeId -> progress data
    // Anime metadata for Continue Watching display
    title?: string;
    poster?: string;
    lastUpdated?: number;
}

interface UserContextType {
    savedAnime: SavedAnime[];
    isLoading: boolean;
    baseUrl: string | null;
    isValidConnection: boolean;
    watchHistory: Record<string, AnimeHistory>; // Key is Anime ID
    setBaseUrl: (url: string) => Promise<void>;
    // New status-based save functions
    saveAnime: (anime: AnimeBasic, status: WatchStatus) => Promise<void>;
    removeAnime: (animeId: string) => Promise<void>;
    updateAnimeStatus: (animeId: string, status: WatchStatus) => Promise<void>;
    getAnimeStatus: (animeId: string) => WatchStatus | null;
    isSaved: (animeId: string) => boolean;
    // Legacy support - will be removed eventually
    toggleSaved: (anime: AnimeBasic) => Promise<void>;
    // Watch history functions
    updateWatchHistory: (animeId: string, episodeId: string, progress: Partial<EpisodeProgress>, animeMetadata?: { title: string; poster: string }) => Promise<void>;
    markEpisodeWatched: (animeId: string, episodeId: string) => Promise<void>;
    isEpisodeWatched: (animeId: string, episodeId: string) => boolean;
    getAnimeHistory: (animeId: string) => AnimeHistory | undefined;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [savedAnime, setSavedAnime] = useState<SavedAnime[]>([]);
    const [watchHistory, setWatchHistory] = useState<Record<string, AnimeHistory>>({});
    const [baseUrl, setBaseUrlState] = useState<string | null>(null);
    const [isValidConnection, setIsValidConnection] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const SAVED_ANIME_KEY = '@saved_anime_v2'; // New key for migrated data
    const SAVED_ANIME_KEY_OLD = '@saved_anime'; // Old key for migration
    const WATCH_HISTORY_KEY = '@watch_history_v2';
    const BASE_URL_KEY = '@api_base_url';

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            let savedStr = await AsyncStorage.getItem(SAVED_ANIME_KEY);
            const historyStr = await AsyncStorage.getItem(WATCH_HISTORY_KEY);
            const baseUrlStr = await AsyncStorage.getItem(BASE_URL_KEY);

            // Migration: Check if old data exists and new data doesn't
            if (!savedStr) {
                const oldSavedStr = await AsyncStorage.getItem(SAVED_ANIME_KEY_OLD);
                if (oldSavedStr) {
                    // Migrate old data to new format
                    const oldData: AnimeBasic[] = JSON.parse(oldSavedStr);
                    const migratedData: SavedAnime[] = oldData.map(anime => ({
                        ...anime,
                        status: 'watch_later' as WatchStatus, // Default status for migrated anime
                        savedAt: Date.now(),
                    }));
                    await AsyncStorage.setItem(SAVED_ANIME_KEY, JSON.stringify(migratedData));
                    setSavedAnime(migratedData);
                    // Optionally remove old key
                    // await AsyncStorage.removeItem(SAVED_ANIME_KEY_OLD);
                }
            } else {
                setSavedAnime(JSON.parse(savedStr));
            }

            if (historyStr) setWatchHistory(JSON.parse(historyStr));
            if (baseUrlStr) {
                // Strip /api/v1 suffix if present to avoid double path
                const cleanBaseUrl = baseUrlStr.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');
                setBaseUrlState(cleanBaseUrl);
                apiClient.setBaseUrl(cleanBaseUrl);
                // Test connection
                try {
                    const response = await fetch(`${cleanBaseUrl}/api/v1/home`);
                    setIsValidConnection(response.ok);
                } catch (e) {
                    console.error('Initial connection test failed', e);
                    setIsValidConnection(false);
                }
            } else {
                // Use default from config
                if (API_BASE_URL && API_BASE_URL.length > 0) {
                    setBaseUrlState(API_BASE_URL);
                    apiClient.setBaseUrl(API_BASE_URL);
                    // Test connection
                    try {
                        const response = await fetch(`${API_BASE_URL}/api/v1/home`);
                        setIsValidConnection(response.ok);
                    } catch (e) {
                        console.error('Initial default connection test failed', e);
                        setIsValidConnection(false);
                    }
                } else {
                    // No saved URL and no default config -> Start in disconnected state
                    setBaseUrlState('');
                    setIsValidConnection(false);
                }
            }
        } catch (e) {
            console.error('Failed to load user data', e);
        } finally {
            setIsLoading(false);
        }
    };

    const saveAnime = async (anime: AnimeBasic, status: WatchStatus) => {
        try {
            // Remove if already exists (to update)
            const filtered = savedAnime.filter(a => a.id !== anime.id);
            const newSaved: SavedAnime = {
                ...anime,
                status,
                savedAt: Date.now(),
            };
            const newList = [...filtered, newSaved];
            setSavedAnime(newList);
            await AsyncStorage.setItem(SAVED_ANIME_KEY, JSON.stringify(newList));
        } catch (e) {
            console.error('Failed to save anime', e);
        }
    };

    const removeAnime = async (animeId: string) => {
        try {
            const newList = savedAnime.filter(a => a.id !== animeId);
            setSavedAnime(newList);
            await AsyncStorage.setItem(SAVED_ANIME_KEY, JSON.stringify(newList));
        } catch (e) {
            console.error('Failed to remove anime', e);
        }
    };

    const updateAnimeStatus = async (animeId: string, status: WatchStatus) => {
        try {
            const newList = savedAnime.map(a =>
                a.id === animeId ? { ...a, status } : a
            );
            setSavedAnime(newList);
            await AsyncStorage.setItem(SAVED_ANIME_KEY, JSON.stringify(newList));
        } catch (e) {
            console.error('Failed to update anime status', e);
        }
    };

    const getAnimeStatus = (animeId: string): WatchStatus | null => {
        const anime = savedAnime.find(a => a.id === animeId);
        return anime ? anime.status : null;
    };

    // Legacy toggleSaved for backwards compatibility
    const toggleSaved = async (anime: AnimeBasic) => {
        try {
            const exists = savedAnime.some(a => a.id === anime.id);
            if (exists) {
                await removeAnime(anime.id);
            } else {
                await saveAnime(anime, 'watch_later');
            }
        } catch (e) {
            console.error('Failed to toggle saved anime', e);
        }
    };

    const isSaved = (animeId: string) => {
        return savedAnime.some(a => a.id === animeId);
    };

    const updateWatchHistory = async (animeId: string, episodeId: string, data: Partial<EpisodeProgress>, animeMetadata?: { title: string; poster: string }) => {
        try {
            const animeHistory = watchHistory[animeId] || {
                animeId,
                lastEpisodeId: episodeId,
                episodes: {}
            };

            const existingEpisode = animeHistory.episodes[episodeId] || {};

            const updatedEpisode: EpisodeProgress = {
                episodeId,
                episodeNumber: data.episodeNumber || existingEpisode.episodeNumber || 0,
                timestamp: Date.now(),
                progress: data.progress ?? existingEpisode.progress ?? 0,
                duration: data.duration ?? existingEpisode.duration ?? 0,
            };

            const updatedHistory: AnimeHistory = {
                ...animeHistory,
                lastEpisodeId: episodeId,
                lastUpdated: Date.now(),
                // Store anime metadata if provided
                title: animeMetadata?.title || animeHistory.title,
                poster: animeMetadata?.poster || animeHistory.poster,
                episodes: {
                    ...animeHistory.episodes,
                    [episodeId]: updatedEpisode
                }
            };

            const newWatchHistory = {
                ...watchHistory,
                [animeId]: updatedHistory
            };

            setWatchHistory(newWatchHistory);
            await AsyncStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(newWatchHistory));
        } catch (e) {
            console.error('Failed to update watch history', e);
        }
    };

    const markEpisodeWatched = async (animeId: string, episodeId: string) => {
        try {
            const animeHistory = watchHistory[animeId];
            if (!animeHistory || !animeHistory.episodes[episodeId]) return;

            const updatedEpisode: EpisodeProgress = {
                ...animeHistory.episodes[episodeId],
                watched: true,
                progress: 1, // Mark as fully watched
            };

            const updatedHistory: AnimeHistory = {
                ...animeHistory,
                episodes: {
                    ...animeHistory.episodes,
                    [episodeId]: updatedEpisode
                }
            };

            const newWatchHistory = {
                ...watchHistory,
                [animeId]: updatedHistory
            };

            setWatchHistory(newWatchHistory);
            await AsyncStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(newWatchHistory));
        } catch (e) {
            console.error('Failed to mark episode watched', e);
        }
    };

    const isEpisodeWatched = (animeId: string, episodeId: string): boolean => {
        const animeHistory = watchHistory[animeId];
        if (!animeHistory || !animeHistory.episodes[episodeId]) return false;
        return animeHistory.episodes[episodeId].watched === true;
    };

    const getAnimeHistory = (animeId: string) => {
        return watchHistory[animeId];
    };

    const setBaseUrl = async (url: string) => {
        try {
            // Remove trailing slash and /api/v1 suffix if present
            const cleanUrl = url.trim().replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

            // Test connection before setting valid
            try {
                const response = await fetch(`${cleanUrl}/api/v1/home`);
                if (response.ok) {
                    setIsValidConnection(true);
                    setBaseUrlState(cleanUrl);
                    apiClient.setBaseUrl(cleanUrl);
                    await AsyncStorage.setItem(BASE_URL_KEY, cleanUrl);
                } else {
                    throw new Error('Connection failed');
                }
            } catch (e) {
                setIsValidConnection(false);
                // Still save the URL so user can correct it in settings, 
                // but app remains in "Setup/Error" state until valid
                setBaseUrlState(cleanUrl);
                apiClient.setBaseUrl(cleanUrl);
                await AsyncStorage.setItem(BASE_URL_KEY, cleanUrl);
                throw e; // Re-throw so SettingsScreen knows it failed
            }
        } catch (e) {
            console.error('Failed to set base URL', e);
            throw e;
        }
    };

    return (
        <UserContext.Provider
            value={{
                savedAnime,
                isLoading,
                baseUrl,
                isValidConnection,
                watchHistory,
                setBaseUrl,
                saveAnime,
                removeAnime,
                updateAnimeStatus,
                getAnimeStatus,
                toggleSaved,
                isSaved,
                updateWatchHistory,
                markEpisodeWatched,
                isEpisodeWatched,
                getAnimeHistory,
            }}
        >
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};
