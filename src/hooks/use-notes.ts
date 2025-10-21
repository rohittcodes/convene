'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface Note {
  id: string;
  title: string;
  content: string;
  project_id?: string;
  meeting_id?: string;
  tags: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
  is_private: boolean;
}

export interface NotesResponse {
  notes: Note[];
}

export interface CreateNoteData {
  title: string;
  content: string;
  project_id?: string;
  meeting_id?: string;
  tags?: string[];
  is_private?: boolean;
}

export interface UpdateNoteData {
  title?: string;
  content?: string;
  tags?: string[];
  project_id?: string;
  is_private?: boolean;
}

// Query keys
export const noteKeys = {
  all: ['notes'] as const,
  lists: () => [...noteKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...noteKeys.lists(), { filters }] as const,
  details: () => [...noteKeys.all, 'detail'] as const,
  detail: (id: string) => [...noteKeys.details(), id] as const,
};

// Fetch notes
export function useNotes(filters?: { search?: string; tag?: string; project_id?: string; meeting_id?: string }) {
  return useQuery({
    queryKey: noteKeys.list(filters || {}),
    queryFn: async (): Promise<NotesResponse> => {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.tag) params.append('tag', filters.tag);
      if (filters?.project_id) params.append('project_id', filters.project_id);
      if (filters?.meeting_id) params.append('meeting_id', filters.meeting_id);

      const url = `/api/notes${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch notes');
      }
      return response.json();
    },
  });
}

// Fetch single note
export function useNote(id: string) {
  return useQuery({
    queryKey: noteKeys.detail(id),
    queryFn: async (): Promise<{ note: Note }> => {
      const response = await fetch(`/api/notes/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch note');
      }
      return response.json();
    },
    enabled: !!id,
  });
}

// Create note mutation
export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateNoteData): Promise<{ note: Note }> => {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create note');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch notes list
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}

// Update note mutation
export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateNoteData }): Promise<{ note: Note }> => {
      const response = await fetch(`/api/notes/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update note');
      }

      return response.json();
    },
    onSuccess: (_, { id }) => {
      // Invalidate note details and lists
      queryClient.invalidateQueries({ queryKey: noteKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}

// Delete note mutation
export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/notes/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete note');
      }
    },
    onSuccess: (_, id) => {
      // Remove from cache and invalidate lists
      queryClient.removeQueries({ queryKey: noteKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() });
    },
  });
}


