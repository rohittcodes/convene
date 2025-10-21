import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { 
  checkDocumentPermission, 
  checkProjectPermission, 
  checkTaskPermission, 
  checkNotePermission,
  filterDocumentsByPermission,
  filterProjectsByPermission,
  filterTasksByPermission,
  filterNotesByPermission
} from './fga';

export class FGAError extends Error {
  constructor(
    message: string,
    public statusCode: number = 403,
    public code: string = 'FGA_PERMISSION_DENIED'
  ) {
    super(message);
    this.name = 'FGAError';
  }
}

// Get user email from session
export const getUserEmail = async (request: NextRequest): Promise<string> => {
  try {
    const session = await auth0.getSession();
    if (!session?.user?.email) {
      throw new FGAError('Authentication required', 401, 'AUTH_REQUIRED');
    }
    return session.user.email;
  } catch (error) {
    console.error('Failed to get user session:', error);
    throw new FGAError('Authentication required', 401, 'AUTH_REQUIRED');
  }
};

// Generic permission checker
export const requirePermission = async (
  userEmail: string, 
  resourceType: 'document' | 'project' | 'task' | 'note',
  resourceId: string, 
  permission: string
): Promise<void> => {
  let hasPermission = false;

  switch (resourceType) {
    case 'document':
      hasPermission = await checkDocumentPermission(userEmail, resourceId, permission as any);
      break;
    case 'project':
      hasPermission = await checkProjectPermission(userEmail, resourceId, permission as any);
      break;
    case 'task':
      hasPermission = await checkTaskPermission(userEmail, resourceId, permission as any);
      break;
    case 'note':
      hasPermission = await checkNotePermission(userEmail, resourceId, permission as any);
      break;
    default:
      throw new FGAError(`Unknown resource type: ${resourceType}`, 400, 'INVALID_RESOURCE_TYPE');
  }

  if (!hasPermission) {
    throw new FGAError(`Permission denied: ${permission} on ${resourceType}:${resourceId}`, 403, 'PERMISSION_DENIED');
  }
};

// Filter resources by permission
export const filterByPermission = async <T extends { id: string }>(
  userEmail: string,
  resources: T[],
  resourceType: 'document' | 'project' | 'task' | 'note',
  permission: string
): Promise<T[]> => {
  const resourceIds = resources.map(r => r.id);
  let authorizedIds: string[] = [];

  switch (resourceType) {
    case 'document':
      authorizedIds = await filterDocumentsByPermission(userEmail, resourceIds, permission as any);
      break;
    case 'project':
      authorizedIds = await filterProjectsByPermission(userEmail, resourceIds, permission as any);
      break;
    case 'task':
      authorizedIds = await filterTasksByPermission(userEmail, resourceIds, permission as any);
      break;
    case 'note':
      authorizedIds = await filterNotesByPermission(userEmail, resourceIds, permission as any);
      break;
    default:
      throw new FGAError(`Unknown resource type: ${resourceType}`, 400, 'INVALID_RESOURCE_TYPE');
  }

  return resources.filter(resource => authorizedIds.includes(resource.id));
};

// Higher-order function to wrap API handlers with FGA checks
export const withFGACheck = <T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>,
  resourceType: 'document' | 'project' | 'task' | 'note',
  permission: string,
  resourceIdExtractor?: (request: NextRequest, ...args: T) => string
) => {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      const userEmail = await getUserEmail(request);
      
      // If resourceIdExtractor is provided, check permission on specific resource
      if (resourceIdExtractor) {
        const resourceId = resourceIdExtractor(request, ...args);
        await requirePermission(userEmail, resourceType, resourceId, permission);
      }

      // Call the original handler
      return await handler(request, ...args);
    } catch (error) {
      if (error instanceof FGAError) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.statusCode }
        );
      }
      
      console.error('FGA middleware error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
};

// Specific middleware for different resource types
export const withDocumentCheck = (permission: 'can_read' | 'can_write' | 'can_delete' | 'can_share') =>
  withFGACheck.bind(null, undefined as any, 'document', permission);

export const withProjectCheck = (permission: 'can_read' | 'can_write' | 'can_delete' | 'can_manage_members') =>
  withFGACheck.bind(null, undefined as any, 'project', permission);

export const withTaskCheck = (permission: 'can_read' | 'can_write' | 'can_delete') =>
  withFGACheck.bind(null, undefined as any, 'task', permission);

export const withNoteCheck = (permission: 'can_read' | 'can_write' | 'can_delete') =>
  withFGACheck.bind(null, undefined as any, 'note', permission);

// Helper to extract resource ID from URL params
export const extractResourceId = (request: NextRequest, paramName: string = 'id'): string => {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const idIndex = pathSegments.findIndex(segment => segment === paramName);
  
  if (idIndex === -1 || idIndex + 1 >= pathSegments.length) {
    throw new FGAError(`Resource ID not found in URL`, 400, 'MISSING_RESOURCE_ID');
  }
  
  return pathSegments[idIndex + 1];
};

// Helper to check if user can access a resource (returns boolean instead of throwing)
export const canAccess = async (
  userEmail: string,
  resourceType: 'document' | 'project' | 'task' | 'note',
  resourceId: string,
  permission: string
): Promise<boolean> => {
  try {
    await requirePermission(userEmail, resourceType, resourceId, permission);
    return true;
  } catch (error) {
    return false;
  }
};

// Helper to get user's role on a resource
export const getUserRole = async (
  userEmail: string,
  resourceType: 'document' | 'project' | 'task' | 'note',
  resourceId: string
): Promise<string | null> => {
  const permissions = resourceType === 'document' 
    ? ['owner', 'editor', 'viewer'] as const
    : resourceType === 'project'
    ? ['owner', 'member', 'viewer'] as const
    : resourceType === 'task'
    ? ['creator', 'assignee'] as const
    : ['creator'] as const;

  for (const role of permissions) {
    const hasRole = await canAccess(userEmail, resourceType, resourceId, role);
    if (hasRole) {
      return role;
    }
  }

  return null;
};
