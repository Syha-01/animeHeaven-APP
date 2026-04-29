import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    FlatList,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { borderRadius, colors, spacing, typography } from '../../theme';
import {
    deleteAnimeFolder,
    deleteEpisode,
    DownloadedAnime,
    DownloadedEpisode,
    formatFileSize,
    getDownloadedAnime,
    refreshAnimeFolder,
} from '../../utils/downloadStorage';

let Sharing: any = null;
if (Platform.OS !== 'web') {
    try {
        Sharing = require('expo-sharing');
    } catch {
        // Not available
    }
}

export default function DownloadsScreen() {
    const insets = useSafeAreaInsets();
    const [downloadedAnime, setDownloadedAnime] = useState<DownloadedAnime[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedAnime, setSelectedAnime] = useState<DownloadedAnime | null>(null);
    const [viewMode, setViewMode] = useState<'folders' | 'episodes'>('folders');

    const loadDownloads = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getDownloadedAnime();
            setDownloadedAnime(data || []);
        } catch (error) {
            console.error('Failed to load downloads:', error);
            setDownloadedAnime([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Refresh only when tab gains focus AND we're on the folder view
    useFocusEffect(
        useCallback(() => {
            if (viewMode === 'folders') {
                loadDownloads();
            }
        }, [loadDownloads, viewMode])
    );

    const totalSize = downloadedAnime.reduce((sum, a) => sum + (a.totalSize || 0), 0);
    const totalEpisodes = downloadedAnime.reduce((sum, a) => sum + (a.episodes?.length || 0), 0);

    const handleDeleteAnime = (anime: DownloadedAnime) => {
        Alert.alert(
            'Delete All Episodes',
            `Delete all ${anime.episodes?.length || 0} downloaded episodes of "${anime.animeName}"?\n\nThis will free up ${formatFileSize(anime.totalSize)}.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteAnimeFolder(anime.folderUri);
                        if (selectedAnime?.folderName === anime.folderName) {
                            setSelectedAnime(null);
                            setViewMode('folders');
                        }
                        loadDownloads();
                    },
                },
            ],
        );
    };

    const handleDeleteEpisode = (episode: DownloadedEpisode) => {
        Alert.alert(
            'Delete Episode',
            `Delete Episode ${episode.episodeNumber}? (${formatFileSize(episode.fileSize)})`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteEpisode(episode.fileUri);
                        // Update selected anime in place
                        if (selectedAnime) {
                            const updated = (selectedAnime.episodes || []).filter(
                                e => e.fileUri !== episode.fileUri
                            );
                            if (updated.length === 0) {
                                setSelectedAnime(null);
                                setViewMode('folders');
                            } else {
                                setSelectedAnime({
                                    ...selectedAnime,
                                    episodes: updated,
                                    totalSize: updated.reduce((s, e) => s + (e.fileSize || 0), 0),
                                });
                            }
                        }
                        loadDownloads();
                    },
                },
            ],
        );
    };

    const handleShareEpisode = async (episode: DownloadedEpisode) => {
        try {
            if (Sharing && await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(episode.fileUri);
            } else {
                Alert.alert('Sharing Unavailable', 'Sharing is not available on this device.');
            }
        } catch (error) {
            console.error('Share failed:', error);
        }
    };

    const handleAnimePress = async (anime: DownloadedAnime) => {
        try {
            // Re-scan the folder to get fresh data before showing episodes
            const fresh = await refreshAnimeFolder(anime.folderUri, anime.folderName);
            setSelectedAnime(fresh || anime);
            setViewMode('episodes');
        } catch {
            // Fallback to existing data
            setSelectedAnime(anime);
            setViewMode('episodes');
        }
    };

    const handleBackToFolders = () => {
        setSelectedAnime(null);
        setViewMode('folders');
        loadDownloads(); // Refresh folder list
    };

    // ─── Render: Anime Folder Card ───
    const renderAnimeFolder = ({ item }: { item: DownloadedAnime }) => {
        if (!item) return null;
        const epCount = item.episodes?.length || 0;
        return (
            <Pressable
                style={({ pressed }) => [styles.folderCard, pressed && styles.pressed]}
                onPress={() => handleAnimePress(item)}
                onLongPress={() => handleDeleteAnime(item)}
                delayLongPress={500}
            >
                <View style={styles.folderIconContainer}>
                    <Ionicons name="folder" size={36} color={colors.primary} />
                    <View style={styles.folderBadge}>
                        <Text style={styles.folderBadgeText}>{epCount}</Text>
                    </View>
                </View>

                <Text style={styles.folderName} numberOfLines={2}>
                    {item.animeName || 'Unknown'}
                </Text>
                <Text style={styles.folderMeta}>
                    {epCount} {epCount === 1 ? 'episode' : 'episodes'}
                </Text>
                <Text style={styles.folderSize}>
                    {formatFileSize(item.totalSize || 0)}
                </Text>
            </Pressable>
        );
    };

    // ─── Render: Episode Row ───
    const renderEpisodeRow = ({ item }: { item: DownloadedEpisode }) => {
        if (!item) return null;
        return (
            <View style={styles.episodeRow}>
                <View style={styles.epBadge}>
                    <Text style={styles.epBadgeText}>{item.episodeNumber || 0}</Text>
                </View>

                <View style={styles.episodeInfo}>
                    <Text style={styles.episodeTitle}>Episode {item.episodeNumber || 0}</Text>
                    <Text style={styles.episodeSize}>{formatFileSize(item.fileSize || 0)}</Text>
                </View>

                <Pressable
                    style={styles.actionButton}
                    onPress={() => handleShareEpisode(item)}
                >
                    <Ionicons name="share-outline" size={20} color={colors.textSecondary} />
                </Pressable>

                <Pressable
                    style={styles.actionButton}
                    onPress={() => handleDeleteEpisode(item)}
                >
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                </Pressable>
            </View>
        );
    };

    // ─── Web fallback ───
    if (Platform.OS === 'web') {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Downloads</Text>
                </View>
                <View style={styles.emptyState}>
                    <Ionicons name="cloud-download-outline" size={64} color={colors.textTertiary} />
                    <Text style={styles.emptyTitle}>Not Available on Web</Text>
                    <Text style={styles.emptySubtitle}>
                        Downloads are only available on mobile devices.
                    </Text>
                </View>
            </View>
        );
    }

    // ─── Episodes view ───
    if (viewMode === 'episodes' && selectedAnime) {
        const episodes = selectedAnime.episodes || [];
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.header}>
                    <View style={styles.episodesHeader}>
                        <Pressable onPress={handleBackToFolders} style={styles.backButton}>
                            <Ionicons name="arrow-back" size={24} color={colors.text} />
                        </Pressable>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.headerTitle} numberOfLines={1}>
                                {selectedAnime.animeName || 'Unknown'}
                            </Text>
                            <Text style={styles.headerSubtitle}>
                                {episodes.length} episodes · {formatFileSize(selectedAnime.totalSize || 0)}
                            </Text>
                        </View>
                        <Pressable
                            onPress={() => handleDeleteAnime(selectedAnime)}
                            style={styles.deleteAllButton}
                        >
                            <Ionicons name="trash-outline" size={20} color={colors.error} />
                        </Pressable>
                    </View>
                </View>

                {episodes.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="film-outline" size={64} color={colors.textTertiary} />
                        <Text style={styles.emptyTitle}>No Episodes</Text>
                        <Text style={styles.emptySubtitle}>This folder is empty.</Text>
                    </View>
                ) : (
                    <FlatList
                        key="episode-list"
                        data={episodes}
                        renderItem={renderEpisodeRow}
                        keyExtractor={(item, index) => item?.fileUri || `ep-${index}`}
                        contentContainerStyle={[
                            styles.episodeListContent,
                            { paddingBottom: insets.bottom + 100 },
                        ]}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
        );
    }

    // ─── Folders view ───
    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Downloads</Text>
                {downloadedAnime.length > 0 && (
                    <View style={styles.statsRow}>
                        <View style={styles.statChip}>
                            <Ionicons name="folder-outline" size={14} color={colors.primary} />
                            <Text style={styles.statText}>{downloadedAnime.length} anime</Text>
                        </View>
                        <View style={styles.statChip}>
                            <Ionicons name="film-outline" size={14} color={colors.primary} />
                            <Text style={styles.statText}>{totalEpisodes} episodes</Text>
                        </View>
                        <View style={styles.statChip}>
                            <Ionicons name="server-outline" size={14} color={colors.primary} />
                            <Text style={styles.statText}>{formatFileSize(totalSize)}</Text>
                        </View>
                    </View>
                )}
            </View>

            {loading ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptySubtitle}>Scanning downloads...</Text>
                </View>
            ) : downloadedAnime.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="cloud-download-outline" size={64} color={colors.textTertiary} />
                    <Text style={styles.emptyTitle}>No Downloads</Text>
                    <Text style={styles.emptySubtitle}>
                        Downloaded episodes will appear here organized by anime. Tap the download icon on any episode to get started.
                    </Text>
                </View>
            ) : (
                <FlatList
                    key="folder-grid"
                    data={downloadedAnime}
                    renderItem={renderAnimeFolder}
                    keyExtractor={(item, index) => item?.folderName || `folder-${index}`}
                    contentContainerStyle={[
                        styles.gridContent,
                        { paddingBottom: insets.bottom + 100 },
                    ]}
                    numColumns={3}
                    columnWrapperStyle={styles.columnWrapper}
                    showsVerticalScrollIndicator={false}
                />
            )}
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
        marginTop: spacing.md,
    },
    headerSubtitle: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.sm,
        marginTop: 2,
    },
    episodesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: spacing.md,
        gap: spacing.sm,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.backgroundSecondary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteAllButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    statChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: borderRadius.full,
        paddingVertical: 4,
        paddingHorizontal: spacing.sm,
    },
    statText: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: '600',
    },
    // ─── Folder Grid ───
    gridContent: {
        padding: spacing.lg,
    },
    columnWrapper: {
        gap: spacing.md,
        justifyContent: 'flex-start',
    },
    folderCard: {
        width: '31%',
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        marginBottom: spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    pressed: {
        opacity: 0.7,
    },
    folderIconContainer: {
        position: 'relative',
        marginBottom: spacing.sm,
    },
    folderBadge: {
        position: 'absolute',
        top: -4,
        right: -8,
        backgroundColor: colors.primary,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    folderBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '800',
    },
    folderName: {
        color: colors.text,
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 2,
    },
    folderMeta: {
        color: colors.textSecondary,
        fontSize: 10,
        fontWeight: '500',
    },
    folderSize: {
        color: colors.textTertiary,
        fontSize: 10,
        marginTop: 2,
    },
    // ─── Episode List ───
    episodeListContent: {
        padding: spacing.lg,
    },
    episodeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: colors.border,
    },
    epBadge: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.md,
        backgroundColor: colors.backgroundSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    epBadgeText: {
        color: colors.text,
        fontSize: typography.fontSize.md,
        fontWeight: '700',
    },
    episodeInfo: {
        flex: 1,
    },
    episodeTitle: {
        color: colors.text,
        fontSize: typography.fontSize.md,
        fontWeight: '600',
    },
    episodeSize: {
        color: colors.textTertiary,
        fontSize: typography.fontSize.xs,
        marginTop: 2,
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: spacing.xs,
    },
    // ─── Empty State ───
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
        maxWidth: 280,
    },
});
