import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export interface WidgetPreference {
    id?: number;
    sensorType: string;
    visible: boolean;
    order: number;
}

export function useWidgetPreferences() {
    const queryClient = useQueryClient();

    // Fetch preferences
    const { data: preferences = [], isLoading } = useQuery<WidgetPreference[]>({
        queryKey: ['/api/widgets/preferences']
    });

    // Save preferences mutation
    const saveMutation = useMutation({
        mutationFn: async (prefs: Omit<WidgetPreference, 'id'>[]) => {
            await apiRequest('POST', '/api/widgets/preferences', prefs);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/widgets/preferences'] });
        }
    });

    // Reset preferences mutation
    const resetMutation = useMutation({
        mutationFn: async () => {
            await apiRequest('DELETE', '/api/widgets/preferences');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/widgets/preferences'] });
        }
    });

    return {
        preferences,
        isLoading,
        savePreferences: saveMutation.mutateAsync,
        resetPreferences: resetMutation.mutateAsync,
        isSaving: saveMutation.isPending,
        isResetting: resetMutation.isPending,
    };
}
