import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
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
import type { IVpe } from './entity';

interface IVideoSettings {
  qualities: IVpe[];
  onSaveSettings: (rate: string, quality: any, captions: string) => void;
  maxFontMultiplier?: number;
  showRate: boolean;
  showCaptions: boolean;
}

const rates = ['0.5', '0.75', '1.0', '1.25', '1.5', '1.75', '2.0'];

const VideoSettings = forwardRef<{ toggle: () => void }, IVideoSettings>((props, ref) => {
  const { qualities, showRate, showCaptions, onSaveSettings, maxFontMultiplier } = props;

  const [rate, setRate] = useState('1.0');
  const [captions, setCaptions] = useState('Off');
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
    const updateQ = qualities?.find(q => q?.selected);
    if (updateQ) {
      setQuality(updateQ);
    }
  }, [qualities]);

  useEffect(() => {
    const orientationListener = (orientation: string | string[]): void => {
      setIsLandscape(orientation.includes('LANDSCAPE'));
    };
    Orientation.getOrientation(orientationListener);
    Orientation.addDeviceOrientationListener(orientationListener);

    return () => {
      Orientation.removeDeviceOrientationListener(orientationListener);
    };
  }, []);

  const toggle = useCallback(
    (mVisible?: boolean): void => {
      const updateVisibility = typeof mVisible === 'boolean' ? mVisible : !modalVisible;
      if (updateVisibility) {
        prevQuality.current = quality;
      } else {
        delete prevQuality.current;
      }
      setModalVisible(updateVisibility);
      const updateQ = qualities.find(q => q.selected);
      if (updateQ) {
        setQuality(updateQ);
      }
    },
    [modalVisible, qualities, quality]
  );

  const onQualityChange = (updateQuality: IVpe): void => setQuality(updateQuality);

  const onRateChange = (newRate: string): void => setRate(newRate);

  const onCaptionsChange = (newCaptions: string): void => setCaptions(newCaptions);

  const onSave = useCallback((): void => {
    toggle(false);
    if (onSaveSettings) {
      onSaveSettings(rate, quality?.height, captions);
    }
  }, [rate, quality?.height, captions, onSaveSettings, toggle]);

  const onCancel = (): void => {
    if (prevQuality.current) {
      setQuality(prevQuality.current);
    }
    delete prevQuality.current;
    setModalVisible(false);
  };

  return (
    <Modal
      transparent={true}
      visible={modalVisible}
      onRequestClose={onCancel}
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
        <SafeAreaView style={styles.modalContent}>
          <ScrollView style={styles.scrollView}>
            <View style={styles.scrollView}>
              <SettingsOption
                title={
                  quality?.height === 'Auto' ? `Auto ${quality.actualH}p` : `${quality?.height}p`
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
              {showRate && (
                <SettingsOption
                  title={`${rate}X`}
                  iconName={'RateSvg'}
                  data={rates}
                  onSelect={item => onRateChange(item as string)}
                  itemTitle={item => `${item}X`}
                  selected={rate}
                />
              )}
              {showCaptions && (
                <SettingsOption
                  title={`Captions ${captions}`}
                  data={['On', 'Off']}
                  iconName={'CaptionsSvg'}
                  itemTitle={item => item as string}
                  onSelect={item => onCaptionsChange(item as string)}
                  selected={captions}
                />
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
  gradient: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    zIndex: 0,
  },
  modalBackground: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
  },
  scrollView: {
    transform: [{ scaleY: -1 }],
  },
  actionBottom: {
    padding: 15,
    alignItems: 'center',
    flexDirection: 'row',
  },
  actionTextBottom: {
    marginLeft: 10,
    fontFamily: 'OpenSans',
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
  actionText: {
    textAlign: 'center',
    fontFamily: 'BebasNeue',
    color: 'white',
    fontSize: 18,
  },
  cancelBtnText: {
    fontSize: 18,
    color: '#FFFFFF',
    padding: 10,
    alignSelf: 'center',
    textAlign: 'center',
    fontFamily: 'OpenSans-Bold',
  },
  option: {
    padding: 10,
    borderWidth: 0.5,
    flexDirection: 'row',
    paddingHorizontal: 30,
    fontFamily: 'OpenSans-Bold',
  },
});

export default VideoSettings;
