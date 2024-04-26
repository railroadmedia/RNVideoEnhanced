/* props: maxFontMultiplier, windowWidth */

import React from 'react';
import {
  Text,
  Modal,
  Animated,
  StyleSheet,
  TouchableOpacity
} from 'react-native';

export default class Alerts extends React.PureComponent {
  state = {
    visible: false,
    opacity: new Animated.Value(0)
  };

  constructor(props) {
    super(props);
  }

  toggle = (title, message) => {
    this.title = title || 'Unknown';
    this.message = message || '';
    if (this.state.visible && this.props.onClose) this.props.onClose();
    this.setState(state => ({ visible: !state.visible }));
  };

  animate = () => {
    Animated.timing(this.state.opacity, {
      duration: 250,
      useNativeDriver: true,
      toValue: this.state.visible ? 1 : 0
    }).start();
  };

  render() {
    const { styles: propStyle } = this.props;
    return (
      <Modal
        testID='modal'
        transparent={true}
        onShow={this.animate}
        visible={this.state.visible}
        onRequestClose={this.toggle}
        supportedOrientations={['portrait', 'landscape']}
      >
        <TouchableOpacity
          testID='modalBackground'
          style={styles.modalBackground}
          onPress={() => this.toggle()}
        >
          <Animated.View
            style={[
              styles.animatedView,
              {
                marginHorizontal: 50,
                opacity: this.state.opacity,
                backgroundColor: propStyle?.background || 'white'
              }
            ]}
          >
            <Text
              maxFontSizeMultiplier={this.props.maxFontMultiplier}
              testID='alertTitle'
              style={[
                styles.mediumTitle,
                styles.text,
                { color: propStyle?.titleTextColor || 'black' }
              ]}
            >
              {this.title}
            </Text>
            <Text
              maxFontSizeMultiplier={this.props.maxFontMultiplier}
              testID='alertMessage'
              style={[
                styles.mediumText,
                styles.text,
                { color: propStyle?.subtitleTextColor || 'black' }
              ]}
            >
              {this.message}
            </Text>
            {this.props.additionalBtn}
            {this.props.additionalTextBtn}
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,.5)'
  },
  text: {
    textAlign: 'center',
    paddingVertical: 10
  },
  animatedView: {
    padding: 10,
    paddingHorizontal: 50,
    borderRadius: 10,
    margin: 5
  },
  mediumTitle: {
    fontSize: 20,
    fontFamily: 'OpenSans-Bold'
  },
  mediumText: {
    fontSize: 14,
    fontFamily: 'OpenSans'
  }
});
