export interface IVideo {
  onPlayerReady?: () => void;
  youtubeId?: string;
  content: IContent;
  type: 'audio' | 'video';
  toSupport: () => void;
  onBack?: () => void;
  connection: boolean | null;
  goToNextLesson?: () => void;
  goToPreviousLesson?: () => void;
  disableNext?: boolean;
  disablePrevious?: boolean;
  autoPlay?: boolean;
  live: boolean;
  liveData?: {
    isLive?: boolean;
    live_event_end_time?: string;
    live_event_start_time?: string;
    live_event_end_time_in_timezone?: string;
    live_event_start_time_in_timezone?: string;
  };
  startTime?: number;
  endTime?: number;
  onStart?: () => void;
  quality?: number;
  onEnd?: () => void;
  onGCastingChange?: (casting: boolean) => void;
  onACastingChange?: (casting?: boolean) => void;
  gCasting?: boolean;
  onRefresh: () => void;
  showControls: boolean;
  paused: boolean;
  onFullscreen?: (isFullscreen: boolean) => void;
  orientationIsLocked?: boolean;
  repeat: boolean;
  onUpdateVideoProgress?: (
    videoId: number | string,
    id: number,
    lengthInSec: number,
    currentTime: number,
    secondsPlayed: number,
    mediaCategory: string,
    apiCallDelay?: number
  ) => void;
  listening?: boolean;
  primaryColor: string;
  themeColors: {
    text: string;
    background: string;
  };
  maxWidth?: number;
  onOrientationChange?: (o: any) => void;
  onQualityChange?: (qual?: string | number) => void;
  maxFontMultiplier?: number;
  showCastingOptions?: boolean;
  orientation?: string;
  aCasting?: boolean;
  offlinePath?: string;
}

export interface IContent {
  id: number;
  isLive?: boolean;
  type: string;
  title: string;
  vimeo_video_id: string;
  live_event_end_time?: string;
  live_event_start_time?: string;
  captions?: string;
  thumbnail_url: string;
  length_in_seconds: number;
  description?: string;
  mp3_no_drums_no_click_url?: string;
  mp3_no_drums_yes_click_url?: string;
  mp3_yes_drums_no_click_url?: string;
  mp3_yes_drums_yes_click_url?: string;
  next_lesson?: ICard;
  previous_lesson?: ICard;
  video_playback_endpoints?: Array<{
    file: string;
    height: number;
    width: number;
  }>;
  last_watch_position_in_seconds?: number;
  signal?: any;
}

export interface IVpe {
  selected?: boolean;
  file?: string;
  height: number | string;
  width?: number;
  actualH?: any;
  originalFile?: string;
}

export interface IMp3 {
  selected?: boolean;
  id: string;
  key: string;
  value: string;
}

export interface ICard {
  id: number;
  mobile_app_url?: string;
  type: string;
}
