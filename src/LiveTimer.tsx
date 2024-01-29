import React, { FunctionComponent, useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { IFormattedTime, formatTimer } from './helper';

interface ILiveTimer {
  endTime: string;
  startTime: string;
  thumbnailUrl: string;
  visible: boolean;
  onEnd: () => void;
  onStart: () => void;
}

const LiveTimer: FunctionComponent<ILiveTimer> = props => {
  const { endTime, startTime, thumbnailUrl, visible, onEnd, onStart } = props;
  const [hours, setHours] = useState('--');
  const [minutes, setMinutes] = useState('--');
  const [seconds, setSeconds] = useState('--');

  const onStartInterval = useRef<NodeJS.Timeout>();
  const onEndInterval = useRef<NodeJS.Timeout>();

  const updateStateTime = useCallback((formattedtime: IFormattedTime) => {
    setHours(formattedtime?.hours);
    setMinutes(formattedtime?.minutes);
    setSeconds(formattedtime?.seconds);
  }, []);

  const countDown = useCallback(
    (time: number, event: string) => {
      if (event === 'onStart') {
        onStartInterval.current = setInterval(() => {
          if (time >= 0) {
            updateStateTime(formatTimer(time));
          } else {
            onStart?.();
            onStartInterval.current && clearInterval(onStartInterval.current);
          }
          time--;
        }, 1000);
      }
      if (event === 'onEnd') {
        onEndInterval.current = setInterval(() => {
          if (time >= 0) {
            if (!time) {
              updateStateTime({
                hours: '--',
                minutes: '--',
                seconds: '--',
              });
            }
            time--;
          } else {
            onEnd?.();
            onEndInterval.current && clearInterval(onEndInterval.current);
          }
        }, 1000);
      }
      return () => clearInterval(onStartInterval.current);
    },
    [onEnd, onStart, updateStateTime]
  );

  useEffect(() => {
    const parsedStartTime = new Date(startTime).getTime() - new Date().getTime() / 1000;
    const parsedEndTime = (new Date(endTime).getTime() - new Date().getTime()) / 1000 + 15 * 60;
    if (!!parsedStartTime) {
      if (parsedStartTime >= 0) {
        updateStateTime(formatTimer(parsedStartTime));
        countDown(parsedStartTime, 'onStart');
      } else {
        onStart?.();
      }
    }
    if (!!parsedEndTime) {
      if (parsedEndTime >= 0) {
        countDown(parsedEndTime, 'onEnd');
      } else {
        onEnd?.();
      }
    }

    return () => {
      onEndInterval.current && clearTimeout(onEndInterval.current);
      onStartInterval.current && clearTimeout(onStartInterval.current);
    };
  }, [endTime, startTime, countDown, onEnd, onStart, updateStateTime]);

  return visible ? (
    <View style={styles.container}>
      <Image source={{ uri: thumbnailUrl }} style={styles.image} />
      <View style={styles.blur} />
      <View>
        <Text style={styles.title}>{hours === '--' ? 'EVENT ENDED' : 'UPCOMING EVENT'}</Text>
        <View style={styles.row}>
          <Text style={styles.time}>
            {hours}
            {`\n`}
            <Text style={styles.font10}>{hours === '01' ? 'HOUR' : 'HOURS'}</Text>
          </Text>
          <Text style={styles.time}>
            :{`  `}
            {`\n`}
            <Text style={styles.font10}>{` `}</Text>
          </Text>
          <Text style={styles.time}>
            {minutes}
            {`\n`}
            <Text style={styles.font10}>
              {hours === '00' && minutes === '01' ? 'MINUTE' : 'MINUTES'}
            </Text>
          </Text>
          <Text style={styles.time}>
            :{`  `}
            {`\n`}
            <Text style={styles.font10}>{` `}</Text>
          </Text>
          <Text style={styles.time}>
            {seconds}
            {`\n`}
            <Text style={styles.font10}>{'SECONDS'}</Text>
          </Text>
        </View>
      </View>
    </View>
  ) : (
    <></>
  );
};

const styles = StyleSheet.create({
  container: {
    height: '100%',
    aspectRatio: 16 / 9,
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  time: {
    color: 'white',
    fontSize: 40,
    textAlign: 'center',
    fontFamily: 'OpenSans-Bold',
  },
  font10: {
    fontSize: 10,
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  title: {
    marginBottom: 20,
    color: 'white',
    textAlign: 'center',
    fontFamily: 'OpenSans-Bold',
  },
  blur: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,.5)',
  },
  row: {
    flexDirection: 'row',
  },
});

export default LiveTimer;
