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
    const { theme } = this.props;
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
                backgroundColor: 'red',
                opacity: this.state.opacity,
                maxWidth: this.props.windowWidth - 50
              }
            ]}
          >
            <Text
              maxFontSizeMultiplier={this.props.maxFontMultiplier}
              testID='alertTitle'
              style={[styles.mediumTitle, styles.text, { color: 'red' }]}
            >
              {this.title}
            </Text>
            <Text
              maxFontSizeMultiplier={this.props.maxFontMultiplier}
              testID='alertMessage'
              style={[styles.mediumText, styles.text, { color: 'red' }]}
            >
              {this.message}
            </Text>
            {this.props.onDelete ? (
              <React.Fragment>
                <TouchableOpacity
                  testID='deleteBtn'
                  onPress={this.props.onDelete}
                  style={[styles.buttonStyle, styles.btn]}
                >
                  <Text
                    maxFontSizeMultiplier={this.props.maxFontMultiplier}
                    style={[
                      styles.buttonText,
                      { padding: 15, color: '#ffffff' }
                    ]}
                  >
                    DELETE
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  testID='cancelBtn'
                  onPress={() => this.toggle()}
                >
                  <Text
                    maxFontSizeMultiplier={this.props.maxFontMultiplier}
                    style={[
                      styles.buttonText,
                      {
                        color: 'green',
                        marginTop: 10
                      }
                    ]}
                  >
                    CANCEL
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            ) : (
              <React.Fragment>
                {this.props.additionalBtn}
                {!this.props.hideTryAgainBtn && (
                  <TouchableOpacity
                    testID={`${this.props.propTestID}TryAgainTO`}
                    onPress={() => {
                      if (!this.props.cancelBtnText && this.props.onTryAgain)
                        this.props.onTryAgain();
                      this.toggle();
                    }}
                  >
                    <Text
                      maxFontSizeMultiplier={this.props.maxFontMultiplier}
                      testID='tryAgainBtnText'
                      style={[
                        styles.text,
                        styles.buttonText,
                        {
                          color: 'green',
                          marginTop: 10
                        }
                      ]}
                    >
                      {this.props.cancelBtnText || 'TRY AGAIN'}
                    </Text>
                  </TouchableOpacity>
                )}
                {this.props.additionalTextBtn}
              </React.Fragment>
            )}
          </Animated.View>
          {this.props.onHelperText && (
            <TouchableOpacity
              testID='helpBtn'
              style={{ position: 'absolute', bottom: 60 }}
              onPress={this.props.onHelperText}
            >
              <Text
                maxFontSizeMultiplier={this.props.maxFontMultiplier}
                style={[styles.mediumText, { color: '#ffffff' }]}
              >
                Do you need help?
              </Text>
              <Text
                maxFontSizeMultiplier={this.props.maxFontMultiplier}
                style={[
                  styles.mediumText,
                  { color: '#ffffff', textDecorationLine: 'underline' }
                ]}
              >
                CONTACT SUPPORT
              </Text>
            </TouchableOpacity>
          )}
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
    backgroundColor: 'yellow'
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
  btn: {
    backgroundColor: 'green',
    marginTop: 10,
    borderColor: 'green'
  },
  mediumTitle: {
    color: '#000000',
    fontSize: 20,
    fontFamily: 'OpenSans-Bold'
  },
  mediumText: {
    color: '#000000',
    fontSize: 14,
    fontFamily: 'OpenSans-Regular'
  },
  buttonStyle: {
    borderWidth: 2,
    borderRadius: 25,
    minHeight: 46,
    justifyContent: 'center',
    alignItems: 'center'
  },
  buttonText: {
    textAlign: 'center',
    fontFamily: 'RobotoCondensed-Bold',
    fontSize: 15
  }
});
