import React, {
  ReactElement,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Text, Modal, Animated, StyleSheet, TouchableOpacity } from 'react-native';

interface IAnimatedCustomAlert {
  additionalBtn?: ReactElement;
  additionalTextBtn?: ReactElement;
  onClose?: () => void;
  maxFontMultiplier?: number;
  themeColors: { background: string; text: string };
}

const AnimatedCustomAlert = forwardRef<
  { toggle: (titleText?: string, messageText?: string) => void },
  IAnimatedCustomAlert
>((props, ref) => {
  const { onClose, additionalBtn, additionalTextBtn, maxFontMultiplier, themeColors } = props;
  const [visible, setVisible] = useState(false);
  const title = useRef<string | undefined>('');
  const message = useRef<string | undefined>('');
  const opacity = useRef(new Animated.Value(0));

  useImperativeHandle(ref, () => ({
    toggle,
  }));

  const toggle = useCallback(
    (titleText?: string, messageText?: string): void => {
      title.current = titleText || 'Unknown';
      message.current = messageText || '';
      if (visible && onClose) {
        onClose?.();
      }
      setVisible(!visible);
    },
    [visible, onClose]
  );

  const animate = (): void => {
    Animated.timing(opacity.current, {
      duration: 250,
      useNativeDriver: true,
      toValue: visible ? 1 : 0,
    }).start();
  };

  return (
    <Modal
      testID='modal'
      transparent={true}
      onShow={animate}
      visible={visible}
      onRequestClose={() => toggle()}
      supportedOrientations={['portrait', 'landscape']}
    >
      <TouchableOpacity
        testID='modalBackground'
        style={styles.modalBackground}
        onPress={() => toggle()}
      >
        <Animated.View
          style={[
            styles.animatedView,
            {
              marginHorizontal: 50,
              opacity: opacity.current,
              backgroundColor: themeColors?.background || 'white',
            },
          ]}
        >
          <Text
            maxFontSizeMultiplier={maxFontMultiplier}
            testID='alertTitle'
            style={[styles.mediumTitle, styles.text, { color: themeColors?.text || 'black' }]}
          >
            {title.current}
          </Text>
          <Text
            maxFontSizeMultiplier={maxFontMultiplier}
            testID='alertMessage'
            style={[styles.mediumText, styles.text, { color: themeColors?.text || 'black' }]}
          >
            {message.current}
          </Text>
          {additionalBtn}
          {additionalTextBtn}
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,.5)',
  },
  text: {
    textAlign: 'center',
    paddingVertical: 10,
  },
  animatedView: {
    padding: 10,
    paddingHorizontal: 50,
    borderRadius: 10,
    margin: 5,
  },
  mediumTitle: {
    fontSize: 20,
    fontFamily: 'OpenSans-Bold',
  },
  mediumText: {
    fontSize: 14,
    fontFamily: 'OpenSans',
  },
});

export default AnimatedCustomAlert;
