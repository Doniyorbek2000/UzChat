import { create } from "zustand";

export const PLAYBACK_SPEEDS = [1, 1.5, 2] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

interface PlaybackSpeedState {
  // Last speed chosen by the user; new voice messages start at this speed too.
  speed: PlaybackSpeed;
  cycleSpeed: () => void;
}

export const usePlaybackSpeedStore = create<PlaybackSpeedState>((set, get) => ({
  speed: 1,

  cycleSpeed: () => {
    const index = PLAYBACK_SPEEDS.indexOf(get().speed);
    set({ speed: PLAYBACK_SPEEDS[(index + 1) % PLAYBACK_SPEEDS.length] });
  },
}));
