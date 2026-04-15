import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { borderRadius, colors, shadows, spacing, typography } from '../theme';
import { WatchStatus } from '../types';

interface StatusOption {
    status: WatchStatus;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
}

const STATUS_OPTIONS: StatusOption[] = [
    { status: 'watching', label: 'Watching', icon: 'eye', color: colors.primary },
    { status: 'watch_later', label: 'Watch Later', icon: 'bookmark', color: colors.warning },
    { status: 'completed', label: 'Completed', icon: 'checkmark-circle', color: colors.success },
    { status: 'dropped', label: 'Dropped', icon: 'close-circle', color: colors.error },
];

interface StatusPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (status: WatchStatus) => void;
    onRemove?: () => void;
    currentStatus?: WatchStatus | null;
    animeName?: string;
    showRemove?: boolean;
}

export const StatusPickerModal: React.FC<StatusPickerModalProps> = ({
    visible,
    onClose,
    onSelect,
    onRemove,
    currentStatus,
    animeName,
    showRemove = false,
}) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Pressable style={styles.overlay} onPress={onClose}>
                <View style={styles.container}>
                    <Pressable style={styles.content} onPress={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.title}>
                                {currentStatus ? 'Update Status' : 'Add to List'}
                            </Text>
                            {animeName && (
                                <Text style={styles.animeName} numberOfLines={1}>
                                    {animeName}
                                </Text>
                            )}
                        </View>

                        {/* Status Options */}
                        <View style={styles.optionsList}>
                            {STATUS_OPTIONS.map((option) => {
                                const isSelected = currentStatus === option.status;
                                return (
                                    <Pressable
                                        key={option.status}
                                        style={[
                                            styles.optionButton,
                                            isSelected && styles.optionButtonSelected,
                                            { borderColor: isSelected ? option.color : colors.border }
                                        ]}
                                        onPress={() => onSelect(option.status)}
                                    >
                                        <Ionicons
                                            name={option.icon}
                                            size={24}
                                            color={isSelected ? option.color : colors.textSecondary}
                                        />
                                        <Text
                                            style={[
                                                styles.optionLabel,
                                                isSelected && { color: option.color }
                                            ]}
                                        >
                                            {option.label}
                                        </Text>
                                        {isSelected && (
                                            <Ionicons
                                                name="checkmark"
                                                size={20}
                                                color={option.color}
                                                style={styles.checkmark}
                                            />
                                        )}
                                    </Pressable>
                                );
                            })}
                        </View>

                        {/* Remove Button */}
                        {showRemove && onRemove && (
                            <Pressable style={styles.removeButton} onPress={onRemove}>
                                <Ionicons name="trash-outline" size={20} color={colors.error} />
                                <Text style={styles.removeText}>Remove from List</Text>
                            </Pressable>
                        )}

                        {/* Cancel Button */}
                        <Pressable style={styles.cancelButton} onPress={onClose}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </Pressable>
                    </Pressable>
                </View>
            </Pressable>
        </Modal>
    );
};

// Helper function to get status display info
export const getStatusInfo = (status: WatchStatus): StatusOption => {
    return STATUS_OPTIONS.find(opt => opt.status === status) || STATUS_OPTIONS[1];
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '85%',
        maxWidth: 340,
    },
    content: {
        backgroundColor: colors.card,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        ...shadows.lg,
    },
    header: {
        marginBottom: spacing.lg,
        alignItems: 'center',
    },
    title: {
        color: colors.text,
        fontSize: typography.fontSize.xl,
        fontWeight: '700',
    },
    animeName: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.sm,
        marginTop: spacing.xs,
        textAlign: 'center',
    },
    optionsList: {
        gap: spacing.sm,
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.backgroundSecondary,
        borderRadius: borderRadius.lg,
        borderWidth: 2,
        borderColor: colors.border,
    },
    optionButtonSelected: {
        backgroundColor: colors.backgroundTertiary,
    },
    optionLabel: {
        color: colors.text,
        fontSize: typography.fontSize.md,
        fontWeight: '600',
        marginLeft: spacing.md,
        flex: 1,
    },
    checkmark: {
        marginLeft: spacing.sm,
    },
    removeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        marginTop: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    removeText: {
        color: colors.error,
        fontSize: typography.fontSize.md,
        fontWeight: '600',
        marginLeft: spacing.sm,
    },
    cancelButton: {
        alignItems: 'center',
        paddingVertical: spacing.md,
        marginTop: spacing.sm,
    },
    cancelText: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.md,
        fontWeight: '600',
    },
});
