/* props: maxFontMultiplier */

import React from 'react';

import { Text, View } from 'react-native';

export default class VideoTimer_V2 extends React.PureComponent {
  state = {};

  constructor(props) {
    super(props);
    this.state.progress = '0:00';
  }

  setProgress = sec => {
    this.setState({ progress: this.props.formatTime(sec) });
  };

  render() {
    let { progress } = this.state;
    let { lengthInSec, formatTime } = this.props;
    return (
      <React.Fragment>
        <Text
          maxFontSizeMultiplier={this.props.maxFontMultiplier}
          style={{ color: 'white', padding: 10 }}
        >
          {progress}
        </Text>
        <View style={{ flex: 1 }} />
        <Text
          maxFontSizeMultiplier={this.props.maxFontMultiplier}
          style={{ color: 'white', padding: 10 }}
        >
          {formatTime(lengthInSec)}
        </Text>
      </React.Fragment>
    );
  }
}
