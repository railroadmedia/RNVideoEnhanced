import React, { forwardRef, useImperativeHandle, useState } from 'react';

import { Text, TextStyle } from 'react-native';

interface IVideoTimer {
  live: boolean;
  length_in_seconds: number;
  maxFontMultiplier?: number;
  styles?: { left: TextStyle; right: TextStyle };
}

const VideoTimer = forwardRef<{ setProgress: (time: number) => void }, IVideoTimer>(
  (props, ref) => {
    const { live, length_in_seconds, maxFontMultiplier, styles: propStyle } = props;
    const [progressState, setProgressState] = useState('0:00');

    useImperativeHandle(ref, () => ({
      setProgress,
    }));

    const formatTime = (seconds: number): string => {
      if (seconds < 1) {
        return '0:00';
      }
      let h = seconds / 3600;
      let m: number | string = (seconds - h * 3600) / 60;
      let s: number | string = seconds - m * 60 - h * 3600;

      s = s < 10 ? `0${s}` : `${s}`;
      m = m < 10 ? (h ? `0${m}` : `${m}`) : `${m}`;
      return h ? `${h}:${m}:${s}` : `${m}:${s}`;
    };

    const setProgress = (sec: number) => {
      setProgressState(formatTime(sec));
    };

    return (
      <React.Fragment>
        <Text
          maxFontSizeMultiplier={maxFontMultiplier}
          style={{ color: 'white', padding: 10, flex: 1, ...propStyle?.left }}
        >
          {progressState}
        </Text>
        <Text
          maxFontSizeMultiplier={maxFontMultiplier}
          style={{
            flex: 1,
            padding: 10,
            color: 'white',
            textAlign: 'right',
            ...propStyle?.right,
          }}
        >
          {live ? 'live' : length_in_seconds && formatTime(length_in_seconds)}
        </Text>
      </React.Fragment>
    );
  }
);

export default VideoTimer;
