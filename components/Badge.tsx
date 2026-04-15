import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { borderRadius, colors, spacing } from '../theme';

type BadgeVariant = 'sub' | 'dub' | 'eps' | 'rank' | 'rating' | 'type' | 'quality' | 'filler';

interface BadgeProps {
    variant: BadgeVariant;
    value: string | number;
    size?: 'sm' | 'md' | 'lg';
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
    sub: { bg: colors.sub, text: colors.text },
    dub: { bg: colors.dub, text: colors.text },
    eps: { bg: colors.backgroundTertiary, text: colors.textSecondary },
    rank: { bg: colors.primary, text: colors.text },
    rating: { bg: colors.warning, text: '#000' },
    type: { bg: colors.backgroundTertiary, text: colors.textSecondary },
    quality: { bg: colors.accent, text: colors.text },
    filler: { bg: colors.error, text: colors.text },
};

export function Badge({ variant, value, size = 'sm' }: BadgeProps) {
    const { bg, text } = variantStyles[variant];

    return (
        <View style={[
            styles.badge,
            { backgroundColor: bg },
            size === 'md' && styles.badgeMd,
            size === 'lg' && styles.badgeLg,
        ]}>
            <Text style={[
                styles.badgeText,
                { color: text },
                size === 'md' && styles.textMd,
                size === 'lg' && styles.textLg,
            ]}>
                {variant === 'sub' && 'SUB '}
                {variant === 'dub' && 'DUB '}
                {value}
            </Text>
        </View>
    );
}

// Episode count badges
interface EpisodeBadgesProps {
    sub?: number;
    dub?: number;
    eps?: number;
    size?: 'sm' | 'md' | 'lg';
}

export function EpisodeBadges({ sub, dub, eps, size = 'sm' }: EpisodeBadgesProps) {
    return (
        <View style={styles.badgeRow}>
            {sub !== undefined && sub > 0 && (
                <Badge variant="sub" value={sub} size={size} />
            )}
            {dub !== undefined && dub > 0 && (
                <Badge variant="dub" value={dub} size={size} />
            )}
            {eps !== undefined && eps > 0 && !sub && !dub && (
                <Badge variant="eps" value={`EP ${eps}`} size={size} />
            )}
        </View>
    );
}

// Rank badge for top 10
interface RankBadgeProps {
    rank: number;
}

export function RankBadge({ rank }: RankBadgeProps) {
    return (
        <View style={styles.rankBadge}>
            <Text style={styles.rankText}>{rank}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
        marginRight: spacing.xs,
    },
    badgeMd: {
        paddingHorizontal: spacing.md,
        paddingVertical: 4,
    },
    badgeLg: {
        paddingHorizontal: spacing.lg,
        paddingVertical: 6,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    textMd: {
        fontSize: 12,
    },
    textLg: {
        fontSize: 14,
    },
    badgeRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    rankBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        width: 28,
        height: 28,
        borderRadius: borderRadius.md,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    rankText: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '800',
    },
});

export default Badge;
