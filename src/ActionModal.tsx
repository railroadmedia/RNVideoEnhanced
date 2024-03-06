import React, { ReactNode, forwardRef, useImperativeHandle, useState } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  ViewStyle,
  StyleSheet,
} from 'react-native';
import { IS_IOS } from './helper';

interface IActionModal {
  children?: ReactNode;
  translucentStyle?: ViewStyle;
  modalStyle?: ViewStyle;
}

const ActionModal = forwardRef<{ toggleModal: (mState?: boolean) => void }, IActionModal>(
  (props, ref) => {
    const { translucentStyle, modalStyle, children } = props;
    const [modalVisible, setModalVisible] = useState(false);

    useImperativeHandle(ref, () => ({
      toggleModal,
    }));

    const toggleModal = (mState?: boolean): void =>
      setModalVisible(v => (mState === undefined ? !v : mState));

    return (
      <Modal
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => toggleModal()}
        supportedOrientations={['portrait', 'landscape']}
        animationType={'slide'}
      >
        <TouchableOpacity
          testID='modalBackground'
          activeOpacity={0.9}
          onPress={() => toggleModal()}
          style={[styles.modalBackground, translucentStyle]}
        >
          <KeyboardAvoidingView
            style={styles.keyboardAvoidingView}
            behavior={IS_IOS ? 'padding' : undefined}
          >
            <View testID='modalStyle' style={modalStyle}>
              {children}
            </View>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  modalBackground: {
    backgroundColor: 'rgba(0, 0, 0, .8)',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoidingView: {
    width: '100%',
    alignItems: 'center',
  },
});

export default ActionModal;
