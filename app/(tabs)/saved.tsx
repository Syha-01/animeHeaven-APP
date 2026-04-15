import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    FlatList,
    Image,
    Keyboard,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SetupRequired } from '../../components/SetupRequired';
import { getStatusInfo, StatusPickerModal } from '../../components/StatusPickerModal';
import { AnimeHistory, useUser } from '../../context/UserContext';
import { borderRadius, colors, spacing, typography } from '../../theme';
import { SavedAnime, WatchStatus } from '../../types';

type FilterTab = 'all' | 'continue' | WatchStatus;

interface TabConfig {
    key: FilterTab;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
}

const TABS: TabConfig[] = [
    { key: 'all', label: 'All', icon: 'albums' },
    { key: 'continue', label: 'Continue', icon: 'play-circle' },
    { key: 'watching', label: 'Watching', icon: 'eye' },
    { key: 'watch_later', label: 'Watch Later', icon: 'bookmark' },
    { key: 'completed', label: 'Completed', icon: 'checkmark-circle' },
    { key: 'dropped', label: 'Dropped', icon: 'close-circle' },
];

// Helper to get highest episode with progress
const getContinueEpisode = (history: AnimeHistory) => {
    const episodes = Object.values(history.episodes);
    if (episodes.length === 0) return null;

    // Sort by episode number descending
    const sorted = episodes.sort((a, b) => b.episodeNumber - a.episodeNumber);

    // Find highest episode that's either in progress or find next after fully watched
    for (const ep of sorted) {
        if (ep.progress > 0.02 && ep.progress < 0.95) {
            // In progress - return this one
            return { episodeId: ep.episodeId, episodeNumber: ep.episodeNumber, isResume: true };
        }
    }

    // If highest is fully watched, return it (user can continue to next)
    const highest = sorted[0];
    if (highest.watched || highest.progress >= 0.95) {
        return { episodeId: highest.episodeId, episodeNumber: highest.episodeNumber + 1, isResume: false };
    }

    return { episodeId: highest.episodeId, episodeNumber: highest.episodeNumber, isResume: true };
};

export default function SavedScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { savedAnime, watchHistory, baseUrl, isValidConnection, updateAnimeStatus, removeAnime } = useUser();
    const [query, setQuery] = useState('');
    const [focused, setFocused] = useState(false);
    const [activeTab, setActiveTab] = useState<FilterTab>('all');

    // Status picker modal state
    const [showStatusPicker, setShowStatusPicker] = useState(false);
    const [selectedAnime, setSelectedAnime] = useState<SavedAnime | null>(null);

    // Get continue watching list from watch history (last 10 with metadata)
    const continueWatchingList = useMemo(() => {
        const historyItems = Object.values(watchHistory)
            .filter(h => h.title && h.poster) // Only items with metadata
            .sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0))
            .slice(0, 10);

        return historyItems.map(h => ({
            ...h,
            continueEpisode: getContinueEpisode(h),
        }));
    }, [watchHistory]);

    // Filter anime by tab and search query
    const filteredAnime = useMemo(() => {
        // Continue watching tab shows history, not saved anime
        if (activeTab === 'continue') {
            if (query.trim()) {
                return continueWatchingList.filter(item =>
                    item.title?.toLowerCase().includes(query.toLowerCase())
                );
            }
            return continueWatchingList;
        }

        let filtered = savedAnime;

        // Filter by tab
        if (activeTab !== 'all') {
            filtered = filtered.filter(anime => anime.status === activeTab);
        }

        // Filter by search query
        if (query.trim()) {
            filtered = filtered.filter(anime =>
                anime.title.toLowerCase().includes(query.toLowerCase())
            );
        }

        // Sort by savedAt (most recent first)
        return filtered.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    }, [savedAnime, activeTab, query, continueWatchingList]);

    // Count anime per status for tab badges
    const statusCounts = useMemo(() => {
        const counts: Record<FilterTab, number> = {
            all: savedAnime.length,
            continue: continueWatchingList.length,
            watching: 0,
            watch_later: 0,
            completed: 0,
            dropped: 0,
        };
        savedAnime.forEach(anime => {
            if (anime.status) {
                counts[anime.status]++;
            }
        });
        return counts;
    }, [savedAnime, continueWatchingList]);

    if (!baseUrl || !isValidConnection) {
        return <SetupRequired reason={!baseUrl ? 'missing_config' : 'connection_failed'} currentUrl={baseUrl} />;
    }

    const handleAnimePress = (anime: SavedAnime) => {
        Keyboard.dismiss();
        router.push(`/anime/${anime.id}`);
    };

    const handleContinueWatchingPress = (item: AnimeHistory & { continueEpisode: ReturnType<typeof getContinueEpisode> }) => {
        Keyboard.dismiss();
        if (item.continueEpisode) {
            // Navigate directly to player
            router.push({
                pathname: '/watch/[id]',
                params: {
                    id: item.continueEpisode.episodeId,
                    animeId: item.animeId
                }
            });
        } else {
            // Fallback to anime detail page
            router.push(`/anime/${item.animeId}`);
        }
    };

    const handleAnimeLongPress = (anime: SavedAnime) => {
        setSelectedAnime(anime);
        setShowStatusPicker(true);
    };

    const handleStatusSelect = async (status: WatchStatus) => {
        if (selectedAnime) {
            await updateAnimeStatus(selectedAnime.id, status);
            setShowStatusPicker(false);
            setSelectedAnime(null);
        }
    };

    const handleRemoveAnime = async () => {
        if (selectedAnime) {
            await removeAnime(selectedAnime.id);
            setShowStatusPicker(false);
            setSelectedAnime(null);
        }
    };

    const renderSavedItem = ({ item }: { item: SavedAnime }) => {
        const statusInfo = getStatusInfo(item.status);
        return (
            <Pressable
                style={({ pressed }) => [styles.animeCard, pressed && styles.pressed]}
                onPress={() => handleAnimePress(item)}
                onLongPress={() => handleAnimeLongPress(item)}
                delayLongPress={400}
            >
                <Image
                    source={{ uri: item.poster }}
                    style={styles.poster}
                    resizeMode="cover"
                />
                {/* Status indicator */}
                <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
                    <Ionicons name={statusInfo.icon} size={10} color="#FFF" />
                </View>
                <View style={styles.cardContent}>
                    <Text style={styles.title} numberOfLines={2}>
                        {item.title}
                    </Text>
                    <View style={styles.metaRow}>
                        {item.type && <Text style={styles.metaText}>{item.type}</Text>}
                    </View>
                </View>
            </Pressable>
        );
    };

    const renderContinueWatchingItem = ({ item }: { item: AnimeHistory & { continueEpisode: ReturnType<typeof getContinueEpisode> } }) => {
        return (
            <Pressable
                style={({ pressed }) => [styles.animeCard, pressed && styles.pressed]}
                onPress={() => handleContinueWatchingPress(item)}
            >
                <Image
                    source={{ uri: item.poster }}
                    style={styles.poster}
                    resizeMode="cover"
                />
                {/* Play indicator */}
                <View style={[styles.statusBadge, { backgroundColor: colors.primary }]}>
                    <Ionicons name="play" size={10} color="#FFF" />
                </View>
                <View style={styles.cardContent}>
                    <Text style={styles.title} numberOfLines={2}>
                        {item.title}
                    </Text>
                    <View style={styles.metaRow}>
                        <Text style={styles.continueText}>
                            {item.continueEpisode?.isResume
                                ? `Resume Ep ${item.continueEpisode.episodeNumber}`
                                : `Continue Ep ${item.continueEpisode?.episodeNumber || '?'}`
                            }
                        </Text>
                    </View>
                </View>
            </Pressable>
        );
    };

    const getEmptyMessage = () => {
        if (query.trim()) {
            return { title: 'No matches found', subtitle: 'Try a different search term' };
        }
        switch (activeTab) {
            case 'continue':
                return { title: 'Nothing to continue', subtitle: 'Start watching anime and your history will appear here' };
            case 'watching':
                return { title: 'Nothing here yet', subtitle: 'Anime you are currently watching will appear here' };
            case 'watch_later':
                return { title: 'Nothing here yet', subtitle: 'Anime you plan to watch will appear here' };
            case 'completed':
                return { title: 'Nothing here yet', subtitle: 'Anime you have finished will appear here' };
            case 'dropped':
                return { title: 'Nothing here yet', subtitle: 'Anime you stopped watching will appear here' };
            default:
                return { title: 'No saved anime', subtitle: 'Your saved anime list is empty. Add shows to watch them later!' };
        }
    };

    const emptyMessage = getEmptyMessage();

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Library</Text>

                {/* Search */}
                <View style={[styles.searchBox, focused && styles.searchBoxFocused]}>
                    <Ionicons name="search" size={20} color={colors.textTertiary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search library..."
                        placeholderTextColor={colors.textTertiary}
                        value={query}
                        onChangeText={setQuery}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        autoCorrect={false}
                    />
                    {query.length > 0 && (
                        <Pressable onPress={() => setQuery('')}>
                            <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                        </Pressable>
                    )}
                </View>

                {/* Tabs */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.tabsContainer}
                    contentContainerStyle={styles.tabsContent}
                >
                    {TABS.map(tab => {
                        const isActive = activeTab === tab.key;
                        const count = statusCounts[tab.key];
                        return (
                            <Pressable
                                key={tab.key}
                                style={[styles.tab, isActive && styles.tabActive]}
                                onPress={() => setActiveTab(tab.key)}
                            >
                                <Ionicons
                                    name={tab.icon}
                                    size={16}
                                    color={isActive ? colors.text : colors.textSecondary}
                                />
                                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                                    {tab.label}
                                </Text>
                                {count > 0 && (
                                    <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                                        <Text style={[styles.countText, isActive && styles.countTextActive]}>
                                            {count}
                                        </Text>
                                    </View>
                                )}
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </View>

            {filteredAnime.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons
                        name={activeTab === 'continue' ? 'play-circle-outline' : activeTab === 'all' ? 'heart-outline' : 'albums-outline'}
                        size={64}
                        color={colors.textTertiary}
                    />
                    <Text style={styles.emptyTitle}>{emptyMessage.title}</Text>
                    <Text style={styles.emptySubtitle}>{emptyMessage.subtitle}</Text>
                </View>
            ) : activeTab === 'continue' ? (
                <FlatList
                    data={filteredAnime as any}
                    renderItem={renderContinueWatchingItem}
                    keyExtractor={item => (item as any).animeId}
                    contentContainerStyle={[
                        styles.listContent,
                        { paddingBottom: insets.bottom + 100 }
                    ]}
                    numColumns={3}
                    columnWrapperStyle={styles.columnWrapper}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <FlatList
                    data={filteredAnime as SavedAnime[]}
                    renderItem={renderSavedItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={[
                        styles.listContent,
                        { paddingBottom: insets.bottom + 100 }
                    ]}
                    numColumns={3}
                    columnWrapperStyle={styles.columnWrapper}
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Status Picker Modal for updating status */}
            <StatusPickerModal
                visible={showStatusPicker}
                onClose={() => {
                    setShowStatusPicker(false);
                    setSelectedAnime(null);
                }}
                onSelect={handleStatusSelect}
                onRemove={handleRemoveAnime}
                currentStatus={selectedAnime?.status}
                animeName={selectedAnime?.title}
                showRemove={true}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.sm,
    },
    headerTitle: {
        color: colors.text,
        fontSize: typography.fontSize.xxxl,
        fontWeight: '800',
        marginBottom: spacing.md,
        marginTop: spacing.md,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundSecondary,
        borderRadius: borderRadius.xl,
        paddingHorizontal: spacing.lg,
        height: 50,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    searchBoxFocused: {
        borderColor: colors.primary,
        backgroundColor: colors.backgroundTertiary,
    },
    searchInput: {
        flex: 1,
        color: colors.text,
        fontSize: typography.fontSize.md,
        marginLeft: spacing.sm,
    },
    tabsContainer: {
        marginTop: spacing.md,
        maxHeight: 44,
    },
    tabsContent: {
        gap: spacing.sm,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: borderRadius.full,
        gap: spacing.xs,
    },
    tabActive: {
        backgroundColor: colors.primary,
    },
    tabText: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
    },
    tabTextActive: {
        color: colors.text,
    },
    countBadge: {
        backgroundColor: colors.backgroundTertiary,
        borderRadius: borderRadius.full,
        paddingHorizontal: 6,
        paddingVertical: 2,
        minWidth: 20,
        alignItems: 'center',
    },
    countBadgeActive: {
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    countText: {
        color: colors.textSecondary,
        fontSize: 10,
        fontWeight: '700',
    },
    countTextActive: {
        color: colors.text,
    },
    listContent: {
        padding: spacing.lg,
    },
    columnWrapper: {
        gap: spacing.md,
        justifyContent: 'flex-start',
    },
    animeCard: {
        width: '31%',
        marginBottom: spacing.lg,
        position: 'relative',
    },
    pressed: {
        opacity: 0.7,
    },
    poster: {
        width: '100%',
        aspectRatio: 2 / 3,
        borderRadius: borderRadius.md,
        backgroundColor: colors.backgroundTertiary,
        marginBottom: spacing.sm,
    },
    statusBadge: {
        position: 'absolute',
        top: spacing.xs,
        right: spacing.xs,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardContent: {
        flex: 1,
    },
    title: {
        color: colors.text,
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        lineHeight: 18,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    metaText: {
        color: colors.textTertiary,
        fontSize: 10,
        fontWeight: '500',
    },
    continueText: {
        color: colors.primary,
        fontSize: 10,
        fontWeight: '600',
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
        marginTop: -50,
    },
    emptyTitle: {
        color: colors.text,
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        marginTop: spacing.lg,
        marginBottom: spacing.sm,
    },
    emptySubtitle: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.md,
        textAlign: 'center',
        lineHeight: 22,
        maxWidth: 250,
    },
});
