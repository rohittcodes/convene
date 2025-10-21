'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface Document {
  id: string;
  content: Buffer;
  fileName: string;
  fileType: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  userEmail: string;
  sharedWith: string[] | null;
}

export interface DocumentsResponse {
  documents: Document[];
}

export interface UploadDocumentData {
  file: File;
}

// Query keys
export const documentKeys = {
  all: ['documents'] as const,
  lists: () => [...documentKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...documentKeys.lists(), { filters }] as const,
  details: () => [...documentKeys.all, 'detail'] as const,
  detail: (id: string) => [...documentKeys.details(), id] as const,
};

// Fetch documents
export function useDocuments(filters?: { search?: string; category?: string; tags?: string[] }) {
  return useQuery({
    queryKey: documentKeys.list(filters || {}),
    queryFn: async (): Promise<DocumentsResponse> => {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.category) params.append('category', filters.category);
      if (filters?.tags) {
        filters.tags.forEach(tag => params.append('tags', tag));
      }

      const url = `/api/documents${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      return response.json();
    },
  });
}

// Fetch single document
export function useDocument(id: string) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: async (): Promise<{ document: Document }> => {
      const response = await fetch(`/api/documents/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch document');
      }
      return response.json();
    },
    enabled: !!id,
  });
}

// Upload document mutation
export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UploadDocumentData): Promise<{ document: Document }> => {
      const formData = new FormData();
      formData.append('file', data.file);

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload document');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch documents list
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
    },
  });
}

// Delete document mutation
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }
    },
    onSuccess: (_, id) => {
      // Remove from cache and invalidate lists
      queryClient.removeQueries({ queryKey: documentKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
    },
  });
}

// Share document mutation
export function useShareDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, userEmail, permission }: { documentId: string; userEmail: string; permission: 'owner' | 'editor' | 'viewer' }): Promise<void> => {
      const response = await fetch(`/api/documents/${documentId}`, {
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
        throw new Error('Failed to share document');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
    },
  });
}

// Unshare document mutation
export function useUnshareDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, userEmail, relation }: { documentId: string; userEmail: string; relation: 'owner' | 'editor' | 'viewer' }): Promise<void> => {
      const response = await fetch(`/api/documents/${documentId}`, {
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
        throw new Error('Failed to unshare document');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() });
    },
  });
}

