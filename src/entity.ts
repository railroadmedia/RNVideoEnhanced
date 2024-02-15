export interface IContent {
  signal: any;
  id: number;
  isLive?: boolean;
  type: string;
  title: string;
  vimeo_video_id?: number;
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
  next_lesson?: {
    id: number;
    mobile_app_url: string;
  };
  previous_lesson?: {
    id: number;
    mobile_app_url: string;
  };
  video_playback_endpoints?: {
    file: string;
    height: number;
    width: number;
  }[];
  last_watch_position_in_seconds?: number;
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
