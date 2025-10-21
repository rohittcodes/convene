import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toastHelpers } from '@/lib/toast-helpers';

interface ShareResourceParams {
  resourceType: 'document' | 'project';
  resourceId: string;
  userEmail: string;
  permission: string;
}

interface UnshareResourceParams {
  resourceType: 'document' | 'project';
  resourceId: string;
  userEmail: string;
  relation: string;
}

export function useShareResource(resourceType: 'document' | 'project') {
  const queryClient = useQueryClient();

  const shareMutation = useMutation({
    mutationFn: async ({ resourceId, userEmail, permission }: Omit<ShareResourceParams, 'resourceType'>) => {
      const response = await fetch(`/api/${resourceType}s/${resourceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'share',
          userEmail,
          permission,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to share resource');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [resourceType + 's'] });
      queryClient.invalidateQueries({ queryKey: [resourceType + 's', variables.resourceId] });
      queryClient.invalidateQueries({ queryKey: [resourceType + 's', variables.resourceId, 'access'] });
      
      toastHelpers.resourceShared(resourceType, variables.userEmail, variables.resourceId);
    },
    onError: (error) => {
      toastHelpers.error(`Failed to share ${resourceType}`);
      console.error('Share error:', error);
    },
  });

  const unshareMutation = useMutation({
    mutationFn: async ({ resourceId, userEmail, relation }: Omit<UnshareResourceParams, 'resourceType'>) => {
      const response = await fetch(`/api/${resourceType}s/${resourceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'unshare',
          userEmail,
          relation,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to unshare resource');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: [resourceType + 's'] });
      queryClient.invalidateQueries({ queryKey: [resourceType + 's', variables.resourceId] });
      queryClient.invalidateQueries({ queryKey: [resourceType + 's', variables.resourceId, 'access'] });
      
      toastHelpers.success(`Access revoked for ${variables.userEmail}`);
    },
    onError: (error) => {
      toastHelpers.error(`Failed to revoke access`);
      console.error('Unshare error:', error);
    },
  });

  return {
    shareResource: shareMutation,
    unshareResource: unshareMutation,
    isSharing: shareMutation.isPending,
    isUnsharing: unshareMutation.isPending,
  };
}

// Convenience hooks for specific resource types
export function useShareDocumentResource() {
  return useShareResource('document');
}

export function useShareProjectResource() {
  return useShareResource('project');
}
