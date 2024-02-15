import React, { forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import { StyleSheet, Text, TextStyle } from 'react-native';
import { formatVideoTime } from './helper';

interface IVideoTimer {
  live: boolean;
  length_in_seconds: number;
  maxFontMultiplier?: number;
  styles?: { left: TextStyle; right: TextStyle };
}

const VideoTimer = forwardRef<{ setProgress: (time: number) => void }, IVideoTimer>(
  ({ live, length_in_seconds, maxFontMultiplier, styles: propStyle }, ref) => {
    const [progressState, setProgressState] = useState('0:00');

    useImperativeHandle(ref, () => ({
      setProgress,
    }));

    const setProgress = (sec: number) => {
      setProgressState(formatVideoTime(sec));
    };

    const renderEndTime = useMemo(
      () => (
        <Text
          maxFontSizeMultiplier={maxFontMultiplier}
          style={[styles.rightTimer, propStyle?.right]}
        >
          {live ? 'live' : length_in_seconds && formatVideoTime(length_in_seconds)}
        </Text>
      ),
      [length_in_seconds, maxFontMultiplier, propStyle?.right, live]
    );

    return (
      <React.Fragment>
        <Text maxFontSizeMultiplier={maxFontMultiplier} style={[styles.leftTimer, propStyle?.left]}>
          {progressState}
        </Text>
        {renderEndTime}
      </React.Fragment>
    );
  }
);

const styles = StyleSheet.create({
  leftTimer: {
    color: 'white',
    padding: 10,
    flex: 1,
  },
  rightTimer: {
    flex: 1,
    padding: 10,
    color: 'white',
    textAlign: 'right',
  },
});

export default VideoTimer;
