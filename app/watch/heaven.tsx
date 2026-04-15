import { Ionicons } from '@expo/vector-icons';
import { AVPlaybackStatus, ResizeMode, Video } from 'expo-av';
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
import type { AnimeDetails, Episode, StreamData } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DOUBLE_TAP_DELAY = 300;
const SEEK_AMOUNT = 10;
const EPISODES_PER_PAGE = 24;
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export default function HeavenWatchScreen() {
    const { id, animeId, startFullscreen } = useLocalSearchParams<{ id: string; animeId: string; startFullscreen?: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { updateWatchHistory, markEpisodeWatched, isEpisodeWatched, getAnimeHistory } = useUser();

    const client = apiClient;

    const videoRef = useRef<Video>(null);
    const webVideoRef = useRef<HTMLVideoElement | null>(null);
    const lastSavedTime = useRef<number>(0);
    const hasMarkedWatched = useRef<boolean>(false);
    const hasResumedPlayback = useRef<boolean>(false);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [streamData, setStreamData] = useState<StreamData | null>(null);
    const [animeDetails, setAnimeDetails] = useState<AnimeDetails | null>(null);

    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState<number>(-1);
    const [animeName, setAnimeName] = useState<string>('');

    const [isPlaying, setIsPlaying] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(startFullscreen === 'true');
    const [showControls, setShowControls] = useState(true);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isBuffering, setIsBuffering] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);

    const [showAutoPlayCountdown, setShowAutoPlayCountdown] = useState(false);
    const [autoPlayCountdown, setAutoPlayCountdown] = useState(5);

    const [gestureIndicator, setGestureIndicator] = useState<{ type: string; value: string } | null>(null);
    const lastTapTime = useRef<number>(0);
    const lastTapX = useRef<number>(0);
    const gestureTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const seekIndicatorOpacity = useRef(new Animated.Value(0)).current;
    const controlsTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const autoPlayTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const progressBarWidth = useRef(0);

    const [episodePage, setEpisodePage] = useState(1);
    const paginationScrollRef = useRef<ScrollView>(null);
    const PAGE_BUTTON_WIDTH = 70;

    // Orientation
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

    useEffect(() => {
        return () => {
            if (Platform.OS !== 'web') {
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            }
        };
    }, []);

    // Keep awake
    useEffect(() => {
        const toggle = async () => {
            if (isPlaying) await activateKeepAwakeAsync();
            else await deactivateKeepAwake();
        };
        toggle();
        return () => { deactivateKeepAwake(); };
    }, [isPlaying]);

    // Hardware back button
    useEffect(() => {
        const onBackPress = () => {
            if (isFullscreen) { toggleFullscreen(); return true; }
            return false;
        };
        const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => sub.remove();
    }, [isFullscreen]);

    // Playback speed
    useEffect(() => {
        if (Platform.OS === 'web' && webVideoRef.current) {
            webVideoRef.current.playbackRate = playbackSpeed;
        } else if (videoRef.current) {
            videoRef.current.setRateAsync(playbackSpeed, true);
        }
    }, [playbackSpeed]);

    // Controls toggle
    const toggleControls = () => {
        if (showControls) {
            setShowControls(false);
            if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
        } else {
            showControlsTemporarily();
        }
    };

    const showControlsTemporarily = () => {
        setShowControls(true);
        if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
        controlsTimeout.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 3000);
    };

    // Gesture indicator
    const showGestureIndicator = (type: string, value: string) => {
        setGestureIndicator({ type, value });
        Animated.sequence([
            Animated.timing(seekIndicatorOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
            Animated.delay(600),
            Animated.timing(seekIndicatorOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => setGestureIndicator(null));
    };

    // Double-tap seek
    const handleDoubleTap = (x: number, containerWidth: number) => {
        const isLeftSide = x < containerWidth / 2;
        const seekAmount = isLeftSide ? -SEEK_AMOUNT : SEEK_AMOUNT;
        if (Platform.OS === 'web' && webVideoRef.current) {
            webVideoRef.current.currentTime = Math.max(0, webVideoRef.current.currentTime + seekAmount);
        } else if (videoRef.current && duration > 0) {
            const newPosition = Math.max(0, Math.min(duration, currentTime + seekAmount * 1000));
            videoRef.current.setPositionAsync(newPosition);
        }
        showGestureIndicator(isLeftSide ? 'seek-back' : 'seek-forward', `${Math.abs(seekAmount)}s`);
        showControlsTemporarily();
    };

    const handlePlayerTap = (e: any) => {
        const now = Date.now();
        const x = Platform.OS === 'web' ? e.nativeEvent?.offsetX ?? e.clientX : e.nativeEvent?.locationX ?? 0;
        if (now - lastTapTime.current < DOUBLE_TAP_DELAY && Math.abs(x - lastTapX.current) < 50) {
            if (gestureTimeout.current) clearTimeout(gestureTimeout.current);
            const containerWidth = Platform.OS === 'web' ? (webVideoRef.current?.clientWidth || SCREEN_WIDTH) : SCREEN_WIDTH;
            handleDoubleTap(x, containerWidth);
        } else {
            if (gestureTimeout.current) clearTimeout(gestureTimeout.current);
            gestureTimeout.current = setTimeout(() => { toggleControls(); }, DOUBLE_TAP_DELAY);
        }
        lastTapTime.current = now;
        lastTapX.current = x;
    };

    // Fetch episodes
    useEffect(() => {
        const fetchData = async () => {
            if (animeId) {
                try {
                    const list = await client.getEpisodes(animeId);
                    setEpisodes(list);
                    const details = await client.getAnime(animeId);
                    setAnimeName(details.title);
                    setAnimeDetails(details);
                } catch (e) { console.error("Failed to fetch data", e); }
            }
        };
        fetchData();
    }, [animeId]);

    useEffect(() => {
        if (episodes.length > 0 && id) {
            const index = episodes.findIndex(e => e.id === id);
            setCurrentEpisodeIndex(index);
            if (index !== -1) {
                const targetPage = Math.floor(index / EPISODES_PER_PAGE) + 1;
                setEpisodePage(targetPage);
            }
        }
    }, [episodes, id]);

    useEffect(() => { hasResumedPlayback.current = false; hasMarkedWatched.current = false; }, [id]);

    // Resume playback
    const resumeFromSavedProgress = useCallback(async () => {
        if (hasResumedPlayback.current || !animeId || !id) return;
        const history = getAnimeHistory(animeId);
        const episodeProgress = history?.episodes[id];
        if (episodeProgress && episodeProgress.progress > 0.02 && episodeProgress.progress < 0.95 && episodeProgress.duration > 0) {
            const savedPositionMs = episodeProgress.progress * episodeProgress.duration;
            if (Platform.OS === 'web' && webVideoRef.current) {
                webVideoRef.current.currentTime = savedPositionMs / 1000;
            } else if (videoRef.current) {
                await videoRef.current.setPositionAsync(savedPositionMs);
            }
            hasResumedPlayback.current = true;
        } else {
            hasResumedPlayback.current = true;
        }
    }, [animeId, id, getAnimeHistory]);

    // Navigation
    const handlePreviousEpisode = async () => {
        if (currentEpisodeIndex > 0) {
            const prevEp = episodes[currentEpisodeIndex - 1];

            router.replace({ pathname: '/watch/heaven' as any, params: { id: prevEp.id, animeId, startFullscreen: isFullscreen ? 'true' : 'false' } });
        }
    };

    const handleNextEpisode = async () => {
        if (currentEpisodeIndex !== -1 && currentEpisodeIndex < episodes.length - 1) {
            const nextEp = episodes[currentEpisodeIndex + 1];

            router.replace({ pathname: '/watch/heaven' as any, params: { id: nextEp.id, animeId, startFullscreen: isFullscreen ? 'true' : 'false' } });
        }
    };

    const handleEpisodeSelect = async (episodeId: string) => {
        if (episodeId !== id) {
            router.replace({ pathname: '/watch/heaven' as any, params: { id: episodeId, animeId } });
        }
    };

    // Auto-play
    useEffect(() => {
        if (showAutoPlayCountdown && autoPlayCountdown > 0) {
            autoPlayTimeout.current = setTimeout(() => setAutoPlayCountdown(prev => prev - 1), 1000);
        } else if (showAutoPlayCountdown && autoPlayCountdown === 0) {
            handleNextEpisode();
        }
        return () => { if (autoPlayTimeout.current) clearTimeout(autoPlayTimeout.current); };
    }, [showAutoPlayCountdown, autoPlayCountdown]);

    // Fetch stream — directly, no servers step
    const fetchStream = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            setError(null);
            setStreamData(null);

            const streamResponse = await client.getStream(id);
            if (streamResponse) {
                setStreamData(streamResponse);
            } else {
                setError('No stream available');
            }
        } catch (err) {
            console.error('Failed to fetch stream:', err);
            setError('Failed to load video.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { fetchStream(); }, [fetchStream]);

    // Web: set MP4 src directly
    useEffect(() => {
        if (Platform.OS === 'web' && streamData?.link?.file && !loading && webVideoRef.current) {
            const video = webVideoRef.current;
            video.src = streamData.link.file;
            video.playbackRate = playbackSpeed;
            video.addEventListener('loadedmetadata', () => { resumeFromSavedProgress(); }, { once: true });
            if (isPlaying) video.play().catch(console.error);
        }
    }, [streamData, loading]);

    // Playback handlers
    const togglePlayPause = () => {
        if (Platform.OS === 'web' && webVideoRef.current) {
            if (isPlaying) webVideoRef.current.pause();
            else webVideoRef.current.play().catch(console.error);
        }
        setIsPlaying(!isPlaying);
        showControlsTemporarily();
    };

    const handleSeek = async (percent: number) => {
        const seekMs = percent * duration;
        if (Platform.OS === 'web' && webVideoRef.current) {
            webVideoRef.current.currentTime = seekMs / 1000;
        } else if (videoRef.current) {
            await videoRef.current.setPositionAsync(seekMs);
        }
        showControlsTemporarily();
    };

    const toggleFullscreen = async () => {
        if (Platform.OS === 'web') {
            try {
                const elem = webVideoRef.current?.parentElement;
                if (!isFullscreen && elem) {
                    await (elem as any).requestFullscreen?.();
                } else {
                    await (document as any).exitFullscreen?.();
                }
            } catch (e) { console.error(e); }
        }
        setIsFullscreen(!isFullscreen);
    };

    const handleBack = async () => {
        if (isFullscreen) await toggleFullscreen();
        else router.back();
    };

    // Web time update
    const handleWebTimeUpdate = () => {
        if (!webVideoRef.current) return;
        const video = webVideoRef.current;
        setCurrentTime(video.currentTime * 1000);
        setDuration(video.duration * 1000 || 0);
        const currentProgress = video.duration ? video.currentTime / video.duration : 0;
        setProgress(currentProgress);

        const now = Date.now();
        if (now - lastSavedTime.current > 5000 && animeId && id) {
            updateWatchHistory(animeId, id, {
                episodeId: id,
                episodeNumber: episodes[currentEpisodeIndex]?.episodeNumber || 0,
                progress: currentProgress,
                duration: video.duration * 1000,
            }, animeDetails ? { title: animeDetails.title, poster: animeDetails.poster } : undefined);
            lastSavedTime.current = now;
        }

        // Mark as watched near end
        if (video.duration && video.duration - video.currentTime <= 120 && !hasMarkedWatched.current && animeId && id) {
            hasMarkedWatched.current = true;
            markEpisodeWatched(animeId, id);
        }

        // Auto-play countdown trigger
        if (video.duration && video.currentTime >= video.duration - 5 && !showAutoPlayCountdown) {
            if (currentEpisodeIndex !== -1 && currentEpisodeIndex < episodes.length - 1) {
                setShowAutoPlayCountdown(true);
                setAutoPlayCountdown(5);
            }
        }
    };

    const handleWebEnded = () => {
        if (currentEpisodeIndex !== -1 && currentEpisodeIndex < episodes.length - 1) {
            setShowAutoPlayCountdown(true);
            setAutoPlayCountdown(5);
        }
    };

    // Native playback status
    const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
        if (!status.isLoaded) {
            if (status.error) { setError(`Playback error: ${status.error}`); setIsBuffering(false); }
            return;
        }
        setIsBuffering(status.isBuffering && !status.isPlaying);
        setDuration(status.durationMillis || 0);

        if (!hasResumedPlayback.current && status.durationMillis && status.durationMillis > 0) {
            resumeFromSavedProgress();
        }

        setCurrentTime(status.positionMillis || 0);
        const currentProgress = status.durationMillis ? status.positionMillis / status.durationMillis : 0;
        setProgress(currentProgress);

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

        // Mark as watched
        const remainingMs = (status.durationMillis || 0) - (status.positionMillis || 0);
        if (remainingMs <= 120000 && remainingMs > 0 && !hasMarkedWatched.current && animeId && id) {
            hasMarkedWatched.current = true;
            markEpisodeWatched(animeId, id);
        }

        if (status.didJustFinish && currentEpisodeIndex !== -1 && currentEpisodeIndex < episodes.length - 1) {
            setShowAutoPlayCountdown(true);
            setAutoPlayCountdown(5);
        }
    };

    const handleSkipBackward = () => {
        if (duration > 0) handleSeek(Math.max(0, currentTime - 10000) / duration);
    };

    const handleSkipForward = () => {
        if (duration > 0) handleSeek(Math.min(duration, currentTime + 10000) / duration);
    };

    const cancelAutoPlay = () => {
        setShowAutoPlayCountdown(false);
        setAutoPlayCountdown(5);
        if (autoPlayTimeout.current) clearTimeout(autoPlayTimeout.current);
    };

    // ===== RENDER =====

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
                    onWaiting={() => setIsBuffering(true)}
                    onPlaying={() => setIsBuffering(false)}
                    onCanPlay={() => setIsBuffering(false)}
                    onEnded={handleWebEnded}
                />
            );
        }

        return (
            <Video
                ref={videoRef}
                source={{
                    uri: streamData.link.file,
                    headers: streamData.referer ? { Referer: streamData.referer } : undefined,
                }}
                style={{ width: '100%', height: '100%', backgroundColor: '#000' }}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={isPlaying}
                isLooping={false}
                onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                useNativeControls={false}
                onLoadStart={() => setIsBuffering(true)}
                onReadyForDisplay={() => setIsBuffering(false)}
            />
        );
    };

    const renderGestureIndicator = () => {
        if (!gestureIndicator) return null;
        return (
            <Animated.View style={[styles.gestureIndicator, { opacity: seekIndicatorOpacity }]} pointerEvents="none">
                <Ionicons name={gestureIndicator.type === 'seek-back' ? 'play-back' : 'play-forward'} size={32} color="#FFF" />
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
                    {isBuffering && <ActivityIndicator size="large" color={colors.primary} />}
                </View>

                <View style={[styles.bottomBar, { paddingBottom: isFullscreen ? 20 : 0 }]}>
                    <View style={styles.timelineRow}>
                        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
                        <View style={styles.progressContainer}>
                            {Platform.OS === 'web' ? (
                                <div
                                    style={{ width: '100%', height: '20px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                                    onClick={(e: any) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        handleSeek((e.clientX - rect.left) / rect.width);
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
                                    onLayout={(e) => { progressBarWidth.current = e.nativeEvent.layout.width; }}
                                    onPress={(e) => {
                                        if (progressBarWidth.current > 0 && duration > 0) {
                                            handleSeek(Math.max(0, Math.min(1, e.nativeEvent.locationX / progressBarWidth.current)));
                                        }
                                    }}
                                >
                                    <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2 }}>
                                        <View style={{ width: `${progress * 100}%`, height: '100%', backgroundColor: colors.primary, borderRadius: 2 }} />
                                        <View style={{
                                            position: 'absolute', left: `${progress * 100}%`, marginLeft: -6, top: -4,
                                            width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary,
                                            elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 4
                                        }} />
                                    </View>
                                </Pressable>
                            )}
                        </View>
                        <Text style={styles.timeText}>{formatTime(duration)}</Text>
                    </View>

                    <View style={styles.controlsRow}>
                        <View style={styles.transportControls}>
                            <Pressable onPress={handlePreviousEpisode} style={[styles.episodeNavButton, currentEpisodeIndex <= 0 && { opacity: 0.5 }]} disabled={currentEpisodeIndex <= 0}>
                                <Ionicons name="play-skip-back" size={20} color="#FFF" />
                            </Pressable>
                            <Pressable onPress={handleSkipBackward} style={styles.seekButton}>
                                <Ionicons name="reload-outline" size={22} color="#FFF" style={{ transform: [{ scaleX: -1 }] }} />
                                <Text style={styles.seekButtonText}>10</Text>
                            </Pressable>
                            <Pressable onPress={togglePlayPause} style={styles.playPauseButtonSmall}>
                                <Ionicons name={isPlaying ? 'pause' : 'play'} size={24} color="#FFF" style={{ marginLeft: isPlaying ? 0 : 2 }} />
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
                <View style={styles.bottomSheetMenu}>
                    <View style={styles.sheetHeader}>
                        <Text style={styles.menuTitle}>Playback Settings</Text>
                        <Pressable onPress={() => setShowSettingsMenu(false)}>
                            <Ionicons name="close" size={24} color={colors.textSecondary} />
                        </Pressable>
                    </View>
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
                </View>
            </>
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
                {renderAutoPlayOverlay()}
                {renderSettingsMenu()}
            </Pressable>

            {!isFullscreen && (
                <ScrollView style={styles.scrollContent}>
                    {/* Current Episode */}
                    <View style={styles.currentEpisodeContainer}>
                        <Text style={styles.currentEpisodeLabel}>Now Playing</Text>
                        {currentEpisodeIndex !== -1 && episodes[currentEpisodeIndex] && (
                            <Text style={styles.currentEpisodeTitle}>
                                Episode {episodes[currentEpisodeIndex].episodeNumber}: {episodes[currentEpisodeIndex].title}
                            </Text>
                        )}
                    </View>

                    {/* Episode Grid */}
                    {episodes.length > 0 && (() => {
                        const totalPages = Math.ceil(episodes.length / EPISODES_PER_PAGE);
                        const paginatedEpisodes = episodes.slice((episodePage - 1) * EPISODES_PER_PAGE, episodePage * EPISODES_PER_PAGE);

                        return (
                            <View style={styles.episodeGridContainer}>
                                <View style={styles.episodeGridHeader}>
                                    <Text style={styles.episodeGridTitle}>All Episodes ({episodes.length})</Text>
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

                                {totalPages > 1 && (
                                    <ScrollView ref={paginationScrollRef} horizontal showsHorizontalScrollIndicator={false} style={styles.paginationScroll} contentContainerStyle={styles.paginationContainer}>
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                                            <Pressable key={pageNum} style={[styles.pageButton, episodePage === pageNum && styles.pageButtonActive]} onPress={() => setEpisodePage(pageNum)}>
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

                                        const size = 48;
                                        const strokeWidth = 3;
                                        const radius = (size - strokeWidth) / 2;
                                        const circumference = 2 * Math.PI * radius;
                                        const progressOffset = circumference - (episodeProgress * circumference);

                                        const getProgressColor = () => { if (isCurrent) return colors.primary; if (isWatched) return colors.info; if (hasProgress) return colors.success; return 'transparent'; };
                                        const getBgColor = () => { if (isCurrent) return colors.primary; if (isWatched) return colors.info; return 'rgba(255,255,255,0.08)'; };
                                        const getTextColor = () => { if (isCurrent || isWatched) return '#FFF'; if (hasProgress) return colors.success; return colors.textSecondary; };

                                        return (
                                            <Pressable key={ep.id} style={styles.episodeCircleContainer} onPress={() => handleEpisodeSelect(ep.id)}>
                                                <View style={styles.episodeCircle}>
                                                    <Svg width={size} height={size} style={styles.progressRing}>
                                                        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.15)" strokeWidth={strokeWidth} fill={getBgColor()} />
                                                        {(hasProgress || isWatched) && (
                                                            <Circle cx={size / 2} cy={size / 2} r={radius} stroke={getProgressColor()} strokeWidth={strokeWidth} fill="transparent"
                                                                strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={isWatched ? 0 : progressOffset}
                                                                strokeLinecap="round" rotation="-90" origin={`${size / 2}, ${size / 2}`} />
                                                        )}
                                                    </Svg>
                                                    <Text style={[styles.episodeCircleText, { color: getTextColor() }]}>{ep.episodeNumber}</Text>
                                                </View>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>
                        );
                    })()}

                    {/* Recommendations */}
                    {animeDetails?.recommended && animeDetails.recommended.length > 0 && (
                        <View style={styles.suggestionsContainer}>
                            <AnimeSection title="You Might Also Like" items={animeDetails.recommended} cardSize="sm" />
                        </View>
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    videoContainer: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * (9 / 16), backgroundColor: '#000', position: 'relative', justifyContent: 'center' },
    fullscreenContainer: { height: '100%', width: '100%', position: 'absolute', top: 0, left: 0, zIndex: 999 },
    centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    errorText: { color: '#FFF', fontSize: 14, textAlign: 'center' },
    retryButton: { marginTop: 12, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 20 },
    retryText: { color: '#FFF', fontWeight: '600' },
    controlsOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'space-between', zIndex: 10 },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingTop: 8 },
    iconButton: { padding: 8 },
    headerTextContainer: { flex: 1, marginHorizontal: 8 },
    headerTitle: { color: '#FFF', fontSize: 14, fontWeight: '700' },
    headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
    centerControls: { alignItems: 'center', justifyContent: 'center' },
    bottomBar: { paddingHorizontal: 12, paddingBottom: 8 },
    timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    timeText: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontVariant: ['tabular-nums'] as any, minWidth: 40 },
    progressContainer: { flex: 1 },
    controlsRow: { alignItems: 'center', paddingTop: 4 },
    transportControls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    episodeNavButton: { padding: 8 },
    seekButton: { padding: 8, alignItems: 'center', justifyContent: 'center' },
    seekButtonText: { color: '#FFF', fontSize: 9, fontWeight: '700', position: 'absolute' },
    playPauseButtonSmall: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    gestureIndicator: { position: 'absolute', alignSelf: 'center', top: '40%', backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 50, padding: 16, alignItems: 'center' },
    gestureIndicatorText: { color: '#FFF', fontSize: 12, fontWeight: '600', marginTop: 4 },
    autoPlayOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 20 },
    autoPlayCard: { backgroundColor: colors.card, borderRadius: 16, padding: 24, alignItems: 'center', width: '80%', maxWidth: 300 },
    autoPlayTitle: { color: colors.primary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    autoPlayEpisode: { color: '#FFF', fontSize: 16, fontWeight: '600', marginTop: 8, textAlign: 'center' },
    autoPlayCountdown: { color: colors.textSecondary, fontSize: 14, marginTop: 12 },
    autoPlayButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
    autoPlayCancelBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: colors.border },
    autoPlayCancelText: { color: colors.textSecondary, fontWeight: '600' },
    autoPlayNowBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.primary },
    autoPlayNowText: { color: '#FFF', fontWeight: '600' },
    menuBackdrop: { ...StyleSheet.absoluteFillObject, zIndex: 15 },
    bottomSheetMenu: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, zIndex: 16 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    menuTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    menuSubtitle: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    menuRowCompact: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    menuChipSmall: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'transparent' },
    menuChipActive: { backgroundColor: 'rgba(139, 92, 246, 0.2)', borderColor: colors.primary },
    menuChipTextSmall: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
    textActive: { color: colors.primary },
    scrollContent: { flex: 1 },
    currentEpisodeContainer: { padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    currentEpisodeLabel: { color: colors.primary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    currentEpisodeTitle: { color: '#FFF', fontSize: 16, fontWeight: '600', marginTop: 4 },
    episodeGridContainer: { padding: 16 },
    episodeGridHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    episodeGridTitle: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    legend: { flexDirection: 'row', gap: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendDotCurrent: { backgroundColor: colors.primary },
    legendDotWatched: { backgroundColor: colors.info },
    legendDotProgress: { backgroundColor: colors.success },
    legendText: { color: colors.textSecondary, fontSize: 10 },
    paginationScroll: { marginBottom: 12 },
    paginationContainer: { gap: 8 },
    pageButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)' },
    pageButtonActive: { backgroundColor: colors.primary },
    pageButtonText: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
    pageButtonTextActive: { color: '#FFF' },
    episodeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    episodeCircleContainer: { alignItems: 'center' },
    episodeCircle: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
    progressRing: { position: 'absolute' },
    episodeCircleText: { fontSize: 14, fontWeight: '600' },
    suggestionsContainer: { marginTop: 8, paddingBottom: 40 },
});
