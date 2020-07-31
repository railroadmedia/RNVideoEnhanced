/* props: maxFontMultiplier */

import React from 'react';

import { Text, View } from 'react-native';

export default class VideoTimer_V2 extends React.PureComponent {
  state = {};

  constructor(props) {
    super(props);
    this.state.progress = '0:00';
  }

  formatTime(seconds) {
    if (seconds < 1) return '0:00';
    let h = parseInt(seconds / 3600);
    let m = parseInt((seconds - h * 3600) / 60);
    let s = parseInt(seconds - m * 60 - h * 3600);

    s = s < 10 ? `0${s}` : `${s}`;
    m = m < 10 ? (h ? `0${m}` : `${m}`) : `${m}`;
    return h ? `${h}:${m}:${s}` : `${m}:${s}`;
  }

  setProgress = sec => {
    this.setState({ progress: this.formatTime(sec) });
  };

  render() {
    let {
      state: { progress },
      props: { lengthInSec, styles: propStyle }
    } = this;
    return (
      <React.Fragment>
        <Text
          maxFontSizeMultiplier={this.props.maxFontMultiplier}
          style={propStyle?.left || { color: 'white', padding: 10 }}
        >
          {progress}
        </Text>
        <View style={{ flex: 1 }} />
        <Text
          maxFontSizeMultiplier={this.props.maxFontMultiplier}
          style={propStyle?.right || { color: 'white', padding: 10 }}
        >
          {this.formatTime(lengthInSec)}
        </Text>
      </React.Fragment>
    );
  }
}
