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

import { SafeAreaView, SafeAreaInsetsContext } from 'react-native-safe-area-context';

import ReactNativeBlobUtil from 'react-native-blob-util';
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
import DoubleTapArea from './DoubleTapArea';
import networkSpeedService from './services/networkSpeed.service';
import LiveTimer from './LiveTimer';

import { svgs } from './img/svgs';
import { getMP3Array } from './helper';

const pixR = PixelRatio.get();
const isiOS = Platform.OS === 'ios';
const isTablet = DeviceInfo.isTablet();
const iconStyle = { width: 40, height: 40, fill: 'white' };
let playPressedFirstTime = true;
let secondsPlayed = 0;
let startPlaySec = 0;
let endPlaySec = 0;
let cTime,
  videoW,
  videoH,
  aCasting,
  gCasting,
  orientation,
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
    isControlVisible: true,
    repeat: false,
    liveEnded: false,
    buffering: true,
    mp3Length: 0,
  };

  constructor(props) {
    super(props);

    quality = props.quality || quality;
    aCasting = props.aCasting || aCasting;
    gCasting = props.gCasting || gCasting;
    cTime = props.autoPlay ? props.startTime ? props.startTime : 0 : props.last_watch_position_in_seconds
    orientation = props.orientation || orientation;
    windowWidth = Math.round(Dimensions.get('screen').width);
    windowHeight = Math.round(Dimensions.get('screen').height);
    greaterWidthHeight =
      windowWidth < windowHeight ? windowHeight : windowWidth;
    offlinePath =
      props.offlinePath || isiOS
        ? ReactNativeBlobUtil.fs.dirs.LibraryDir
        : ReactNativeBlobUtil.fs.dirs.DocumentDir;
    this.getVideoDimensions();

    if (!props.youtubeId) {
      this.state.buffering = true;
    }
    this.translateControls = new Animated.Value(1);
    this.translateBlueX = new Animated.Value(-videoW + 11);
    this.translateBlueX.setOffset(-11); // Offsets half the timer dot width so its centered.

    this.state.mp3s = getMP3Array(props.content);
    if (!props.youtubeId) this.state.vpe = this.filterVideosByResolution();
    this.state.fullscreen = !isTablet && windowWidth > windowHeight;
    this.state.paused = props.paused;
    this.state.repeat = props.repeat ? props.repeat : false;
    this.state.showPoster = true;
    this.state.showControls = props.showControls;
    this.state.showCastingOptions = props?.showCastingOptions !== undefined ? props.showCastingOptions : true;
    if (isTablet)
      this.state.tabOrientation =
        orientation || (windowWidth > windowHeight ? 'LANDSCAPE' : 'PORTRAIT');
    try {
      this.state.mp3s[0].selected = true;
    } catch (e) {}
  }
  
  componentDidMount() {
    if (!this.props.youtubeId) {
      if (gCasting) {
        this.setState({ showControls: false });
      }
      this.googleCastSession?.getCurrentCastSession().then(client => {
        if (!client) {
          return (gCasting = false);
        } else {
          gCasting = true;
        }
        client = client?.client;

        client?.getMediaStatus().then(st => {
          this.setState({ showControls: true, paused: false });
          this.googleCastClient = client;
          this.gCastProgressListener();
          if (gCasting) {
            this.gCastMedia(
              st?.mediaInfo?.metadata?.title === this.props.content.title
                ? st.streamPosition
                : 0
            );
          }
        });
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
    playPressedFirstTime = true;
    secondsPlayed = 0;
    clearTimeout(this.controlsTO);
    if (!this.props.youtubeId) {
      this.setState({ paused: true });
    }
    if (!!this.stateListener) {
      this.stateListener.remove();
    }
    Orientation.removeDeviceOrientationListener(this.orientationListener);
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
    const { props: { content, youtubeId, autoPlay, connection } } = this;
    if (prevProps.connection !== connection && !connection && !youtubeId) {
      this.selectQuality('Auto')
    }
    if (prevProps.content.id !== content.id) {
      cTime = autoPlay ? 0 : content.last_watch_position_in_seconds;
      playPressedFirstTime = true;
      secondsPlayed = 0;
      this.setState({
        mp3s: getMP3Array(content),
      });

      if (!youtubeId) this.setState({ vpe: this.filterVideosByResolution() });
    }
  }

  handleAppStateChange = (state) => {
    if (
      state === (isiOS ? "inactive" : "background") &&
      !this.props.youtubeId
    ) {
      this.setState({ paused: true }, () => {
        this.updateVideoProgress();
      });
    }
    this.toggleControls(1);
    clearTimeout(this.controlsTO);
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
            this.updateControlVisibility(true);
            this.animateControls(1);
            aCasting = true;
            this.props.onACastingChange?.(true);
            let svpe = this.state.vpe?.find(v => v.selected);
            let networkSpeed = await networkSpeedService.getNetworkSpeed(
              this.state.vpe[0]?.file,
              offlinePath,
              signal
            );
            if (networkSpeed.aborted) return;
            this.setState({ videoRefreshing: !!captions }, () =>
              this.setState({
                videoRefreshing: false,
                vpe: [
                  ...video_playback_endpoints?.map(v => ({
                    ...v,
                    selected: v.height === svpe.height
                  })),
                  {
                    height: 'Auto',
                    selected: svpe.height === 'Auto',
                    actualH: networkSpeed.recommendedVideoQuality,
                    file: Object.create(video_playback_endpoints)
                      ?.sort((i, j) => (i.height < j.height ? 1 : -1))
                      ?.find(
                        v => v.height <= networkSpeed.recommendedVideoQuality
                      )?.file
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
    this.googleCastSession?.onSessionEnding((res) => {
      delete this.googleCastClient;
      gCasting = false;
      this.props.onGCastingChange?.(false);
      this.setState({
        videoRefreshing: false,
        vpe: this.filterVideosByResolution(),
        showPoster: false,
      });
      this.updateControlVisibility(this.state.paused ? true : false);
      this.animateControls(this.state.paused ? 1 : 0);
    });

    this.googleCastSession?.onSessionStarted(({ client }) => {
      this.googleCastClient = client;
      this.updateControlVisibility(true);
      this.animateControls(1);
      gCasting = true;
      this.props.onGCastingChange?.(true);
      this.gCastMedia();
      this.gCastProgressListener();
      this.setState({
        showPoster: true
      })
    });
  };

  gCastProgressListener = () => {
    this.googleCastClient?.onMediaProgressUpdated(progress => {
      if (!progress) return;
      progress = Math.round(progress);
      let { length_in_seconds } = this.props.content;
      if (progress === parseInt(length_in_seconds) - 1) {
        this.googleCastClient?.pause();
        return this.onEnd();
      }
      this.onProgress({ currentTime: progress });
    });
  };

  gCastMedia = async (time) => {
    let {
      state: { vpe, mp3s, rate, captionsHidden, mp3Length },
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
    let svpe = vpe?.find(v => v.selected);
    try {
      let networkSpeed = await networkSpeedService.getNetworkSpeed(
        vpe[0]?.file,
        offlinePath,
        signal
      );
      if (networkSpeed.aborted) return;
      this.setState(
        {
          paused: false,
          videoRefreshing: true,
          vpe: [
            ...video_playback_endpoints?.map(v => ({
              ...v,
              selected: v.height === svpe.height
            })),
            {
              height: 'Auto',
              selected: svpe.height === 'Auto',
              actualH: networkSpeed.recommendedVideoQuality,
              file: Object.create(video_playback_endpoints)
                ?.sort((i, j) => (i.height < j.height ? 1 : -1))
                ?.find(v => v.height <= networkSpeed.recommendedVideoQuality)
                ?.file
            }
          ]
        },
        () => {
          let castOptions = {
            mediaInfo: {
              contentUrl:
                (type === 'video'
                  ? !!this.state.vpe?.find(v => v.selected)?.originalFile
                  ? this.state.vpe?.find(v => v.selected)?.originalFile 
                  : this.state.vpe?.find(v => v.selected)?.file
                  : mp3s?.find(mp3 => mp3.selected)?.value) || '',
              metadata: {
                type: 'movie',
                studio: 'Drumeo',
                title: title || '',
                subtitle: description || '',
              },
              streamDuration: parseFloat(mp3Length || length_in_seconds)
            },
            playbackRate: parseFloat(rate),
            startTime: Math.round(time || cTime || 0)
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
          this.googleCastClient?.loadMedia(castOptions);
          if (captions)
            if (!captionsHidden) {
              this.googleCastClient?.onMediaPlaybackStarted(
                s => {
                  if (s.playerState === 'playing') {
                    this.googleCastClient?.setActiveTrackIds([1]);
                    this.googleCastClient?.setTextTrackStyle({
                      backgroundColor: '#00000000',
                      edgeType: 'outline',
                      edgeColor: '#000000FF',
                      fontFamily: 'OpenSans'
                    });
                  }
                }
              );
            } else {
              this.googleCastClient?.onMediaPlaybackStarted(
                s => {
                  if (s.playerState === 'playing') {
                    this.googleCastClient?.setActiveTrackIds([]);
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

  updateVideoProgress = async (apiCallDelay) => {
    let {
      youtubeId,
      content: { vimeo_video_id, id, length_in_seconds }
    } = this.props;

    this.props.onUpdateVideoProgress?.(
      youtubeId || vimeo_video_id,
      id,
      this.state.mp3Length || length_in_seconds,
      cTime,
      secondsPlayed,
      youtubeId ? 'youtube' : 'vimeo',
      apiCallDelay,
    );
    secondsPlayed = 0;
  };

  orientationListener = (o, force) => {
    if (this.props.orientationIsLocked) {
      return;
    }
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

    let fs = (!isTablet || this.props.live) ? isLandscape : force ? !this.state.fullscreen : this.state.fullscreen;

    this.props.onOrientationChange?.(o);
    if (this.state.mp3Length > 0) {
      if (parseInt(cTime) !== this.state.mp3Length) {
        this.onProgress({ currentTime: cTime || 0 });
      }
    } else {
      if (parseInt(cTime) !== this.props.content.length_in_seconds) {
        this.onProgress({ currentTime: cTime || 0 });
      }
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
    let vpe = this.props.content.video_playback_endpoints?.map(v => ({
      ...v
    }));
    if (!aCasting)
      vpe = vpe?.filter(v =>
        windowWidth < windowHeight
          ? v.height <= -~windowWidth * pixR
          : v.height <= -~windowHeight * pixR
      );
    vpe = aCasting
      ? vpe?.map(v => ({
          ...v,
          selected: v.height === quality
        }))
      : [
          ...vpe?.map(v => ({
            ...v,
            selected: v.height === quality
          })),
          {
            height: 'Auto',
            file: vpe[vpe.length - 1]?.file,
            actualH: vpe[vpe.length - 1]?.height,
            selected: quality === 'Auto'
          }
        ];

    if (!vpe?.find(v => v.selected))
      return vpe?.map(v => ({
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
      recommendedVideoQuality = vpe?.find(v => !v?.file.includes('http'));
      if (!recommendedVideoQuality) {
        let networkSpeed = await networkSpeedService.getNetworkSpeed(
          vpe[0]?.file,
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
        ? vpe?.map(v => ({
            ...v,
            selected: v.height === q
          }))
        : vpe?.map(v => ({
            ...v,
            selected: v.height === q,
            file:
              q === 'Auto' && v.height === 'Auto'
                ? recommendedVideoQuality?.file
                : v?.file,
            actualH:
              q === 'Auto' && v.height === 'Auto'
                ? recommendedVideoQuality?.actualH || recommendedVideoQuality?.height
                : v.height === 'Auto'
                ? v?.actualH
                : v?.height
          }))
    };
    if (!newVPE.vpe?.find(v => v.selected))
      newVPE.vpe = newVPE.vpe?.map(v => ({
        ...v,
        selected: v.height === 720
      }));
    if (skipRender) return newVPE.vpe;
    else return this.setState(newVPE);
  };

  updateBlueX = () => {
    if (!this.translateBlueX) return;
    const { length_in_seconds } = this.props.content;
    const { mp3Length } = this.state;
    const secLength = mp3Length > 0 ? mp3Length : length_in_seconds;
    const translate = cTime !== undefined && !!secLength ? (cTime * videoW) / secLength - videoW : -videoW;
    if (!isNaN(translate) && isFinite(translate)) this.translateBlueX.setValue(translate);
  }

  getVideoDimensions = (inset) => {
    let width, height;
    let {
      props: { maxWidth, live, type },
      state: { fullscreen }
    } = this;

    if (this.props.youtubeId) {
      if (fullscreen && !isTablet) {
        if (live) {
          return {
            width: "100%",
            aspectRatio: 16 / 9,
            height: undefined,
          };
        }
        return {
          width: "100%",
          height: "100%",
        };
      }
      if (type === 'audio') {
        width = 640;
        height = 360;
      } else {
        return { width: "100%", aspectRatio: 16 / 9 };
      }
    } else ({ width, height } = this.props.content.video_playback_endpoints[0]);
    let greaterVDim = width < height ? height : width,
      lowerVDim = width < height ? width : height;

    if (fullscreen && isiOS && inset) {
      this.insets = inset;
    }

    videoW = fullscreen
      ? ((isiOS ? windowHeight - (this?.insets?.bottom || 0) : windowHeight) * width) / height
      : maxWidth || windowWidth;
    videoH = fullscreen
      ? (isiOS ? windowHeight - (this?.insets?.bottom || 0) : windowHeight)
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
      videoW = Math.round(windowWidth * 2 / 3);
      videoH = Math.round(videoW * lowerVDim / greaterVDim);
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
        cTime = this.seekTime;
        this.updateVideoProgress();
        clearTimeout(this.controlsTO);
        this.controlsTO = setTimeout(() => {
          this.updateControlVisibility(this.state.paused ? true : false);
          this.animateControls(this.state.paused ? 1 : 0);
        }, 3000);
      },
      onPanResponderTerminate: () => {
        delete this.seeking;
        if (this.videoPlayStatus) {
          this.togglePaused();
        }
        delete this.videoPlayStatus;
        this.onSeek(this.seekTime);
        cTime = this.seekTime;
        this.updateVideoProgress();
        clearTimeout(this.controlsTO);
        this.controlsTO = setTimeout(() => {
          this.updateControlVisibility(this.state.paused ? true : false);
          this.animateControls(this.state.paused ? 1 : 0);
        }, 3000);
      },
      onPanResponderGrant: ({ nativeEvent: { locationX } }, { dx, dy }) => {
        clearTimeout(this.controlsTO);
        this.updateControlVisibility(true);
        this.animateControls(1);
        this.seekTime = (locationX / videoW) * (this.state.mp3Length > 0 ? this.state.mp3Length : this.props.content.length_in_seconds);
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
        moveX = moveX - this.progressBarPositionX;
        let translate = moveX - videoW;
        if (moveX < 0 || translate > 0) return;
        this.translateBlueX.setValue(translate);
        this.seekTime = (moveX / videoW) * (this.state.mp3Length > 0 ? this.state.mp3Length : this.props.content.length_in_seconds);
        if (!isiOS) {
          this.onProgress({ currentTime: this.seekTime });
        }
        this.videoTimer.setProgress(this.seekTime);
      }
    }).panHandlers;
  };

  onProgress = ({ currentTime }) => {
    if (currentTime === undefined) return;
    if (currentTime > 0) {
      secondsPlayed++;
    }
    this.getVideoDimensions();
    cTime = currentTime;
    let {
      content: { length_in_seconds },
      endTime
    } = this.props;
    if (this.seeking) return;
    this.updateBlueX();
    if (this.videoTimer) this.videoTimer.setProgress(currentTime);
    if (!!endTime && endTime === parseInt(currentTime)) {
      this.props.onEnd?.();
    }
    if (this.state.mp3Length > 0 && this.state.mp3Length === parseInt(currentTime)) this.onEnd();
    else if (length_in_seconds && length_in_seconds === parseInt(currentTime)) this.onEnd();
  };

  toggleControls = controlsOverwrite => {
    clearTimeout(this.controlsTO);
    controlsOverwrite = isNaN(controlsOverwrite)
      ? this.translateControls._value
        ? 0
        : 1
      : controlsOverwrite;
    this.updateControlVisibility(controlsOverwrite ? true : false);
    this.controlsTO = setTimeout(() => {
      if (!this.state.paused) {
        this.updateControlVisibility(false);
        this.animateControls(0);
      }
    }, 3000);
    this.translateControls?.stopAnimation(() => {
      this.animateControls(controlsOverwrite);
    });
  };

  togglePaused = (pausedOverwrite, skipActionOnCasting) => {
    this.setState(({ paused, showPoster }) => {
      paused = typeof pausedOverwrite === 'boolean' ? pausedOverwrite : !paused;
      if (gCasting) {
        showPoster = true;
      } else if (showPoster) {
        showPoster = false;
      }
      if (!paused && playPressedFirstTime) {
        this.updateVideoProgress();
        playPressedFirstTime = false;
      }
      if (gCasting && !skipActionOnCasting)
        if (paused) this.googleCastClient?.pause();
        else this.googleCastClient?.play();
      this.animateControls(paused ? 1 : 0);
      return { paused, showPoster };
    },
    () => this.updateControlVisibility(this.state.paused ? true : false)
    );
  };

  updateControlVisibility = (updatedValue) => {
    if ((this.props.content.type === 'play-along' && this.props.listening) || aCasting || gCasting) return;
    this.setState({ isControlVisible: updatedValue });
  }

  animateControls = (toValue, speed) => {
    if ((this.props.content.type === 'play-along' && this.props.listening) || aCasting || gCasting) return;
    Animated.timing(this.translateControls, {
      toValue,
      duration: speed || 100,
      useNativeDriver: true
    }).start();
    this.translateControls._value = toValue;
  };

  handleLiveBack = () => {
    this.props.onBack?.();
  }

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
    this.updateControlVisibility(true);
    this.animateControls(1, 1);
    this.props.onBack?.();
  };

  handleYtBack = () => {
    this.webview.injectJavaScript(`(function() {
      onBack();
    })()`);
  };

  onLoad = (videoDetails) => {
    let {
      youtubeId,
      content: { last_watch_position_in_seconds },
      autoPlay,
      startTime,
      listening
    } = this.props;
    if (youtubeId && listening) {
      this.setState({ mp3Length: videoDetails.duration });
    }
    if (this.videoRef) {
      this.videoRef['seek'](
        autoPlay ? startTime || 0 : cTime || last_watch_position_in_seconds || 0
      );
      this.props.onPlayerReady?.();
    }
    if (!isiOS || youtubeId)
      this.onProgress({
        currentTime: autoPlay ? startTime || 0 : cTime || last_watch_position_in_seconds || 0
      });
    let position = autoPlay ? startTime || 0 : cTime || last_watch_position_in_seconds || 0;
    this.googleCastClient?.seek({
      position: parseFloat(position)
    });
    this.setState({ buffering: false });
    if (autoPlay) {
      this.toggleControls();
      this.togglePaused(false,false);
    }
  };

  onBuffer = ({ isBuffering }) => {
    if (!aCasting && !gCasting && !this.props.youtubeId) {
      this.setState({ 
        buffering: isBuffering,
      })
    }
  }

  onSaveSettings = (rate, qual, captions) =>
    this.setState({ rate, captionsHidden: captions === 'Off' }, () =>
      this.selectQuality(qual, true).then(vpe =>
        this.setState({ vpe, buffering: true }, () => {
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
    this.updateVideoProgress();
    if (this.props?.autoPlay) {
      this.props?.goToNextLesson?.();
      return;
    }
    this.orientationListener(
      isTablet ? this.state.tabOrientation : 'PORT',
      !isTablet
    );
    this.setState({ paused: true }, () => {
      cTime = 0;
      if (this.videoRef) {
        this.videoRef['seek'](0);
      }
      if (!isiOS) this.onProgress({ currentTime: 0 });
      this.googleCastClient?.seek({ position: 0 });
      this.updateControlVisibility(true);
      this.animateControls(1);
      this.updateBlueX();
      this.videoTimer?.setProgress(0);
    });
  };

  onAudioBecomingNoisy = () => {
    if (!this.state.paused) this.togglePaused();
  };

  onSeek = time => {
    time = parseFloat(time);
    let fullLength = parseFloat(this.state.mp3Length || this.props.content.length_in_seconds);
    if (time < 0) time = 0;
    else if (time > fullLength) time = fullLength;

    if (this.state.showPoster){
      this.setState({showPoster: gCasting ? true : false});
    } else if (gCasting) {
      this.setState({showPoster: true})
    }
    if (this.videoRef) {
      this.videoRef['seek'](time);
    }
    if (this.webview) {
      this.webview.injectJavaScript(`seekTo(${time})`);
    }
    if (!isiOS || gCasting) this.onProgress({ currentTime: time });
    this.googleCastClient?.seek({ position: parseFloat(time || 0) });
  };

  onError = ({ error: { code } }) => {
    if (code === -11855) {
      this.setState(
        ({ vpe }) => {
          let selectedHeight = vpe?.find(v => v.selected)?.height;
          return {
            vpe: vpe?.filter(
              v => v.height < selectedHeight || v.height === 'Auto'
            )
          };
        },
        () => {
          let { vpe } = this.state;
          this.props.onQualityChange?.(vpe[vpe.length - 2]?.height);
        }
      );
    } else if (code === -1009 && !this.props.connection) {
      this.onLoad();
    } else {
      this.alert.toggle(
        `We're sorry, there was an issue loading this video, try reloading the lesson.`,
        `If the problem persists please contact support.`
      );
    }
  };

  onWebViewMessage = ({ nativeEvent: { data } }) => {
    const parsedData = JSON.parse(data);

    switch (parsedData.eventType) {
      case 'playerReady':
        if (this.props?.autoPlay && this.webview) {
          this.webview.injectJavaScript(`playVideo()`);
        }
        this.props.onPlayerReady?.();
        break;
      case 'playerStateChange':
        cTime = parsedData.data?.target?.playerInfo?.currentTime;
        if (parsedData.data?.data === 1) {
          startPlaySec = cTime;
        }
        if (parsedData.data?.data === 2) {
          endPlaySec = cTime;
          secondsPlayed = endPlaySec - startPlaySec;
          if (secondsPlayed > 0) {
            this.updateVideoProgress();
          } 
        }
        if (parsedData.data?.data === 0) {
          this.onEnd();
        }
        break;
      case 'back':
        cTime = parsedData.currentTime;
        endPlaySec = cTime;
        secondsPlayed = endPlaySec - startPlaySec;
        this.handleBack();
        break;

    }
  };

  minsToStart = startDate => Math.ceil((Date.parse(startDate) - Date.now()) / (1000 * 60));

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
        showCastingOptions,
        captionsHidden,
        videoRefreshing,
        tabOrientation,
        showPoster,
        buffering,
        mp3Length,
        isControlVisible,
      },
      props: {
        type,
        live,
        liveData,
        maxWidth,
        youtubeId,
        settingsMode,
        onFullscreen,
        onBack,
        goToPreviousLesson,
        goToNextLesson,
        startTime,
        endTime,
        disableNext,
        disablePrevious,
        autoPlay,
        connection,
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
        },
        content: {
          captions,
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
      disablePrevious !== undefined
        ? !disablePrevious
        : previous_lesson && (previous_lesson.id || previous_lesson.mobile_app_url);
    const hasNext =
      disableNext !== undefined
        ? !disableNext
        : next_lesson && (next_lesson.id || next_lesson.mobile_app_url);
    const audioOnly = contentType === 'play-along' && listening;
    const minsToStart = this.minsToStart(liveData?.live_event_start_time_in_timezone || 0)
    const showTimer = (!!liveData && !liveData?.isLive) || this.state.liveEnded || (!!liveData && liveData?.isLive && minsToStart < 15 && minsToStart > 0);

    return (
      <SafeAreaView
        edges={fullscreen && !live ? ['top', 'bottom'] : ['top']}
        style={fullscreen ? styles.fullscreenSafeArea : {}}
      >
        {!maxWidth && (
          <View style={styles.maxWidth} />
        )}
        {(!!liveData || (!!youtubeId && !audioOnly && !fullscreen) ) && onBack && (
          <TouchableOpacity
            style={{ zIndex:5, padding: 10, alignSelf: 'flex-start' }}
            onPress={!!liveData ? this.handleLiveBack : this.handleYtBack}
          >
            {svgs.arrowLeft({
              width: 18,
              height: 18,
              fill: fullscreen ? 'white' : iconColor || 'white'
            })}
          </TouchableOpacity>
        )}
        <SafeAreaInsetsContext.Consumer>
          {(insets) => (
            <>
              <View
                style={[
                  styles.videoContainer,
                  fullscreen ? styles.videoContainerFullscreen : {},
                ]}
              >
                <View style={this.getVideoDimensions(insets)}>
                  {!videoRefreshing && (
                    <>
                      {!!youtubeId && !audioOnly ? (
                        <WebView
                          originWhitelist={["*"]}
                          androidLayerType={"hardware"}
                          scalesPageToFit={true}
                          javaScriptEnabled={true}
                          domStorageEnabled={false}
                          mixedContentMode="always"
                          startInLoadingState={false}
                          allowsFullscreenVideo={true}
                          userAgent={
                            isTablet && isiOS
                              ? `Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/ 604.1.21 (KHTML, like Gecko) Version/ 12.0 Mobile/17A6278a Safari/602.1.26`
                              : null
                          }
                          ref={(r) => (this.webview = r)}
                          allowsInlineMediaPlayback={true}
                          onMessage={this.onWebViewMessage}
                          mediaPlaybackRequiresUserAction={false}
                          automaticallyAdjustContentInsets={false}
                          style={styles.webview}
                          onNavigationStateChange={({ url }) => {
                            if (url.includes(`www.youtube.com`)) {
                              this.webview.stopLoading();
                            }
                          }}
                          source={{
                            baseUrl: "https://www.musora.com",
                            html: `
                      <!DOCTYPE html>
                      <html>
                        <head>
                          <meta name="viewport" content="width=device-width">
                          <style>
                            body {
                              margin: 0;
                            }
                            .video {
                                position: absolute;
                                top: 0;
                                left: 0;
                                width: 100%;
                                height: 100%;
                            }
                          </style>
                        </head>
                        <body>
                          <div class="video" id="player" />

                          <script>
                            var tag = document.createElement('script');

                            tag.src = "https://www.youtube.com/iframe_api";
                            var firstScriptTag = document.getElementsByTagName('script')[0];
                            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

                            var player;
                            function onYouTubeIframeAPIReady() {
                              player = new YT.Player('player', {
                                width: '1000',
                                height: '1000',
                                videoId: '${youtubeId}',
                                playerVars: {
                                  rel: 1,
                                  playsinline: 1,
                                  enablejsapi: 1,
                                  start: '${autoPlay ? (startTime ? startTime : 0) : last_watch_position_in_seconds}',
                                  end: '${endTime}',
                                  controls: 1,
                                  fs: 1,
                                  origin: 'https://www.musora.com',
                                  modestbranding: 1
                                },
                                events: {
                                  'onReady': onPlayerReady,
                                  'onStateChange': onPlayerStateChange,
                                }
                              });
                            }

                            function onPlayerReady(event) {
                              window.ReactNativeWebView.postMessage(JSON.stringify({eventType: 'playerReady'}))
                            }

                            function onPlayerStateChange(event) {
                              window.ReactNativeWebView.postMessage(JSON.stringify({eventType: 'playerStateChange', data: event}))
                            }

                            function onBack() {
                              window.ReactNativeWebView.postMessage(JSON.stringify({eventType: 'back', currentTime: player.getCurrentTime()}))
                            }

                            function playVideo() {
                              player.playVideo();
                            }

                            function seekTo(time) {
                              player.seekTo(time, true);
                            }
                        
                          </script>
                        </body>
                      </html>
                    `,
                          }}
                        />
                      ) : (
                        <RNVideo
                          paused={paused}
                          repeat={repeat}
                          controls={false}
                          onEnd={this.onEnd}
                          resizeMode="cover"
                          onLoad={this.onLoad}
                          onError={this.onError}
                          onBuffer={this.onBuffer}
                          rate={parseFloat(rate)}
                          playInBackground={false}
                          playWhenInactive={true}
                          audioOnly={audioOnly}
                          onProgress={this.onProgress}
                          ignoreSilentSwitch={"ignore"}
                          progressUpdateInterval={1000}
                          ref={(r) => (this.videoRef = r)}
                          onRemotePlayPause={this.togglePaused}
                          fullscreen={isiOS ? false : fullscreen}
                          style={{ width: "100%", height: "100%" }}
                          onAudioBecomingNoisy={this.onAudioBecomingNoisy}
                          source={{
                            uri: audioOnly
                              ? mp3s?.find((mp3) => mp3.selected)?.value
                              : vpe?.find((v) => v.selected)?.file,
                          }}
                          onExternalPlaybackChange={() => {
                            if (isiOS) AirPlay.startScan();
                          }}
                          {...(aCasting ||
                          !captions ||
                          typeof captions !== "string"
                            ? {}
                            : {
                                selectedTextTrack: {
                                  type: "title",
                                  value: captionsHidden
                                    ? "Disabled"
                                    : "English",
                                },
                                textTracks:
                                  type === "video"
                                    ? [
                                        {
                                          language: "en",
                                          uri: "https://raw.githubusercontent.com/bogdan-vol/react-native-video/master/disabled.vtt",
                                          title: "Disabled",
                                          type: TextTrackType.VTT, // "text/vtt"
                                        },
                                        {
                                          language: "en",
                                          uri: captions,
                                          title: "English",
                                          type: TextTrackType.VTT, // "text/vtt"
                                        },
                                      ]
                                    : [],
                              })}
                        />
                      )}
                    </>
                  )}
                  {live && (
                    <LiveTimer
                      endTime={`${liveData?.live_event_end_time} UTC`}
                      startTime={`${liveData?.live_event_start_time} UTC`}
                      thumbnailUrl={thumbnail_url}
                      visible={showTimer}
                      onEnd={() => {
                        this.webview?.injectJavaScript(`(function() {
                    window.video.pause();
                  })()`);
                        this.setState({
                          liveEnded: true,
                        });
                        this.props.onEnd?.();
                      }}
                      onStart={() => {
                        this.props.onStartLive?.();
                      }}
                    />
                  )}
                  {(!youtubeId || audioOnly) && (
                    <TouchableOpacity
                      onPress={this.toggleControls}
                      style={{
                        width: "100%",
                        height: "100%",
                        ...styles.controlsContainer,
                      }}
                    >
                      {(audioOnly || showPoster) && (
                        <Image
                          source={{
                            uri: `https://www.musora.com/musora-cdn/image/${thumbnail_url}`,
                          }}
                          style={{
                            width: "100%",
                            height: "100%",
                            position: "absolute",
                          }}
                        />
                      )}
                      {!!isControlVisible && (
                        <Animated.View
                          style={{
                            ...styles.constrolsBackground,
                            opacity:
                              type === "video"
                                ? this.translateControls.interpolate({
                                    outputRange: [0, 0.5],
                                    inputRange: [0, 1],
                                  })
                                : 0.5,
                          }}
                        />
                      )}

                      {!!buffering && !paused && (
                        <Animated.View
                          style={{
                            position: "absolute",
                            alignSelf: "center",
                          }}
                        >
                          <ActivityIndicator
                            color="white"
                            size={"large"}
                            animating={buffering}
                          />
                        </Animated.View>
                      )}
                      {!youtubeId && (
                        <View
                          style={{
                            width: "100%",
                            height: "100%",
                            ...styles.controlsContainer,
                          }}
                        >
                          <DoubleTapArea
                            styles={styles.leftDoubleTap}
                            onDoubleTap={() => this.onSeek((cTime -= 10))}
                            onSingleTap={this.toggleControls}
                          />
                          <DoubleTapArea
                            styles={styles.rightDoubleTap}
                            onDoubleTap={() => this.onSeek((cTime += 10))}
                            onSingleTap={this.toggleControls}
                          />
                        </View>
                      )}
                      {showControls && (
                        <>
                          <Animated.View
                            style={{
                              flexDirection: "row",
                              opacity:
                                type === "video" ? this.translateControls : 1,
                            }}
                          >
                            <DoubleTapArea
                              styles={{ width: "43%", alignItems: "center" }}
                              onDoubleTap={() => this.onSeek((cTime -= 10))}
                            >
                              {goToPreviousLesson && isControlVisible && (
                                <TouchableOpacity
                                  onPress={goToPreviousLesson}
                                  style={{
                                    flex: 1,
                                    alignItems: "center",
                                    opacity: hasPrevious ? 1 : 0.5,
                                  }}
                                  disabled={!hasPrevious}
                                >
                                  {svgs.prevLesson({
                                    ...iconStyle,
                                    ...largePlayerControls,
                                  })}
                                </TouchableOpacity>
                              )}
                            </DoubleTapArea>
                            {isControlVisible && (
                              <TouchableOpacity
                                onPress={this.togglePaused}
                                style={{ flex: 1, alignItems: "center" }}
                              >
                                {svgs[paused ? "playSvg" : "pause"]({
                                  ...iconStyle,
                                  ...largePlayerControls,
                                })}
                              </TouchableOpacity>
                            )}
                            <DoubleTapArea
                              styles={{ width: "43%", alignItems: "center" }}
                              onDoubleTap={() => this.onSeek((cTime += 10))}
                            >
                              {goToNextLesson && isControlVisible && (
                                <TouchableOpacity
                                  onPress={goToNextLesson}
                                  style={{
                                    flex: 1,
                                    alignItems: "center",
                                    opacity: hasNext ? 1 : 0.5,
                                  }}
                                  disabled={!hasNext}
                                >
                                  {svgs.prevLesson({
                                    ...{ ...iconStyle, ...largePlayerControls },
                                    style: {
                                      transform: [{ rotate: "180deg" }],
                                    },
                                  })}
                                </TouchableOpacity>
                              )}
                            </DoubleTapArea>
                          </Animated.View>
                        </>
                      )}
                      {(!gCasting || (gCasting && this.googleCastClient)) && (
                        <Animated.View
                          style={{
                            bottom: fullscreen ? 30 + 25 : 11,
                            ...styles.bottomControlsContainer,
                            opacity:
                              type === "video" ? this.translateControls : 1,
                          }}
                        >
                          <VideoTimer
                            live={live}
                            styles={timerText}
                            length_in_seconds={mp3Length || length_in_seconds}
                            ref={(r) => (this.videoTimer = r)}
                            maxFontMultiplier={this.props.maxFontMultiplier}
                          />
                          {!!isControlVisible && (
                            <>
                              {!youtubeId &&
                                settingsMode !== "bottom" &&
                                connection &&
                                !audioOnly && (
                                  <TouchableOpacity
                                    style={{
                                      padding: 10,
                                    }}
                                    underlayColor={"transparent"}
                                    onPress={() => {
                                      this.videoSettings.toggle();
                                    }}
                                  >
                                    {svgs.videoQuality({
                                      width: 20,
                                      height: 20,
                                      fill: "white",
                                      ...smallPlayerControls,
                                    })}
                                  </TouchableOpacity>
                                )}
                              {!audioOnly && onFullscreen && (
                                <TouchableOpacity
                                  style={{ padding: 10 }}
                                  underlayColor={"transparent"}
                                  onPress={() => {
                                    this.orientationListener(
                                      this.state.fullscreen
                                        ? isTablet
                                          ? orientation.includes("PORT")
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
                                    fill: "white",
                                    ...smallPlayerControls,
                                  })}
                                </TouchableOpacity>
                              )}
                              {audioOnly && (
                                <TouchableOpacity
                                  style={styles.mp3TogglerContainer}
                                  onPress={() =>
                                    this.mp3ActionModal.toggleModal()
                                  }
                                >
                                  <Text
                                    maxFontSizeMultiplier={
                                      this.props.maxFontMultiplier
                                    }
                                    style={{
                                      ...styles.mp3TogglerText,
                                      color: mp3TogglerTextColor || "white",
                                    }}
                                  >
                                    {this.formatMP3Name(
                                      mp3s.find((mp3) => mp3.selected).key
                                    )}
                                  </Text>
                                  {svgs.arrowDown({
                                    height: 20,
                                    width: 20,
                                    fill: "#ffffff",
                                    ...smallPlayerControls,
                                  })}
                                </TouchableOpacity>
                              )}
                            </>
                          )}
                        </Animated.View>
                      )}

                      {onBack && (
                        <Animated.View
                          style={{
                            ...styles.backContainer,
                            opacity:
                              type === "video" ? this.translateControls : 1,
                          }}
                        >
                          {isControlVisible && (
                            <TouchableOpacity
                              style={styles.backContainer}
                              onPress={this.handleBack}
                            >
                              {svgs[fullscreen ? "x" : "arrowLeft"]({
                                width: 18,
                                height: 18,
                                fill: "#ffffff",
                                ...smallPlayerControls,
                              })}
                            </TouchableOpacity>
                          )}
                        </Animated.View>
                      )}
                    </TouchableOpacity>
                  )}
                  {!youtubeId && showCastingOptions && (
                    <>
                      {isiOS && (
                        <Animated.View
                          style={{
                            top: 4.5,
                            width: 66,
                            height: 34,
                            position: "absolute",
                            right: settingsMode === "bottom" ? 98 : 49,
                            opacity:
                              type === "video" ? this.translateControls : 1,
                          }}
                        >
                          {isControlVisible && (
                            <TouchableOpacity
                              activeOpacity={1}
                              onPress={() => AirPlay.startScan()}
                            >
                              <AirPlayButton />
                            </TouchableOpacity>
                          )}
                        </Animated.View>
                      )}
                      <Animated.View
                        style={{
                          top: 7,
                          position: "absolute",
                          right: settingsMode === "bottom" ? 49 : 10,
                          opacity:
                            type === "video" ? this.translateControls : 1,
                        }}
                      >
                        {isControlVisible && (
                          <CastButton
                            style={{
                              width: 29,
                              height: 29,
                              tintColor: "white",
                              ...smallPlayerControls,
                            }}
                          />
                        )}
                      </Animated.View>
                    </>
                  )}
                  {!youtubeId &&
                    settingsMode === "bottom" &&
                    connection &&
                    !audioOnly && (
                      <Animated.View
                        style={{
                          top: 7,
                          right: 10,
                          position: "absolute",
                          opacity:
                            type === "video" ? this.translateControls : 1,
                        }}
                      >
                        {!!isControlVisible && (
                          <TouchableOpacity
                            underlayColor={"transparent"}
                            onPress={() => {
                              this.videoSettings.toggle();
                            }}
                          >
                            {svgs.menu({
                              width: 29,
                              height: 29,
                              fill: "white",
                              ...smallPlayerControls,
                            })}
                          </TouchableOpacity>
                        )}
                      </Animated.View>
                    )}
                </View>
              </View>
              {(!youtubeId || audioOnly) &&
                showControls &&
                (!gCasting || (gCasting && this.googleCastClient)) && (
                  <Animated.View
                    onLayout={({
                      nativeEvent: {
                        layout: { x },
                      },
                    }) =>
                      (this.progressBarPositionX =
                        fullscreen && insets.left > 0 && isiOS
                          ? insets.left + x
                          : x)
                    }
                    {...this.pResponder()}
                    style={{
                      ...this.getVideoDimensions(insets),
                      ...styles.timerContainer,
                      position: fullscreen ? "absolute" : "relative",
                      bottom: fullscreen
                        ? windowHeight > videoH
                          ? (windowHeight - videoH) / 2
                          : 5
                        : 0,
                      opacity: fullscreen
                        ? type === "video"
                          ? this.translateControls
                          : 1
                        : 1,
                    }}
                  >
                    <View
                      style={{
                        ...styles.timerGrey,
                        backgroundColor:
                          afterTimerCursorBackground || "#2F3334",
                      }}
                    >
                      <Animated.View
                        style={{
                          ...styles.timerBlue,
                          transform: [{ translateX: this.translateBlueX }],
                          backgroundColor: beforeTimerCursorBackground || "red",
                        }}
                      />
                      <Animated.View
                        style={{
                          ...styles.timerDot,
                          backgroundColor: timerCursorBackground || "red",
                          transform: [{ translateX: this.translateBlueX }],
                          opacity:
                            type === "video" ? this.translateControls : 1,
                        }}
                      />
                    </View>
                    <View style={styles.timerCover} />
                  </Animated.View>
                )}
            </>
          )}
        </SafeAreaInsetsContext.Consumer>
        {fullscreen && <PrefersHomeIndicatorAutoHidden />}
        {!youtubeId && connection && (
          <VideoSettings
            qualities={vpe?.sort((i, j) =>
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
        {audioOnly && (
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
  },
  leftDoubleTap: {
    flex: 1,
    position: 'absolute',
    left: 0,
    width: '40%',
    height: '100%'
  },
  rightDoubleTap: {
    flex: 1,
    alignItems: 'center',
    position: 'absolute',
    right: 0,
    width: '40%',
    height: '100%'
  },
  fullscreenSafeArea: {
    width: '100%',
    height: '100%',
    backgroundColor: 'black',
    alignItems: 'center',
  },
  maxWidth: {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    position: 'absolute',
  },
  videoContainer: {
    overflow: 'hidden',
    backgroundColor: 'black',
    alignItems: 'stretch',
  },
  videoContainerFullscreen: {
    top: 0,
    width: '100%',
    height: '100%',
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webview: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: 'black',
  }
});
