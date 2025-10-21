import { useQuery } from '@tanstack/react-query';

interface PermissionCheck {
  resourceType: 'document' | 'project' | 'task' | 'note';
  resourceId: string;
  permission: string;
}

interface PermissionResult {
  resourceId: string;
  allowed: boolean;
}

interface UseResourcePermissionsOptions {
  resourceType: 'document' | 'project' | 'task' | 'note';
  resourceId: string;
  permissions: string[];
  enabled?: boolean;
}

export function useResourcePermissions({
  resourceType,
  resourceId,
  permissions,
  enabled = true,
}: UseResourcePermissionsOptions) {
  const checks: PermissionCheck[] = permissions.map(permission => ({
    resourceType,
    resourceId,
    permission,
  }));

  const { data, isLoading, error } = useQuery({
    queryKey: ['permissions', resourceType, resourceId, permissions],
    queryFn: async (): Promise<Record<string, boolean>> => {
      const response = await fetch('/api/permissions/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ checks }),
      });

      if (!response.ok) {
        throw new Error('Failed to check permissions');
      }

      const result: { results: PermissionResult[] } = await response.json();
      
      // Convert array to object for easier access
      const permissionsMap: Record<string, boolean> = {};
      result.results.forEach(({ resourceId: id, allowed }, index) => {
        if (id === resourceId && index < permissions.length) {
          permissionsMap[permissions[index]] = allowed;
        }
      });

      return permissionsMap;
    },
    enabled: enabled && permissions.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Create individual permission booleans
  const permissionResults: Record<string, boolean> = {};
  permissions.forEach(permission => {
    permissionResults[permission] = data?.[permission] || false;
  });

  return {
    ...permissionResults,
    isLoading,
    error,
    hasAnyPermission: Object.values(permissionResults).some(Boolean),
    hasAllPermissions: Object.values(permissionResults).every(Boolean),
  } as typeof permissionResults & {
    isLoading: boolean;
    error: Error | null;
    hasAnyPermission: boolean;
    hasAllPermissions: boolean;
  };
}

// Convenience hooks for specific resource types
export function useDocumentPermissions(documentId: string, permissions: string[] = ['can_read', 'can_write', 'can_delete', 'can_share']) {
  const result = useResourcePermissions({
    resourceType: 'document',
    resourceId: documentId,
    permissions,
  });
  
  return {
    canRead: result.can_read || false,
    canWrite: result.can_write || false,
    canDelete: result.can_delete || false,
    canShare: result.can_share || false,
    isLoading: result.isLoading,
    error: result.error,
    hasAnyPermission: result.hasAnyPermission,
    hasAllPermissions: result.hasAllPermissions,
  };
}

export function useProjectPermissions(projectId: string, permissions: string[] = ['can_read', 'can_write', 'can_delete', 'can_manage_members']) {
  const result = useResourcePermissions({
    resourceType: 'project',
    resourceId: projectId,
    permissions,
  });
  
  return {
    canRead: result.can_read || false,
    canWrite: result.can_write || false,
    canDelete: result.can_delete || false,
    canManageMembers: result.can_manage_members || false,
    isLoading: result.isLoading,
    error: result.error,
    hasAnyPermission: result.hasAnyPermission,
    hasAllPermissions: result.hasAllPermissions,
  };
}

export function useTaskPermissions(taskId: string, permissions: string[] = ['can_read', 'can_write', 'can_delete']) {
  const result = useResourcePermissions({
    resourceType: 'task',
    resourceId: taskId,
    permissions,
  });
  
  return {
    canRead: result.can_read || false,
    canWrite: result.can_write || false,
    canDelete: result.can_delete || false,
    isLoading: result.isLoading,
    error: result.error,
    hasAnyPermission: result.hasAnyPermission,
    hasAllPermissions: result.hasAllPermissions,
  };
}

export function useNotePermissions(noteId: string, permissions: string[] = ['can_read', 'can_write', 'can_delete']) {
  const result = useResourcePermissions({
    resourceType: 'note',
    resourceId: noteId,
    permissions,
  });
  
  return {
    canRead: result.can_read || false,
    canWrite: result.can_write || false,
    canDelete: result.can_delete || false,
    isLoading: result.isLoading,
    error: result.error,
    hasAnyPermission: result.hasAnyPermission,
    hasAllPermissions: result.hasAllPermissions,
  };
}
