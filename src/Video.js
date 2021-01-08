/*
    props: connection, onUpdateVideoProgress, aCasting,
      gCasting, quality, onQualityChange, onACastingChange, onGCastingChange
      onOrientationChange, maxFontMultiplier, offlinePath
*/
import React from 'react';
import {
  View,
  Text,
  Image,
  AppState,
  Animated,
  Platform,
  StatusBar,
  Dimensions,
  PixelRatio,
  StyleSheet,
  PanResponder,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';

import { SafeAreaView } from 'react-navigation';

import RNFetchBlob from 'rn-fetch-blob';
// import YouTube from 'react-native-youtube';
import WebView from 'react-native-webview';
import DeviceInfo from 'react-native-device-info';
import Orientation from 'react-native-orientation-locker';
import RNVideo, { TextTrackType } from 'react-native-video';
import GoogleCast, { CastButton } from 'react-native-google-cast';
import PrefersHomeIndicatorAutoHidden from 'react-native-home-indicator';
import {
  AirPlay,
  AirPlayButton,
  AirPlayListener
} from 'react-native-airplay-ios';

import ActionModal from './ActionModal';
import VideoTimer from './VideoTimer';
import VideoSettings from './VideoSettings';
import AnimatedCustomAlert from './AnimatedCustomAlert';

import networkSpeedService from './services/networkSpeed.service';

import { svgs } from './img/svgs';

const pixR = PixelRatio.get();
const isiOS = Platform.OS === 'ios';
const isTablet = DeviceInfo.isTablet();
const iconStyle = { width: 40, height: 40, fill: 'white' };
let cTime,
  videoW,
  videoH,
  aCasting,
  gCasting,
  aListener,
  connection,
  orientation,
  gListenerMP,
  gListenerSE,
  gListenerSS,
  windowWidth,
  offlinePath,
  windowHeight,
  quality = 'Auto',
  greaterWidthHeight;

export default class Video extends React.Component {
  state = {
    rate: '1.0',
    paused: true,
    captionsHidden: true,
    videoRefreshing: false,
    showControls: true,
    repeat: false
  };

  constructor(props) {
    super(props);

    if (gCasting) {
      if (props.youtubeId) {
        gCasting = false;
        GoogleCast.endSession();
      }
      GoogleCast.pause();
    }
    connection = !!props.connection;
    quality = props.quality || quality;
    aCasting = props.aCasting || aCasting;
    gCasting = props.gCasting || gCasting;
    cTime = props.content.lastWatchedPosInSec;
    orientation = props.orientation || orientation;
    windowWidth = Math.round(Dimensions.get('screen').width);
    windowHeight = Math.round(Dimensions.get('screen').height);
    greaterWidthHeight =
      windowWidth < windowHeight ? windowHeight : windowWidth;
    offlinePath =
      props.offlinePath || isiOS
        ? RNFetchBlob.fs.dirs.LibraryDir
        : RNFetchBlob.fs.dirs.DocumentDir;
    this.getVideoDimensions();

    if (!props.content.youtubeId) this.bufferingOpacity = new Animated.Value(1);
    this.translateControls = new Animated.Value(0);
    this.translateBlueX = new Animated.Value(-videoW);

    this.state.mp3s = props.content.mp3s;
    if (!props.content.youtubeId)
      this.state.vpe = this.filterVideosByResolution();
    this.state.fullscreen = !isTablet && windowWidth > windowHeight;
    this.state.paused = props.paused;
    this.state.repeat = props.repeat ? props.repeat : false;
    this.state.showControls = props.showControls;
    if (isTablet)
      this.state.tabOrientation =
        orientation || (windowWidth > windowHeight ? 'LANDSCAPE' : 'PORTRAIT');
    try {
      this.state.mp3s[0].selected = true;
    } catch (e) {}
  }

  componentDidMount() {
    if (!this.props.content.youtubeId) {
      this.appleCastingListeners();
      this.googleCastingListeners();
      this.selectQuality(quality || 'Auto');
    }
    AppState.addEventListener('change', this.handleAppStateChange);
    Orientation.addDeviceOrientationListener(this.orientationListener);
  }

  componentWillUnmount() {
    this.updateVideoProgress();
    clearTimeout(this.controlsTO);
    clearTimeout(this.bufferingTO);
    clearTimeout(this.bufferingTooLongTO);
    if (!this.props.content.youtubeId) {
      aListener?.remove();
      gListenerMP?.remove();
      gListenerSE?.remove();
      gListenerSS?.remove();
    }
    AppState.removeEventListener('change', this.handleAppStateChange);
    Orientation.removeDeviceOrientationListener(this.orientationListener);
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (this.props.type !== nextProps.type) return true;
    if (this.props.content.isLive !== nextProps.content.isLive) return true;
    for (let key in this.state) {
      if (typeof this.state[key] === 'object')
        for (let oKey in this.state[key]) {
          if (typeof this.state[key][oKey] === 'object')
            for (let ooKey in this.state[key][oKey]) {
              if (this.state[key][oKey][ooKey] !== nextState[key][oKey][ooKey])
                return true;
            }
          else if (this.state[key][oKey] !== nextState[key][oKey]) return true;
        }
      else if (this.state[key] !== nextState[key]) return true;
    }
    if (nextProps.theme !== this.props.theme) return true;
    return false;
  }

  handleAppStateChange = () => {
    this.toggleControls(0);
    this.updateVideoProgress();
    clearTimeout(this.controlsTO);
    clearTimeout(this.bufferingTO);
    clearTimeout(this.bufferingTooLongTO);
  };

  appleCastingListeners() {
    if (!isiOS) return;
    let {
      props: {
        content: { captions, signal, video_playback_endpoints }
      }
    } = this;
    aListener = AirPlayListener.addListener(
      'deviceConnected',
      async ({ devices }) => {
        try {
          if (devices[0].portType === 'AirPlay') {
            this.animateControls(0);
            aCasting = true;
            this.props.onACastingChange?.(true);
            let svpe = this.state.vpe.find(v => v.selected);
            let networkSpeed = await networkSpeedService.getNetworkSpeed(
              this.state.vpe[0].file,
              offlinePath,
              signal
            );
            if (networkSpeed.aborted) return;
            this.setState({ videoRefreshing: !!captions }, () =>
              this.setState({
                videoRefreshing: false,
                vpe: [
                  ...video_playback_endpoints.map(v => ({
                    ...v,
                    selected: v.height === svpe.height
                  })),
                  {
                    height: 'Auto',
                    selected: svpe.height === 'Auto',
                    actualH: networkSpeed.recommendedVideoQuality,
                    file: Object.create(video_playback_endpoints)
                      .sort((i, j) => (i.height < j.height ? 1 : -1))
                      .find(
                        v => v.height <= networkSpeed.recommendedVideoQuality
                      ).file
                  }
                ]
              })
            );
          } else {
            aCasting = undefined;
            this.props.onACastingChange?.();
            this.setState({ videoRefreshing: !!captions }, () =>
              this.setState({
                videoRefreshing: false,
                vpe: this.filterVideosByResolution()
              })
            );
          }
        } catch (e) {}
      }
    );
  }

  googleCastingListeners = async () => {
    gCasting = (await GoogleCast.getCastState()) === 'Connected';
    this.props.onGCastingChange?.(gCasting);
    if (gCasting) this.gCastMedia();

    gListenerSE = GoogleCast.EventEmitter.addListener(
      GoogleCast.SESSION_ENDING,
      () => {
        gCasting = false;
        this.props.onGCastingChange?.(false);
        this.setState({
          videoRefreshing: false,
          vpe: this.filterVideosByResolution()
        });
      }
    );

    gListenerMP = GoogleCast.EventEmitter.addListener(
      GoogleCast.MEDIA_PROGRESS_UPDATED,
      ({ mediaProgress: { progress } }) => {
        progress = Math.round(progress);
        let { lengthInSec } = this.props.content;
        if (progress === parseInt(lengthInSec) - 1) {
          GoogleCast.pause();
          return this.onEnd();
        }
        this.onProgress({ currentTime: progress });
      }
    );

    gListenerSS = GoogleCast.EventEmitter.addListener(
      GoogleCast.SESSION_STARTED,
      () => {
        this.animateControls(0);
        gCasting = true;
        this.props.onGCastingChange?.(true);
        this.gCastMedia();
      }
    );
  };

  gCastMedia = async () => {
    let {
      state: { vpe, mp3s, captionsHidden },
      props: {
        type,
        content: {
          title,
          signal,
          description,
          thumbnailUrl,
          video_playback_endpoints
        }
      }
    } = this;
    let svpe = vpe.find(v => v.selected);
    try {
      if (!captionsHidden) GoogleCast.toggleSubtitles(true);
      let networkSpeed = await networkSpeedService.getNetworkSpeed(
        vpe[0].file,
        offlinePath,
        signal
      );
      if (networkSpeed.aborted) return;
      this.setState(
        {
          paused: false,
          videoRefreshing: true,
          vpe: [
            ...video_playback_endpoints.map(v => ({
              ...v,
              selected: v.height === svpe.height
            })),
            {
              height: 'Auto',
              selected: svpe.height === 'Auto',
              actualH: networkSpeed.recommendedVideoQuality,
              file: Object.create(video_playback_endpoints)
                .sort((i, j) => (i.height < j.height ? 1 : -1))
                .find(v => v.height <= networkSpeed.recommendedVideoQuality)
                .file
            }
          ]
        },
        async () => {
          let castOptions = {
            studio: 'Drumeo',
            title: title || '',
            playPosition: cTime || 0,
            subtitle: description || '',
            imageUrl: thumbnailUrl || '',
            mediaUrl:
              (type === 'video'
                ? this.state.vpe.find(v => v.selected).file
                : mp3s.find(mp3 => mp3.selected).value) || ''
          };
          await GoogleCast.castMedia(castOptions);
          GoogleCast.seek(cTime);
        }
      );
    } catch (e) {
      gCasting = false;
      this.props.onGCastingChange?.(false);
      await GoogleCast.endSession();
    }
  };

  updateVideoProgress = async () => {
    let {
      content: { videoId, id, lengthInSec, youtubeId }
    } = this.props;
    this.props.onUpdateVideoProgress?.(
      videoId,
      id,
      lengthInSec,
      cTime,
      youtubeId ? 'youtube' : 'vimeo'
    );
  };

  orientationListener = (o, force) => {
    if (o === 'UNKNOWN') return;
    orientation = o;
    if (isTablet) Orientation.unlockAllOrientations();
    let { paused } = this.state;
    let isLandscape = o.includes('LAND');

    if (
      !force &&
      ((!isTablet && (paused || o.includes('FACE') || o.includes('UPSIDE'))) ||
        (isTablet && o.includes('UNKNOWN')))
    )
      return;
    if (o.includes('LEFT')) {
      Orientation.lockToLandscapeLeft();
    } else if (o.includes('RIGHT')) {
      Orientation.lockToLandscapeRight();
    } else {
      if (!isTablet) Orientation.lockToPortrait();
    }

    let dimsShouldChange =
      (isLandscape && windowWidth < windowHeight) ||
      (!isLandscape && windowWidth > windowHeight);
    if (dimsShouldChange) {
      windowHeight = windowWidth + windowHeight;
      windowWidth = windowHeight - windowWidth;
      windowHeight = windowHeight - windowWidth;
      greaterWidthHeight =
        windowWidth < windowHeight ? windowHeight : windowWidth;
    }

    if (isTablet)
      return this.setState(
        {
          tabOrientation: o,
          fullscreen: force ? !this.state.fullscreen : this.state.fullscreen
        },
        () => {
          this.props.onOrientationChange?.(o);
          this.onProgress({ currentTime: cTime });
          if (force) StatusBar.setHidden(this.state.fullscreen);
          this.props.onFullscreen?.(this.state.fullscreen);
        }
      );
    this.setState({ fullscreen: isLandscape }, () => {
      StatusBar.setHidden(isLandscape);
      this.onProgress({ currentTime: cTime });
      this.props.onFullscreen?.(this.state.fullscreen);
    });
  };

  filterVideosByResolution = () => {
    let vpe = this.props.content.video_playback_endpoints.map(v => ({
      ...v
    }));
    if (!aCasting)
      vpe = vpe.filter(v =>
        windowWidth < windowHeight
          ? v.height <= -~windowWidth * pixR
          : v.height <= -~windowHeight * pixR
      );
    vpe = aCasting
      ? vpe.map(v => ({
          ...v,
          selected: v.height === quality
        }))
      : [
          ...vpe.map(v => ({
            ...v,
            selected: v.height === quality
          })),
          {
            height: 'Auto',
            file: vpe[vpe.length - 1].file,
            actualH: vpe[vpe.length - 1].height,
            selected: quality === 'Auto'
          }
        ];

    if (!vpe.find(v => v.selected))
      return vpe.map(v => ({
        ...v,
        selected: v.height === 720
      }));
    return vpe;
  };

  selectQuality = async (q, skipRender) => {
    let recommendedVideoQuality;
    let {
      state: { vpe },
      props: {
        content: { signal }
      }
    } = this;
    if (q === 'Auto') {
      recommendedVideoQuality = vpe.find(v => !v?.file.includes('http'));
      if (!recommendedVideoQuality) {
        let networkSpeed = await networkSpeedService.getNetworkSpeed(
          vpe[0].file,
          offlinePath,
          signal
        );
        if (networkSpeed.aborted) return;
        recommendedVideoQuality = Object.create(vpe)
          .sort((i, j) => (i.height < j.height ? 1 : -1))
          .find(rsv => rsv.height <= networkSpeed.recommendedVideoQuality);
      }
    }
    let newVPE = {
      videoRefreshing: gCasting,
      vpe: aCasting
        ? vpe.map(v => ({
            ...v,
            selected: v.height === q
          }))
        : vpe.map(v => ({
            ...v,
            selected: v.height === q,
            file:
              q === 'Auto' && v.height === 'Auto'
                ? recommendedVideoQuality.file
                : v.file,
            actualH:
              q === 'Auto' && v.height === 'Auto'
                ? recommendedVideoQuality.height
                : v.height === 'Auto'
                ? v.actualH
                : v.height
          }))
    };
    if (!newVPE.vpe.find(v => v.selected))
      newVPE.vpe = newVPE.vpe.map(v => ({
        ...v,
        selected: v.height === 720
      }));
    if (skipRender) return newVPE.vpe;
    else return this.setState(newVPE);
  };

  getVideoDimensions = () => {
    let width, height;
    let {
      props: { maxWidth },
      state: { fullscreen }
    } = this;
    if (this.props.content.youtubeId) {
      width = windowWidth;
      height = (9 / 16) * width;
    } else ({ width, height } = this.props.content.video_playback_endpoints[0]);
    let greaterVDim = width < height ? height : width,
      lowerVDim = width < height ? width : height;

    videoW = fullscreen
      ? (windowHeight * width) / height
      : maxWidth || windowWidth;
    videoH = fullscreen
      ? windowHeight
      : ((maxWidth || windowWidth) / width) * height;

    if (videoW > windowWidth) {
      videoW = Math.round(windowWidth);
      videoH = Math.round((videoW * lowerVDim) / greaterVDim);
    }

    if (
      windowWidth > windowHeight &&
      isTablet &&
      !fullscreen &&
      !this.props.maxWidth
    ) {
      videoH = Math.round(windowHeight / 2);
      videoW = Math.round((videoH * greaterVDim) / lowerVDim);
    }

    return { width: videoW, height: videoH };
  };

  pResponder = () => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onShouldBlockNativeResponder: () => true,
      onPanResponderTerminationRequest: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onPanResponderRelease: () => {
        delete this.seeking;
        this.updateVideoProgress();
        clearTimeout(this.controlsTO);
        this.controlsTO = setTimeout(
          () =>
            this.animateControls(this.state.paused ? 0 : -greaterWidthHeight),
          3000
        );
      },
      onPanResponderTerminate: () => {
        delete this.seeking;
        this.updateVideoProgress();
        clearTimeout(this.controlsTO);
        this.controlsTO = setTimeout(
          () =>
            this.animateControls(this.state.paused ? 0 : -greaterWidthHeight),
          3000
        );
      },
      onPanResponderGrant: ({ nativeEvent: { locationX } }, { dx, dy }) => {
        clearTimeout(this.controlsTO);
        this.animateControls(0);
        if (this.videoRef) {
          if (!isiOS)
            this.onProgress({
              currentTime: (locationX / videoW) * this.props.content.lengthInSec
            });
          this.videoRef[this.props.content.youtubeId ? 'seekTo' : 'seek'](
            (locationX / videoW) * this.props.content.lengthInSec
          );
        }
        if (gCasting)
          GoogleCast.seek(
            (locationX / videoW) * this.props.content.lengthInSec
          );
        return Math.abs(dx) > 2 || Math.abs(dy) > 2;
      },
      onPanResponderMove: (e, { moveX }) => {
        this.seeking = true;
        moveX = moveX - (windowWidth - videoW) / 2;
        this.translateBlueX.setValue(moveX - videoW);
        if (this.videoRef) {
          if (!isiOS)
            this.onProgress({
              currentTime: (moveX / videoW) * this.props.content.lengthInSec
            });
          this.videoRef[this.props.content.youtubeId ? 'seekTo' : 'seek'](
            (moveX / videoW) * this.props.content.lengthInSec
          );
        }
        if (gCasting)
          GoogleCast.seek((moveX / videoW) * this.props.content.lengthInSec);
        this.videoTimer.setProgress(
          (moveX / videoW) * this.props.content.lengthInSec
        );
      }
    }).panHandlers;
  };

  onProgress = ({ currentTime }) => {
    cTime = currentTime;
    let { lengthInSec, youtubeId } = this.props.content;
    if (this.seeking) return;
    clearTimeout(this.bufferingTO);
    clearTimeout(this.bufferingTooLongTO);
    delete this.bufferingTO;
    this.bufferingOpacity?.setValue(0);
    this.translateBlueX.setValue((currentTime * videoW) / lengthInSec - videoW);
    if (this.videoTimer) this.videoTimer.setProgress(currentTime);
    if (!aCasting && !youtubeId) {
      this.bufferingTO = setTimeout(
        () =>
          this.bufferingOpacity.setValue(
            this.state.paused || aCasting || gCasting ? 0 : 1
          ),
        3000
      );
      this.bufferingTooLongTO = setTimeout(
        () => this.selectQuality('Auto'),
        10000
      );
    }
    if (lengthInSec && lengthInSec === parseInt(currentTime)) this.onEnd();
  };

  toggleControls = controlsOverwrite => {
    clearTimeout(this.controlsTO);
    controlsOverwrite = isNaN(controlsOverwrite)
      ? this.translateControls._value
        ? 0
        : -greaterWidthHeight
      : controlsOverwrite;
    this.animateControls(controlsOverwrite);
    this.controlsTO = setTimeout(
      () => !this.state.paused && this.animateControls(-greaterWidthHeight),
      3000
    );
  };

  togglePaused = (pausedOverwrite, skipActionOnCasting) => {
    this.updateVideoProgress();
    this.setState(({ paused }) => {
      paused = typeof pausedOverwrite === 'boolean' ? pausedOverwrite : !paused;
      if (gCasting && !skipActionOnCasting)
        if (paused) GoogleCast.pause();
        else GoogleCast.play();
      this.animateControls(paused ? 0 : -greaterWidthHeight);
      clearTimeout(this.bufferingTO);
      clearTimeout(this.bufferingTooLongTO);
      this.bufferingOpacity?.setValue(paused || aCasting || gCasting ? 0 : 1);
      return { paused };
    });
  };

  animateControls = (toValue, speed) => {
    if (this.props.type === 'audio' || aCasting || gCasting) return;
    Animated.spring(this.translateControls, {
      toValue,
      speed: speed || 100,
      bounciness: 12,
      useNativeDriver: true
    }).start();
    this.translateControls._value = toValue;
  };

  handleBack = () => {
    let { fullscreen, tabOrientation } = this.state;
    if (fullscreen)
      return this.orientationListener(
        isTablet ? tabOrientation : fullscreen ? 'PORT' : 'LANDLEFT',
        true
      );
    if (isTablet) Orientation.unlockAllOrientations();
    this.animateControls(greaterWidthHeight, 1);
    this.props.onBack();
  };

  handleYtBack = () => {
    this.webview.injectJavaScript(`(function() {
      let currentTime;
      if(window.video) currentTime = window.video.getCurrentTime();
      else currentTime = ${cTime};
      window.ReactNativeWebView.postMessage(JSON.stringify({
        key: 'back',
        currentTime
      }));
    })()`);
  };

  onLoad = () => {
    let { youtubeId, lastWatchedPosInSec } = this.props.content;
    if (this.videoRef) {
      if (!isiOS || youtubeId)
        this.onProgress({
          currentTime: cTime || lastWatchedPosInSec
        });
      this.videoRef[youtubeId ? 'seekTo' : 'seek'](
        cTime || lastWatchedPosInSec || 0
      );
    }
    if (youtubeId && (!this.props.live || !this.props.content.isLive))
      this.setState({ paused: false }, () => this.setState({ paused: true }));
    else if (youtubeId && this.props.content.isLive) this.togglePaused(false);
    if (gCasting) GoogleCast.seek(cTime || lastWatchedPosInSec);
    this.bufferingOpacity?.setValue(0);
  };

  onSaveSettings = (rate, qual, captions) =>
    this.setState({ rate, captionsHidden: captions === 'Off' }, () =>
      this.selectQuality(qual, true).then(vpe =>
        this.setState({ vpe }, () => {
          quality = qual;
          this.props.onQualityChange?.(qual);
          if (gCasting) this.gCastMedia();
        })
      )
    );

  formatMP3Name = mp3 => {
    switch (mp3) {
      case 'mp3_no_drums_no_click_url':
        return 'Music Only'.toUpperCase();
      case 'mp3_yes_drums_no_click_url':
        return 'With Drums'.toUpperCase();
      case 'mp3_no_drums_yes_click_url':
        return 'With Metronome'.toUpperCase();
      case 'mp3_yes_drums_yes_click_url':
        return 'With Drums & Metronome'.toUpperCase();
    }
  };

  selectMp3 = selectedMp3 => {
    if (this.mp3ActionModal) this.mp3ActionModal.toggleModal();
    this.setState(
      ({ mp3s }) => ({
        mp3s: mp3s.map(mp3 => ({
          ...mp3,
          selected: mp3.id === selectedMp3.id
        }))
      }),
      () => {
        if (gCasting) this.gCastMedia();
      }
    );
  };

  onEnd = () => {
    this.orientationListener(
      isTablet ? this.state.tabOrientation : 'PORT',
      true
    );
    this.updateVideoProgress();
    this.setState({ paused: true, fullscreen: false }, () => {
      cTime = 0;
      StatusBar.setHidden(false);
      if (this.videoRef) {
        if (!isiOS) this.onProgress({ currentTime: 0 });
        this.videoRef[this.props.content.youtubeId ? 'seekTo' : 'seek'](0);
      }
      if (gCasting) GoogleCast.seek(0);
      this.animateControls(0);
      this.translateBlueX.setValue(-videoW);
      this.videoTimer?.setProgress(0);
    });
  };

  onAudioBecomingNoisy = () => {
    if (!this.state.paused) this.togglePaused();
  };

  onSeek = time => {
    time = parseFloat(time);
    let fullLength = parseFloat(this.props.content.lengthInSec);
    if (time < 0) time = 0;
    else if (time > fullLength) time = fullLength;

    this.updateVideoProgress();
    if (this.videoRef)
      this.videoRef[this.props.content.youtubeId ? 'seekTo' : 'seek'](time);
    if (!isiOS || gCasting) this.onProgress({ currentTime: time });
    if (gCasting) GoogleCast.seek(time);
  };

  onError = ({ error: { code } }) => {
    if (code === -11855) {
      this.setState(
        ({ vpe }) => {
          let selectedHeight = vpe.find(v => v.selected).height;
          return {
            vpe: vpe.filter(
              v => v.height < selectedHeight || v.height === 'Auto'
            )
          };
        },
        () => {
          let { vpe } = this.state;
          this.props.onQualityChange?.(vpe[vpe.length - 2].height);
        }
      );
    } else if (code === -1009 && !connection) {
      this.onLoad();
    } else {
      this.alert.toggle(
        `We're sorry, there was an issue loading this video, try reloading the lesson.`,
        `If the problem persists please contact support.`
      );
    }
  };

  injectJsInWebView = () => `(function() {
    document.addEventListener('DOMNodeInserted', () => {
      if(!window.video) window.video = document.querySelector('video');
        if(window.video && !window.eventsAdded) {
          window.eventsAdded = true;
          window.video.addEventListener('play', () => {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              key: 'play',
              currentTime: window.video.getCurrentTime()
            }));
          });
          window.video.addEventListener('pause', () => {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              key: 'pause',
              currentTime: window.video.getCurrentTime()
            }));
          });
          window.video.addEventListener('ended', () => {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              key: 'ended'
            }));
          });
        }
    });
  })()`;

  onWebViewMessage = ({ nativeEvent: { data } }) => {
    let { key, currentTime } = JSON.parse(data);
    switch (key) {
      case 'ended':
        this.onEnd();
        this.webview.injectJavaScript(`(function() {
          window.video.play().then(() => window.video.pause());
        })()`);
        break;
      case 'play':
      case 'pause':
        cTime = currentTime;
        this.togglePaused();
        break;
      case 'back':
        cTime = currentTime;
        this.handleBack();
        break;
    }
  };

  render() {
    let {
      state: {
        vpe,
        mp3s,
        rate,
        paused,
        repeat,
        fullscreen,
        showControls,
        tabOrientation,
        captionsHidden,
        videoRefreshing
      },
      props: {
        type,
        live,
        maxWidth,
        youtubeId,
        settingsMode,
        styles: {
          alert,
          settings,
          timerText,
          mp3ListPopup,
          smallPlayerControls,
          largePlayerControls,
          mp3TogglerTextColor,
          timerCursorBackground,
          afterTimerCursorBackground,
          beforeTimerCursorBackground
        },
        content: {
          isLive,
          endTime,
          captions,
          buffering,
          startTime,
          formatTime,
          lengthInSec,
          nextLessonId,
          thumbnailUrl,
          nextLessonUrl,
          previousLessonId,
          previousLessonUrl,
          lastWatchedPosInSec
        }
      }
    } = this;
    return (
      <SafeAreaView
        forceInset={{
          left: 'never',
          right: 'never',
          bottom: 'never',
          top: fullscreen ? 'never' : 'always'
        }}
        style={[
          {
            zIndex: 1,
            overflow: 'hidden',
            alignItems: 'center',
            marginBottom: youtubeId ? 0 : -11
          },
          fullscreen
            ? {
                top: 0,
                width: '100%',
                height: '100%',
                position: 'absolute',
                justifyContent: 'center',
                backgroundColor: 'black'
              }
            : {}
        ]}
      >
        {!maxWidth && (
          <View
            style={{
              top: 0,
              bottom: 11,
              width: '100%',
              position: 'absolute',
              backgroundColor: 'black'
            }}
          />
        )}
        {!!youtubeId && !fullscreen && (
          <TouchableOpacity
            style={{ padding: 10, alignSelf: 'flex-start' }}
            onPress={this.handleYtBack}
          >
            {svgs.arrowLeft({
              width: 18,
              height: 18,
              fill: 'white'
            })}
          </TouchableOpacity>
        )}
        <View style={[this.getVideoDimensions(), { backgroundColor: 'black' }]}>
          {!videoRefreshing && (
            <>
              {!!youtubeId ? (
                <>
                  {/* <YouTube
                    rel={false}
                    controls={0}
                    play={!paused}
                    fullscreen={false}
                    videoId={youtubeId}
                    onReady={this.onLoad}
                    onError={this.onError}
                    onProgress={this.onProgress}
                    showFullscreenButton={false}
                    ref={r => (this.videoRef = r)}
                    style={{ alignSelf: 'stretch', aspectRatio: 16 / 9 }}
                  />
                  {paused && live && (
                    <Image
                      source={{
                        uri: `https://i2.ytimg.com/vi/${youtubeId}/mqdefault.jpg`
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        position: 'absolute'
                      }}
                    />
                  )} */}
                  <WebView
                    scalesPageToFit={true}
                    javaScriptEnabled={true}
                    domStorageEnabled={false}
                    mixedContentMode='always'
                    startInLoadingState={false}
                    allowsFullscreenVideo={true}
                    userAgent={'Mozilla (iPad)'}
                    ref={r => (this.webview = r)}
                    allowsInlineMediaPlayback={true}
                    onMessage={this.onWebViewMessage}
                    mediaPlaybackRequiresUserAction={false}
                    automaticallyAdjustContentInsets={false}
                    injectedJavaScript={this.injectJsInWebView()}
                    style={{
                      aspectRatio: 16 / 9,
                      alignSelf: 'stretch',
                      backgroundColor: 'black'
                    }}
                    source={{
                      uri: `https://www.youtube.com/embed/${youtubeId}?color=white&modestbranding=1&playsinline=1&enablejsapi=1&start=${
                        lastWatchedPosInSec || 0
                      }`,
                      headers: { referer: 'https://www.drumeo.com/' }
                    }}
                    onNavigationStateChange={({ url }) => {
                      if (
                        !url.includes(
                          `https://www.youtube.com/embed/${youtubeId}?color=white&modestbranding=1&playsinline=1&enablejsapi=1&start=`
                        )
                      )
                        this.webview.stopLoading();
                    }}
                  />
                </>
              ) : (
                <RNVideo
                  paused={paused}
                  repeat={repeat}
                  controls={false}
                  onEnd={this.onEnd}
                  resizeMode='cover'
                  onLoad={this.onLoad}
                  onError={this.onError}
                  rate={parseFloat(rate)}
                  playInBackground={true}
                  playWhenInactive={true}
                  audioOnly={type === 'audio'}
                  onProgress={this.onProgress}
                  ignoreSilentSwitch={'ignore'}
                  progressUpdateInterval={1000}
                  ref={r => (this.videoRef = r)}
                  onRemotePlayPause={this.togglePaused}
                  fullscreen={isiOS ? false : fullscreen}
                  style={{ width: '100%', height: '100%' }}
                  onAudioBecomingNoisy={this.onAudioBecomingNoisy}
                  source={{
                    uri:
                      type === 'audio'
                        ? mp3s.find(mp3 => mp3.selected).value
                        : vpe.find(v => v.selected).file
                  }}
                  onExternalPlaybackChange={() => {
                    if (isiOS) AirPlay.startScan();
                  }}
                  {...(aCasting || !captions
                    ? {}
                    : {
                        selectedTextTrack: {
                          type: 'title',
                          value: captionsHidden ? 'Disabled' : 'English'
                        },
                        textTracks:
                          type === 'video'
                            ? [
                                {
                                  language: 'en',
                                  uri:
                                    'https://raw.githubusercontent.com/bogdan-vol/react-native-video/master/disabled.vtt',
                                  title: 'Disabled',
                                  type: TextTrackType.VTT // "text/vtt"
                                },
                                {
                                  language: 'en',
                                  uri: captions,
                                  title: 'English',
                                  type: TextTrackType.VTT // "text/vtt"
                                }
                              ]
                            : []
                      })}
                />
              )}
            </>
          )}
          {!youtubeId && (
            <TouchableOpacity
              onPress={this.toggleControls}
              style={{
                width: '100%',
                height: '100%',
                ...styles.controlsContainer
              }}
            >
              {type === 'audio' && (
                <Image
                  source={{ uri: thumbnailUrl }}
                  style={{
                    width: '100%',
                    height: '100%',
                    position: 'absolute'
                  }}
                />
              )}
              <Animated.View
                style={{
                  ...styles.constrolsBackground,
                  opacity:
                    type === 'video'
                      ? this.translateControls.interpolate({
                          outputRange: [0, 0.5],
                          inputRange: [-videoW, 0]
                        })
                      : 0.5
                }}
              />
              {!!this.bufferingOpacity && (
                <Animated.View
                  style={{
                    position: 'absolute',
                    alignSelf: 'center',
                    opacity: this.bufferingOpacity
                  }}
                >
                  <ActivityIndicator
                    color='white'
                    size={'large'}
                    animating={buffering}
                  />
                </Animated.View>
              )}
              {live && (
                <LiveTimer
                  endTime={endTime}
                  startTime={startTime}
                  visible={live && !isLive}
                  onEnd={() => {
                    this.togglePaused();
                    this.props.onEndLive?.();
                  }}
                  onStart={() => {
                    this.togglePaused();
                    this.props.onStartLive?.();
                  }}
                />
              )}
              {showControls && (!live || isLive) && (
                <>
                  <Animated.View
                    style={{
                      flexDirection: 'row',
                      transform: [
                        {
                          translateX:
                            type === 'video' ? this.translateControls : 0
                        }
                      ]
                    }}
                  >
                    <TouchableOpacity
                      onPress={this.props.goToPreviousLesson}
                      style={{
                        flex: 1,
                        alignItems: 'center',
                        opacity: previousLessonId || previousLessonUrl ? 1 : 0.5
                      }}
                      disabled={!(previousLessonId || previousLessonUrl)}
                    >
                      {svgs.prevLesson({
                        ...iconStyle,
                        ...largePlayerControls
                      })}
                    </TouchableOpacity>
                    {!live && (
                      <TouchableOpacity
                        style={{ flex: 1, alignItems: 'center' }}
                        onPress={() => this.onSeek((cTime -= 10))}
                      >
                        {svgs.back10({
                          ...iconStyle,
                          ...largePlayerControls
                        })}
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={this.togglePaused}
                      style={{ flex: 1, alignItems: 'center' }}
                    >
                      {svgs[paused ? 'playSvg' : 'pause']({
                        ...iconStyle,
                        ...largePlayerControls
                      })}
                    </TouchableOpacity>
                    {!live && (
                      <TouchableOpacity
                        style={{ flex: 1, alignItems: 'center' }}
                        onPress={() => this.onSeek((cTime += 10))}
                      >
                        {svgs.forward10({
                          ...iconStyle,
                          ...largePlayerControls
                        })}
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={this.props.goToNextLesson}
                      style={{
                        flex: 1,
                        alignItems: 'center',
                        opacity: nextLessonId || nextLessonUrl ? 1 : 0.5
                      }}
                      disabled={!(nextLessonUrl || nextLessonId)}
                    >
                      {svgs.prevLesson({
                        ...{ ...iconStyle, ...largePlayerControls },
                        style: { transform: [{ rotate: '180deg' }] }
                      })}
                    </TouchableOpacity>
                  </Animated.View>
                  <Animated.View
                    style={{
                      bottom: fullscreen
                        ? windowHeight > videoH
                          ? 29
                          : 29 + 25
                        : 11,
                      ...styles.bottomControlsContainer,
                      transform: [
                        {
                          translateX:
                            type === 'video' ? this.translateControls : 0
                        }
                      ]
                    }}
                  >
                    <VideoTimer
                      live={live}
                      styles={timerText}
                      formatTime={formatTime}
                      lengthInSec={lengthInSec}
                      ref={r => (this.videoTimer = r)}
                      maxFontMultiplier={this.props.maxFontMultiplier}
                    />
                    {!youtubeId &&
                      settingsMode !== 'bottom' &&
                      connection &&
                      type !== 'audio' && (
                        <TouchableOpacity
                          style={{
                            padding: 10
                          }}
                          underlayColor={'transparent'}
                          onPress={() => {
                            this.videoSettings.toggle();
                          }}
                        >
                          {svgs.videoQuality({
                            width: 20,
                            height: 20,
                            fill: 'white',
                            ...smallPlayerControls
                          })}
                        </TouchableOpacity>
                      )}
                    {type !== 'audio' && (
                      <TouchableOpacity
                        style={{ padding: 10 }}
                        underlayColor={'transparent'}
                        onPress={() =>
                          this.orientationListener(
                            isTablet
                              ? tabOrientation
                              : fullscreen
                              ? 'PORT'
                              : 'LANDLEFT',
                            true
                          )
                        }
                      >
                        {svgs.fullScreen({
                          width: 20,
                          height: 20,
                          fill: 'white',
                          ...smallPlayerControls
                        })}
                      </TouchableOpacity>
                    )}
                    {type === 'audio' && (
                      <TouchableOpacity
                        style={styles.mp3TogglerContainer}
                        onPress={() => this.mp3ActionModal.toggleModal()}
                      >
                        <Text
                          maxFontSizeMultiplier={this.props.maxFontMultiplier}
                          style={{
                            ...styles.mp3TogglerText,
                            color: mp3TogglerTextColor || 'white'
                          }}
                        >
                          {this.formatMP3Name(
                            mp3s.find(mp3 => mp3.selected).key
                          )}
                        </Text>
                        {svgs.arrowDown({
                          height: 20,
                          width: 20,
                          fill: '#ffffff',
                          ...smallPlayerControls
                        })}
                      </TouchableOpacity>
                    )}
                  </Animated.View>
                </>
              )}
              <TouchableOpacity
                style={{
                  ...styles.backContainer,
                  transform: [
                    {
                      translateX: type === 'video' ? this.translateControls : 0
                    }
                  ]
                }}
                onPress={this.handleBack}
              >
                {svgs[fullscreen ? 'x' : 'arrowLeft']({
                  width: 18,
                  height: 18,
                  fill: '#ffffff',
                  ...smallPlayerControls
                })}
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          {!youtubeId && (
            <>
              {isiOS && (
                <Animated.View
                  style={{
                    top: 7,
                    position: 'absolute',
                    right: settingsMode === 'bottom' ? 39 : 10,
                    transform: [
                      {
                        translateX:
                          type === 'video' ? this.translateControls : 0
                      }
                    ]
                  }}
                >
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => AirPlay.startScan()}
                  >
                    <AirPlayButton />
                  </TouchableOpacity>
                </Animated.View>
              )}
              <Animated.View
                style={{
                  top: 7,
                  position: 'absolute',
                  right: settingsMode === 'bottom' ? 68 : 39,
                  transform: [
                    {
                      translateX: type === 'video' ? this.translateControls : 0
                    }
                  ]
                }}
              >
                <CastButton
                  style={{
                    width: 29,
                    height: 29,
                    tintColor: 'white',
                    ...smallPlayerControls
                  }}
                />
              </Animated.View>
            </>
          )}
          {!youtubeId &&
            settingsMode === 'bottom' &&
            connection &&
            type !== 'audio' && (
              <Animated.View
                style={{
                  top: 7,
                  right: 10,
                  position: 'absolute',
                  transform: [
                    {
                      translateX: type === 'video' ? this.translateControls : 0
                    }
                  ]
                }}
              >
                <TouchableOpacity
                  underlayColor={'transparent'}
                  onPress={() => {
                    this.videoSettings.toggle();
                  }}
                >
                  {svgs.menu({
                    width: 29,
                    height: 29,
                    fill: 'white',
                    ...smallPlayerControls
                  })}
                </TouchableOpacity>
              </Animated.View>
            )}
        </View>
        {!youtubeId && !live && showControls && (
          <Animated.View
            {...this.pResponder()}
            style={{
              ...this.getVideoDimensions(),
              ...styles.timerContainer,
              position: fullscreen ? 'absolute' : 'relative',
              bottom: fullscreen
                ? windowHeight > videoH
                  ? (windowHeight - videoH) / 2
                  : 25
                : 0,
              transform: [
                {
                  translateX: fullscreen
                    ? type === 'video'
                      ? this.translateControls
                      : 0
                    : 0
                }
              ]
            }}
          >
            <View
              style={{
                ...styles.timerGrey,
                backgroundColor: afterTimerCursorBackground || '#2F3334'
              }}
            >
              <Animated.View
                style={{
                  ...styles.timerBlue,
                  transform: [{ translateX: this.translateBlueX }],
                  backgroundColor: beforeTimerCursorBackground || 'red'
                }}
              />
              <Animated.View
                style={{
                  ...styles.timerDot,
                  backgroundColor: timerCursorBackground || 'red',
                  transform: [{ translateX: this.translateBlueX }],
                  opacity:
                    type === 'video'
                      ? this.translateControls.interpolate({
                          outputRange: [0, 1],
                          inputRange: [-videoW, 0]
                        })
                      : 1
                }}
              />
            </View>
            <View style={styles.timerCover} />
          </Animated.View>
        )}
        {fullscreen && <PrefersHomeIndicatorAutoHidden />}
        {!youtubeId && (
          <VideoSettings
            qualities={vpe.sort((i, j) =>
              i.height < j.height || j.height === 'Auto' ? 1 : -1
            )}
            styles={settings}
            settingsMode={settingsMode}
            showRate={!gCasting && !aCasting}
            ref={r => (this.videoSettings = r)}
            onSaveSettings={this.onSaveSettings}
            maxFontMultiplier={this.props.maxFontMultiplier}
            showCaptions={!!captions && !gCasting && !aCasting}
          />
        )}
        {type === 'audio' && (
          <ActionModal
            modalStyle={{ width: '80%' }}
            ref={r => (this.mp3ActionModal = r)}
          >
            {mp3s.map(mp3 => (
              <TouchableOpacity
                key={mp3.id}
                onPress={() => this.selectMp3(mp3)}
                style={{
                  ...styles.mp3OptionContainer,
                  backgroundColor: mp3ListPopup?.background || '#F7F9FC',
                  borderBottomColor:
                    mp3ListPopup?.borderBottomColor || '#E1E6EB'
                }}
              >
                <Text
                  maxFontSizeMultiplier={this.props.maxFontMultiplier}
                  style={{
                    ...styles.mp3OptionText,
                    color: mp3.selected
                      ? mp3ListPopup?.selectedTextColor || 'blue'
                      : mp3ListPopup?.unselectedTextColor || 'black'
                  }}
                >
                  {this.formatMP3Name(mp3.key)}
                </Text>
                {mp3.selected && (
                  <View style={{ marginRight: 10 }}>
                    {svgs.check({
                      width: 23,
                      height: 23,
                      fill: 'black',
                      ...mp3ListPopup?.checkIcon
                    })}
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ActionModal>
        )}
        <AnimatedCustomAlert
          styles={alert}
          ref={r => (this.alert = r)}
          maxFontMultiplier={this.props.maxFontMultiplier}
          additionalBtn={
            <TouchableOpacity
              style={{
                marginTop: 10,
                borderRadius: 50,
                backgroundColor: alert?.reloadLesson?.background || 'black'
              }}
              onPress={() => {
                this.alert.toggle();
                this.props.onRefresh();
              }}
            >
              <Text
                maxFontSizeMultiplier={this.props.maxFontMultiplier}
                style={{
                  padding: 15,
                  fontSize: 15,
                  textAlign: 'center',
                  fontFamily: 'OpenSans-Bold',
                  color: alert?.reloadLesson?.color || 'white'
                }}
              >
                RELOAD LESSON
              </Text>
            </TouchableOpacity>
          }
          additionalTextBtn={
            <TouchableOpacity
              style={{ padding: 15 }}
              onPress={() => {
                this.alert.toggle();
                this.props.toSupport?.();
              }}
            >
              <Text
                maxFontSizeMultiplier={this.props.maxFontMultiplier}
                style={{
                  fontSize: 12,
                  textAlign: 'center',
                  fontFamily: 'OpenSans',
                  textDecorationLine: 'underline',
                  color: alert?.contactSupport?.color || 'black'
                }}
              >
                CONTACT SUPPORT
              </Text>
            </TouchableOpacity>
          }
        />
      </SafeAreaView>
    );
  }
}
class LiveTimer extends React.Component {
  state = {
    hours: '--',
    minutes: '--',
    seconds: '--'
  };

  constructor(props) {
    super(props);
    let startTime = parseInt(
        (new Date(`${props.startTime} UTC`) - new Date()) / 1000
      ),
      endTime = parseInt(
        (new Date(`${props.endTime} UTC`) - new Date()) / 1000
      );
    if (startTime >= 0) {
      this.state = this.formatTimer(startTime);
      this.countDown(startTime, 'onStart');
    } else props.onStart?.();
    if (endTime >= 0) this.countDown(endTime, 'onEnd');
  }

  componentWillUnmount() {
    clearTimeout(this.onEndInterval);
    clearTimeout(this.onStartInterval);
  }

  countDown = (time, event) => {
    this[`${event}Interval`] = setInterval(() => {
      if (time >= 0) {
        if (event === 'onStart') this.setState(this.formatTimer(time));
        time--;
      } else {
        this.props[event]?.();
        clearImmediate(this[`${event}Interval`]);
      }
    }, 1000);
  };

  formatTimer = seconds => {
    const hours = parseInt(seconds / 3600);
    const minutes = parseInt((seconds -= hours * 3600) / 60);
    seconds -= minutes * 60;
    return {
      hours: `${hours < 10 ? 0 : ''}${hours}`,
      minutes: `${minutes < 10 ? 0 : ''}${minutes}`,
      seconds: `${seconds < 10 ? 0 : ''}${seconds}`
    };
  };

  render() {
    let { hours, minutes, seconds } = this.state;
    return this.props.visible ? (
      <View
        style={{
          height: '100%',
          aspectRatio: 16 / 9,
          position: 'absolute',
          alignItems: 'center',
          flexDirection: 'row',
          marginHorizontal: 15,
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,.5)'
        }}
      >
        <Text
          style={{
            color: 'white',
            fontSize: 40,
            textAlign: 'center',
            fontFamily: 'RobotoCondensed-Bold'
          }}
        >
          {hours}
          {`\n`}
          <Text style={{ fontSize: 10 }}>
            {hours === '01' ? 'HOUR' : 'HOURS'}
          </Text>
        </Text>
        <Text
          style={{
            fontSize: 40,
            color: 'white',
            textAlign: 'center',
            fontFamily: 'RobotoCondensed-Bold'
          }}
        >
          :{`  `}
          {`\n`}
          <Text style={{ fontSize: 10 }}>{` `}</Text>
        </Text>
        <Text
          style={{
            fontSize: 40,
            color: 'white',
            textAlign: 'center',
            fontFamily: 'RobotoCondensed-Bold'
          }}
        >
          {minutes}
          {`\n`}
          <Text style={{ fontSize: 10 }}>
            {hours === '00' && minutes === '01' ? 'MINUTE' : 'MINUTES'}
          </Text>
        </Text>
        <Text
          style={{
            color: 'white',
            fontSize: 40,
            textAlign: 'center',
            fontFamily: 'RobotoCondensed-Bold'
          }}
        >
          :{`  `}
          {`\n`}
          <Text style={{ fontSize: 10 }}>{` `}</Text>
        </Text>
        <Text
          style={{
            color: 'white',
            fontSize: 40,
            textAlign: 'center',
            fontFamily: 'RobotoCondensed-Bold'
          }}
        >
          {seconds}
          {`\n`}
          <Text style={{ fontSize: 10 }}>SECONDS</Text>
        </Text>
      </View>
    ) : (
      <></>
    );
  }
}

const styles = StyleSheet.create({
  videoBackgorund: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    backgroundColor: 'black'
  },
  backContainer: {
    top: 0,
    left: 0,
    padding: 15,
    position: 'absolute',
    justifyContent: 'center'
  },
  controlsContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center'
  },
  timerContainer: {
    height: 29,
    marginTop: -11,
    overflow: 'hidden'
  },
  timerGrey: {
    height: 7,
    width: '100%',
    marginTop: 11,
    alignItems: 'center',
    flexDirection: 'row'
  },
  timerBlue: {
    width: '100%',
    height: '100%'
  },
  timerDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginLeft: Math.sqrt(Math.pow(11, 2) - Math.pow(3.5, 2)) - 11
  },
  timerCover: {
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    position: 'absolute',
    backgroundColor: 'transparent'
  },
  constrolsBackground: {
    width: '102%',
    height: '100%',
    position: 'absolute',
    justifyContent: 'center',
    backgroundColor: 'black'
  },
  bottomControlsContainer: {
    width: '100%',
    position: 'absolute',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center'
  },
  mp3TogglerContainer: {
    position: 'absolute',
    alignItems: 'center',
    flexDirection: 'row'
  },
  mp3TogglerText: {
    fontSize: 12,
    fontFamily: 'OpenSans'
  },
  mp3OptionContainer: {
    padding: 10,
    alignItems: 'center',
    flexDirection: 'row',
    borderBottomWidth: 1
  },
  mp3OptionText: {
    flex: 1,
    fontSize: 10,
    paddingLeft: 13,
    fontFamily: 'OpenSans'
  }
});
