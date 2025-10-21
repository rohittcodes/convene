import { toastHelpers } from '@/lib/toast-helpers';

interface PermissionToastOptions {
  resourceType: 'document' | 'project' | 'task' | 'note';
  resourceName?: string;
  userEmail?: string;
  permission?: string;
}

export function usePermissionToast() {
  const showPermissionGranted = ({ resourceType, resourceName, userEmail }: PermissionToastOptions) => {
    const resource = resourceName || resourceType;
    const message = userEmail 
      ? `Access granted to ${userEmail} for ${resource}`
      : `You now have access to ${resource}`;
    
    toastHelpers.success(message);
  };

  const showPermissionRevoked = ({ resourceType, resourceName, userEmail }: PermissionToastOptions) => {
    const resource = resourceName || resourceType;
    const message = userEmail 
      ? `Access revoked for ${userEmail} from ${resource}`
      : `Access revoked from ${resource}`;
    
    toastHelpers.success(message);
  };

  const showPermissionDenied = ({ resourceType, resourceName, permission }: PermissionToastOptions) => {
    const resource = resourceName || resourceType;
    const perm = permission || 'access';
    const message = `You don't have ${perm} permission for ${resource}`;
    
    toastHelpers.error(message);
  };

  const showPermissionError = ({ resourceType, resourceName, action = 'update permissions' }: PermissionToastOptions & { action?: string }) => {
    const resource = resourceName || resourceType;
    const message = `Failed to ${action} for ${resource}`;
    
    toastHelpers.error(message);
  };

  const showRoleChanged = ({ resourceType, resourceName, userEmail, permission }: PermissionToastOptions) => {
    const resource = resourceName || resourceType;
    const message = `${userEmail}'s role changed to ${permission} for ${resource}`;
    
    toastHelpers.success(message);
  };

  const showMemberAdded = ({ resourceType, resourceName, userEmail }: PermissionToastOptions) => {
    const resource = resourceName || resourceType;
    const message = `${userEmail} added as member to ${resource}`;
    
    toastHelpers.success(message);
  };

  const showMemberRemoved = ({ resourceType, resourceName, userEmail }: PermissionToastOptions) => {
    const resource = resourceName || resourceType;
    const message = `${userEmail} removed from ${resource}`;
    
    toastHelpers.success(message);
  };

  return {
    showPermissionGranted,
    showPermissionRevoked,
    showPermissionDenied,
    showPermissionError,
    showRoleChanged,
    showMemberAdded,
    showMemberRemoved,
  };
}
