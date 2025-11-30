'use client';

import { useSingerSongs, type Song } from '@/lib/hooks/useSingerSongs';
import { Music, Check, Loader2 } from 'lucide-react';

interface SongSelectorProps {
  singerId: string | null;
  selectedSongId: string | null;
  onSongSelect: (songId: string | null) => void;
}

export function SongSelector({ singerId, selectedSongId, onSongSelect }: SongSelectorProps) {
  const { songs, loading, error } = useSingerSongs(singerId);

  // Don't show selector if no singer is selected
  if (!singerId) {
    return null;
  }

  // Format duration from seconds to MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Format date to readable format
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Music className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Select Song (Optional)</h3>
      </div>

      <p className="text-sm text-gray-600">
        Choose a song to create a music video, or leave unselected for a regular video
      </p>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading songs...</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">Error loading songs: {error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-2">
          {/* No song option */}
          <button
            type="button"
            onClick={() => onSongSelect(null)}
            className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
              selectedSongId === null
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">No song (regular video)</p>
                <p className="text-sm text-gray-500">Generate a video without music</p>
              </div>
              {selectedSongId === null && (
                <Check className="w-5 h-5 text-blue-600" />
              )}
            </div>
          </button>

          {/* Song list */}
          {songs.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-lg">
              <Music className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-600 font-medium">No songs found</p>
              <p className="text-sm text-gray-500 mt-1">
                Generate songs for this singer first to create music videos
              </p>
            </div>
          ) : (
            songs.map((song) => (
              <button
                key={song.id}
                type="button"
                onClick={() => onSongSelect(song.id)}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                  selectedSongId === song.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Music className="w-4 h-4 text-slate-400" />
                      <p className="font-medium text-white">{song.name}</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      <span>{formatDuration(song.duration)}</span>
                      <span>•</span>
                      <span>{formatDate(song.createdAt)}</span>
                    </div>
                  </div>
                  {selectedSongId === song.id && (
                    <Check className="w-5 h-5 text-blue-600 ml-2 flex-shrink-0" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
