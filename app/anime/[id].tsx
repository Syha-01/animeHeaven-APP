import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Dimensions,
    Image,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { apiClient } from '../../api/client';
import { AnimeSection } from '../../components/AnimeSection';
import { Badge, EpisodeBadges } from '../../components/Badge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { getStatusInfo, StatusPickerModal } from '../../components/StatusPickerModal';
import { useUser } from '../../context/UserContext';

import { borderRadius, colors, shadows, spacing, typography } from '../../theme';
import type { AnimeDetails, Episode, WatchStatus } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_HEIGHT = 400;
const EPISODES_PER_PAGE = 24;

export default function AnimeDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { saveAnime, removeAnime, isSaved, getAnimeStatus, getAnimeHistory, isEpisodeWatched} = useUser();


    const client = apiClient;

    const [anime, setAnime] = useState<AnimeDetails | null>(null);
    const [episodes, setEpisodes] = useState<Episode[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [synopsisExpanded, setSynopsisExpanded] = useState(false);
    const [showStatusPicker, setShowStatusPicker] = useState(false);

    // Pagination State
    const [page, setPage] = useState(1);
    const paginationScrollRef = useRef<ScrollView>(null);
    const PAGE_BUTTON_WIDTH = 70; // Approximate width of each page button

    const fetchData = useCallback(async () => {
        if (!id) return;

        try {
            const [animeData, episodesData] = await Promise.all([
                client.getAnime(id),
                client.getEpisodes(id).catch(() => []),
            ]);
            setAnime(animeData);
            setEpisodes(episodesData);
        } catch (err) {
            console.error('Failed to fetch anime details:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id, client]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleBack = () => {
        router.back();
    };

    const handleWatchPress = async (episode?: Episode) => {
        if (episodes.length > 0) {
            const ep = episode || episodes[0];

            router.push({
                pathname: '/watch/heaven' as any,
                params: { id: ep.id, animeId: anime?.id }
            });
        }
    };

    const handleGenrePress = (genre: string) => {
        router.push(`/genre/${genre.toLowerCase()}`);
    };

    const handleSavePress = () => {
        setShowStatusPicker(true);
    };

    const handleStatusSelect = async (status: WatchStatus) => {
        if (anime) {
            await saveAnime(anime, status);
            setShowStatusPicker(false);
        }
    };

    const handleRemoveAnime = async () => {
        if (anime) {
            await removeAnime(anime.id);
            setShowStatusPicker(false);
        }
    };

    // Derived Pagination
    const totalPages = Math.ceil(episodes.length / EPISODES_PER_PAGE);
    const paginatedEpisodes = episodes.slice((page - 1) * EPISODES_PER_PAGE, page * EPISODES_PER_PAGE);

    // Determine "Continue Watching" episode - highest episode number with progress
    const continueWatchingEpisode = useMemo(() => {
        if (!anime?.id || episodes.length === 0) return null;

        const history = getAnimeHistory(anime.id);
        if (!history || !history.episodes) return null;

        // Find all episodes that have been watched or have progress
        const watchedEpisodes = episodes.filter(ep => {
            const epProgress = history.episodes[ep.id];
            return epProgress && (epProgress.progress > 0.02 || epProgress.watched);
        });

        if (watchedEpisodes.length === 0) return null;

        // Sort by episode number descending and return the highest
        const sortedEpisodes = watchedEpisodes.sort((a, b) => b.episodeNumber - a.episodeNumber);
        const highestWatched = sortedEpisodes[0];
        const highestProgress = history.episodes[highestWatched.id];

        // If the highest episode is fully watched (>95%), suggest the next episode
        if (highestProgress.watched || highestProgress.progress >= 0.95) {
            const nextEpisode = episodes.find(ep => ep.episodeNumber === highestWatched.episodeNumber + 1);
            if (nextEpisode) {
                return { episode: nextEpisode, isNext: true };
            }
            // No next episode, user finished the last episode they watched
            return { episode: highestWatched, isNext: false };
        }

        // Episode is in progress, return it
        return { episode: highestWatched, isNext: false };
    }, [anime?.id, episodes, getAnimeHistory]);

    // Auto-navigate to the correct pagination page when there's a continue watching episode
    useEffect(() => {
        if (continueWatchingEpisode && episodes.length > 0) {
            const episodeIndex = episodes.findIndex(ep => ep.id === continueWatchingEpisode.episode.id);
            if (episodeIndex !== -1) {
                const targetPage = Math.floor(episodeIndex / EPISODES_PER_PAGE) + 1;
                setPage(targetPage);

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
    }, [continueWatchingEpisode, episodes]);

    if (loading) {
        return <LoadingSpinner fullScreen />;
    }

    if (!anime) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={64} color={colors.textTertiary} />
                <Text style={styles.errorText}>Failed to load anime details</Text>
                <Pressable style={styles.retryButton} onPress={handleBack}>
                    <Text style={styles.retryText}>Go Back</Text>
                </Pressable>
            </View>
        );
    }

    const saved = isSaved(anime.id);
    const currentStatus = getAnimeStatus(anime.id);
    const statusInfo = currentStatus ? getStatusInfo(currentStatus) : null;

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                    />
                }
            >
                {/* Hero Header */}
                <View style={styles.header}>
                    <Image
                        source={{ uri: anime.poster }}
                        style={styles.backgroundImage}
                        resizeMode="cover"
                        blurRadius={3}
                    />
                    <LinearGradient
                        colors={['transparent', 'rgba(15,15,26,0.8)', colors.background]}
                        locations={[0, 0.6, 1]}
                        style={styles.gradient}
                    />

                    {/* Back Button */}
                    <Pressable
                        style={[styles.iconButton, { top: insets.top + spacing.md, left: spacing.lg }]}
                        onPress={handleBack}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.text} />
                    </Pressable>

                    {/* Save Button */}
                    <Pressable
                        style={[styles.iconButton, { top: insets.top + spacing.md, right: spacing.lg }]}
                        onPress={handleSavePress}
                    >
                        <Ionicons
                            name={saved ? "bookmark" : "bookmark-outline"}
                            size={24}
                            color={statusInfo ? statusInfo.color : colors.text}
                        />
                    </Pressable>

                    {/* Poster and Basic Info */}
                    <View style={styles.headerContent}>
                        <Image
                            source={{ uri: anime.poster }}
                            style={styles.poster}
                            resizeMode="cover"
                        />

                        <View style={styles.headerInfo}>
                            <Text style={styles.title} numberOfLines={3}>
                                {anime.title}
                            </Text>

                            {anime.alternativeTitle && (
                                <Text style={styles.alternativeTitle} numberOfLines={1}>
                                    {anime.alternativeTitle}
                                </Text>
                            )}

                            <View style={styles.metaRow}>
                                {anime.type && <Badge variant="type" value={anime.type} size="md" />}
                                {anime.rating && <Badge variant="rating" value={anime.rating} size="md" />}
                            </View>

                            {anime.episodes && (
                                <View style={styles.episodeBadges}>
                                    <EpisodeBadges
                                        sub={anime.episodes.sub}
                                        dub={anime.episodes.dub}
                                        size="md"
                                    />
                                </View>
                            )}

                            {anime.MAL_score && (
                                <View style={styles.scoreContainer}>
                                    <Ionicons name="star" size={18} color={colors.warning} />
                                    <Text style={styles.scoreText}>{anime.MAL_score}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>

                {/* Watch Button */}
                {episodes.length > 0 && (() => {
                    const isResume = continueWatchingEpisode && !continueWatchingEpisode.isNext;
                    return (
                        <View style={styles.watchButtonContainer}>
                            <Pressable
                                style={[
                                    styles.watchButton,
                                    isResume && { backgroundColor: colors.success }
                                ]}
                                onPress={() => handleWatchPress(continueWatchingEpisode?.episode)}
                            >
                                <Ionicons name="play" size={24} color={colors.text} />
                                <Text style={styles.watchButtonText}>
                                    {continueWatchingEpisode
                                        ? (continueWatchingEpisode.isNext
                                            ? `Continue Ep ${continueWatchingEpisode.episode.episodeNumber}`
                                            : `Resume Ep ${continueWatchingEpisode.episode.episodeNumber}`)
                                        : 'Start Watching'}
                                </Text>
                            </Pressable>
                        </View>
                    );
                })()}

                {/* Info Section */}
                <View style={styles.infoSection}>
                    {/* Quick Info */}
                    <View style={styles.quickInfo}>
                        {anime.status && (
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Status</Text>
                                <Text style={styles.infoValue}>{anime.status}</Text>
                            </View>
                        )}
                        {anime.premiered && (
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Premiered</Text>
                                <Text style={styles.infoValue}>{anime.premiered}</Text>
                            </View>
                        )}
                        {anime.duration && (
                            <View style={styles.infoItem}>
                                <Text style={styles.infoLabel}>Duration</Text>
                                <Text style={styles.infoValue}>{anime.duration}</Text>
                            </View>
                        )}
                    </View>

                    {/* Synopsis */}
                    {anime.synopsis && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Synopsis</Text>
                            <Text
                                style={styles.synopsis}
                                numberOfLines={synopsisExpanded ? undefined : 4}
                            >
                                {anime.synopsis}
                            </Text>
                            <Pressable onPress={() => setSynopsisExpanded(!synopsisExpanded)}>
                                <Text style={styles.showMore}>
                                    {synopsisExpanded ? 'Show Less' : 'Show More'}
                                </Text>
                            </Pressable>
                        </View>
                    )}

                    {/* Genres */}
                    {anime.genres && anime.genres.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Genres</Text>
                            <View style={styles.genreList}>
                                {anime.genres.map((genre: string) => (
                                    <Pressable
                                        key={genre}
                                        style={styles.genreChip}
                                        onPress={() => handleGenrePress(genre)}
                                    >
                                        <Text style={styles.genreText}>{genre}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Studios */}
                    {anime.studios && anime.studios.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Studios</Text>
                            <Text style={styles.studioText}>{anime.studios.join(', ')}</Text>
                        </View>
                    )}
                </View>

                {/* Episodes Section */}
                {episodes.length > 0 && (
                    <View style={styles.episodesSection}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Episodes</Text>
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

                        <View style={styles.episodesContent}>
                            {/* Pagination Controls - Horizontally Scrollable */}
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
                                            style={[styles.pageButton, page === pageNum && styles.pageButtonActive]}
                                            onPress={() => setPage(pageNum)}
                                        >
                                            <Text style={[styles.pageButtonText, page === pageNum && styles.pageButtonTextActive]}>
                                                {(pageNum - 1) * EPISODES_PER_PAGE + 1}-{Math.min(pageNum * EPISODES_PER_PAGE, episodes.length)}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </ScrollView>
                            )}

                            <View style={styles.episodeGrid}>
                                {paginatedEpisodes.map((episode) => {
                                    const isCurrent = getAnimeHistory(anime.id)?.lastEpisodeId === episode.id;
                                    const isWatched = isEpisodeWatched(anime.id, episode.id);
                                    const history = getAnimeHistory(anime.id);
                                    const episodeProgress = history?.episodes[episode.id]?.progress || 0;
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
                                        return colors.card;
                                    };

                                    const getTextColor = () => {
                                        if (isCurrent || isWatched) return '#FFF';
                                        if (hasProgress) return colors.success;
                                        return colors.textSecondary;
                                    };

                                    return (
                                        <Pressable
                                            key={episode.id}
                                            style={styles.episodeCircleContainer}
                                            onPress={() => handleWatchPress(episode)}
                                        >
                                            {/* SVG Progress Ring */}
                                            <View style={styles.episodeCircle}>
                                                <Svg width={size} height={size} style={styles.progressRing}>
                                                    {/* Background circle (track) */}
                                                    <Circle
                                                        cx={size / 2}
                                                        cy={size / 2}
                                                        r={radius}
                                                        stroke={colors.border}
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
                                                    {episode.episodeNumber}
                                                </Text>
                                            </View>
                                        </Pressable>
                                    )
                                })}
                            </View>
                        </View>
                    </View>
                )
                }

                {/* Related Anime */}
                {
                    anime.related && anime.related.length > 0 && (
                        <AnimeSection title="Related" items={anime.related} />
                    )
                }

                {/* Recommended */}
                {
                    anime.recommended && anime.recommended.length > 0 && (
                        <AnimeSection title="You Might Also Like" items={anime.recommended} />
                    )
                }
            </ScrollView >

            {/* Status Picker Modal */}
            <StatusPickerModal
                visible={showStatusPicker}
                onClose={() => setShowStatusPicker(false)}
                onSelect={handleStatusSelect}
                onRemove={handleRemoveAnime}
                currentStatus={currentStatus}
                animeName={anime.title}
                showRemove={saved}
            />
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        height: HEADER_HEIGHT,
        position: 'relative',
    },
    backgroundImage: {
        ...StyleSheet.absoluteFillObject,
        width: SCREEN_WIDTH,
        height: HEADER_HEIGHT,
    },
    gradient: {
        ...StyleSheet.absoluteFillObject,
    },
    iconButton: {
        position: 'absolute',
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.overlay,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    headerContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        padding: spacing.lg,
    },
    poster: {
        width: 120,
        height: 180,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.backgroundTertiary,
        ...shadows.lg,
    },
    headerInfo: {
        flex: 1,
        marginLeft: spacing.lg,
        justifyContent: 'flex-end',
    },
    title: {
        color: colors.text,
        fontSize: typography.fontSize.xl,
        fontWeight: '800',
        lineHeight: 26,
    },
    alternativeTitle: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.sm,
        marginTop: spacing.xs,
    },
    metaRow: {
        flexDirection: 'row',
        marginTop: spacing.sm,
    },
    episodeBadges: {
        marginTop: spacing.sm,
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.sm,
    },
    scoreText: {
        color: colors.warning,
        fontSize: typography.fontSize.md,
        fontWeight: '700',
        marginLeft: spacing.xs,
    },
    watchButtonContainer: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
    },
    watchButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        paddingVertical: spacing.lg,
        borderRadius: borderRadius.xl,
        ...shadows.glow,
    },
    watchButtonText: {
        color: colors.text,
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        marginLeft: spacing.sm,
    },
    infoSection: {
        padding: spacing.lg,
    },
    quickInfo: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
    },
    infoItem: {
        width: '50%',
        marginBottom: spacing.sm,
    },
    infoLabel: {
        color: colors.textTertiary,
        fontSize: typography.fontSize.xs,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    infoValue: {
        color: colors.text,
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
    },
    section: {
        marginBottom: spacing.lg,
    },
    sectionTitle: {
        color: colors.text,
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        marginBottom: spacing.sm,
    },
    synopsis: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.md,
        lineHeight: 22,
    },
    showMore: {
        color: colors.primary,
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        marginTop: spacing.sm,
    },
    genreList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    genreChip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: borderRadius.full,
        marginRight: spacing.sm,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    genreText: {
        color: colors.text,
        fontSize: typography.fontSize.sm,
        fontWeight: '500',
    },
    studioText: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.md,
    },
    episodesSection: {
        marginTop: spacing.lg,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        marginBottom: spacing.md,
    },
    episodeCount: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.sm,
    },
    episodesContent: {
        paddingHorizontal: spacing.lg,
    },
    episodeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'center',
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
    episodeSquare: {
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
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
        fontSize: typography.fontSize.md,
        fontWeight: '600',
    },
    episodeSquareTextActive: {
        color: '#FFF',
    },
    errorContainer: {
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xxxl,
    },
    errorText: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.md,
        marginTop: spacing.lg,
        textAlign: 'center',
    },
    retryButton: {
        marginTop: spacing.lg,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.md,
        backgroundColor: colors.primary,
        borderRadius: borderRadius.full,
    },
    retryText: {
        color: colors.text,
        fontSize: typography.fontSize.md,
        fontWeight: '600',
    },
    paginationContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    pageButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: colors.card,
        borderRadius: 16,
    },
    pageButtonActive: {
        backgroundColor: colors.primary,
    },
    pageButtonText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
    },
    pageButtonTextActive: {
        color: '#FFF',
    },
    // Pagination scroll
    paginationScroll: {
        marginBottom: 12,
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
        fontSize: typography.fontSize.md,
        fontWeight: '600',
    },
});
