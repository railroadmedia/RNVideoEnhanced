import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

formatTimer = seconds => {
  const hours = parseInt(seconds / 3600);
  const minutes = parseInt((seconds -= hours * 3600) / 60);
  seconds -= minutes * 60;
  return {
    hours: `${hours < 10 ? 0 : ''}${hours}`,
    minutes: `${minutes < 10 ? 0 : ''}${minutes}`,
    seconds: `${seconds < 10 ? 0 : ''}${seconds}`
  };
};

const LiveTimer = props => {
  const [hours, setHours] = useState('--');
  const [minutes, setMinutes] = useState('--');
  const [seconds, setSeconds] = useState('--');

  let onStartInterval = useRef();
  let onEndInterval = useRef();

  useEffect(() => {
    let startTime = parseInt((new Date(props.startTime) - new Date()) / 1000);
    let endTime =
      parseInt((new Date(props.endTime) - new Date()) / 1000) + 15 * 60;
    if (!!startTime) {
      if (startTime >= 0) {
        updateStateTime(formatTimer(startTime));
        countDown(startTime, 'onStart');
      } else props.onStart?.();
    }
    if (!!endTime) {
      if (endTime >= 0) {
        countDown(endTime, 'onEnd');
      } else props.onEnd?.();
    }

    return () => {
      clearTimeout(onEndInterval.current);
      clearTimeout(onStartInterval.current);
    };
  }, [props.endTime, props.startTime]);

  const updateStateTime = useCallback(time => {
    setHours(time.hours);
    setMinutes(time.minutes);
    setSeconds(time.seconds);
  }, []);

  const countDown = useCallback((time, event) => {
    if (event === 'onStart') {
      onStartInterval.current = setInterval(() => {
        if (time >= 0) {
          updateStateTime(formatTimer(time));
        } else {
          props.onStart?.();
          clearInterval(onStartInterval.current);
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
              seconds: '--'
            });
          }
          time--;
        } else {
            props.onEnd?.();
            clearInterval(onEndInterval.current);
        }
      }, 1000);
    }
  }, [props]);

  return props.visible ? (
    <View style={styles.container}>
      <Image source={{ uri: props.thumbnailUrl }} style={styles.image} />
      <View style={styles.blur} />
      <View>
        <Text style={styles.title}>
          {hours === '--' ? 'EVENT ENDED' : 'UPCOMING EVENT'}
        </Text>
        <View style={styles.row}>
          <Text style={styles.time}>
            {hours}
            {`\n`}
            <Text style={styles.font10}>
              {hours === '01' ? 'HOUR' : 'HOURS'}
            </Text>
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
            <Text style={styles.font10}>SECONDS</Text>
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
    justifyContent: 'center'
  },
  time: {
    color: 'white',
    fontSize: 40,
    textAlign: 'center',
    fontFamily: 'OpenSans-Bold'
  },
  font10: {
    fontSize: 10
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute'
  },
  title: {
    marginBottom: 20,
    color: 'white',
    textAlign: 'center',
    fontFamily: 'OpenSans-Bold'
  },
  blur: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,.5)'
  },
  row: {
    flexDirection: 'row'
  }
});

export default LiveTimer;
