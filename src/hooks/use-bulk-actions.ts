'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toastHelpers } from '@/lib/toast-helpers';

interface BulkActionData {
  action: string;
  itemIds: string[];
  data?: any;
}

// Bulk document actions
export function useBulkDocumentActions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ action, itemIds, data }: BulkActionData): Promise<void> => {
      const response = await fetch('/api/documents/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          documentIds: itemIds,
          ...data,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to execute bulk action');
      }
    },
    onSuccess: (_, { action, itemIds }) => {
      // Invalidate documents queries
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      
      // Show success message
      const count = itemIds.length;
      switch (action) {
        case 'share':
          toastHelpers.success(`Shared ${count} document${count !== 1 ? 's' : ''} successfully`);
          break;
        case 'delete':
          toastHelpers.success(`Deleted ${count} document${count !== 1 ? 's' : ''} successfully`);
          break;
        default:
          toastHelpers.success(`Bulk action completed for ${count} document${count !== 1 ? 's' : ''}`);
      }
    },
    onError: (error) => {
      toastHelpers.error(error instanceof Error ? error.message : 'Failed to execute bulk action');
    },
  });
}

// Bulk task actions
export function useBulkTaskActions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ action, itemIds, data }: BulkActionData): Promise<void> => {
      const response = await fetch('/api/tasks/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          taskIds: itemIds,
          ...data,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to execute bulk action');
      }
    },
    onSuccess: (_, { action, itemIds }) => {
      // Invalidate tasks queries
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
      // Show success message
      const count = itemIds.length;
      switch (action) {
        case 'assign':
          toastHelpers.success(`Assigned ${count} task${count !== 1 ? 's' : ''} successfully`);
          break;
        case 'delete':
          toastHelpers.success(`Deleted ${count} task${count !== 1 ? 's' : ''} successfully`);
          break;
        default:
          toastHelpers.success(`Bulk action completed for ${count} task${count !== 1 ? 's' : ''}`);
      }
    },
    onError: (error) => {
      toastHelpers.error(error instanceof Error ? error.message : 'Failed to execute bulk action');
    },
  });
}

// Combined bulk actions hook
export function useBulkActions() {
  const bulkDocumentActions = useBulkDocumentActions();
  const bulkTaskActions = useBulkTaskActions();

  const executeBulkAction = async (action: string, itemIds: string[], data?: any, itemType?: 'document' | 'task') => {
    // If itemType is specified, use the appropriate hook
    if (itemType === 'document') {
      return bulkDocumentActions.mutateAsync({ action, itemIds, data });
    } else if (itemType === 'task') {
      return bulkTaskActions.mutateAsync({ action, itemIds, data });
    }

    // Otherwise, try to determine from the action or execute on both
    if (['share'].includes(action)) {
      return bulkDocumentActions.mutateAsync({ action, itemIds, data });
    } else if (['assign'].includes(action)) {
      return bulkTaskActions.mutateAsync({ action, itemIds, data });
    } else if (['delete'].includes(action)) {
      // For delete, we need to know the type - this is a limitation
      throw new Error('Item type must be specified for delete operations');
    }

    throw new Error(`Unknown bulk action: ${action}`);
  };

  return {
    executeBulkAction,
    isExecuting: bulkDocumentActions.isPending || bulkTaskActions.isPending,
    error: bulkDocumentActions.error || bulkTaskActions.error,
  };
}

