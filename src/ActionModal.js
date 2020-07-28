/*

* actionStyle, actionText, modalStyle, translucentStyle, icon, buttonStyle
* actionStyle - style for the container of the button that opens the modal
* actionText - text of the button that opens the modal
* modalStyle: width and height of modal
* this component eliminates the need of a refference in the parent
  component (ref={r => this.reference = r}), for opening a modal with no
  position restraints relative to its parent

*/

import React from 'react';
import {
  View,
  Modal,
  Platform,
  TouchableOpacity,
  KeyboardAvoidingView
} from 'react-native';

let isiOS;
export default class ActionModal extends React.Component {
  state = {
    modalVisible: false
  };

  constructor(props) {
    super(props);

    isiOS = Platform.OS === 'ios';
  }

  toggleModal = mState =>
    new Promise(res =>
      this.setState(
        ({ modalVisible }) => ({
          modalVisible: mState === undefined ? !modalVisible : mState
        }),
        () => (isiOS ? (this.modalDismissed = res) : res())
      )
    );

  render() {
    return (
      <Modal
        transparent={true}
        visible={this.state.modalVisible}
        onDismiss={() => this.modalDismissed()}
        onRequestClose={() => this.toggleModal()}
        supportedOrientations={['portrait', 'landscape']}
        animationType='slide'
      >
        <TouchableOpacity
          testID='modalBackground'
          activeOpacity={0.9}
          onPress={() => this.toggleModal()}
          style={[
            {
              backgroundColor: 'rgba(0, 0, 0, .8)',
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center'
            },
            this.props.translucentStyle
          ]}
        >
          <KeyboardAvoidingView
            style={{
              width: '100%',
              alignItems: 'center'
            }}
            behavior={`${isiOS ? 'padding' : ''}`}
          >
            <View testID='modalStyle' style={this.props.modalStyle}>
              {this.props.children}
            </View>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    );
  }
}
