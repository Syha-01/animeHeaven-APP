import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import { apiClient } from '../../api/client';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { SetupRequired } from '../../components/SetupRequired';
import { APP_CONFIG } from '../../config';
import { useUser } from '../../context/UserContext';
import { borderRadius, colors, spacing, typography } from '../../theme';
import type { Suggestion } from '../../types';

const AZ_LETTERS = ['#', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];

export default function SearchScreen() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { baseUrl, isValidConnection} = useUser();
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [loading, setLoading] = useState(false);
    const [genres, setGenres] = useState<string[]>([]);
    const [focused, setFocused] = useState(false);

    const client = apiClient;

    // Fetch genres on mount
    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const meta = await client.getMeta();
                setGenres(meta.genres || []);
            } catch (err) {
                console.error('Failed to fetch meta:', err);
            }
        };
        fetchMeta();
    }, [client]);

    // Debounced search suggestions
    useEffect(() => {
        if (query.length < 2) {
            setSuggestions([]);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                setLoading(true);
                const results = await client.getSuggestions(query);
                setSuggestions(results);
            } catch (err) {
                console.error('Failed to fetch suggestions:', err);
            } finally {
                setLoading(false);
            }
        }, APP_CONFIG.searchDebounceMs);

        return () => clearTimeout(timer);
    }, [query, client]);

    const handleSearch = () => {
        if (query.trim()) {
            Keyboard.dismiss();
            router.push(`/results?keyword=${encodeURIComponent(query.trim())}`);
        }
    };

    const handleSuggestionPress = (suggestion: Suggestion) => {
        Keyboard.dismiss();
        router.push(`/anime/${suggestion.id}`);
    };

    const handleGenrePress = (genre: string) => {
        router.push(`/genre/${genre.toLowerCase()}`);
    };

    const handleLetterPress = (letter: string) => {
        const param = letter === '#' ? '0-9' : letter.toLowerCase();
        router.push(`/results?letter=${param}`);
    };

    const handleFilterPress = () => {
        router.push('/results?filter=true');
    };

    const renderSuggestion = ({ item }: { item: Suggestion }) => (
        <Pressable
            style={({ pressed }) => [styles.suggestionItem, pressed && styles.pressed]}
            onPress={() => handleSuggestionPress(item)}
        >
            <Image
                source={{ uri: item.poster }}
                style={styles.suggestionImage}
                resizeMode="cover"
            />
            <View style={styles.suggestionContent}>
                <Text style={styles.suggestionTitle} numberOfLines={1}>
                    {item.title}
                </Text>
                <Text style={styles.suggestionMeta} numberOfLines={1}>
                    {item.type} {item.aired && `• ${item.aired}`}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        </Pressable>
    );

    if (!baseUrl || !isValidConnection) {
        return <SetupRequired reason={!baseUrl ? 'missing_config' : 'connection_failed'} currentUrl={baseUrl} />;
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Search Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Search</Text>

                {/* Search Input */}
                <View style={styles.searchContainer}>
                    <View style={[styles.searchBox, focused && styles.searchBoxFocused]}>
                        <Ionicons name="search" size={20} color={colors.textTertiary} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search anime..."
                            placeholderTextColor={colors.textTertiary}
                            value={query}
                            onChangeText={setQuery}
                            onFocus={() => setFocused(true)}
                            onBlur={() => setFocused(false)}
                            onSubmitEditing={handleSearch}
                            returnKeyType="search"
                            autoCorrect={false}
                            autoCapitalize="none"
                        />
                        {query.length > 0 && (
                            <Pressable onPress={() => setQuery('')}>
                                <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                            </Pressable>
                        )}
                    </View>

                    <Pressable style={styles.filterButton} onPress={handleFilterPress}>
                        <Ionicons name="options-outline" size={24} color={colors.text} />
                    </Pressable>
                </View>


            </View>

            {/* Suggestions Dropdown */}
            {query.length >= 2 && (suggestions.length > 0 || loading) && (
                <View style={styles.suggestionsContainer}>
                    {loading ? (
                        <LoadingSpinner size="small" />
                    ) : (
                        <FlatList
                            data={suggestions}
                            renderItem={renderSuggestion}
                            keyExtractor={(item) => item.id}
                            keyboardShouldPersistTaps="handled"
                        />
                    )}
                </View>
            )}

            {/* Browse Content */}
            {query.length < 2 && (
                <ScrollView
                    style={styles.browseContent}
                    contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* A-Z Quick Access */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Browse A-Z</Text>
                        <View style={styles.letterGrid}>
                            {AZ_LETTERS.map((letter) => (
                                <Pressable
                                    key={letter}
                                    style={({ pressed }) => [
                                        styles.letterButton,
                                        pressed && styles.letterButtonPressed,
                                    ]}
                                    onPress={() => handleLetterPress(letter)}
                                >
                                    <Text style={styles.letterText}>{letter}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    {/* Genres */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Genres</Text>
                        <View style={styles.genreGrid}>
                            {genres.slice(0, 20).map((genre) => (
                                <Pressable
                                    key={genre}
                                    style={({ pressed }) => [
                                        styles.genreChip,
                                        pressed && styles.genreChipPressed,
                                    ]}
                                    onPress={() => handleGenrePress(genre)}
                                >
                                    <Text style={styles.genreText}>{genre}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    {/* Quick Links */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Quick Browse</Text>
                        <View style={styles.quickLinks}>
                            {[
                                { label: 'Top Airing', route: 'top-airing', icon: 'tv-outline' },
                                { label: 'Most Popular', route: 'most-popular', icon: 'star-outline' },
                                { label: 'Most Favorite', route: 'most-favorite', icon: 'heart-outline' },
                                { label: 'Completed', route: 'completed', icon: 'checkmark-circle-outline' },
                                { label: 'Recently Added', route: 'recently-added', icon: 'add-circle-outline' },
                                { label: 'Upcoming', route: 'top-upcoming', icon: 'calendar-outline' },
                            ].map((item) => (
                                <Pressable
                                    key={item.route}
                                    style={({ pressed }) => [
                                        styles.quickLinkCard,
                                        pressed && styles.pressed,
                                    ]}
                                    onPress={() => router.push(`/results?query=${item.route}`)}
                                >
                                    <Ionicons name={item.icon as any} size={24} color={colors.primary} style={styles.quickLinkIcon} />
                                    <Text style={styles.quickLinkLabel}>{item.label}</Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
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
    header: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
    },
    headerTitle: {
        color: colors.text,
        fontSize: typography.fontSize.xxxl,
        fontWeight: '800',
        marginBottom: spacing.lg,
        marginTop: spacing.md,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchBox: {
        flex: 1,
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
        marginRight: spacing.sm,
    },
    filterButton: {
        width: 50,
        height: 50,
        borderRadius: borderRadius.xl,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: spacing.sm,
    },
    suggestionsContainer: {
        backgroundColor: colors.backgroundSecondary,
        marginHorizontal: spacing.lg,
        borderRadius: borderRadius.lg,
        flex: 1,
        marginTop: spacing.sm,
        marginBottom: spacing.lg,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    suggestionImage: {
        width: 50,
        height: 70,
        borderRadius: borderRadius.sm,
        backgroundColor: colors.backgroundTertiary,
    },
    suggestionContent: {
        flex: 1,
        marginLeft: spacing.md,
    },
    suggestionTitle: {
        color: colors.text,
        fontSize: typography.fontSize.md,
        fontWeight: '600',
    },
    suggestionMeta: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.sm,
        marginTop: 2,
    },
    pressed: {
        opacity: 0.7,
    },
    browseContent: {
        flex: 1,
    },
    section: {
        padding: spacing.lg,
    },
    sectionTitle: {
        color: colors.text,
        fontSize: typography.fontSize.lg,
        fontWeight: '700',
        marginBottom: spacing.md,
    },
    letterGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    letterButton: {
        width: 40,
        height: 40,
        borderRadius: borderRadius.md,
        backgroundColor: colors.backgroundSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        margin: 4,
    },
    letterButtonPressed: {
        backgroundColor: colors.primary,
    },
    letterText: {
        color: colors.text,
        fontSize: typography.fontSize.md,
        fontWeight: '600',
    },
    genreGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    genreChip: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.full,
        backgroundColor: colors.backgroundSecondary,
        marginRight: spacing.sm,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    genreChipPressed: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    genreText: {
        color: colors.text,
        fontSize: typography.fontSize.sm,
        fontWeight: '500',
        textTransform: 'capitalize',
    },
    quickLinks: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -spacing.xs,
    },
    quickLinkCard: {
        width: '48%',
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        padding: spacing.lg,
        margin: '1%',
        flexDirection: 'row',
        alignItems: 'center',
    },
    quickLinkIcon: {
        fontSize: 24,
        marginRight: spacing.md,
    },
    quickLinkLabel: {
        color: colors.text,
        fontSize: typography.fontSize.md,
        fontWeight: '600',
    },
    providerToggleContainer: {
        flexDirection: 'row',
        backgroundColor: colors.backgroundSecondary,
        borderRadius: borderRadius.lg,
        padding: 4,
        marginTop: spacing.md,
    },
    providerTab: {
        flex: 1,
        paddingVertical: spacing.sm,
        alignItems: 'center',
        borderRadius: borderRadius.md,
    },
    providerTabActive: {
        backgroundColor: colors.primary,
    },
    providerTabText: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.sm,
        fontWeight: '600',
    },
    providerTabTextActive: {
        color: '#FFFFFF',
    },
});
