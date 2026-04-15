import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

interface LoadingSpinnerProps {
    size?: 'small' | 'large';
    color?: string;
    fullScreen?: boolean;
}

export function LoadingSpinner({
    size = 'large',
    color = colors.primary,
    fullScreen = false
}: LoadingSpinnerProps) {
    if (fullScreen) {
        return (
            <View style={styles.fullScreen}>
                <ActivityIndicator size={size} color={color} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ActivityIndicator size={size} color={color} />
        </View>
    );
}

// Skeleton loading component
interface SkeletonProps {
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: object;
}

export function Skeleton({
    width = '100%',
    height = 20,
    borderRadius = 8,
    style
}: SkeletonProps) {
    return (
        <View
            style={[
                styles.skeleton,
                { width, height, borderRadius },
                style
            ]}
        />
    );
}

// Card skeleton for anime cards
export function AnimeCardSkeleton() {
    return (
        <View style={styles.cardSkeleton}>
            <Skeleton width={140} height={200} borderRadius={12} />
            <Skeleton width={120} height={14} style={{ marginTop: 8 }} />
            <Skeleton width={80} height={12} style={{ marginTop: 4 }} />
        </View>
    );
}

// Spotlight skeleton
export function SpotlightSkeleton() {
    return (
        <View style={styles.spotlightSkeleton}>
            <Skeleton width="100%" height={450} borderRadius={0} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    fullScreen: {
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    skeleton: {
        backgroundColor: colors.backgroundTertiary,
        overflow: 'hidden',
    },
    cardSkeleton: {
        marginRight: 12,
    },
    spotlightSkeleton: {
        width: '100%',
    },
});

export default LoadingSpinner;
