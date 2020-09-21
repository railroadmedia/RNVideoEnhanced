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

import { download, x, videoQuality, speed, check } from './img/svgs';

export default class VideoSettings extends React.PureComponent {
  state = {
    rate: '1.0',
    captions: 'Off',
    subSettings: '',
    modalVisible: false
  };

  constructor(props) {
    super(props);
    this.state.quality = props.qualities.find(q => q.selected);
  }

  onRequestClose = () => {};

  toggle = modalVisible =>
    this.setState(state => {
      modalVisible =
        modalVisible === 'boolean' ? modalVisible : !state.modalVisible;
      if (modalVisible) this.prevQuality = this.state.quality;
      else delete this.prevQuality;
      return {
        modalVisible,
        subSettings: ''
      };
    });

  onQualityChange = quality =>
    this.setState({ quality }, () => {
      if (this.state.subSettings) this.onSave();
    });

  onRateChange = rate =>
    this.setState({ rate }, () => {
      if (this.state.subSettings) this.onSave();
    });

  onCaptionsChange = captions =>
    this.setState({ captions }, () => {
      if (this.state.subSettings) this.onSave();
    });

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

  toggleRate = () => this.setState({ subSettings: 'rate' });

  toggleQuality = () => this.setState({ subSettings: 'quality' });

  toggleCaptions = () => this.setState({ subSettings: 'captions' });

  renderRate = (rate, propStyle) =>
    ['0.5', '0.75', '1.0', '1.25', '1.5', '1.75', '2.0'].map(s => (
      <TouchableOpacity
        key={s}
        style={[
          styles.option,
          {
            borderColor: propStyle?.optionsBorderColor
          }
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
            fontFamily: s === rate ? 'OpenSans-Bold' : 'OpenSans'
          }}
        >
          {s}X
        </Text>
      </TouchableOpacity>
    ));

  renderQualities = (qualities, quality, propStyle) =>
    qualities.map(q => (
      <TouchableOpacity
        key={q.height}
        style={[
          styles[
            this.props.settingsMode === 'bottom' ? 'optionBottom' : 'option'
          ],
          {
            borderColor: propStyle?.optionsBorderColor
          }
        ]}
        onPress={() => this.onQualityChange(q)}
      >
        {this.props.settingsMode === 'bottom' && (
          <>
            {this.state.quality.height === q.height ? (
              check({
                width: 20,
                height: 20,
                fill: 'black'
              })
            ) : (
              <View style={{ width: 20 }} />
            )}
          </>
        )}
        <Text
          maxFontSizeMultiplier={this.props.maxFontMultiplier}
          style={{
            color:
              q.height === quality.height
                ? propStyle?.selectedOptionTextColor
                : propStyle?.unselectedOptionTextColor,
            fontFamily: 'OpenSans',
            marginLeft: this.props.settingsMode === 'bottom' ? 10 : 0
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
    ));

  renderCaptions = (captions, propStyle) =>
    ['On', 'Off'].map(c => (
      <TouchableOpacity
        key={c}
        style={[
          styles.option,
          {
            borderColor: propStyle?.optionsBorderColor
          }
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
            fontFamily: c === captions ? 'OpenSans-Bold' : 'OpenSans'
          }}
        >
          {c}
        </Text>
      </TouchableOpacity>
    ));

  render() {
    let {
      state: { rate, quality, captions, subSettings },
      props: {
        showRate,
        qualities,
        showCaptions,
        settingsMode,
        styles: propStyle
      }
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
            style={
              settingsMode === 'bottom'
                ? styles.modalBackgroundBottom
                : styles.modalBackground
            }
          >
            <SafeAreaView
              forceInset={{
                top: 'never',
                left: 'never',
                right: 'never',
                bottom: 'always'
              }}
              style={[
                settingsMode === 'bottom'
                  ? styles.scrollContainerBottom
                  : styles.scrollContainer,
                {
                  backgroundColor: propStyle?.background || 'white'
                }
              ]}
            >
              <ScrollView>
                {subSettings === 'quality' ? (
                  this.renderQualities(qualities, quality, propStyle)
                ) : subSettings === 'rate' ? (
                  this.renderRate(rate, propStyle)
                ) : subSettings === 'captions' ? (
                  this.renderCaptions(captions, propStyle)
                ) : (
                  <>
                    {settingsMode === 'bottom' ? (
                      <TouchableOpacity
                        style={styles.actionBottom}
                        onPress={this.toggleQuality}
                      >
                        {videoQuality({
                          width: 20,
                          height: 20,
                          fill: 'black'
                        })}
                        <Text style={styles.actionTextBottom}>
                          Video Quality -{' '}
                          {quality.height === 'Auto'
                            ? `Auto (${quality.actualH}p)`
                            : `${quality.height}p`}
                        </Text>
                      </TouchableOpacity>
                    ) : (
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
                        {this.renderQualities(qualities, quality, propStyle)}
                      </ExpandableView>
                    )}
                    <View
                      style={{
                        height: 0.5,
                        backgroundColor: propStyle?.separatorColor || 'black'
                      }}
                    />
                    {showRate && (
                      <>
                        {settingsMode === 'bottom' ? (
                          <TouchableOpacity
                            onPress={this.toggleRate}
                            style={styles.actionBottom}
                          >
                            {speed({
                              width: 20,
                              height: 20,
                              fill: 'black'
                            })}
                            <Text style={styles.actionTextBottom}>
                              Playback Speed -{' '}
                              {rate === '1.0' ? 'Normal' : `${rate}X`}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <ExpandableView
                            title={`${rate}X`}
                            iconColor={'blue'}
                            titleStyle={{
                              ...styles.expandableTitle,
                              color: propStyle?.selectedOptionTextColor
                            }}
                          >
                            {this.renderRate(rate, propStyle)}
                          </ExpandableView>
                        )}
                      </>
                    )}
                    <View
                      style={{
                        height: 0.5,
                        backgroundColor: propStyle?.separatorColor || 'black'
                      }}
                    />
                    {showCaptions && (
                      <>
                        {settingsMode === 'bottom' ? (
                          <TouchableOpacity
                            onPress={this.toggleCaptions}
                            style={styles.actionBottom}
                          >
                            {speed({
                              width: 20,
                              height: 20,
                              fill: 'black'
                            })}
                            <Text style={styles.actionTextBottom}>
                              Captions
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <ExpandableView
                            title={`Captions ${captions}`}
                            iconColor={'blue'}
                            titleStyle={{
                              ...styles.expandableTitle,
                              color: propStyle?.selectedOptionTextColor
                            }}
                          >
                            {this.renderCaptions(captions, propStyle)}
                          </ExpandableView>
                        )}
                      </>
                    )}
                    {showCaptions && (
                      <View
                        style={{
                          height: 0.5,
                          backgroundColor: propStyle?.separatorColor || 'black'
                        }}
                      />
                    )}
                  </>
                )}
              </ScrollView>
              {settingsMode !== 'bottom' && (
                <TouchableOpacity
                  onPress={this.onSave}
                  style={[
                    styles.action,
                    {
                      margin: 20,
                      marginBottom: 0,
                      backgroundColor: propStyle?.save?.background || 'black'
                    }
                  ]}
                >
                  <Text
                    maxFontSizeMultiplier={this.props.maxFontMultiplier}
                    style={[
                      styles.actionText,
                      {
                        color: propStyle?.save?.color || 'white'
                      }
                    ]}
                  >
                    SAVE
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={{
                  ...styles[
                    settingsMode === 'bottom' ? 'actionBottom' : 'action'
                  ],
                  backgroundColor: propStyle?.cancel?.background
                }}
                onPress={this.onCancel}
              >
                {x({
                  width: 18,
                  height: 18,
                  fill: 'black'
                })}
                <Text
                  maxFontSizeMultiplier={this.props.maxFontMultiplier}
                  style={[
                    styles[
                      settingsMode === 'bottom'
                        ? 'actionTextBottom'
                        : 'actionText'
                    ],
                    { color: propStyle?.cancel?.color }
                  ]}
                >
                  {settingsMode === 'bottom' ? 'Cancel' : 'CANCEL'}
                </Text>
              </TouchableOpacity>
            </SafeAreaView>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,.5)'
  },
  modalBackgroundBottom: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,.5)'
  },
  scrollContainer: {
    margin: 20,
    maxHeight: '80%',
    borderRadius: 20,
    overflow: 'hidden'
  },
  scrollContainerBottom: {},
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
  optionBottom: {
    padding: 15,
    borderWidth: 0.5,
    flexDirection: 'row',
    fontFamily: 'OpenSans-Bold'
  },
  action: {
    padding: 15,
    borderRadius: 50,
    marginHorizontal: 30
  },
  actionBottom: {
    padding: 15,
    alignItems: 'center',
    flexDirection: 'row'
  },
  actionText: {
    textAlign: 'center',
    fontFamily: 'OpenSans-Bold'
  },
  actionTextBottom: {
    marginLeft: 10,
    fontFamily: 'OpenSans'
  }
});
