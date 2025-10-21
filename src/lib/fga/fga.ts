import { buildOpenFgaClient } from '@auth0/ai';

export const fgaClient = buildOpenFgaClient();

// Core FGA utilities
export const checkPermission = async (user: string, object: string, relation: string): Promise<boolean> => {
  try {
    const response = await fgaClient.check({
      user: `user:${user}`,
      relation,
      object,
    });
    return response.allowed || false;
  } catch (error) {
    console.error('FGA check failed:', error);
    return false;
  }
};

export const addRelation = async (user: string, object: string, relation: string): Promise<void> => {
  try {
    await fgaClient.write({
      writes: [{
        user: `user:${user}`,
        relation,
        object,
      }],
    });
  } catch (error: any) {
    const msg: string = error?.apiErrorMessage || error?.message || '';
    if (msg.includes('tuple which already exists')) {
      console.warn('[FGA] Relation already exists, skipping:', { user, object, relation });
      return;
    }
    console.error('[FGA] addRelation failed:', msg);
    throw error;
  }
};

export const removeRelation = async (user: string, object: string, relation: string): Promise<void> => {
  await fgaClient.write({
    deletes: [{
      user: `user:${user}`,
      relation,
      object,
    }],
  });
};

export const listObjects = async (user: string, objectType: string, relation: string): Promise<string[]> => {
  try {
    const response = await fgaClient.listObjects({
      user: `user:${user}`,
      relation,
      type: objectType,
    });
    return response.objects || [];
  } catch (error) {
    console.error('FGA listObjects failed:', error);
    return [];
  }
};

export const listUsers = async (object: string, relation: string): Promise<string[]> => {
  try {
    const response = await fgaClient.listUsers({
      object: { type: object } as any,
      relation: relation as any,
      user_filters: [{ type: 'user' }],
    });
    return response.users?.map(user => (user as any).user || (user as any).id || user) || [];
  } catch (error) {
    console.error('FGA listUsers failed:', error);
    return [];
  }
};

// Document-specific helpers
export const grantDocumentAccess = async (userEmail: string, documentId: string, relation: 'owner' | 'editor' | 'viewer'): Promise<void> => {
  await addRelation(userEmail, `document:${documentId}`, relation);
};

export const revokeDocumentAccess = async (userEmail: string, documentId: string, relation: 'owner' | 'editor' | 'viewer'): Promise<void> => {
  await removeRelation(userEmail, `document:${documentId}`, relation);
};

export const checkDocumentPermission = async (userEmail: string, documentId: string, permission: 'can_read' | 'can_write' | 'can_delete' | 'can_share'): Promise<boolean> => {
  return checkPermission(userEmail, `document:${documentId}`, permission);
};

// Project-specific helpers
export const grantProjectAccess = async (userEmail: string, projectId: string, relation: 'owner' | 'member' | 'viewer'): Promise<void> => {
  await addRelation(userEmail, `project:${projectId}`, relation);
};

export const revokeProjectAccess = async (userEmail: string, projectId: string, relation: 'owner' | 'member' | 'viewer'): Promise<void> => {
  await removeRelation(userEmail, `project:${projectId}`, relation);
};

export const checkProjectPermission = async (userEmail: string, projectId: string, permission: 'can_read' | 'can_write' | 'can_delete' | 'can_manage_members'): Promise<boolean> => {
  return checkPermission(userEmail, `project:${projectId}`, permission);
};

// Task-specific helpers
export const grantTaskAccess = async (userEmail: string, taskId: string, relation: 'creator' | 'assignee'): Promise<void> => {
  await addRelation(userEmail, `task:${taskId}`, relation);
};

export const revokeTaskAccess = async (userEmail: string, taskId: string, relation: 'creator' | 'assignee'): Promise<void> => {
  await removeRelation(userEmail, `task:${taskId}`, relation);
};

export const checkTaskPermission = async (userEmail: string, taskId: string, permission: 'can_read' | 'can_write' | 'can_delete'): Promise<boolean> => {
  return checkPermission(userEmail, `task:${taskId}`, permission);
};

// Note-specific helpers
export const grantNoteAccess = async (userEmail: string, noteId: string, relation: 'creator'): Promise<void> => {
  await addRelation(userEmail, `note:${noteId}`, relation);
};

export const checkNotePermission = async (userEmail: string, noteId: string, permission: 'can_read' | 'can_write' | 'can_delete'): Promise<boolean> => {
  return checkPermission(userEmail, `note:${noteId}`, permission);
};

// Utility functions for filtering resources
export const filterDocumentsByPermission = async (userEmail: string, documentIds: string[], permission: 'can_read' | 'can_write' | 'can_delete' | 'can_share'): Promise<string[]> => {
  const authorizedIds: string[] = [];
  
  for (const docId of documentIds) {
    const hasPermission = await checkDocumentPermission(userEmail, docId, permission);
    if (hasPermission) {
      authorizedIds.push(docId);
    }
  }
  
  return authorizedIds;
};

export const filterProjectsByPermission = async (userEmail: string, projectIds: string[], permission: 'can_read' | 'can_write' | 'can_delete' | 'can_manage_members'): Promise<string[]> => {
  const authorizedIds: string[] = [];
  
  for (const projectId of projectIds) {
    const hasPermission = await checkProjectPermission(userEmail, projectId, permission);
    if (hasPermission) {
      authorizedIds.push(projectId);
    }
  }
  
  return authorizedIds;
};

export const filterTasksByPermission = async (userEmail: string, taskIds: string[], permission: 'can_read' | 'can_write' | 'can_delete'): Promise<string[]> => {
  const authorizedIds: string[] = [];
  
  for (const taskId of taskIds) {
    const hasPermission = await checkTaskPermission(userEmail, taskId, permission);
    if (hasPermission) {
      authorizedIds.push(taskId);
    }
  }
  
  return authorizedIds;
};

export const filterNotesByPermission = async (userEmail: string, noteIds: string[], permission: 'can_read' | 'can_write' | 'can_delete'): Promise<string[]> => {
  const authorizedIds: string[] = [];
  
  for (const noteId of noteIds) {
    const hasPermission = await checkNotePermission(userEmail, noteId, permission);
    if (hasPermission) {
      authorizedIds.push(noteId);
    }
  }
  
  return authorizedIds;
};