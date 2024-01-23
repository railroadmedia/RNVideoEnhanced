/* props: maxFontMultiplier */

import React from 'react';

import { View, Text, Modal, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Orientation from 'react-native-orientation-locker';

import SettingsOption from './SettingsOptions';

import { download, videoQuality, speed, check } from './img/svgs';

interface ISettingsProps {
  qualities: any;
  onSaveSettings: (rate: string, quality: any, captions: string) => void;
  maxFontMultiplier?: number;
  styles: any;
  settingsMode?: string;
  showRate: boolean;
  showCaptions: boolean;
  modalComponent: React.ReactElement;
}
type H = number | string;
interface IQuality {
  height: H;
  actualH: number;
}

interface ISettingsState {
  rate: string;
  captions: string;
  subSettings: string;
  modalVisible: boolean;
  quality: IQuality;
  isLandscape: boolean;
}

export default class VideoSettings extends React.PureComponent<ISettingsProps, ISettingsState> {
  state = {
    rate: '1.0',
    captions: 'Off',
    subSettings: '',
    modalVisible: false,
    quality: {
      height: 'Auto',
      actualH: 0
    },
    isLandscape: false
  };

  constructor(props) {
    super(props);
    this.state.quality = props.qualities.find(q => q.selected);
  }

  componentDidMount = () => {
    Orientation.getOrientation(this.orientationListener);
    Orientation.addDeviceOrientationListener(this.orientationListener);
  };

  orientationListener = orientation => {
    this.setState(() => ({ isLandscape: orientation.includes('LANDSCAPE') }));
  };

  onRequestClose = () => {};

  prevQuality?: IQuality = undefined;

  toggle = modalVisible =>
    this.setState(state => {
      modalVisible = modalVisible === 'boolean' ? modalVisible : !state.modalVisible;
      if (modalVisible) this.prevQuality = state.quality;
      else delete this.prevQuality;
      return {
        modalVisible,
        subSettings: '',
        quality: this.props.qualities.find(q => q.selected)
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
    if (onSaveSettings) onSaveSettings(rate, quality?.height, captions);
  };

  onCancel = () => {
    if (this.prevQuality) this.setState({ quality: this.prevQuality });
    delete this.prevQuality;
    this.toggle(false);
  };

  toggleRate = () => this.setState({ subSettings: 'rate' });

  toggleQuality = () => this.setState({ subSettings: 'quality' });

  toggleCaptions = () => this.setState({ subSettings: 'captions' });

  rates = ['0.5', '0.75', '1.0', '1.25', '1.5', '1.75', '2.0'];

  renderRate = (rate, propStyle) =>
    this.rates.map(s => (
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
            color: s === rate ? propStyle?.selectedOptionTextColor : propStyle?.unselectedOptionTextColor,
            fontFamily: s === rate ? 'OpenSans-Bold' : 'OpenSans'
          }}
        >
          {s}X
        </Text>
      </TouchableOpacity>
    ));

  renderQualities = (qualities, quality, propStyle) =>
    qualities?.map(q => (
      <TouchableOpacity
        key={q?.height}
        style={[
          styles[this.props.settingsMode === 'bottom' ? 'optionBottom' : 'option'],
          {
            borderColor: propStyle?.optionsBorderColor
          }
        ]}
        onPress={() => this.onQualityChange(q)}
      >
        {this.props.settingsMode === 'bottom' && (
          <>
            {this.state.quality?.height === q?.height ? (
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
              q?.height === quality?.height ? propStyle?.selectedOptionTextColor : propStyle?.unselectedOptionTextColor,
            fontFamily: 'OpenSans',
            marginLeft: this.props.settingsMode === 'bottom' ? 10 : 0
          }}
        >
          {q?.height}
          {q?.height === 'Auto' ? ` ${q?.actualH}p` : 'p'}
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
            color: c === captions ? propStyle?.selectedOptionTextColor : propStyle?.unselectedOptionTextColor,
            fontFamily: c === captions ? 'OpenSans-Bold' : 'OpenSans'
          }}
        >
          {c}
        </Text>
      </TouchableOpacity>
    ));

  render() {
    let {
      state: { rate, quality, captions, subSettings, modalVisible, isLandscape },
      props: { showRate, qualities, showCaptions, settingsMode, styles: propStyle }
    } = this;
    return (
      <Modal
        transparent={true}
        visible={modalVisible}
        onRequestClose={this.onRequestClose}
        supportedOrientations={['portrait', 'landscape']}
        animationType={'none'}
      >
        <LinearGradient style={styles.gradient} colors={['rgba(0, 12, 23, 0.69)', 'rgba(0, 12, 23, 1)']} />
        <TouchableOpacity
          style={styles.modalBackground}
          onPress={this.onCancel}
          accessible={Platform.OS === 'ios' ? false : true}
        >
          <SafeAreaView style={[styles.modalContent]}>
            <ScrollView style={{ transform: [{ scaleY: -1 }] }}>
              <View style={{ transform: [{ scaleY: -1 }] }}>
                {subSettings === 'quality' ? (
                  this.renderQualities(qualities, quality, propStyle)
                ) : subSettings === 'rate' ? (
                  this.renderRate(rate, propStyle)
                ) : subSettings === 'captions' ? (
                  this.renderCaptions(captions, propStyle)
                ) : (
                  <>
                    {settingsMode === 'bottom' ? (
                      <TouchableOpacity style={styles.actionBottom} onPress={this.toggleQuality}>
                        {videoQuality({
                          width: 20,
                          height: 20,
                          fill: 'black'
                        })}
                        <Text style={styles.actionTextBottom}>
                          Video Quality -{' '}
                          {quality?.height === 'Auto' ? `Auto (${quality?.actualH}p)` : `${quality?.height}p`}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <SettingsOption
                        title={quality?.height === 'Auto' ? `Auto ${quality?.actualH}p` : `${quality?.height}p`}
                        iconName={'CameraSvg'}
                        data={qualities}
                        onSelect={(item: IQuality) => this.onQualityChange(item)}
                        itemTitle={item => (item?.height === 'Auto' ? `Auto ${item?.actualH}p` : `${item?.height}p`)}
                        selected={quality}
                      />
                    )}
                    {showRate && (
                      <>
                        {settingsMode === 'bottom' ? (
                          <TouchableOpacity onPress={this.toggleRate} style={styles.actionBottom}>
                            {speed({
                              width: 20,
                              height: 20,
                              fill: 'black'
                            })}
                            <Text style={styles.actionTextBottom}>
                              Playback Speed - {rate === '1.0' ? 'Normal' : `${rate}X`}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <SettingsOption
                            title={`${rate}X`}
                            iconName={'RateSvg'}
                            data={this.rates}
                            onSelect={item => this.onRateChange(item)}
                            itemTitle={item => `${item}X`}
                            selected={rate}
                          />
                        )}
                      </>
                    )}
                    {showCaptions && (
                      <>
                        {settingsMode === 'bottom' ? (
                          <TouchableOpacity onPress={this.toggleCaptions} style={styles.actionBottom}>
                            {speed({
                              width: 20,
                              height: 20,
                              fill: 'black'
                            })}
                            <Text style={styles.actionTextBottom}>Captions</Text>
                          </TouchableOpacity>
                        ) : (
                          <SettingsOption
                            title={`Captions ${captions}`}
                            data={['On', 'Off']}
                            iconName={'CaptionsSvg'}
                            itemTitle={item => item}
                            onSelect={item => this.onCaptionsChange(item)}
                            selected={captions}
                          />
                        )}
                      </>
                    )}
                  </>
                )}
              </View>
            </ScrollView>

            <TouchableOpacity
              onPress={this.onSave}
              style={[
                styles.action,
                {
                  marginTop: isLandscape ? 10 : 50,
                  marginBottom: isLandscape ? 10 : 70
                }
              ]}
            >
              <Text maxFontSizeMultiplier={this.props.maxFontMultiplier} style={styles.actionText}>
                SAVE
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={this.onCancel}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </TouchableOpacity>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1
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
    paddingHorizontal: 50,
    borderRadius: 50,
    height: 40,
    backgroundColor: 'clear',
    borderColor: 'white',
    borderWidth: 2,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center'
  },
  actionBottom: {
    padding: 15,
    alignItems: 'center',
    flexDirection: 'row'
  },
  actionText: {
    textAlign: 'center',
    fontFamily: 'BebasNeue',
    color: 'white',
    fontSize: 18
  },
  actionTextBottom: {
    marginLeft: 10,
    fontFamily: 'OpenSans'
  },
  gradient: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    zIndex: 0
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center'
  },
  cancelBtnText: {
    fontSize: 18,
    color: '#FFFFFF',
    padding: 10,
    alignSelf: 'center',
    textAlign: 'center',
    fontFamily: 'OpenSans-Bold'
  }
});
