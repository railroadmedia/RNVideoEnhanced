import { Dimensions, PixelRatio, Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import type { IContent, IMp3 } from './entity';

export const getMP3Array = (lesson: IContent): IMp3[] => {
  const mp3s: IMp3[] = [];
  if (lesson.mp3_no_drums_no_click_url) {
    mp3s.push({
      id: 'mp3_no_drums_no_click_url',
      key: 'mp3_no_drums_no_click_url',
      value: lesson.mp3_no_drums_no_click_url,
    });
  }
  if (lesson.mp3_no_drums_yes_click_url) {
    mp3s.push({
      id: 'mp3_no_drums_yes_click_url',
      key: 'mp3_no_drums_yes_click_url',
      value: lesson.mp3_no_drums_yes_click_url,
    });
  }
  if (lesson.mp3_yes_drums_no_click_url) {
    mp3s.push({
      id: 'mp3_yes_drums_no_click_url',
      key: 'mp3_yes_drums_no_click_url',
      value: lesson.mp3_yes_drums_no_click_url,
    });
  }
  if (lesson.mp3_yes_drums_yes_click_url) {
    mp3s.push({
      id: 'mp3_yes_drums_yes_click_url',
      key: 'mp3_yes_drums_yes_click_url',
      value: lesson.mp3_yes_drums_yes_click_url,
    });
  }
  return mp3s;
};

export interface IFormattedTime {
  hours: string;
  minutes: string;
  seconds: string;
}

export const formatTimer = (seconds: number): IFormattedTime => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  console.log(hours,minutes,remainingSeconds)
  const hDisplay = hours > 0 ? hours : "00";
  const mDisplay = minutes > 0 ? minutes  : "00";
  const sDisplay = remainingSeconds;

  return {
    hours: `${hDisplay}`,
    minutes: `${mDisplay}`,
    seconds: `${sDisplay}`,
  };
};

export const formatVideoTime = (seconds: number): string => {
  if (seconds < 1) {
    return '0:00';
  }
  const h = Math.trunc(seconds / 3600);
  let m: number | string = Math.trunc((seconds - h * 3600) / 60);
  let s: number | string = Math.trunc(seconds - m * 60 - h * 3600);

  s = s < 10 ? `0${s}` : `${s}`;
  m = m < 10 ? (h ? `0${m}` : `${m}`) : `${m}`;
  return h ? `${h}:${m}:${s}` : `${m}:${s}`;
};

export const IS_IOS = Platform.OS === 'ios';
export const PIX_R = PixelRatio.get();
export const IS_TABLET = DeviceInfo.isTablet();
export const WINDOW_WIDTH = Dimensions.get('screen').width;
export const WINDOW_HEIGHT = Dimensions.get('screen').height;
