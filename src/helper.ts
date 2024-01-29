import { PixelRatio, Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import type { IContent, IMp3 } from './entity';

export const getMP3Array = (lesson: IContent): IMp3[] => {
  let mp3s: IMp3[] = [];
  if (lesson.mp3_no_drums_no_click_url)
    mp3s.push({
      id: 'mp3_no_drums_no_click_url',
      key: 'mp3_no_drums_no_click_url',
      value: lesson.mp3_no_drums_no_click_url,
    });
  if (lesson.mp3_no_drums_yes_click_url)
    mp3s.push({
      id: 'mp3_no_drums_yes_click_url',
      key: 'mp3_no_drums_yes_click_url',
      value: lesson.mp3_no_drums_yes_click_url,
    });

  if (lesson.mp3_yes_drums_no_click_url)
    mp3s.push({
      id: 'mp3_yes_drums_no_click_url',
      key: 'mp3_yes_drums_no_click_url',
      value: lesson.mp3_yes_drums_no_click_url,
    });

  if (lesson.mp3_yes_drums_yes_click_url)
    mp3s.push({
      id: 'mp3_yes_drums_yes_click_url',
      key: 'mp3_yes_drums_yes_click_url',
      value: lesson.mp3_yes_drums_yes_click_url,
    });

  return mp3s;
};

export interface IFormattedTime {
  hours: string;
  minutes: string;
  seconds: string;
}

export const formatTimer = (seconds: number): IFormattedTime => {
  const hours = seconds / 3600;
  const minutes = (seconds -= hours * 3600) / 60;
  seconds -= minutes * 60;
  return {
    hours: `${hours < 10 ? 0 : ''}${hours}`,
    minutes: `${minutes < 10 ? 0 : ''}${minutes}`,
    seconds: `${seconds < 10 ? 0 : ''}${seconds}`,
  };
};

export const IS_IOS = Platform.OS === 'ios';
export const PIX_R = PixelRatio.get();
export const IS_TABLET = DeviceInfo.isTablet();
