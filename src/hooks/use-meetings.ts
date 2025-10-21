'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface Meeting {
  id: string;
  title: string;
  description?: string;
  scheduled_time: string;
  duration_minutes: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  room_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  participant_count: number;
  participants?: Array<{
    id: string;
    user_email: string;
    role: 'host' | 'participant';
    status: 'invited' | 'accepted' | 'declined';
  }>;
}

export interface MeetingsResponse {
  meetings: Meeting[];
}

export interface CreateMeetingData {
  title: string;
  description?: string;
  scheduled_time: string;
  duration_minutes: number;
  participants?: Array<{
    email: string;
    role: 'host' | 'participant';
  }>;
}

// Query keys
export const meetingKeys = {
  all: ['meetings'] as const,
  lists: () => [...meetingKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...meetingKeys.lists(), { filters }] as const,
  details: () => [...meetingKeys.all, 'detail'] as const,
  detail: (id: string) => [...meetingKeys.details(), id] as const,
};

// Fetch meetings
export function useMeetings() {
  return useQuery({
    queryKey: meetingKeys.lists(),
    queryFn: async (): Promise<MeetingsResponse> => {
      const response = await fetch('/api/meetings');
      if (!response.ok) {
        throw new Error('Failed to fetch meetings');
      }
      return response.json();
    },
  });
}

// Fetch single meeting
export function useMeeting(id: string) {
  return useQuery({
    queryKey: meetingKeys.detail(id),
    queryFn: async (): Promise<{ meeting: Meeting }> => {
      const response = await fetch(`/api/meetings/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch meeting');
      }
      return response.json();
    },
    enabled: !!id,
  });
}

// Create meeting mutation
export function useCreateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateMeetingData): Promise<{ meeting: Meeting }> => {
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create meeting');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch meetings list
      queryClient.invalidateQueries({ queryKey: meetingKeys.lists() });
    },
  });
}

// Delete meeting mutation
export function useDeleteMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/meetings/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete meeting');
      }
    },
    onSuccess: (_, id) => {
      // Remove from cache and invalidate lists
      queryClient.removeQueries({ queryKey: meetingKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: meetingKeys.lists() });
    },
  });
}

// Start recording mutation
export function useStartRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meetingId: string): Promise<{ recordingId: string; status: string }> => {
      const response = await fetch(`/api/meetings/${meetingId}/recording`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start recording');
      }

      return response.json();
    },
    onSuccess: (_, meetingId) => {
      // Invalidate meeting details to get updated recording status
      queryClient.invalidateQueries({ queryKey: meetingKeys.detail(meetingId) });
    },
  });
}

// Stop recording mutation
export function useStopRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meetingId: string): Promise<void> => {
      const response = await fetch(`/api/meetings/${meetingId}/recording`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to stop recording');
      }
    },
    onSuccess: (_, meetingId) => {
      // Invalidate meeting details to get updated recording status
      queryClient.invalidateQueries({ queryKey: meetingKeys.detail(meetingId) });
    },
  });
}
