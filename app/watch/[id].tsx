import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeVideo } from '../../components/NativeVideo';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    BackHandler,
    Dimensions,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { apiClient } from '../../api/client';
import { AnimeSection } from '../../components/AnimeSection';
import { useUser } from '../../context/UserContext';

import { colors, shadows } from '../../theme';
import type { AnimeDetails, Episode, ServersResponse, StreamData } from '../../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DOUBLE_TAP_DELAY = 300;
const SEEK_AMOUNT = 10; // seconds
const EPISODES_PER_PAGE = 24;

// HLS.js for web streaming
let Hls: any = null;
if (Platform.OS === 'web') {
    Hls = require('hls.js').default;
}

// Playback speed options
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

// Orientation lock options
type OrientationMode = 'auto' | 'landscape' | 'portrait';

export default function WatchScreen() {
    const { id, animeId, startFullscreen } = useLocalSearchParams<{ id: string; animeId: string; startFullscreen?: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { updateWatchHistory, markEpisodeWatched, isEpisodeWatched, getAnimeHistory} = useUser();


    const client = apiClient;

    const videoRef = useRef<any>(null);
    const webVideoRef = useRef<HTMLVideoElement | null>(null);
    const hlsRef = useRef<any>(null);
    const lastSavedTime = useRef<number>(0);
    const hasMarkedWatched = useRef<boolean>(false);
    const hasResumedPlayback = useRef<boolean>(false);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Server & Stream State
    const [servers, setServers] = useState<ServersResponse | null>(null);
    const [streamData, setStreamData] = useState<StreamData | null>(null);
    const [selectedType, setSelectedType] = useState<'sub' | 'dub'>('sub');
    const [selectedServer, setSelectedServer] = useState<string>('hd-2');
    const [animeDetails, setAnimeDetails] = useState<AnimeDetails | null>(null);

    // Episodes & Navigation
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState<number>(-1);
    const [animeName, setAnimeName] = useState<string>('');

    // Playback State
    const [isPlaying, setIsPlaying] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(startFullscreen === 'true');
    const [showControls, setShowControls] = useState(true);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isBuffering, setIsBuffering] = useState(false);

    // UI State
    const [showSkipIntro, setShowSkipIntro] = useState(false);
    const [showSkipOutro, setShowSkipOutro] = useState(false);
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);

    // Subtitles State
    const [subtitleText, setSubtitleText] = useState<string>('');
    const [subtitleTextTop, setSubtitleTextTop] = useState<string>('');
    const [subtitles, setSubtitles] = useState<any[]>([]);
    const [subtitleSize, setSubtitleSize] = useState<number>(16);
    const [subtitleColor, setSubtitleColor] = useState<string>('#FFFFFF');
    const [subtitleBgOpacity, setSubtitleBgOpacity] = useState<number>(0.5);

    // Playback Speed
    const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

    // Orientation Lock
    const [orientationMode, setOrientationMode] = useState<OrientationMode>('auto');

    // Auto-Play Next
    const [showAutoPlayCountdown, setShowAutoPlayCountdown] = useState(false);
    const [autoPlayCountdown, setAutoPlayCountdown] = useState(5);

    // Gesture State
    const [gestureIndicator, setGestureIndicator] = useState<{ type: string; value: string } | null>(null);
    const lastTapTime = useRef<number>(0);
    const lastTapX = useRef<number>(0);
    const gestureTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const seekIndicatorOpacity = useRef(new Animated.Value(0)).current;

    // Volume/Brightness for gesture feedback
    const [volume, setVolume] = useState(1);

    const controlsTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const autoPlayTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // Progress bar width for tap-to-seek
    const progressBarWidth = useRef(0);

    // Episode Grid Pagination
    const [episodePage, setEpisodePage] = useState(1);
    const paginationScrollRef = useRef<ScrollView>(null);
    const PAGE_BUTTON_WIDTH = 70; // Approximate width of each page button

    // Load subtitle preferences
    useEffect(() => {
        const loadSubtitlePrefs = async () => {
            try {
                const size = await AsyncStorage.getItem('subtitle_size');
                const color = await AsyncStorage.getItem('subtitle_color');
                const bgOpacity = await AsyncStorage.getItem('subtitle_bg_opacity');
                if (size) setSubtitleSize(parseInt(size));
                if (color) setSubtitleColor(color);
                if (bgOpacity) setSubtitleBgOpacity(parseFloat(bgOpacity));
            } catch (e) {
                console.error('Failed to load subtitle prefs', e);
            }
        };
        loadSubtitlePrefs();
    }, []);

    // Save subtitle preferences
    const saveSubtitlePrefs = async (size: number, color: string, bgOpacity: number) => {
        try {
            await AsyncStorage.setItem('subtitle_size', size.toString());
            await AsyncStorage.setItem('subtitle_color', color);
            await AsyncStorage.setItem('subtitle_bg_opacity', bgOpacity.toString());
        } catch (e) {
            console.error('Failed to save subtitle prefs', e);
        }
    };

    // Orientation Logic - Synced with State
    useEffect(() => {
        const syncOrientation = async () => {
            if (Platform.OS === 'web') return;
            if (isFullscreen) {
                await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
            } else {
                await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            }
        };
        syncOrientation();
    }, [isFullscreen]);

    // Cleanup: Reset to Portrait ONLY when leaving the screen completely
    useEffect(() => {
        return () => {
            if (Platform.OS !== 'web') {
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            }
        };
    }, []);

    // Apply orientation mode
    const applyOrientationMode = async (mode: OrientationMode) => {
        if (Platform.OS === 'web') return;
        setOrientationMode(mode);
        switch (mode) {
            case 'landscape':
                await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
                break;
            case 'portrait':
                await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
                break;
            case 'auto':
            default:
                await ScreenOrientation.unlockAsync();
                break;
        }
    };

    // Toggle logic for controls
    const toggleControls = () => {
        if (showControls) {
            setShowControls(false);
            if (controlsTimeout.current) {
                clearTimeout(controlsTimeout.current);
            }
        } else {
            showControlsTemporarily();
        }
    };

    const showControlsTemporarily = () => {
        setShowControls(true);
        if (controlsTimeout.current) {
            clearTimeout(controlsTimeout.current);
        }
        controlsTimeout.current = setTimeout(() => {
            if (isPlaying) {
                setShowControls(false);
            }
        }, 3000);
    };

    // Gesture Indicator Animation
    const showGestureIndicator = (type: string, value: string) => {
        setGestureIndicator({ type, value });
        Animated.sequence([
            Animated.timing(seekIndicatorOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
            Animated.delay(600),
            Animated.timing(seekIndicatorOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => setGestureIndicator(null));
    };

    // Double-tap seek handler
    const handleDoubleTap = (x: number, containerWidth: number) => {
        const isLeftSide = x < containerWidth / 2;
        const seekAmount = isLeftSide ? -SEEK_AMOUNT : SEEK_AMOUNT;

        if (Platform.OS === 'web' && webVideoRef.current) {
            webVideoRef.current.currentTime = Math.max(0, webVideoRef.current.currentTime + seekAmount);
        } else if (videoRef.current && duration > 0) {
            const newPosition = Math.max(0, Math.min(duration, currentTime + seekAmount * 1000));
            videoRef.current.setPositionAsync(newPosition);
        }

        showGestureIndicator(
            isLeftSide ? 'seek-back' : 'seek-forward',
            `${Math.abs(seekAmount)}s`
        );
        showControlsTemporarily();
    };

    // Touch/Click handler for double-tap detection
    const handlePlayerTap = (e: any) => {
        const now = Date.now();
        const x = Platform.OS === 'web' ? e.nativeEvent?.offsetX ?? e.clientX : e.nativeEvent?.locationX ?? 0;

        if (now - lastTapTime.current < DOUBLE_TAP_DELAY && Math.abs(x - lastTapX.current) < 50) {
            // Double tap detected
            if (gestureTimeout.current) {
                clearTimeout(gestureTimeout.current);
            }
            const containerWidth = Platform.OS === 'web'
                ? (webVideoRef.current?.clientWidth || SCREEN_WIDTH)
                : SCREEN_WIDTH;
            handleDoubleTap(x, containerWidth);
        } else {
            // Single tap - wait to see if it becomes a double tap
            if (gestureTimeout.current) {
                clearTimeout(gestureTimeout.current);
            }
            gestureTimeout.current = setTimeout(() => {
                toggleControls();
            }, DOUBLE_TAP_DELAY);
        }

        lastTapTime.current = now;
        lastTapX.current = x;
    };

    // Fetch episodes and anime name
    useEffect(() => {
        const fetchData = async () => {
            if (animeId) {
                try {
                    // Fetch episodes
                    const list = await client.getEpisodes(animeId);
                    setEpisodes(list);

                    // Fetch anime details for name
                    const animeDetails = await client.getAnime(animeId);
                    setAnimeName(animeDetails.title);
                } catch (e) {
                    console.error("Failed to fetch data", e);
                }
            }
        };
        fetchData();
    }, [animeId, client]);

    useEffect(() => {
        if (episodes.length > 0 && id) {
            const index = episodes.findIndex(e => e.id === id);
            setCurrentEpisodeIndex(index);

            // Auto-navigate to the correct pagination page for the current episode
            if (index !== -1) {
                const targetPage = Math.floor(index / EPISODES_PER_PAGE) + 1;
                setEpisodePage(targetPage);

                // Scroll the pagination bar to show the active page button
                setTimeout(() => {
                    const scrollX = (targetPage - 1) * PAGE_BUTTON_WIDTH - (SCREEN_WIDTH / 2) + (PAGE_BUTTON_WIDTH / 2);
                    paginationScrollRef.current?.scrollTo({
                        x: Math.max(0, scrollX),
                        animated: true
                    });
                }, 100);
            }
        }
    }, [episodes, id]);

    // Reset resume flag when episode changes
    useEffect(() => {
        hasResumedPlayback.current = false;
        hasMarkedWatched.current = false;
    }, [id]);

    // Function to resume playback from saved progress
    const resumeFromSavedProgress = useCallback(async () => {
        if (hasResumedPlayback.current) return;
        if (!animeId || !id) return;

        const history = getAnimeHistory(animeId);
        const episodeProgress = history?.episodes[id];

        // Only resume if there's saved progress that's not at the very beginning or end
        // Skip if progress is < 2% (just started) or > 95% (basically finished)
        if (episodeProgress &&
            episodeProgress.progress > 0.02 &&
            episodeProgress.progress < 0.95 &&
            episodeProgress.duration > 0) {

            const savedPositionMs = episodeProgress.progress * episodeProgress.duration;
            console.log(`Resuming playback at ${Math.floor(savedPositionMs / 1000)}s (${Math.floor(episodeProgress.progress * 100)}%)`);

            if (Platform.OS === 'web' && webVideoRef.current) {
                webVideoRef.current.currentTime = savedPositionMs / 1000;
            } else if (videoRef.current) {
                await videoRef.current.setPositionAsync(savedPositionMs);
            }

            hasResumedPlayback.current = true;
        } else {
            // No saved progress or at beginning/end - mark as resumed so we don't try again
            hasResumedPlayback.current = true;
        }
    }, [animeId, id, getAnimeHistory]);

    const handlePreviousEpisode = async () => {
        if (currentEpisodeIndex > 0) {
            const prevEp = episodes[currentEpisodeIndex - 1];

            router.replace({
                pathname: '/watch/[id]',
                params: {
                    id: prevEp.id,
                    animeId: animeId,
                    startFullscreen: isFullscreen ? 'true' : 'false' // Pass state
                }
            });
        }
    };

    const handleNextEpisode = async () => {
        if (currentEpisodeIndex !== -1 && currentEpisodeIndex < episodes.length - 1) {
            const nextEp = episodes[currentEpisodeIndex + 1];

            router.replace({
                pathname: '/watch/[id]',
                params: {
                    id: nextEp.id,
                    animeId: animeId,
                    startFullscreen: isFullscreen ? 'true' : 'false' // Pass state
                }
            });
        }
    };

    // Helper function for episode selection with ad
    const handleEpisodeSelect = async (episodeId: string) => {
        if (episodeId !== id) {

            router.replace({
                pathname: '/watch/[id]',
                params: { id: episodeId, animeId: animeId }
            });
        }
    };

    // Auto-play next episode countdown
    useEffect(() => {
        if (showAutoPlayCountdown && autoPlayCountdown > 0) {
            autoPlayTimeout.current = setTimeout(() => {
                setAutoPlayCountdown(prev => prev - 1);
            }, 1000);
        } else if (showAutoPlayCountdown && autoPlayCountdown === 0) {
            handleNextEpisode();
        }

        return () => {
            if (autoPlayTimeout.current) {
                clearTimeout(autoPlayTimeout.current);
            }
        };
    }, [showAutoPlayCountdown, autoPlayCountdown]);

    const QUALITY_OPTIONS = ['Auto', '1080p', '720p', '480p', '360p'];
    const [currentQuality, setCurrentQuality] = useState<string>('Auto');

    // HLS for web
    const initHlsPlayer = useCallback((url: string) => {
        if (Platform.OS !== 'web' || !webVideoRef.current) return;

        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }

        const video = webVideoRef.current;

        if (Hls && Hls.isSupported()) {
            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                maxBufferLength: 30,
                maxMaxBufferLength: 60,
                backBufferLength: 30,
            });

            hls.loadSource(url);
            hls.attachMedia(video);

            hlsRef.current = hls;

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.playbackRate = playbackSpeed;

                // Resume from saved position if available
                resumeFromSavedProgress();

                // Log available quality levels for debugging
                if (hls.levels) {
                    console.log('Available HLS levels:', hls.levels.map((l: any) => l.height + 'p'));
                }

                if (isPlaying) {
                    video.play().catch(console.error);
                }
            });

            hls.on(Hls.Events.ERROR, (event: any, data: any) => {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            hls.recoverMediaError();
                            break;
                        default:
                            break;
                    }
                }
            });

            hlsRef.current = hls;
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = url;
            video.playbackRate = playbackSpeed;
            // Resume from saved position for Safari/iOS native HLS
            video.addEventListener('loadedmetadata', () => {
                resumeFromSavedProgress();
            }, { once: true });
            if (isPlaying) {
                video.play().catch(console.error);
            }
        }
    }, [isPlaying, playbackSpeed, resumeFromSavedProgress]);

    useEffect(() => {
        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
            }
        };
    }, []);


    // Prevent screen from sleeping while playing
    useEffect(() => {
        const toggleKeepAwake = async () => {
            if (isPlaying) {
                await activateKeepAwakeAsync();
            } else {
                await deactivateKeepAwake();
            }
        };

        toggleKeepAwake();

        // Cleanup: Allow sleep when user leaves the screen
        return () => {
            deactivateKeepAwake();
        };
    }, [isPlaying]);

    // Handle Hardware Back Button (Android)
    useEffect(() => {
        const onBackPress = () => {
            if (isFullscreen) {
                toggleFullscreen();
                return true; // Prevent default behavior (going back/exiting app)
            }
            return false; // Default behavior (go back to previous screen)
        };

        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

        return () => subscription.remove();
    }, [isFullscreen]);

    // Update playback speed
    useEffect(() => {
        if (Platform.OS === 'web' && webVideoRef.current) {
            webVideoRef.current.playbackRate = playbackSpeed;
        } else if (videoRef.current) {
            videoRef.current.setRateAsync(playbackSpeed, true);
        }
    }, [playbackSpeed]);

    // VTT Parser
    const parseVTT = (vttText: string) => {
        const items = [];
        const lines = vttText.split('\n');
        let index = 0;

        while (index < lines.length) {
            const line = lines[index].trim();
            if (line.includes('-->')) {
                const [startStr, endStr] = line.split('-->');
                const parseTime = (t: string) => {
                    const parts = t.trim().split(':');
                    const seconds = parts.length === 3
                        ? parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2])
                        : parseInt(parts[0]) * 60 + parseFloat(parts[1]);
                    return seconds * 1000;
                };

                const start = parseTime(startStr);
                const end = parseTime(endStr);

                let text = '';
                index++;
                while (index < lines.length && lines[index].trim() !== '') {
                    text += lines[index] + '\n';
                    index++;
                }

                // Clean up text
                text = text.trim()
                    .replace(/<[^>]*>/g, '') // Remove HTML tags
                    .replace(/\{[^}]*\}/g, '') // Remove ASS/SSA style tags if present
                    .replace(/&nbsp;/g, ' '); // Remove common entities

                items.push({ start, end, text });
            } else {
                index++;
            }
        }
        return items;
    };

    const loadSubtitles = async (file: string) => {
        try {
            if (!file) return;
            const response = await fetch(file);
            const text = await response.text();
            const parsed = parseVTT(text);
            setSubtitles(parsed);
        } catch (e) {
            console.error('Failed to load subtitles', e);
        }
    };

    const pickBestServer = (serverList: any[]) => {
        if (!serverList || serverList.length === 0) return 'hd-1';
        const priorities = ['hd-2', 'dt-2', 'hd-1'];
        for (const p of priorities) {
            const found = serverList.find(s => s.name.toLowerCase() === p);
            if (found) return found.name;
        }
        return serverList[0].name;
    };

    const fetchStream = useCallback(async () => {
        if (!id) return;

        try {
            setLoading(true);
            setError(null);
            setStreamData(null);

            // Fetch Anime Details if not already available (or if needed for recommendations)
            if (animeId) {
                try {
                    const details = await client.getAnime(animeId);
                    setAnimeDetails(details);
                    setAnimeName(details.title);
                } catch (e) {
                    console.error('Failed to fetch anime details', e);
                }
            }

            let streamResponse: StreamData | null = null;

            
                // AnimeHeaven has no servers endpoint — go directly to stream
                streamResponse = await client.getStream(id);
            

            if (streamResponse) {
                setStreamData(streamResponse);
                const defaultTrack = streamResponse.tracks?.find(t => t.default && t.kind === 'captions');
                if (defaultTrack && Platform.OS !== 'web') {
                    loadSubtitles(defaultTrack.file);
                }
            } else {
                setError('No stream available');
            }
        } catch (err) {
            console.error('Failed to fetch stream:', err);
            setError('Failed to load video.');
        } finally {
            setLoading(false);
        }
    }, [id, client, animeId]);

    useEffect(() => {
        fetchStream();
    }, [fetchStream]);

    useEffect(() => {
        if (Platform.OS === 'web' && streamData?.link?.file && !loading) {
            setTimeout(() => {
                if (streamData.link.type === 'mp4') {
                    // MP4 can be played directly without HLS.js
                    if (webVideoRef.current) {
                        if (hlsRef.current) {
                            hlsRef.current.destroy();
                            hlsRef.current = null;
                        }
                        webVideoRef.current.src = streamData.link.file;
                        webVideoRef.current.playbackRate = playbackSpeed;
                        webVideoRef.current.addEventListener('loadedmetadata', () => {
                            resumeFromSavedProgress();
                        }, { once: true });
                        if (isPlaying) {
                            webVideoRef.current.play().catch(console.error);
                        }
                    }
                } else {
                    initHlsPlayer(streamData.link.file);
                }
            }, 100);
        }
    }, [streamData, loading, initHlsPlayer]);

    const handleServerChange = async (server: string, type: 'sub' | 'dub') => {
        try {
            setLoading(true);
            setSelectedServer(server);
            setSelectedType(type);
            setSubtitles([]);
            setSubtitleText('');
            setSubtitleTextTop('');

            if (Platform.OS === 'web' && hlsRef.current) {
                hlsRef.current.detachMedia();
            }

            const streamResponse = await client.getStream(id!, server, type);
            if (streamResponse) {
                setStreamData(streamResponse);
                const defaultTrack = streamResponse.tracks?.find(t => t.default && t.kind === 'captions');
                if (defaultTrack && Platform.OS !== 'web') {
                    loadSubtitles(defaultTrack.file);
                }
            } else {
                setError('No stream available for this server');
            }
        } catch (err) {
            console.error('Failed to change server:', err);
            setError('Failed to load video');
        } finally {
            setLoading(false);
        }
    };

    const handleBack = async () => {
        if (isFullscreen) {
            await toggleFullscreen();
        } else {
            router.back();
        }
    };

    const togglePlayPause = () => {
        if (Platform.OS === 'web' && webVideoRef.current) {
            if (isPlaying) {
                webVideoRef.current.pause();
            } else {
                webVideoRef.current.play().catch(console.error);
            }
        }
        setIsPlaying(!isPlaying);
        showControlsTemporarily();
    };

    const handleWebTimeUpdate = () => {
        if (!webVideoRef.current) return;
        const video = webVideoRef.current;
        const now = Date.now();

        setCurrentTime(video.currentTime * 1000);
        setDuration(video.duration * 1000 || 0);
        const currentProgress = video.duration ? video.currentTime / video.duration : 0;
        setProgress(currentProgress);

        // History Update
        if (now - lastSavedTime.current > 5000 && animeId && id) {
            updateWatchHistory(animeId, id, {
                episodeId: id,
                episodeNumber: episodes[currentEpisodeIndex]?.episodeNumber || 0,
                progress: currentProgress,
                duration: video.duration * 1000,
            }, animeDetails ? { title: animeDetails.title, poster: animeDetails.poster } : undefined);
            lastSavedTime.current = now;
        }

        if (streamData?.intro) {
            setShowSkipIntro(video.currentTime >= streamData.intro.start && video.currentTime <= streamData.intro.end);
        } else {
            setShowSkipIntro(false);
        }

        if (streamData?.outro) {
            const isInOutro = video.currentTime >= streamData.outro.start && video.currentTime <= streamData.outro.end;
            setShowSkipOutro(isInOutro);
            // Mark as watched when outro starts
            if (isInOutro && !hasMarkedWatched.current && animeId && id) {
                hasMarkedWatched.current = true;
                markEpisodeWatched(animeId, id);
            }
        } else {
            setShowSkipOutro(false);
            // Mark as watched when within 2 minutes of end (no outro available)
            if (video.duration && video.duration - video.currentTime <= 120 && !hasMarkedWatched.current && animeId && id) {
                hasMarkedWatched.current = true;
                markEpisodeWatched(animeId, id);
            }
        }

        // Check for episode end - trigger auto-play countdown
        if (video.duration && video.currentTime >= video.duration - 5 && !showAutoPlayCountdown) {
            if (currentEpisodeIndex !== -1 && currentEpisodeIndex < episodes.length - 1) {
                setShowAutoPlayCountdown(true);
                setAutoPlayCountdown(5);
            }
        }
    };

    const handleWebEnded = () => {
        // Episode ended - auto-play next if available
        if (currentEpisodeIndex !== -1 && currentEpisodeIndex < episodes.length - 1) {
            setShowAutoPlayCountdown(true);
            setAutoPlayCountdown(5);
        }
    };

    const handleWebWaiting = () => setIsBuffering(true);
    const handleWebPlaying = () => setIsBuffering(false);
    const handleWebCanPlay = () => setIsBuffering(false);

    const handlePlaybackStatusUpdate = (status: any) => {
        if (!status.isLoaded) {
            if (status.error) {
                // Format the error message to be user-friendly if possible
                const errorMsg = `Playback error: ${status.error}`;
                console.error(errorMsg);
                setError(errorMsg);
                setIsBuffering(false);
            }
            return;
        }

        if (status.isLoaded) {
            setIsBuffering(status.isBuffering && !status.isPlaying);
            setDuration(status.durationMillis || 0);

            // Resume from saved position on first load (native)
            if (!hasResumedPlayback.current && status.durationMillis && status.durationMillis > 0) {
                resumeFromSavedProgress();
            }


            setCurrentTime(status.positionMillis || 0);
            const currentProgress = status.durationMillis ? status.positionMillis / status.durationMillis : 0;
            setProgress(currentProgress);

            // History Update
            const now = Date.now();
            if (now - lastSavedTime.current > 5000 && animeId && id && status.isPlaying) {
                updateWatchHistory(animeId, id, {
                    episodeId: id,
                    episodeNumber: episodes[currentEpisodeIndex]?.episodeNumber || 0,
                    progress: currentProgress,
                    duration: status.durationMillis || 0,
                }, animeDetails ? { title: animeDetails.title, poster: animeDetails.poster } : undefined);
                lastSavedTime.current = now;
            }

            if (streamData?.intro) {
                const seconds = (status.positionMillis || 0) / 1000;
                setShowSkipIntro(seconds >= streamData.intro.start && seconds <= streamData.intro.end);
            }
            if (streamData?.outro) {
                const seconds = (status.positionMillis || 0) / 1000;
                const isInOutro = seconds >= streamData.outro.start && seconds <= streamData.outro.end;
                setShowSkipOutro(isInOutro);
                // Mark as watched when outro starts
                if (isInOutro && !hasMarkedWatched.current && animeId && id) {
                    hasMarkedWatched.current = true;
                    markEpisodeWatched(animeId, id);
                }
            } else {
                // Mark as watched when within 2 minutes of end (no outro available)
                const remainingMs = (status.durationMillis || 0) - (status.positionMillis || 0);
                if (remainingMs <= 120000 && remainingMs > 0 && !hasMarkedWatched.current && animeId && id) {
                    hasMarkedWatched.current = true;
                    markEpisodeWatched(animeId, id);
                }
            }

            if (subtitles.length > 0 && Platform.OS !== 'web') {
                // Find ALL active subtitles
                const current = subtitles.filter(s => status.positionMillis! >= s.start && status.positionMillis! <= s.end);

                let topText = '';
                let bottomText = '';

                if (current.length > 1) {
                    // Case 1: Multiple overlapping cues
                    // First cue goes to top, rest to bottom
                    topText = current[0].text.trim();
                    bottomText = current.slice(1).map(s => s.text.trim()).join('\n');
                } else if (current.length === 1) {
                    // Case 2: Single cue check for dialogue dashes
                    const text: string = current[0].text.trim();
                    const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l);

                    if (lines.length >= 2 && lines.every((l: string) => l.startsWith('-'))) {
                        // Assumption: If all lines start with '-', it's a dialogue.
                        // Split first line to top, rest to bottom.
                        // Remove the leading "- " or "-" from the text.
                        topText = lines[0].replace(/^-\s*/, '').trim();
                        bottomText = lines.slice(1).map((l: string) => l.replace(/^-\s*/, '')).join('\n');
                    } else {
                        bottomText = text;
                    }
                }

                setSubtitleTextTop(topText);
                setSubtitleText(bottomText);
            }

            // Check for episode end
            if (status.didJustFinish && currentEpisodeIndex !== -1 && currentEpisodeIndex < episodes.length - 1) {
                setShowAutoPlayCountdown(true);
                setAutoPlayCountdown(5);
            }
        }
    };

    const handleSkipIntro = async () => {
        if (!streamData?.intro) return;
        const skipTo = streamData.intro.end + 2;

        if (Platform.OS === 'web' && webVideoRef.current) {
            webVideoRef.current.currentTime = skipTo;
        } else if (videoRef.current) {
            await videoRef.current.setPositionAsync(skipTo * 1000);
        }
        setShowSkipIntro(false);
    };

    const handleSkipOutro = async () => {
        if (!streamData?.outro) return;
        const skipTo = streamData.outro.end;

        if (Platform.OS === 'web' && webVideoRef.current) {
            webVideoRef.current.currentTime = skipTo;
        } else if (videoRef.current) {
            await videoRef.current.setPositionAsync(skipTo * 1000);
        }
        setShowSkipOutro(false);
    };

    const handleSeek = (seekProgress: number) => {
        showControlsTemporarily();
        if (Platform.OS === 'web' && webVideoRef.current && duration > 0) {
            webVideoRef.current.currentTime = (seekProgress * duration) / 1000;
        } else if (videoRef.current && duration > 0) {
            videoRef.current.setPositionAsync(seekProgress * duration);
        }
    };

    const formatTime = (ms: number) => {
        if (!ms) return '0:00';
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleSetQuality = (quality: string) => {
        setCurrentQuality(quality);
        if (Platform.OS === 'web' && hlsRef.current) {
            if (quality === 'Auto') {
                hlsRef.current.currentLevel = -1; // -1 is auto
            } else {
                const qValue = parseInt(quality); // e.g., "720p" -> 720
                const levels = hlsRef.current.levels || [];
                // Find exact match first
                let levelIndex = levels.findIndex((l: any) => l.height === qValue);
                // If no exact match, find the closest level that doesn't exceed the requested quality
                if (levelIndex === -1) {
                    const sortedLevels = levels
                        .map((l: any, i: number) => ({ height: l.height, index: i }))
                        .filter((l: any) => l.height <= qValue)
                        .sort((a: any, b: any) => b.height - a.height);
                    if (sortedLevels.length > 0) {
                        levelIndex = sortedLevels[0].index;
                    }
                }
                if (levelIndex !== -1) {
                    hlsRef.current.currentLevel = levelIndex;
                }
            }
        }
    };

    const toggleFullscreen = async () => {
        if (Platform.OS === 'web' && webVideoRef.current) {
            if (!document.fullscreenElement) {
                webVideoRef.current.requestFullscreen?.().catch(console.error);
            } else {
                document.exitFullscreen?.().catch(console.error);
            }
        }
        // For mobile, just toggle state. The useEffect above handles the orientation lock.
        setIsFullscreen(!isFullscreen);
    };

    const cancelAutoPlay = () => {
        setShowAutoPlayCountdown(false);
        setAutoPlayCountdown(5);
        if (autoPlayTimeout.current) {
            clearTimeout(autoPlayTimeout.current);
        }
    };

    const renderWebSubtitles = () => {
        if (!streamData?.tracks) return null;
        const captions = streamData.tracks.filter(t => t.kind === 'captions');
        if (captions.length === 0) return null;
        return captions.map((track, i) => (
            <track
                key={i}
                kind="captions"
                label={track.label}
                srcLang={track.label.slice(0, 2).toLowerCase()}
                src={track.file}
                default={track.default}
            />
        ));
    };

    const renderVideoLayer = () => {
        if (!streamData?.link?.file || error) {
            return (
                <View style={styles.centerContainer}>
                    {loading ? (
                        <ActivityIndicator size="large" color={colors.primary} />
                    ) : (
                        <>
                            <Text style={styles.errorText}>{error || "Loading stream..."}</Text>
                            {error && (
                                <Pressable style={styles.retryButton} onPress={fetchStream}>
                                    <Text style={styles.retryText}>Retry</Text>
                                </Pressable>
                            )}
                        </>
                    )}
                </View>
            );
        }

        if (Platform.OS === 'web') {
            return (
                <video
                    ref={webVideoRef as any}
                    style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
                    playsInline
                    onTimeUpdate={handleWebTimeUpdate}
                    onWaiting={handleWebWaiting}
                    onPlaying={handleWebPlaying}
                    onCanPlay={handleWebCanPlay}
                    onEnded={handleWebEnded}
                    crossOrigin="anonymous"
                >
                    {renderWebSubtitles()}
                </video>
            );
        }

        return (
            <>
                <NativeVideo
                    ref={videoRef}
                    source={{
                        uri: streamData.link.file,
                        headers: streamData.referer ? { Referer: streamData.referer } : undefined,
                    }}
                    style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
                    shouldPlay={isPlaying}
                    onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                    onLoadStart={() => setIsBuffering(true)}
                    onReadyForDisplay={() => setIsBuffering(false)}
                />

                {subtitleTextTop !== '' && (
                    <View style={styles.subtitleOverlayTop} pointerEvents="none">
                        <Text style={[
                            styles.subtitleTextDisplay,
                            {
                                fontSize: subtitleSize,
                                color: subtitleColor,
                                backgroundColor: `rgba(0,0,0,${subtitleBgOpacity})`,
                            }
                        ]}>
                            {subtitleTextTop}
                        </Text>
                    </View>
                )}

                {subtitleText !== '' && (
                    <View style={styles.subtitleOverlay} pointerEvents="none">
                        <Text style={[
                            styles.subtitleTextDisplay,
                            {
                                fontSize: subtitleSize,
                                color: subtitleColor,
                                backgroundColor: `rgba(0,0,0,${subtitleBgOpacity})`,
                            }
                        ]}>
                            {subtitleText}
                        </Text>
                    </View>
                )}
            </>
        );
    };

    const renderGestureIndicator = () => {
        if (!gestureIndicator) return null;

        return (
            <Animated.View
                style={[
                    styles.gestureIndicator,
                    { opacity: seekIndicatorOpacity }
                ]}
                pointerEvents="none"
            >
                <Ionicons
                    name={gestureIndicator.type === 'seek-back' ? 'play-back' : 'play-forward'}
                    size={32}
                    color="#FFF"
                />
                <Text style={styles.gestureIndicatorText}>{gestureIndicator.value}</Text>
            </Animated.View>
        );
    };

    const renderAutoPlayOverlay = () => {
        if (!showAutoPlayCountdown) return null;

        return (
            <View style={styles.autoPlayOverlay}>
                <View style={styles.autoPlayCard}>
                    <Text style={styles.autoPlayTitle}>Next Episode</Text>
                    <Text style={styles.autoPlayEpisode}>
                        Episode {episodes[currentEpisodeIndex + 1]?.episodeNumber}: {episodes[currentEpisodeIndex + 1]?.title}
                    </Text>
                    <Text style={styles.autoPlayCountdown}>Playing in {autoPlayCountdown}s</Text>
                    <View style={styles.autoPlayButtons}>
                        <Pressable style={styles.autoPlayCancelBtn} onPress={cancelAutoPlay}>
                            <Text style={styles.autoPlayCancelText}>Cancel</Text>
                        </Pressable>
                        <Pressable style={styles.autoPlayNowBtn} onPress={handleNextEpisode}>
                            <Ionicons name="play" size={16} color="#FFF" />
                            <Text style={styles.autoPlayNowText}>Play Now</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        );
    };

    const renderPersistentOverlay = () => {
        // FIX: Remove the (!showControls) check so buttons stay visible.
        // We only return null if NEITHER button is needed.
        if (!showSkipIntro && !showSkipOutro) return null;

        return (
            <View style={styles.persistentOverlay} pointerEvents="box-none">
                <View style={styles.skipContainer} pointerEvents="box-none">
                    {showSkipIntro && (
                        <Pressable style={styles.skipButton} onPress={handleSkipIntro}>
                            <Text style={styles.skipButtonText}>Skip Intro</Text>
                            <Ionicons name="play-forward" size={16} color="#000" />
                        </Pressable>
                    )}
                    {showSkipOutro && (
                        <Pressable style={styles.skipButton} onPress={handleSkipOutro}>
                            <Text style={styles.skipButtonText}>Skip Outro</Text>
                            <Ionicons name="play-forward" size={16} color="#000" />
                        </Pressable>
                    )}
                </View>
            </View>
        );
    };

    const handleSkipBackward = () => {
        if (duration > 0) {
            const newTime = Math.max(0, currentTime - 10000);
            handleSeek(newTime / duration);
        }
    };

    const handleSkipForward = () => {
        if (duration > 0) {
            const newTime = Math.min(duration, currentTime + 10000);
            handleSeek(newTime / duration);
        }
    };

    const renderControlsLayer = () => {
        if (!showControls) return null;

        return (
            <View style={styles.controlsOverlay}>
                <View style={[styles.topBar, { paddingTop: isFullscreen ? (insets.top || 10) : 0 }]}>
                    <Pressable style={styles.iconButton} onPress={handleBack}>
                        <Ionicons name="arrow-back" size={28} color="#FFF" />
                    </Pressable>

                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle} numberOfLines={1}>{animeName}</Text>
                        {currentEpisodeIndex !== -1 && episodes[currentEpisodeIndex] && (
                            <Text style={styles.headerSubtitle} numberOfLines={1}>
                                Episode {episodes[currentEpisodeIndex].episodeNumber}
                            </Text>
                        )}
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Pressable style={styles.iconButton} onPress={() => setShowSettingsMenu(!showSettingsMenu)}>
                            <Ionicons name="settings-outline" size={24} color="#FFF" />
                        </Pressable>
                        <Pressable style={[styles.iconButton, { marginLeft: 8 }]} onPress={toggleFullscreen}>
                            <Ionicons name={isFullscreen ? 'contract' : 'expand'} size={24} color="#FFF" />
                        </Pressable>
                    </View>
                </View>

                <View style={styles.centerControls}>
                    {isBuffering && (
                        <ActivityIndicator size="large" color={colors.primary} />
                    )}
                </View>

                <View style={[styles.bottomBar, { paddingBottom: isFullscreen ? 20 : 0 }]}>
                    {/* Row 1: Timeline with inline time */}
                    <View style={styles.timelineRow}>
                        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>

                        <View style={styles.progressContainer}>
                            {Platform.OS === 'web' ? (
                                <div
                                    style={{ width: '100%', height: '20px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                                    onClick={(e: any) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const p = (e.clientX - rect.left) / rect.width;
                                        handleSeek(p);
                                    }}
                                >
                                    <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '2px', position: 'relative' }}>
                                        <div style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: colors.primary, borderRadius: '2px' }} />
                                        <div style={{ left: `${progress * 100}%`, position: 'absolute', top: '-6px', width: '12px', height: '12px', backgroundColor: colors.primary, borderRadius: '50%', transform: 'translateX(-50%)', boxShadow: '0 0 8px rgba(139, 92, 246, 0.6)' }} />
                                    </div>
                                </div>
                            ) : (
                                <Pressable
                                    style={{ flex: 1, height: 40, justifyContent: 'center' }}
                                    onLayout={(e) => {
                                        progressBarWidth.current = e.nativeEvent.layout.width;
                                    }}
                                    onPress={(e) => {
                                        // Tap-to-seek: calculate position from touch
                                        if (progressBarWidth.current > 0 && duration > 0) {
                                            const touchX = e.nativeEvent.locationX;
                                            const newProgress = Math.max(0, Math.min(1, touchX / progressBarWidth.current));
                                            handleSeek(newProgress);
                                        }
                                    }}
                                >
                                    {/* Background Track */}
                                    <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
                                        {/* Filled Track */}
                                        <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: colors.primary, borderRadius: 2 }} />

                                        {/* Playhead Thumb */}
                                        <View style={{
                                            position: 'absolute',
                                            left: `${progress * 100}%`,
                                            marginLeft: -6,
                                            top: -4,
                                            width: 12,
                                            height: 12,
                                            borderRadius: 6,
                                            backgroundColor: colors.primary,
                                            elevation: 4,
                                            shadowColor: "#000",
                                            shadowOffset: { width: 0, height: 0 },
                                            shadowOpacity: 0.5,
                                            shadowRadius: 4
                                        }} />
                                    </View>
                                </Pressable>
                            )}
                        </View>

                        <Text style={styles.timeText}>{formatTime(duration)}</Text>
                    </View>

                    {/* Row 2: Controls */}
                    <View style={styles.controlsRow}>
                        {/* Center: Transport */}
                        <View style={styles.transportControls}>
                            <Pressable onPress={handlePreviousEpisode} style={[styles.episodeNavButton, currentEpisodeIndex <= 0 && { opacity: 0.5 }]} disabled={currentEpisodeIndex <= 0}>
                                <Ionicons name="play-skip-back" size={20} color="#FFF" />
                            </Pressable>

                            <Pressable onPress={handleSkipBackward} style={styles.seekButton}>
                                <Ionicons name="reload-outline" size={22} color="#FFF" style={{ transform: [{ scaleX: -1 }] }} />
                                <Text style={styles.seekButtonText}>10</Text>
                            </Pressable>

                            <Pressable onPress={togglePlayPause} style={styles.playPauseButtonSmall}>
                                <Ionicons
                                    name={isPlaying ? 'pause' : 'play'}
                                    size={24}
                                    color="#FFF"
                                    style={{ marginLeft: isPlaying ? 0 : 2 }}
                                />
                            </Pressable>

                            <Pressable onPress={handleSkipForward} style={styles.seekButton}>
                                <Ionicons name="reload-outline" size={22} color="#FFF" />
                                <Text style={styles.seekButtonText}>10</Text>
                            </Pressable>

                            <Pressable onPress={handleNextEpisode} style={[styles.episodeNavButton, (currentEpisodeIndex === -1 || currentEpisodeIndex >= episodes.length - 1) && { opacity: 0.5 }]} disabled={currentEpisodeIndex === -1 || currentEpisodeIndex >= episodes.length - 1}>
                                <Ionicons name="play-skip-forward" size={20} color="#FFF" />
                            </Pressable>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    const renderSettingsMenu = () => {
        if (!showSettingsMenu) return null;

        return (
            <>
                <Pressable style={styles.menuBackdrop} onPress={() => setShowSettingsMenu(false)} />
                <View style={[styles.bottomSheetMenu, { height: '60%', maxHeight: '80%' }]}>
                    <View style={styles.sheetHeader}>
                        <Text style={styles.menuTitle}>Playback Settings</Text>
                        <Pressable onPress={() => setShowSettingsMenu(false)}>
                            <Ionicons name="close" size={24} color={colors.textSecondary} />
                        </Pressable>
                    </View>
                    <View style={[styles.settingsColumnsContainer, { flex: 1 }]}>
                        {/* Left Column */}
                        <ScrollView
                            style={styles.settingsColumn}
                            contentContainerStyle={{ paddingBottom: insets.bottom + 20, gap: 4 }}
                            showsVerticalScrollIndicator={false}
                        >
                            <Text style={styles.menuSubtitle}>Speed</Text>
                            <View style={styles.menuRowCompact}>
                                {SPEED_OPTIONS.map(speed => (
                                    <Pressable
                                        key={speed}
                                        style={[styles.menuChipSmall, playbackSpeed === speed && styles.menuChipActive]}
                                        onPress={() => setPlaybackSpeed(speed)}
                                    >
                                        <Text style={[styles.menuChipTextSmall, playbackSpeed === speed && styles.textActive]}>{speed}x</Text>
                                    </Pressable>
                                ))}
                            </View>

                            <Text style={styles.menuSubtitle}>Quality</Text>
                            <View style={styles.menuRowCompact}>
                                {QUALITY_OPTIONS.map(q => (
                                    <Pressable
                                        key={q}
                                        style={[styles.menuChipSmall, currentQuality === q && styles.menuChipActive]}
                                        onPress={() => handleSetQuality(q)}
                                        disabled={Platform.OS !== 'web' && q !== 'Auto'}
                                    >
                                        <Text style={[styles.menuChipTextSmall, currentQuality === q && styles.textActive, Platform.OS !== 'web' && q !== 'Auto' && { opacity: 0.5 }]}>
                                            {q}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </ScrollView>

                        {/* Right Column */}
                        <ScrollView
                            style={styles.settingsColumn}
                            contentContainerStyle={{ paddingBottom: insets.bottom + 20, gap: 4 }}
                            showsVerticalScrollIndicator={false}
                        >
                            <Text style={styles.menuSubtitle}>Sub Size</Text>
                            <View style={styles.menuRowCompact}>
                                {[12, 14, 16, 18, 20, 24].map(size => (
                                    <Pressable
                                        key={size}
                                        style={[styles.menuChipSmall, subtitleSize === size && styles.menuChipActive]}
                                        onPress={() => {
                                            setSubtitleSize(size);
                                            saveSubtitlePrefs(size, subtitleColor, subtitleBgOpacity);
                                        }}
                                    >
                                        <Text style={[styles.menuChipTextSmall, subtitleSize === size && styles.textActive]}>{size}</Text>
                                    </Pressable>
                                ))}
                            </View>

                            <Text style={styles.menuSubtitle}>Sub Color</Text>
                            <View style={styles.menuRowCompact}>
                                {['#FFFFFF', '#FFFF00', '#00FF00', '#00FFFF'].map(color => (
                                    <Pressable
                                        key={color}
                                        style={[styles.colorChipSmall, subtitleColor === color && styles.colorChipActive, { backgroundColor: color }]}
                                        onPress={() => {
                                            setSubtitleColor(color);
                                            saveSubtitlePrefs(subtitleSize, color, subtitleBgOpacity);
                                        }}
                                    />
                                ))}
                            </View>

                            <Text style={styles.menuSubtitle}>Sub BG</Text>
                            <View style={styles.menuRowCompact}>
                                {[0, 0.25, 0.5, 0.75, 1].map(opacity => (
                                    <Pressable
                                        key={opacity}
                                        style={[styles.menuChipSmall, subtitleBgOpacity === opacity && styles.menuChipActive]}
                                        onPress={() => {
                                            setSubtitleBgOpacity(opacity);
                                            saveSubtitlePrefs(subtitleSize, subtitleColor, opacity);
                                        }}
                                    >
                                        <Text style={[styles.menuChipTextSmall, subtitleBgOpacity === opacity && styles.textActive]}>{Math.round(opacity * 100)}%</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </>
        );
    };

    // Always visible settings panel below video
    const renderSettingsPanel = () => {
        if (!servers || isFullscreen) return null;

        return (
            <View style={styles.settingsPanel}>
                {/* Audio Type Selection */}
                <View style={styles.settingsSection}>
                    <Text style={styles.settingsSectionTitle}>Audio</Text>
                    <View style={styles.settingsRow}>
                        <Pressable
                            style={[styles.settingsPill, selectedType === 'sub' && styles.settingsPillActive]}
                            onPress={() => handleServerChange(selectedServer, 'sub')}
                            disabled={!servers.sub.length}
                        >
                            <Text style={[styles.settingsPillText, selectedType === 'sub' && styles.settingsPillTextActive]}>
                                SUB ({servers.sub.length})
                            </Text>
                        </Pressable>
                        <Pressable
                            style={[styles.settingsPill, selectedType === 'dub' && styles.settingsPillActive]}
                            onPress={() => handleServerChange(selectedServer, 'dub')}
                            disabled={!servers.dub.length}
                        >
                            <Text style={[styles.settingsPillText, selectedType === 'dub' && styles.settingsPillTextActive]}>
                                DUB ({servers.dub.length})
                            </Text>
                        </Pressable>
                    </View>
                </View>

                {/* Server Selection */}
                <View style={styles.settingsSection}>
                    <Text style={styles.settingsSectionTitle}>Server</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.serverScroll}>
                        <View style={styles.settingsRow}>
                            {(selectedType === 'sub' ? servers.sub : servers.dub).map(s => (
                                <Pressable
                                    key={s.name}
                                    style={[styles.settingsPill, selectedServer === s.name && styles.settingsPillActive]}
                                    onPress={() => handleServerChange(s.name, selectedType)}
                                >
                                    <Text style={[styles.settingsPillText, selectedServer === s.name && styles.settingsPillTextActive]}>
                                        {s.name.toUpperCase()}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </ScrollView>
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, !isFullscreen && { paddingTop: insets.top }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar hidden={true} />

            <Pressable
                style={[styles.videoContainer, isFullscreen && styles.fullscreenContainer]}
                onPress={handlePlayerTap}
            >
                {renderVideoLayer()}
                {renderGestureIndicator()}
                {renderControlsLayer()}
                {renderPersistentOverlay()}
                {renderAutoPlayOverlay()}
                {renderSettingsMenu()}
            </Pressable>

            {!isFullscreen && (
                <ScrollView style={styles.scrollContent}>
                    {/* Rich Info Section */}
                    {animeDetails && (
                        <View style={styles.infoSection}>
                            <Text style={styles.infoTitle}>{animeDetails.title}</Text>
                        </View>
                    )}

                    {/* Current Episode Title */}
                    <View style={styles.currentEpisodeContainer}>
                        <Text style={styles.currentEpisodeLabel}>Now Playing</Text>
                        {currentEpisodeIndex !== -1 && episodes[currentEpisodeIndex] && (
                            <Text style={styles.currentEpisodeTitle}>
                                Episode {episodes[currentEpisodeIndex].episodeNumber}: {episodes[currentEpisodeIndex].title}
                            </Text>
                        )}
                    </View>

                    {renderSettingsPanel()}

                    {/* Episode Grid with Pagination */}
                    {episodes.length > 0 && (() => {
                        const totalPages = Math.ceil(episodes.length / EPISODES_PER_PAGE);
                        const paginatedEpisodes = episodes.slice(
                            (episodePage - 1) * EPISODES_PER_PAGE,
                            episodePage * EPISODES_PER_PAGE
                        );

                        return (
                            <View style={styles.episodeGridContainer}>
                                <View style={styles.episodeGridHeader}>
                                    <Text style={styles.episodeGridTitle}>All Episodes ({episodes.length})</Text>
                                    {/* Legend */}
                                    <View style={styles.legend}>
                                        <View style={styles.legendItem}>
                                            <View style={[styles.legendDot, styles.legendDotCurrent]} />
                                            <Text style={styles.legendText}>Now</Text>
                                        </View>
                                        <View style={styles.legendItem}>
                                            <View style={[styles.legendDot, styles.legendDotWatched]} />
                                            <Text style={styles.legendText}>Watched</Text>
                                        </View>
                                        <View style={styles.legendItem}>
                                            <View style={[styles.legendDot, styles.legendDotProgress]} />
                                            <Text style={styles.legendText}>In Progress</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <ScrollView
                                        ref={paginationScrollRef}
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        style={styles.paginationScroll}
                                        contentContainerStyle={styles.paginationContainer}
                                    >
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                                            <Pressable
                                                key={pageNum}
                                                style={[styles.pageButton, episodePage === pageNum && styles.pageButtonActive]}
                                                onPress={() => setEpisodePage(pageNum)}
                                            >
                                                <Text style={[styles.pageButtonText, episodePage === pageNum && styles.pageButtonTextActive]}>
                                                    {(pageNum - 1) * EPISODES_PER_PAGE + 1}-{Math.min(pageNum * EPISODES_PER_PAGE, episodes.length)}
                                                </Text>
                                            </Pressable>
                                        ))}
                                    </ScrollView>
                                )}

                                <View style={styles.episodeGrid}>
                                    {paginatedEpisodes.map((ep) => {
                                        const isCurrent = ep.id === id;
                                        const isWatched = animeId ? isEpisodeWatched(animeId, ep.id) : false;
                                        const history = animeId ? getAnimeHistory(animeId) : undefined;
                                        const episodeProgress = history?.episodes[ep.id]?.progress || 0;
                                        const hasProgress = episodeProgress > 0 && episodeProgress < 1;

                                        // Circle dimensions
                                        const size = 48;
                                        const strokeWidth = 3;
                                        const radius = (size - strokeWidth) / 2;
                                        const circumference = 2 * Math.PI * radius;
                                        const progressOffset = circumference - (episodeProgress * circumference);

                                        // Determine colors
                                        const getProgressColor = () => {
                                            if (isCurrent) return colors.primary;
                                            if (isWatched) return colors.info;
                                            if (hasProgress) return colors.success;
                                            return 'transparent';
                                        };

                                        const getBgColor = () => {
                                            if (isCurrent) return colors.primary;
                                            if (isWatched) return colors.info;
                                            return 'rgba(255,255,255,0.08)';
                                        };

                                        const getTextColor = () => {
                                            if (isCurrent || isWatched) return '#FFF';
                                            if (hasProgress) return colors.success;
                                            return colors.textSecondary;
                                        };

                                        return (
                                            <Pressable
                                                key={ep.id}
                                                style={styles.episodeCircleContainer}
                                                onPress={() => handleEpisodeSelect(ep.id)}
                                            >
                                                {/* SVG Progress Ring */}
                                                <View style={styles.episodeCircle}>
                                                    <Svg width={size} height={size} style={styles.progressRing}>
                                                        {/* Background circle (track) */}
                                                        <Circle
                                                            cx={size / 2}
                                                            cy={size / 2}
                                                            r={radius}
                                                            stroke="rgba(255,255,255,0.15)"
                                                            strokeWidth={strokeWidth}
                                                            fill={getBgColor()}
                                                        />
                                                        {/* Progress circle */}
                                                        {(hasProgress || isWatched) && (
                                                            <Circle
                                                                cx={size / 2}
                                                                cy={size / 2}
                                                                r={radius}
                                                                stroke={getProgressColor()}
                                                                strokeWidth={strokeWidth}
                                                                fill="transparent"
                                                                strokeDasharray={`${circumference} ${circumference}`}
                                                                strokeDashoffset={isWatched ? 0 : progressOffset}
                                                                strokeLinecap="round"
                                                                rotation="-90"
                                                                origin={`${size / 2}, ${size / 2}`}
                                                            />
                                                        )}
                                                    </Svg>
                                                    {/* Episode number text */}
                                                    <Text style={[styles.episodeCircleText, { color: getTextColor() }]}>
                                                        {ep.episodeNumber}
                                                    </Text>
                                                </View>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>
                        );
                    })()}

                    {/* Suggested Anime */}
                    {animeDetails?.recommended && animeDetails.recommended.length > 0 && (
                        <View style={styles.suggestionsContainer}>
                            <AnimeSection
                                title="You Might Also Like"
                                items={animeDetails.recommended}
                                cardSize="sm"
                            />
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    videoContainer: {
        width: SCREEN_WIDTH,
        height: SCREEN_WIDTH * (9 / 16),
        backgroundColor: '#000',
        position: 'relative',
        justifyContent: 'center',
    },
    fullscreenContainer: {
        height: '100%',
        width: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 999,
    },
    // Styles for Error/Loading states
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    errorText: {
        color: '#FFF',
        marginBottom: 10,
    },
    retryButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
    },
    retryText: {
        color: '#000',
        fontWeight: 'bold',
    },
    persistentOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        zIndex: 20,
        pointerEvents: 'box-none',
    },
    controlsOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'space-between',
        zIndex: 10,
    },
    topBar: {
        flexDirection: 'row',
        padding: 10,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerTextContainer: {
        flex: 1,
        marginHorizontal: 16,
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    headerSubtitle: {
        color: '#DDD',
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    centerControls: {
        alignItems: 'center',
        justifyContent: 'center',
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        pointerEvents: 'box-none',
    },
    // New Styles
    scrollContent: {
        flex: 1,
    },
    infoSection: {
        padding: 16,
        paddingBottom: 8,
    },
    infoTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 8,
    },
    currentEpisodeContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        backgroundColor: 'rgba(255,255,255,0.02)',
        marginBottom: 8,
    },
    currentEpisodeLabel: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        color: colors.primary,
        marginBottom: 4,
    },
    currentEpisodeTitle: {
        fontSize: 16,
        color: '#FFF',
        fontWeight: '600',
    },
    suggestionsContainer: {
        marginTop: 16,
        marginBottom: 40,
    },
    iconButton: {
        padding: 8,
        borderRadius: 20,
    },
    shadow: {
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    playPauseButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    episodeNavButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginHorizontal: 8,
    },
    playPauseButtonSmall: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        marginHorizontal: 12,
        ...shadows.glow,
    },
    seekButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
    },
    seekButtonText: {
        position: 'absolute',
        fontSize: 9,
        fontWeight: 'bold',
        color: '#FFF',
    },
    bottomBar: {
        flexDirection: 'column',
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: 'rgba(0,0,0,0.8)',
        width: '100%',
    },
    controlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginTop: 4,
        position: 'relative',
    },
    timelineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        width: '100%',
    },
    transportControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    fullscreenButton: {
        position: 'absolute',
        right: 0,
        padding: 8,
    },
    timeText: {
        color: '#DDD',
        fontSize: 12,
        fontWeight: '600',
        minWidth: 40,
        textAlign: 'center',
    },
    progressContainer: {
        flex: 1,
        height: 20,
        justifyContent: 'center',
    },
    skipContainer: {
        position: 'absolute',
        bottom: 80,
        right: 16,
        alignItems: 'flex-end',
        gap: 8,
    },
    skipButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    skipButtonText: {
        color: '#000',
        fontWeight: '700',
        fontSize: 13,
        marginRight: 4,
    },
    gestureIndicator: {
        position: 'absolute',
        alignSelf: 'center',
        top: '50%',
        marginTop: -30,
        backgroundColor: 'rgba(0,0,0,0.7)',
        borderRadius: 50,
        padding: 15,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,

    },
    gestureIndicatorText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 4,
    },
    autoPlayOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.8)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 150,
    },
    autoPlayCard: {
        backgroundColor: colors.backgroundSecondary,
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        width: '80%',
        maxWidth: 320,
    },
    autoPlayTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    autoPlayEpisode: {
        color: colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 12,
    },
    autoPlayCountdown: {
        color: colors.primary,
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 20,
    },
    autoPlayButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    autoPlayCancelBtn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    autoPlayCancelText: {
        color: colors.textSecondary,
        fontWeight: '600',
    },
    autoPlayNowBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    autoPlayNowText: {
        color: '#FFF',
        fontWeight: '600',
    },
    menuBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 100,
    },
    bottomSheetMenu: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1A1A2E',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '80%',
        zIndex: 101,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    menuTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    menuSubtitle: {
        color: colors.textSecondary,
        fontSize: 12,
        marginTop: 12,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    menuRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    menuChip: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    menuChipSmall: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        minWidth: 40,
        alignItems: 'center',
    },
    menuChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    menuChipText: {
        color: colors.textSecondary,
        fontWeight: '600',
        fontSize: 13,
    },
    menuChipTextSmall: {
        color: colors.textSecondary,
        fontWeight: '600',
        fontSize: 11,
    },
    settingsColumnsContainer: {
        flexDirection: 'row',
        gap: 16,
    },
    settingsColumn: {
        flex: 1,
        gap: 4,
    },
    menuRowCompact: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 12,
    },
    colorChipSmall: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    textActive: {
        color: '#FFF',
    },
    colorChip: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    colorChipActive: {
        borderColor: colors.primary,
    },
    // Always-visible settings panel
    settingsPanel: {
        backgroundColor: colors.background,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    settingsSection: {
        marginBottom: 12,
    },
    settingsSectionTitle: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    settingsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    serverScroll: {
        marginHorizontal: -16,
        paddingHorizontal: 16,
    },
    settingsPill: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    settingsPillActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    settingsPillText: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
    },
    settingsPillTextActive: {
        color: '#FFF',
    },
    infoContainer: {
        padding: 16,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    // Removed duplicate infoTitle
    infoEpisode: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    infoAnimeName: {
        color: colors.text,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    subtitleOverlay: {
        position: 'absolute',
        bottom: 80,
        left: 20,
        right: 20,
        alignItems: 'center',
        zIndex: 5,
    },
    subtitleOverlayTop: {
        position: 'absolute',
        top: 40,
        left: 20,
        right: 20,
        alignItems: 'center',
        zIndex: 5,
    },
    subtitleTextDisplay: {
        color: '#FFF',
        fontSize: 16,
        textAlign: 'center',
        textShadowColor: '#000',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    // Removed duplicate scrollContent
    episodeGridContainer: {
        padding: 16,
        backgroundColor: colors.background,
    },
    episodeGridHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    episodeGridTitle: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    legend: {
        flexDirection: 'row',
        gap: 12,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    legendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    legendDotCurrent: {
        backgroundColor: colors.primary,
    },
    legendDotWatched: {
        backgroundColor: colors.info,
    },
    legendDotProgress: {
        backgroundColor: colors.success,
    },
    legendText: {
        color: colors.textSecondary,
        fontSize: 10,
    },
    episodeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'center',
    },
    episodeSquare: {
        width: 42,
        height: 42,
        borderRadius: 8,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    episodeSquareCurrent: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    episodeSquareWatched: {
        backgroundColor: colors.info,
        borderColor: colors.info,
    },
    episodeSquareProgress: {
        backgroundColor: colors.success,
        borderColor: colors.success,
    },
    episodeSquareText: {
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    episodeSquareTextActive: {
        color: '#FFF',
    },
    // Pagination styles
    paginationScroll: {
        marginBottom: 12,
    },
    paginationContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    pageButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    pageButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    pageButtonText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
    },
    pageButtonTextActive: {
        color: '#FFF',
    },
    // Circular episode styles
    episodeCircleContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    episodeCircle: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    progressRing: {
        position: 'absolute',
    },
    episodeCircleText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
