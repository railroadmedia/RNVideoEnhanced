import React from 'react';
import {
  View,
  Text,
  Image
} from 'react-native';

class LiveTimer extends React.Component {
  state = {
    hours: '--',
    minutes: '--',
    seconds: '--'
  };

  constructor(props) {
    super(props);
    let startTime = parseInt((new Date(props.startTime) - new Date()) / 1000),
      endTime =
        parseInt((new Date(props.endTime) - new Date()) / 1000) + 15 * 60;
    if (startTime >= 0) {
      this.state = this.formatTimer(startTime);
      this.countDown(startTime, 'onStart');
    } else props.onStart?.();
    if (endTime >= 0) {
      this.countDown(endTime, 'onEnd');
    } else this.props.onEnd?.();
  }

  componentWillUnmount() {
    clearTimeout(this.onEndInterval);
    clearTimeout(this.onStartInterval);
  }

  countDown = (time, event) => {
    this[`${event}Interval`] = setInterval(() => {
      if (time >= 0) {
        if (event === 'onStart') this.setState(this.formatTimer(time));
        if (event === 'onEnd' && !time)
          this.setState({
            hours: '--',
            minutes: '--',
            seconds: '--'
          });
        time--;
      } else {
        this.props[event]?.();
        clearInterval(this[`${event}Interval`]);
      }
    }, 1000);
  };

  formatTimer = (seconds) => {
    const hours = parseInt(seconds / 3600);
    const minutes = parseInt((seconds -= hours * 3600) / 60);
    seconds -= minutes * 60;
    return {
      hours: `${hours < 10 ? 0 : ''}${hours}`,
      minutes: `${minutes < 10 ? 0 : ''}${minutes}`,
      seconds: `${seconds < 10 ? 0 : ''}${seconds}`
    };
  };

  render() {
    let { hours, minutes, seconds } = this.state;
    return this.props.visible ? (
      <View
        style={{
          height: '100%',
          aspectRatio: 16 / 9,
          position: 'absolute',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Image
          source={{ uri: this.props.thumbnailUrl }}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute'
          }}
        />
        <View
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            backgroundColor: 'rgba(0,0,0,.5)'
          }}
        />
        <View>
          <Text
            style={{
              marginBottom: 20,
              color: 'white',
              textAlign: 'center',
              fontFamily: 'RobotoCondensed-Bold'
            }}
          >
            {hours === '--' ? 'EVENT ENDED' : 'UPCOMING EVENT'}
          </Text>
          <View style={{ flexDirection: 'row' }}>
            <Text
              style={{
                color: 'white',
                fontSize: 40,
                textAlign: 'center',
                fontFamily: 'RobotoCondensed-Bold'
              }}
            >
              {hours}
              {`\n`}
              <Text style={{ fontSize: 10 }}>
                {hours === '01' ? 'HOUR' : 'HOURS'}
              </Text>
            </Text>
            <Text
              style={{
                fontSize: 40,
                color: 'white',
                textAlign: 'center',
                fontFamily: 'RobotoCondensed-Bold'
              }}
            >
              :{`  `}
              {`\n`}
              <Text style={{ fontSize: 10 }}>{` `}</Text>
            </Text>
            <Text
              style={{
                fontSize: 40,
                color: 'white',
                textAlign: 'center',
                fontFamily: 'RobotoCondensed-Bold'
              }}
            >
              {minutes}
              {`\n`}
              <Text style={{ fontSize: 10 }}>
                {hours === '00' && minutes === '01' ? 'MINUTE' : 'MINUTES'}
              </Text>
            </Text>
            <Text
              style={{
                color: 'white',
                fontSize: 40,
                textAlign: 'center',
                fontFamily: 'RobotoCondensed-Bold'
              }}
            >
              :{`  `}
              {`\n`}
              <Text style={{ fontSize: 10 }}>{` `}</Text>
            </Text>
            <Text
              style={{
                color: 'white',
                fontSize: 40,
                textAlign: 'center',
                fontFamily: 'RobotoCondensed-Bold'
              }}
            >
              {seconds}
              {`\n`}
              <Text style={{ fontSize: 10 }}>SECONDS</Text>
            </Text>
          </View>
        </View>
      </View>
    ) : (
      <></>
    );
  }
}

export default LiveTimer;