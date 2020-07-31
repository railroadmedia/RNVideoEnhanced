/* props: maxFontMultiplier */

import React from 'react';

import {
  View,
  Text,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-navigation';

import ExpandableView from './ExpandableView';

import { download } from './img/svgs';

let isiOS;
export default class VideoSettings extends React.PureComponent {
  state = {
    rate: '1.0',
    captions: 'Off',
    modalVisible: false
  };

  constructor(props) {
    super(props);
    this.state.quality = props.qualities.find(q => q.selected);
    isiOS = Platform.OS === 'ios';
  }

  onRequestClose = () => {};

  toggle = modalVisible => {
    this.setState(state => {
      modalVisible =
        modalVisible === 'boolean' ? modalVisible : !state.modalVisible;
      if (modalVisible) this.prevQuality = this.state.quality;
      else delete this.prevQuality;
      return {
        modalVisible,
        quality: this.props.qualities.find(q => q.selected)
      };
    });
  };

  onQualityChange = quality => {
    this.setState({ quality });
  };

  onRateChange = rate => {
    this.setState({ rate });
  };

  onCaptionsChange = captions => {
    this.setState({ captions });
  };

  onSave = () => {
    this.toggle(false);
    delete this.prevQuality;
    let { onSaveSettings } = this.props;
    let { rate, quality, captions } = this.state;
    if (onSaveSettings) onSaveSettings(rate, quality.height, captions);
  };

  onCancel = () => {
    if (this.prevQuality) this.setState({ quality: this.prevQuality });
    delete this.prevQuality;
    this.toggle(false);
  };

  render() {
    let {
      state: { quality, rate, captions },
      props: { qualities, showCaptions, showRate, styles: propStyle }
    } = this;
    return (
      <Modal
        transparent={true}
        visible={this.state.modalVisible}
        onRequestClose={this.onRequestClose}
        supportedOrientations={['portrait', 'landscape']}
      >
        <SafeAreaView
          style={{ flex: 1 }}
          forceInset={{
            top: 'always',
            left: 'always',
            right: 'always',
            bottom: 'never'
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={this.onCancel}
            style={styles.modalBackground}
          >
            <View
              style={[
                styles.scrollContainer,
                {
                  backgroundColor: propStyle?.background
                }
              ]}
            >
              <ScrollView>
                <ExpandableView
                  iconColor={'blue'}
                  titleStyle={{
                    ...styles.expandableTitle,
                    color: propStyle?.selectedOptionTextColor
                  }}
                  title={
                    quality.height === 'Auto'
                      ? `Auto ${quality.actualH}p`
                      : `${quality.height}p`
                  }
                >
                  {qualities.map(q => (
                    <TouchableOpacity
                      key={q.height}
                      style={[
                        styles.option,
                        { borderColor: propStyle?.optionsBorderColor }
                      ]}
                      onPress={() => this.onQualityChange(q)}
                    >
                      <Text
                        maxFontSizeMultiplier={this.props.maxFontMultiplier}
                        style={{
                          color:
                            q.height === quality.height
                              ? propStyle?.selectedOptionTextColor
                              : propStyle?.unselectedOptionTextColor,
                          fontFamily:
                            q.height === quality.height
                              ? 'OpenSans-Bold'
                              : isiOS
                              ? 'OpenSans-Regular'
                              : 'OpenSans-Regular'
                        }}
                      >
                        {q.height}
                        {q.height === 'Auto' ? ` ${q.actualH}p` : 'p'}
                      </Text>
                      {q.file &&
                        q.file.indexOf('http') < 0 &&
                        download({
                          width: 20,
                          height: 20,
                          fill: 'black',
                          ...propStyle?.downloadIcon
                        })}
                    </TouchableOpacity>
                  ))}
                </ExpandableView>
                <View
                  style={{
                    height: 0.5,
                    backgroundColor: propStyle?.separatorColor
                  }}
                />
                {showRate && (
                  <ExpandableView
                    title={`${rate}X`}
                    iconColor={'blue'}
                    titleStyle={{
                      ...styles.expandableTitle,
                      color: propStyle?.selectedOptionTextColor
                    }}
                  >
                    {['0.5', '0.75', '1.0', '1.25', '1.5', '1.75', '2.0'].map(
                      s => (
                        <TouchableOpacity
                          key={s}
                          style={[
                            styles.option,
                            { borderColor: propStyle?.optionsBorderColor }
                          ]}
                          onPress={() => this.onRateChange(s)}
                        >
                          <Text
                            maxFontSizeMultiplier={this.props.maxFontMultiplier}
                            style={{
                              color:
                                s === rate
                                  ? propStyle?.selectedOptionTextColor
                                  : propStyle?.unselectedOptionTextColor,
                              fontFamily:
                                s === rate
                                  ? 'OpenSans-Bold'
                                  : isiOS
                                  ? 'OpenSans-Regular'
                                  : 'OpenSans-Regular'
                            }}
                          >
                            {s}X
                          </Text>
                        </TouchableOpacity>
                      )
                    )}
                  </ExpandableView>
                )}
                <View
                  style={{
                    height: 0.5,
                    backgroundColor: propStyle?.separatorColor
                  }}
                />
                {showCaptions && (
                  <ExpandableView
                    title={`Captions ${captions}`}
                    iconColor={'blue'}
                    titleStyle={{
                      ...styles.expandableTitle,
                      color: propStyle?.selectedOptionTextColor
                    }}
                  >
                    {['On', 'Off'].map(c => (
                      <TouchableOpacity
                        key={c}
                        style={[
                          styles.option,
                          { borderColor: propStyle?.optionsBorderColor }
                        ]}
                        onPress={() => this.onCaptionsChange(c)}
                      >
                        <Text
                          maxFontSizeMultiplier={this.props.maxFontMultiplier}
                          style={{
                            color:
                              c === captions
                                ? propStyle?.selectedOptionTextColor
                                : propStyle?.unselectedOptionTextColor,
                            fontFamily:
                              c === captions
                                ? 'OpenSans-Bold'
                                : isiOS
                                ? 'OpenSans-Regular'
                                : 'OpenSans-Regular'
                          }}
                        >
                          {c}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ExpandableView>
                )}
                {showCaptions && (
                  <View
                    style={{
                      height: 0.5,
                      backgroundColor: propStyle?.separatorColor
                    }}
                  />
                )}
              </ScrollView>
              <TouchableOpacity
                onPress={this.onSave}
                style={[
                  styles.action,
                  { margin: 20, backgroundColor: propStyle?.save?.background }
                ]}
              >
                <Text
                  maxFontSizeMultiplier={this.props.maxFontMultiplier}
                  style={[styles.actionText, { color: propStyle?.save?.color }]}
                >
                  SAVE
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  ...styles.action,
                  backgroundColor: propStyle?.cancel?.background
                }}
                onPress={this.onCancel}
              >
                <Text
                  maxFontSizeMultiplier={this.props.maxFontMultiplier}
                  style={[
                    styles.actionText,
                    { color: propStyle?.cancel?.color }
                  ]}
                >
                  CANCEL
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    justifyContent: 'center'
  },
  scrollContainer: {
    margin: 20,
    maxHeight: '80%',
    borderRadius: 20,
    overflow: 'hidden'
  },
  expandableTitle: {
    paddingHorizontal: 20,
    fontFamily: 'OpenSans-Bold'
  },
  option: {
    padding: 10,
    borderWidth: 0.5,
    flexDirection: 'row',
    paddingHorizontal: 30,
    fontFamily: 'OpenSans-Bold'
  },
  action: {
    padding: 15,
    borderRadius: 50,
    marginHorizontal: 30
  },
  actionText: {
    textAlign: 'center',
    fontFamily: 'OpenSans-Bold'
  }
});
