import { fetchAsync } from './utils/fetch.js';
import Setting from './utils/setting.js';

let playlist;
let currentTrack = 0;
let player;

const mediaPlaying = new Setting('mediaPlaying', {
  name: 'Media Playing',
  type: 'boolean',
  defaultValue: false,
});

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('ToggleMedia').addEventListener('click', toggleMedia);
  getMedia();
});

const getMedia = async () => {
  try {
    const rawPlaylist = await fetchAsync('playlist.json', 'json');
    playlist = rawPlaylist;
    enableMediaPlayer();
  } catch (e) {
    console.error("Couldn't get playlist");
    console.error(e);
  }
};

const enableMediaPlayer = () => {
  if (playlist?.availableFiles?.length > 0) {
    randomizePlaylist();
    const icon = document.getElementById('ToggleMedia');
    icon.classList.add('available');
    setIcon();
    if (mediaPlaying.value === true) {
      startMedia();
    }
  }
};

const setIcon = () => {
  const icon = document.getElementById('ToggleMedia');
  if (mediaPlaying.value === true) {
    icon.classList.add('playing');
  } else {
    icon.classList.remove('playing');
  }
};

const toggleMedia = forcedState => {
  if (typeof forcedState === 'boolean') {
    mediaPlaying.value = forcedState;
  } else {
    mediaPlaying.value = !mediaPlaying.value;
  }
  stateChanged();
};

const startMedia = async () => {
  if (!player) {
    initializePlayer();
  } else {
    try {
      await player.play();
    } catch (e) {
      console.error("Couldn't play music");
      console.error(e);
      // set state back to not playing for good UI experience
      mediaPlaying.value = false;
      stateChanged();
    }
  }
};

const stopMedia = () => {
  if (!player) {
    return;
  }
  player.pause();
};

const stateChanged = () => {
  setIcon();
  if (mediaPlaying.value) {
    startMedia();
  } else {
    stopMedia();
  }
};

const randomizePlaylist = () => {
  let availableFiles = [...playlist.availableFiles];
  const randomPlaylist = [];
  while (availableFiles.length > 0) {
    const i = Math.floor(Math.random() * availableFiles.length);
    randomPlaylist.push(availableFiles[i]);
    availableFiles = availableFiles.filter((file, index) => index !== i);
  }
  playlist.availableFiles = randomPlaylist;
};

const initializePlayer = () => {
  if (!playlist.availableFiles || playlist?.availableFiles.length === 0) {
    throw new Error('No playlist available');
  }
  if (player) {
    return;
  }
  player = new Audio();

  currentTrack = 0;

  player.addEventListener('canplay', playerCanPlay);
  player.addEventListener('ended', playerEnded);

  player.src = `music/${playlist.availableFiles[currentTrack]}`;
  player.type = 'audio/mpeg';
  player.volume = 0.75; // Hardcoded to 75%
};

const playerCanPlay = async () => {
  // check to make sure they user still wants music (protect against slow loading music)
  if (!mediaPlaying.value) {
    return;
  }
  startMedia();
};

const playerEnded = () => {
  currentTrack += 1;
  if (currentTrack >= playlist.availableFiles.length) {
    randomizePlaylist();
    currentTrack = 0;
  }
  player.src = `music/${playlist.availableFiles[currentTrack]}`;
};
