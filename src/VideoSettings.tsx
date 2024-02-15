import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Orientation from 'react-native-orientation-locker';

import SettingsOption from './SettingsOptions';
import { download, videoQuality, speed, check } from './img/svgs';
import type { IVpe } from './entity';

interface IVideoSettings {
  qualities: IVpe[];
  onSaveSettings: (rate: string, quality: any, captions: string) => void;
  maxFontMultiplier?: number;
  styles: any;
  settingsMode?: string;
  showRate: boolean;
  showCaptions: boolean;
}

const rates = ['0.5', '0.75', '1.0', '1.25', '1.5', '1.75', '2.0'];

const VideoSettings = forwardRef<{ toggle: () => void }, IVideoSettings>((props, ref) => {
  const {
    qualities,
    settingsMode,
    showRate,
    showCaptions,
    onSaveSettings,
    styles: propStyle,
    maxFontMultiplier,
  } = props;

  const [rate, setRate] = useState('1.0');
  const [captions, setCaptions] = useState('Off');
  const [subSettings, setSubSettings] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [quality, setQuality] = useState<IVpe>({
    height: 'Auto',
    actualH: 0,
  });
  const [isLandscape, setIsLandscape] = useState(false);
  const prevQuality = useRef<IVpe | undefined>();

  useImperativeHandle(ref, () => ({
    toggle,
  }));

  useEffect(() => {
    const q = qualities?.find(q => q?.selected);
    if (q) {
      setQuality(q);
    }
  }, [qualities]);

  useEffect(() => {
    const orientationListener = (orientation: string | string[]) => {
      setIsLandscape(orientation.includes('LANDSCAPE'));
    };
    Orientation.getOrientation(orientationListener);
    Orientation.addDeviceOrientationListener(orientationListener);

    return () => {
      Orientation.removeDeviceOrientationListener(orientationListener);
    };
  }, []);

  const onRequestClose = () => {};

  const toggle = (modalVisible?: boolean) => {
    modalVisible = typeof modalVisible === 'boolean' ? modalVisible : !modalVisible;
    if (modalVisible) {
      prevQuality.current = quality;
    } else {
      delete prevQuality.current; // delete
    }
    setModalVisible(modalVisible);
    setSubSettings('');
    const q = qualities.find(q => q.selected);
    if (q) {
      setQuality(q);
    }
  };

  const onQualityChange = (quality: IVpe) => {
    setQuality(quality);
    if (subSettings) {
      onSave();
    }
  };

  const onRateChange = (rate: string) => {
    setRate(rate);
    if (subSettings) {
      onSave();
    }
  };

  const onCaptionsChange = (captions: string) => {
    setCaptions(captions);
    if (subSettings) {
      onSave();
    }
  };

  const onSave = () => {
    toggle(false);
    delete prevQuality.current; // delete
    if (onSaveSettings) {
      onSaveSettings(rate, quality?.height, captions);
    }
  };

  const onCancel = () => {
    if (prevQuality.current) {
      setQuality(prevQuality.current);
    }
    delete prevQuality.current; // delete
    toggle(false);
  };

  const toggleRate = () => setSubSettings('rate');

  const toggleQuality = () => setSubSettings('quality');

  const toggleCaptions = () => setSubSettings('captions');

  const renderRate = (rate: string) =>
    rates.map(s => (
      <TouchableOpacity
        key={s}
        style={[
          styles.option,
          {
            borderColor: propStyle?.optionsBorderColor,
          },
        ]}
        onPress={() => onRateChange(s)}
      >
        <Text
          maxFontSizeMultiplier={maxFontMultiplier}
          style={{
            color:
              s === rate
                ? propStyle?.selectedOptionTextColor
                : propStyle?.unselectedOptionTextColor,
            fontFamily: s === rate ? 'OpenSans-Bold' : 'OpenSans',
          }}
        >
          {s}X
        </Text>
      </TouchableOpacity>
    ));

  const renderQualities = (qualities: IVpe[], quality: IVpe) =>
    qualities?.map(q => (
      <TouchableOpacity
        key={q?.height}
        style={[
          styles[settingsMode === 'bottom' ? 'optionBottom' : 'option'],
          {
            borderColor: propStyle?.optionsBorderColor,
          },
        ]}
        onPress={() => onQualityChange(q)}
      >
        {settingsMode === 'bottom' && (
          <>
            {quality?.height === q?.height ? (
              check({
                width: 20,
                height: 20,
                fill: 'black',
              })
            ) : (
              <View style={{ width: 20 }} />
            )}
          </>
        )}
        <Text
          maxFontSizeMultiplier={maxFontMultiplier}
          style={{
            color:
              q?.height === quality?.height
                ? propStyle?.selectedOptionTextColor
                : propStyle?.unselectedOptionTextColor,
            fontFamily: 'OpenSans',
            marginLeft: settingsMode === 'bottom' ? 10 : 0,
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
            ...propStyle?.downloadIcon,
          })}
      </TouchableOpacity>
    ));

  const renderCaptions = (captions: string) =>
    ['On', 'Off'].map(c => (
      <TouchableOpacity
        key={c}
        style={[
          styles.option,
          {
            borderColor: propStyle?.optionsBorderColor,
          },
        ]}
        onPress={() => onCaptionsChange(c)}
      >
        <Text
          maxFontSizeMultiplier={maxFontMultiplier}
          style={{
            color:
              c === captions
                ? propStyle?.selectedOptionTextColor
                : propStyle?.unselectedOptionTextColor,
            fontFamily: c === captions ? 'OpenSans-Bold' : 'OpenSans',
          }}
        >
          {c}
        </Text>
      </TouchableOpacity>
    ));

  return (
    <Modal
      transparent={true}
      visible={modalVisible}
      onRequestClose={onRequestClose}
      supportedOrientations={['portrait', 'landscape']}
      animationType={'none'}
    >
      <LinearGradient
        style={styles.gradient}
        colors={['rgba(0, 12, 23, 0.69)', 'rgba(0, 12, 23, 1)']}
      />
      <TouchableOpacity
        style={styles.modalBackground}
        onPress={onCancel}
        accessible={Platform.OS === 'ios' ? false : true}
      >
        <SafeAreaView style={[styles.modalContent]}>
          <ScrollView style={{ transform: [{ scaleY: -1 }] }}>
            <View style={{ transform: [{ scaleY: -1 }] }}>
              {subSettings === 'quality' ? (
                renderQualities(qualities, quality)
              ) : subSettings === 'rate' ? (
                renderRate(rate)
              ) : subSettings === 'captions' ? (
                renderCaptions(captions)
              ) : (
                <>
                  {settingsMode === 'bottom' ? (
                    <TouchableOpacity style={styles.actionBottom} onPress={toggleQuality}>
                      {videoQuality({
                        width: 20,
                        height: 20,
                        fill: 'black',
                      })}
                      <Text style={styles.actionTextBottom}>
                        {`Video Quality - ${quality?.height === 'Auto' ? `Auto (${quality?.actualH}p)` : `${quality?.height}p`}`}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <SettingsOption
                      title={
                        quality?.height === 'Auto'
                          ? `Auto ${quality.actualH}p`
                          : `${quality?.height}p`
                      }
                      iconName={'CameraSvg'}
                      data={qualities}
                      onSelect={item => onQualityChange(item as IVpe)}
                      itemTitle={item =>
                        (item as IVpe)?.height === 'Auto'
                          ? `Auto ${(item as IVpe)?.actualH}p`
                          : `${(item as IVpe)?.height}p`
                      }
                      selected={quality}
                    />
                  )}
                  {showRate && (
                    <>
                      {settingsMode === 'bottom' ? (
                        <TouchableOpacity onPress={toggleRate} style={styles.actionBottom}>
                          {speed({
                            width: 20,
                            height: 20,
                            fill: 'black',
                          })}
                          <Text style={styles.actionTextBottom}>
                            {`Playback Speed - ${rate === '1.0' ? 'Normal' : `${rate}X`}`}
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <SettingsOption
                          title={`${rate}X`}
                          iconName={'RateSvg'}
                          data={rates}
                          onSelect={item => onRateChange(item as string)}
                          itemTitle={item => `${item}X`}
                          selected={rate}
                        />
                      )}
                    </>
                  )}
                  {showCaptions && (
                    <>
                      {settingsMode === 'bottom' ? (
                        <TouchableOpacity onPress={toggleCaptions} style={styles.actionBottom}>
                          {speed({
                            width: 20,
                            height: 20,
                            fill: 'black',
                          })}
                          <Text style={styles.actionTextBottom}>{'Captions'}</Text>
                        </TouchableOpacity>
                      ) : (
                        <SettingsOption
                          title={`Captions ${captions}`}
                          data={['On', 'Off']}
                          iconName={'CaptionsSvg'}
                          itemTitle={item => item as string}
                          onSelect={item => onCaptionsChange(item as string)}
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
            onPress={onSave}
            style={[
              styles.action,
              {
                marginTop: isLandscape ? 10 : 50,
                marginBottom: isLandscape ? 10 : 70,
              },
            ]}
          >
            <Text maxFontSizeMultiplier={maxFontMultiplier} style={styles.actionText}>
              {'SAVE'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.cancelBtnText}>{'Close'}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </TouchableOpacity>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
  },
  modalBackgroundBottom: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,.5)',
  },
  scrollContainer: {
    margin: 20,
    maxHeight: '80%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  scrollContainerBottom: {},
  option: {
    padding: 10,
    borderWidth: 0.5,
    flexDirection: 'row',
    paddingHorizontal: 30,
    fontFamily: 'OpenSans-Bold',
  },
  optionBottom: {
    padding: 15,
    borderWidth: 0.5,
    flexDirection: 'row',
    fontFamily: 'OpenSans-Bold',
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
    alignItems: 'center',
  },
  actionBottom: {
    padding: 15,
    alignItems: 'center',
    flexDirection: 'row',
  },
  actionText: {
    textAlign: 'center',
    fontFamily: 'BebasNeue',
    color: 'white',
    fontSize: 18,
  },
  actionTextBottom: {
    marginLeft: 10,
    fontFamily: 'OpenSans',
  },
  gradient: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    zIndex: 0,
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 18,
    color: '#FFFFFF',
    padding: 10,
    alignSelf: 'center',
    textAlign: 'center',
    fontFamily: 'OpenSans-Bold',
  },
});

export default VideoSettings;
