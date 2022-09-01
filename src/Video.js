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
  Dimensions,
  PixelRatio,
  StyleSheet,
  PanResponder,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import RNFetchBlob from 'rn-fetch-blob';
import WebView from 'react-native-webview';
import DeviceInfo from 'react-native-device-info';
import Orientation, { LANDSCAPE_LEFT, LANDSCAPE_RIGHT, PORTRAIT } from 'react-native-orientation-locker';
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
import { getMP3Array } from './helper';

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
  googleCastSession = GoogleCast.getSessionManager();
  state = {
    rate: '1.0',
    paused: true,
    captionsHidden: true,
    videoRefreshing: false,
    showControls: true,
    repeat: false,
    liveEnded: false,
  };

  constructor(props) {
    super(props);
    connection = !!props.connection;
    quality = props.quality || quality;
    aCasting = props.aCasting || aCasting;
    gCasting = props.gCasting || gCasting;
    cTime = props.content.last_watch_position_in_seconds;
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

    if (!props.youtubeId) this.bufferingOpacity = new Animated.Value(1);
    this.translateControls = new Animated.Value(0);
    this.translateBlueX = new Animated.Value(-videoW + 11);
    this.translateBlueX.setOffset(-11); // Offsets half the timer dot width so its centered.

    this.state.mp3s = getMP3Array(props.content);
    if (!props.youtubeId) this.state.vpe = this.filterVideosByResolution();
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
    if (!this.props.youtubeId) {
      this.googleCastSession.getCurrentCastSession().then(client => {
        client = client?.client;
        if (!client) return (gCasting = false);
        client.pause();
        if (this.props.youtubeId) {
          this.googleCastSession?.endCurrentSession();
          return (gCasting = false);
        }
        this.googleCastClient = client;
        this.gCastProgressListener();
      });
      this.appleCastingListeners();
      this.googleCastingListeners();
      this.selectQuality(quality || 'Auto');
    }
    this.stateListener = AppState.addEventListener('change', this.handleAppStateChange);

    Orientation.getOrientation(this.orientationListener);
    Orientation.addDeviceOrientationListener(this.orientationListener);
  }

  componentWillUnmount() {
    this.updateVideoProgress();
    clearTimeout(this.controlsTO);
    clearTimeout(this.bufferingTO);
    clearTimeout(this.bufferingTooLongTO);
    if (!this.props.youtubeId) {
      aListener?.remove();
      gListenerMP?.remove();
      gListenerSE?.remove();
      gListenerSS?.remove();
      aListener = undefined;
      gListenerMP = undefined;
      gListenerSE = undefined;
      gListenerSS = undefined;
    }
    if (!!this.stateListener) {
      this.stateListener.remove();
    }
    Orientation.removeDeviceOrientationListener(this.orientationListener);
    Orientation.unlockAllOrientations();
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (
      this.props.type !== nextProps.type ||
      this.props.content.isLive !== nextProps.content.isLive ||
      nextProps.theme !== this.props.theme ||
      nextProps.content.id !== this.props.id
    ) return true;
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
    return false;
  }

  componentDidUpdate(prevProps) {
    const { props: { content, youtubeId } } = this;
    if (prevProps.content.id !== content.id) {
      cTime = content.last_watch_position_in_seconds;
      this.setState({
        mp3s: getMP3Array(content),
      });

      if (!youtubeId) this.setState({ vpe: this.filterVideosByResolution() });
    }
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
    if (gCasting) this.gCastMedia();

    gListenerSE?.remove();
    gListenerSE = undefined;
    gListenerSE = this.googleCastSession.onSessionEnding(() => {
      delete this.googleCastClient;
      gCasting = false;
      this.props.onGCastingChange?.(false);
      this.setState({
        videoRefreshing: false,
        vpe: this.filterVideosByResolution()
      });
      gListenerMP?.remove();
      gListenerMP = undefined;
    });

    gListenerSS?.remove();
    gListenerSS = undefined;
    gListenerSS = this.googleCastSession.onSessionStarted(({ client }) => {
      this.googleCastClient = client;
      this.animateControls(0);
      gCasting = true;
      this.props.onGCastingChange?.(true);
      this.gCastMedia();
      this.gCastProgressListener();
    });
  };

  gCastProgressListener = () => {
    gListenerMP?.remove();
    gListenerMP = undefined;
    this.googleCastClient?.seek({ position: parseFloat(cTime || 0) });
    gListenerMP = this.googleCastClient.onMediaProgressUpdated(progress => {
      if (!progress) return;
      progress = Math.round(progress);
      let { length_in_seconds } = this.props.content;
      if (progress === parseInt(length_in_seconds) - 1) {
        this.googleCastClient.pause();
        return this.onEnd();
      }
      this.onProgress({ currentTime: progress });
    });
  };

  gCastMedia = async () => {
    let {
      state: { vpe, mp3s, rate, captionsHidden },
      props: {
        type,
        content: {
          title,
          signal,
          captions,
          description,
          thumbnail_url,
          video_playback_endpoints,
          length_in_seconds
        }
      }
    } = this;
    let svpe = vpe.find(v => v.selected);
    try {
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
        () => {
          let castOptions = {
            mediaInfo: {
              contentUrl:
                (type === 'video'
                  ? this.state.vpe.find(v => v.selected).file
                  : mp3s.find(mp3 => mp3.selected).value) || '',
              metadata: {
                type: 'movie',
                studio: 'Drumeo',
                title: title || '',
                subtitle: description || '',
                images: [{ url: thumbnail_url || '' }]
              },
              streamDuration: parseFloat(length_in_seconds)
            },
            playbackRate: parseFloat(rate),
            startTime: Math.round(cTime)
          };
          if (captions)
            castOptions.mediaInfo.mediaTracks = [
              {
                id: 1, // assign a unique numeric ID
                type: 'text',
                subtype: 'subtitles',
                name: 'English Subtitle',
                contentId: captions,
                language: 'en-US'
              }
            ];
          this.googleCastClient.loadMedia(castOptions);
          if (captions)
            if (!captionsHidden) {
              let gCastStartedListener = this.googleCastClient.onMediaPlaybackStarted(
                s => {
                  if (s.playerState === 'playing') {
                    this.googleCastClient.setActiveTrackIds([1]);
                    this.googleCastClient.setTextTrackStyle({
                      backgroundColor: '#00000000',
                      edgeType: 'outline',
                      edgeColor: '#000000FF',
                      fontFamily: 'OpenSans'
                    });
                    gCastStartedListener.remove();
                    gCastStartedListener = undefined;
                  }
                }
              );
            } else {
              let gCastStartedListener = this.googleCastClient.onMediaPlaybackStarted(
                s => {
                  if (s.playerState === 'playing') {
                    this.googleCastClient.setActiveTrackIds([]);
                    gCastStartedListener.remove();
                    gCastStartedListener = undefined;
                  }
                }
              );
            }
        }
      );
    } catch (e) {
      gCasting = false;
      this.props.onGCastingChange?.(false);
      this.googleCastSession?.endCurrentSession();
    }
  };

  updateVideoProgress = async () => {
    let {
      youtubeId,
      content: { vimeo_video_id, id, length_in_seconds }
    } = this.props;
    this.props.onUpdateVideoProgress?.(
      vimeo_video_id,
      id,
      length_in_seconds,
      cTime,
      youtubeId ? 'youtube' : 'vimeo'
    );
  };

  orientationListener = (o, force) => {
    orientation = o.includes('UPSIDE') ? PORTRAIT: o;

    if (o.includes('UNKNOWN') || o.includes('FACE') || o.includes('UPSIDE')) return;

    Orientation.unlockAllOrientations();
    let isLandscape = o.includes('LAND');

    if (force) {
      if (o.includes('LEFT')) {
        Orientation.lockToLandscapeLeft();
      } else if (o.includes('RIGHT')) {
        Orientation.lockToLandscapeRight();
      } else {
        Orientation.lockToPortrait();
      }
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

    let fs = !isTablet ? isLandscape : force ? !this.state.fullscreen: this.state.fullscreen;

    this.props.onOrientationChange?.(o);
    if (parseInt(cTime) !== this.props.content.length_in_seconds) {
      this.onProgress({ currentTime: cTime || 0});
    }
    this.props.onFullscreen?.(fs);

    return this.setState({
      tabOrientation: o.includes('LEFT')
        ? LANDSCAPE_LEFT
        : o.includes('RIGHT')
        ? LANDSCAPE_RIGHT
        : PORTRAIT,
      fullscreen: fs,
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

  updateBlueX = () => {
    if (!this.translateBlueX) return;
    const { length_in_seconds } = this.props.content;
    const translate = cTime !== undefined && !!length_in_seconds ? (cTime * videoW) / length_in_seconds - videoW : 0;
    if (!isNaN(translate) && isFinite(translate)) this.translateBlueX.setValue(translate);
  }

  getVideoDimensions = () => {
    let width, height;
    let {
      props: { maxWidth, forcedWidth },
      state: { fullscreen }
    } = this;
    if (!!forcedWidth) {
      windowWidth = forcedWidth;
    }

    if (this.props.youtubeId) {
      if (fullscreen && !isTablet) {
        return { width: "100%", height: "100%" };
      }
      return { width: "100%", aspectRatio: 16 / 9 };
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
    this.updateBlueX();
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
        if (this.videoPlayStatus) {
          this.togglePaused();
        }
        delete this.videoPlayStatus;
        this.onSeek(this.seekTime);
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
        if (this.videoPlayStatus) {
          this.togglePaused();
        }
        delete this.videoPlayStatus;
        this.onSeek(this.seekTime);
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
        this.seekTime = (locationX / videoW) * this.props.content.length_in_seconds;
        if (!isiOS) {
          this.onProgress({ currentTime: this.seekTime });
        }
        this.googleCastClient?.seek({ position: parseFloat(this.seekTime) });
        return Math.abs(dx) > 2 || Math.abs(dy) > 2;
      },
      onPanResponderMove: (_, { moveX }) => {
        this.seeking = true;
        if (!this.state.paused) {
          this.videoPlayStatus = true;
          this.togglePaused();
        }
        const screenW = isTablet && orientation.includes('LAND') && !this.state.fullscreen ? (windowWidth * 2/3) - 10 : windowWidth;
        let newX = moveX - (screenW - videoW) / 2;
        let translate = newX - videoW;
        if (newX < 0 || translate > 0) return;
        this.translateBlueX.setValue(translate);
        this.seekTime = (newX / videoW) * this.props.content.length_in_seconds;
        if (!isiOS) {
          this.onProgress({ currentTime: this.seekTime });
        }
        this.googleCastClient?.seek({
          position: parseFloat(this.seekTime)
        });
        this.videoTimer.setProgress(this.seekTime);
      }
    }).panHandlers;
  };

  onProgress = ({ currentTime }) => {
    if (currentTime === undefined) return;
    this.getVideoDimensions();
    cTime = currentTime;
    let {
      content: { length_in_seconds },
      youtubeId
    } = this.props;
    if (this.seeking) return;
    clearTimeout(this.bufferingTO);
    clearTimeout(this.bufferingTooLongTO);
    delete this.bufferingTO;
    this.bufferingOpacity?.setValue(0);
    this.updateBlueX();
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
    if (length_in_seconds && length_in_seconds === parseInt(currentTime)) this.onEnd();
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
        if (paused) this.googleCastClient?.pause();
        else this.googleCastClient?.play();
      this.animateControls(paused ? 0 : -greaterWidthHeight);
      clearTimeout(this.bufferingTO);
      clearTimeout(this.bufferingTooLongTO);
      this.bufferingOpacity?.setValue(paused || aCasting || gCasting ? 0 : 1);
      return { paused };
    });
  };

  animateControls = (toValue, speed) => {
    if ((this.props.content.type === 'play-along' && this.props.listening) || aCasting || gCasting) return;
    Animated.spring(this.translateControls, {
      toValue,
      speed: speed || 100,
      bounciness: 12,
      useNativeDriver: true
    }).start();
    this.translateControls._value = toValue;
  };

  handleBack = () => {
    const { fullscreen } = this.state;

    if (fullscreen) {
      this.setState({ fullscreen: false });
      return this.orientationListener(
        isTablet ? (orientation.includes('PORT') ? PORTRAIT : orientation) : PORTRAIT,
        true
      );
    }
    if (isTablet) {
      Orientation.unlockAllOrientations();
    }
    this.animateControls(greaterWidthHeight, 1);
    this.props.onBack();
  };

  handleYtBack = () => {
    this.webview.injectJavaScript(`(function() {
      let currentTime = ${cTime || 0};
      try {
        if(window.video)
          if(window.video.getCurrentTime) currentTime = window.video.getCurrentTime();
          else currentTime = window.video.currentTime || 0;
        window.ReactNativeWebView.postMessage(JSON.stringify({
          key: 'back',
          currentTime
        }));
      } catch(e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          key: 'back',
          currentTime
        }));
      }
    })()`);
  };

  onLoad = () => {
    let {
      youtubeId,
      content: { last_watch_position_in_seconds }
    } = this.props;
    if (this.videoRef) {
      if (!isiOS || youtubeId)
        this.onProgress({
          currentTime: cTime || last_watch_position_in_seconds
        });
      this.videoRef[youtubeId ? 'seekTo' : 'seek'](
        cTime || last_watch_position_in_seconds || 0
      );
    }
    let position = cTime || last_watch_position_in_seconds || 0;
    this.googleCastClient?.seek({
      position: parseFloat(position)
    });
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
      if (this.videoRef) {
        if (!isiOS) this.onProgress({ currentTime: 0 });
        this.videoRef[this.props.youtubeId ? 'seekTo' : 'seek'](0);
      }
      this.googleCastClient?.seek({ position: 0 });
      this.animateControls(0);
      this.updateBlueX();
      this.videoTimer?.setProgress(0);
    });
  };

  onAudioBecomingNoisy = () => {
    if (!this.state.paused) this.togglePaused();
  };

  onSeek = time => {
    time = parseFloat(time);
    let fullLength = parseFloat(this.props.content.length_in_seconds);
    if (time < 0) time = 0;
    else if (time > fullLength) time = fullLength;

    this.updateVideoProgress();
    if (this.videoRef)
      this.videoRef[this.props.youtubeId ? 'seekTo' : 'seek'](time);
    if (!isiOS || gCasting) this.onProgress({ currentTime: time });
    this.googleCastClient?.seek({ position: parseFloat(time || 0) });
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
            if(window.video.getCurrentTime)
              window.ReactNativeWebView.postMessage(JSON.stringify({
                key: 'play',
                currentTime: window.video.getCurrentTime()
              }));
            else
              window.ReactNativeWebView.postMessage(JSON.stringify({
                key: 'play',
                currentTime: window.video.currentTime || 0
              }));
          });
          window.video.addEventListener('pause', () => {
            if(window.video.getCurrentTime)
              window.ReactNativeWebView.postMessage(JSON.stringify({
                key: 'pause',
                currentTime: window.video.getCurrentTime()
              }));
            else
              window.ReactNativeWebView.postMessage(JSON.stringify({
                key: 'pause',
                currentTime: window.video.currentTime || 0
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
        captionsHidden,
        videoRefreshing,
        tabOrientation,
      },
      props: {
        type,
        live,
        maxWidth,
        youtubeId,
        settingsMode,
        onFullscreen,
        goToPreviousLesson,
        goToNextLesson,
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
          beforeTimerCursorBackground,
          iconColor,
          containerStyle,
        },
        content: {
          isLive,
          live_event_end_time,
          captions,
          buffering,
          live_event_start_time,
          length_in_seconds,
          thumbnail_url,
          last_watch_position_in_seconds,
          next_lesson,
          previous_lesson,
          type: contentType
        },
        listening,
      }
    } = this;

    const hasPrevious =
      previous_lesson && (previous_lesson.id || previous_lesson.mobile_app_url);
    const hasNext =
      next_lesson && (next_lesson.id || next_lesson.mobile_app_url);
    const audioOnly = contentType === 'play-along' && listening;

    return (
      <SafeAreaView
        edges={fullscreen ? [] : ['top']}
        style={[
          {
            zIndex: 1,
            overflow: 'hidden',
            alignItems: 'center'
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
            : {},
          containerStyle,
        ]}
      >
        {!maxWidth && (
          <View
            style={{
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              position: 'absolute',
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
              fill: iconColor || 'white'
            })}
          </TouchableOpacity>
        )}
        <View
          style={[
            this.getVideoDimensions(),
            fullscreen && isiOS
              ? { marginTop: 42, backgroundColor: "black" }
              : { backgroundColor: "black" },
          ]}
        >
          {!videoRefreshing && (
            <>
              {!!youtubeId ? (
                <WebView
                  androidLayerType={"hardware"}
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
                      last_watch_position_in_seconds || 0
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
                  audioOnly={audioOnly}
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
                      audioOnly
                        ? mp3s.find(mp3 => mp3.selected).value
                        : vpe.find(v => v.selected).file
                  }}
                  onExternalPlaybackChange={() => {
                    if (isiOS) AirPlay.startScan();
                  }}
                  {...(aCasting || !captions || typeof captions !== 'string'
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
          {live && (
            <LiveTimer
              endTime={`${live_event_end_time} UTC`}
              startTime={`${live_event_start_time} UTC`}
              thumbnailUrl={thumbnail_url}
              visible={!isLive || this.state.liveEnded}
              onEnd={() => {
                this.webview?.injectJavaScript(`(function() {
                  window.video.pause();
                })()`);
                this.setState({
                  liveEnded: true
                });
                this.props.onEndLive?.();
              }}
              onStart={() => {
                this.props.onStartLive?.();
              }}
            />
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
              {audioOnly && (
                <Image
                  source={{ uri: thumbnail_url }}
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
              {showControls && (
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
                    {goToPreviousLesson && (
                      <TouchableOpacity
                        onPress={goToPreviousLesson}
                        style={{
                          flex: 1,
                          alignItems: 'center',
                          opacity: hasPrevious ? 1 : 0.5
                        }}
                        disabled={!hasPrevious}
                      >
                        {svgs.prevLesson({
                          ...iconStyle,
                          ...largePlayerControls
                        })}
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={{ flex: 1, alignItems: 'center' }}
                      onPress={() => this.onSeek((cTime -= 10))}
                    >
                      {svgs.back10({
                        ...iconStyle,
                        ...largePlayerControls
                      })}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={this.togglePaused}
                      style={{ flex: 1, alignItems: 'center' }}
                    >
                      {svgs[paused ? 'playSvg' : 'pause']({
                        ...iconStyle,
                        ...largePlayerControls
                      })}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flex: 1, alignItems: 'center' }}
                      onPress={() => this.onSeek((cTime += 10))}
                    >
                      {svgs.forward10({
                        ...iconStyle,
                        ...largePlayerControls
                      })}
                    </TouchableOpacity>
                    {goToNextLesson && (
                      <TouchableOpacity
                        onPress={goToNextLesson}
                        style={{
                          flex: 1,
                          alignItems: 'center',
                          opacity: hasNext ? 1 : 0.5
                        }}
                        disabled={!hasNext}
                      >
                        {svgs.prevLesson({
                          ...{ ...iconStyle, ...largePlayerControls },
                          style: { transform: [{ rotate: '180deg' }] }
                        })}
                      </TouchableOpacity>
                    )}
                  </Animated.View>
                  <Animated.View
                    style={{
                      bottom: fullscreen ? 30 + 25 : 11,
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
                      length_in_seconds={length_in_seconds}
                      ref={r => (this.videoTimer = r)}
                      maxFontMultiplier={this.props.maxFontMultiplier}
                    /> 
                    {!youtubeId &&
                      settingsMode !== 'bottom' &&
                      connection &&
                      !audioOnly && (
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
                    {!audioOnly && onFullscreen && (
                      <TouchableOpacity
                        style={{ padding: 10 }}
                        underlayColor={'transparent'}
                        onPress={() => {
                          this.orientationListener(
                            this.state.fullscreen
                              ? isTablet
                                ? orientation.includes('PORT')
                                  ? PORTRAIT
                                  : orientation
                                : PORTRAIT
                              : isTablet
                              ? tabOrientation
                              : LANDSCAPE_LEFT,
                            true
                          );
                        }}
                      >
                        {svgs.fullScreen({
                          width: 20,
                          height: 20,
                          fill: 'white',
                          ...smallPlayerControls
                        })}
                      </TouchableOpacity>
                    )}
                    {contentType === 'play-along' && (
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
                    top: 4.5,
                    width: 66,
                    height: 34,
                    position: 'absolute',
                    right: settingsMode === 'bottom' ? 98 : 49,
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
                  right: settingsMode === 'bottom' ? 49 : 10,
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
            !audioOnly && (
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
        {!youtubeId && showControls && (
          <Animated.View
            {...this.pResponder()}
            style={{
              ...this.getVideoDimensions(),
              ...styles.timerContainer,
              position: fullscreen ? 'absolute' : 'relative',
              bottom: fullscreen
              ? windowHeight > videoH
                ? (windowHeight - videoH) / 2
                : 20
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
            showRate={!aCasting}
            ref={r => (this.videoSettings = r)}
            onSaveSettings={this.onSaveSettings}
            maxFontMultiplier={this.props.maxFontMultiplier}
            showCaptions={!!captions && !aCasting}
          />
        )}
        {contentType === 'play-along' && (
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
    width: '100%',
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
