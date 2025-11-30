import { useState, useEffect } from 'react';

export interface Song {
  id: string;
  name: string;
  duration: number;
  createdAt: string;
  storageKey: string;
  audioUrl: string;
}

export interface UseSingerSongsResult {
  songs: Song[];
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch songs for a specific singer
 * @param singerId - The ID of the singer to fetch songs for
 * @returns Songs, loading state, and error
 */
export function useSingerSongs(singerId: string | null): UseSingerSongsResult {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Reset state when singer changes
    if (!singerId) {
      setSongs([]);
      setError(null);
      return;
    }

    const fetchSongs = async () => {
      setLoading(true);
      setError(null);

      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';
        const response = await fetch(`${apiUrl}/api/assets/audio/${singerId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || 'test-token-demo-user'}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch songs: ${response.statusText}`);
        }

        const data = await response.json();

        // Transform API response to Song interface
        const songsData: Song[] = (data.songs || []).map((song: any) => ({
          id: song.id,
          name: song.name || `Song ${song.id.slice(-8)}`,
          duration: song.duration || 0,
          createdAt: song.createdAt,
          storageKey: song.storageKey,
          audioUrl: song.publicUrl || song.audioUrl,
        }));

        setSongs(songsData);
      } catch (err) {
        console.error('Error fetching songs:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch songs');
        setSongs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSongs();
  }, [singerId]);

  return { songs, loading, error };
}
