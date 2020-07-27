// /*
//     props: connection, onUpdateVideoProgress, aCasting,
//       gCasting, quality, onQualityChange, onACastingChange, onGCastingChange
//       deviceInfo, onOrientationChange, maxFontMultiplier, offlinePath
// */
// import React from 'react';
// import {
//   View,
//   Text,
//   Image,
//   AppState,
//   Animated,
//   Platform,
//   StatusBar,
//   PixelRatio,
//   StyleSheet,
//   PanResponder,
//   TouchableOpacity,
//   ActivityIndicator
// } from 'react-native';

// import Orientation from 'react-native-orientation-locker';
// import RNVideo, { TextTrackType } from 'react-native-video';
// import GoogleCast, { CastButton } from 'react-native-google-cast';
// import PrefersHomeIndicatorAutoHidden from 'react-native-home-indicator';
// import {
//   AirPlay,
//   AirPlayButton,
//   AirPlayListener
// } from 'react-native-airplay-ios';

// import ActionModal from './ActionModal';
// import VideoTimer_V2 from './VideoTimer_V2';
// import VideoSettings_V2 from './VideoSettings_V2';
// import AnimatedCustomAlert from './AnimatedCustomAlert';

// import networkSpeedService from '../../services/networkSpeed.service';

// import { svgs } from '../../img/svgs';
// import { DRUMEO_BLUE, LIGHT_BORDER_COLOR, iconStyles } from '../../Styles';

// const pixR = PixelRatio.get();
// const iconStyle = { width: 40, height: 40, fill: 'white' };
// const isiOS = Platform.OS === 'ios';
// const maxWidth = 700;
// let cTime,
//   videoW,
//   videoH,
//   isTablet,
//   aCasting,
//   gCasting,
//   aListener,
//   connection,
//   orientation,
//   gListenerMP,
//   gListenerSE,
//   gListenerSS,
//   windowWidth,
//   windowHeight,
//   greaterWidthHeight;

// export default class Video extends React.Component {
//   state = {
//     rate: '1.0',
//     paused: true,
//     captionsHidden: true,
//     videoRefreshing: false
//   };

//   constructor(props) {
//     super(props);

//     if (gCasting) GoogleCast.pause();
//     aCasting = this.props.aCasting;
//     gCasting = this.props.gCasting;
//     connection = !!this.props.connection;
//     cTime = props.content.lastWatchedPosInSec;
//     ({ isTablet, windowWidth, windowHeight, orientation } = props.deviceProps);
//     windowWidth = Math.round(windowWidth);
//     windowHeight = Math.round(windowHeight);
//     greaterWidthHeight =
//       windowWidth < windowHeight ? windowHeight : windowWidth;
//     this.getVideoDimensions();

//     this.bufferingOpacity = new Animated.Value(1);
//     this.translateControls = new Animated.Value(0);
//     this.translateBlueX = new Animated.Value(-videoW);

//     this.state.mp3s = props.content.mp3s;
//     this.state.vpe = this.filterVideosByResolution();
//     this.state.fullscreen = !isTablet && windowWidth > windowHeight;
//     if (isTablet)
//       this.state.tabOrientation =
//         orientation || Orientation.getInitialOrientation();

//     try {
//       this.state.mp3s[0].selected = true;
//     } catch (e) {}
//   }

//   componentDidMount() {
//     this.appleCastingListeners();
//     this.googleCastingListeners();
//     this.selectQuality(this.props.quality || 'Auto');
//     AppState.addEventListener('change', this.handleAppStateChange);
//     Orientation.addDeviceOrientationListener(this.orientationListener);
//   }

//   componentWillUnmount() {
//     this.updateVideoProgress();
//     clearTimeout(this.controlsTO);
//     clearTimeout(this.bufferingTO);
//     clearTimeout(this.bufferingTooLongTO);
//     if (aListener) aListener.remove();
//     if (gListenerMP) gListenerMP.remove();
//     if (gListenerSE) gListenerSE.remove();
//     if (gListenerSS) gListenerSS.remove();
//     AppState.removeEventListener('change', this.handleAppStateChange);
//     Orientation.removeDeviceOrientationListener(this.orientationListener);
//   }

//   shouldComponentUpdate(nextProps, nextState) {
//     if (this.props.type !== nextProps.type) return true;
//     for (key in this.state) {
//       if (typeof this.state[key] === 'object')
//         for (oKey in this.state[key]) {
//           if (typeof this.state[key][oKey] === 'object')
//             for (ooKey in this.state[key][oKey]) {
//               if (this.state[key][oKey][ooKey] !== nextState[key][oKey][ooKey])
//                 return true;
//             }
//           else if (this.state[key][oKey] !== nextState[key][oKey]) return true;
//         }
//       else if (this.state[key] !== nextState[key]) return true;
//     }
//     if (nextProps.theme !== this.props.theme) return true;
//     return false;
//   }

//   handleAppStateChange = () => {
//     this.toggleControls(0);
//     this.updateVideoProgress();
//     clearTimeout(this.controlsTO);
//     clearTimeout(this.bufferingTO);
//     clearTimeout(this.bufferingTooLongTO);
//   };

//   appleCastingListeners() {
//     if (!isiOS) return;
//     let {
//       props: {
//         content: { captions, signal, video_playback_endpoints }
//       }
//     } = this;
//     aListener = AirPlayListener.addListener(
//       'deviceConnected',
//       async ({ devices }) => {
//         try {
//           if (devices[0].portType === 'AirPlay') {
//             this.animateControls(0);
//             aCasting = true;
//             this.props.onACastingChange(true);
//             let svpe = this.state.vpe.find(v => v.selected);
//             let networkSpeed = await networkSpeedService.getNetworkSpeed(
//               this.state.vpe[0].file,
//               signal
//             );
//             if (networkSpeed.aborted) return;
//             this.setState({ videoRefreshing: !!captions }, () =>
//               this.setState({
//                 videoRefreshing: false,
//                 vpe: [
//                   ...video_playback_endpoints.map(v => ({
//                     ...v,
//                     selected: v.height === svpe.height
//                   })),
//                   {
//                     height: 'Auto',
//                     selected: svpe.height === 'Auto',
//                     actualH: networkSpeed.recommendedVideoQuality,
//                     file: Object.create(video_playback_endpoints)
//                       .sort((i, j) => (i.height < j.height ? 1 : -1))
//                       .find(
//                         v => v.height <= networkSpeed.recommendedVideoQuality
//                       ).file
//                   }
//                 ]
//               })
//             );
//           } else {
//             aCasting = undefined;
//             this.props.onACastingChange?.();
//             this.setState({ videoRefreshing: !!captions }, () =>
//               this.setState({
//                 videoRefreshing: false,
//                 vpe: this.filterVideosByResolution()
//               })
//             );
//           }
//         } catch (e) {}
//       }
//     );
//   }

//   googleCastingListeners = async () => {
//     gCasting = (await GoogleCast.getCastState()) === 'Connected';
//     this.props.onGCastingChange?.(gCasting);
//     if (gCasting) this.gCastMedia();

//     gListenerSE = GoogleCast.EventEmitter.addListener(
//       GoogleCast.SESSION_ENDING,
//       () => {
//         gCasting = false;
//         this.props.onGCastingChange?.(false);
//         this.setState({
//           videoRefreshing: false,
//           vpe: this.filterVideosByResolution()
//         });
//       }
//     );

//     gListenerMP = GoogleCast.EventEmitter.addListener(
//       GoogleCast.MEDIA_PROGRESS_UPDATED,
//       ({ mediaProgress: { progress } }) => {
//         progress = Math.round(progress);
//         let { lengthInSec } = this.props.content;
//         if (progress === parseInt(lengthInSec) - 1) {
//           GoogleCast.pause();
//           return this.onEnd();
//         }
//         this.onProgress({ currentTime: progress });
//       }
//     );

//     gListenerSS = GoogleCast.EventEmitter.addListener(
//       GoogleCast.SESSION_STARTED,
//       () => {
//         this.animateControls(0);
//         gCasting = true;
//         this.props.onGCastingChange?.(true);
//         this.gCastMedia();
//       }
//     );
//   };

//   gCastMedia = async () => {
//     let {
//       state: { vpe, mp3s, captionsHidden },
//       props: {
//         type,
//         content: {
//           title,
//           signal,
//           description,
//           thumbnailUrl,
//           video_playback_endpoints
//         }
//       }
//     } = this;
//     let svpe = vpe.find(v => v.selected);
//     try {
//       if (!captionsHidden) GoogleCast.toggleSubtitles(true);
//       let networkSpeed = await networkSpeedService.getNetworkSpeed(
//         vpe[0].file,
//         signal
//       );
//       if (networkSpeed.aborted) return;
//       this.setState(
//         {
//           paused: false,
//           videoRefreshing: true,
//           vpe: [
//             ...video_playback_endpoints.map(v => ({
//               ...v,
//               selected: v.height === svpe.height
//             })),
//             {
//               height: 'Auto',
//               selected: svpe.height === 'Auto',
//               actualH: networkSpeed.recommendedVideoQuality,
//               file: Object.create(video_playback_endpoints)
//                 .sort((i, j) => (i.height < j.height ? 1 : -1))
//                 .find(v => v.height <= networkSpeed.recommendedVideoQuality)
//                 .file
//             }
//           ]
//         },
//         async () => {
//           let castOptions = {
//             studio: 'Drumeo',
//             title: title || '',
//             playPosition: cTime || 0,
//             subtitle: description || '',
//             imageUrl: thumbnailUrl || '',
//             mediaUrl:
//               (type === 'video'
//                 ? this.state.vpe.find(v => v.selected).file
//                 : mp3s.find(mp3 => mp3.selected).value) || ''
//           };
//           await GoogleCast.castMedia(castOptions);
//           GoogleCast.seek(cTime);
//         }
//       );
//     } catch (e) {
//       gCasting = false;
//       this.props.onGCastingChange?.(false);
//       await GoogleCast.endSession();
//     }
//   };

//   updateVideoProgress = async () => {
//     let {
//       content: { videoId, id, lengthInSec }
//     } = this.props;
//     this.props.onUpdateVideoProgress?.(videoId, id, lengthInSec);
//   };

//   orientationListener = (o, force) => {
//     if (isTablet) Orientation.unlockAllOrientations();
//     let { paused } = this.state;
//     let isLandscape = o.indexOf('AND') > 0;

//     if (
//       !force &&
//       ((!isTablet &&
//         (paused || o.indexOf('KNO') > 0 || o.indexOf('DOWN') > 0)) ||
//         (isTablet && o.indexOf('KNO') > 0))
//     )
//       return;
//     if (o.indexOf('LEFT') > 0) {
//       Orientation.lockToLandscapeLeft();
//     } else if (o.indexOf('RIGHT') > 0) {
//       Orientation.lockToLandscapeRight();
//     } else {
//       if (!isTablet) Orientation.lockToPortrait();
//     }

//     let dimsShouldChange =
//       (isLandscape && windowWidth < windowHeight) ||
//       (!isLandscape && windowWidth > windowHeight);
//     if (dimsShouldChange) {
//       windowHeight = windowWidth + windowHeight;
//       windowWidth = windowHeight - windowWidth;
//       windowHeight = windowHeight - windowWidth;
//       greaterWidthHeight =
//         windowWidth < windowHeight ? windowHeight : windowWidth;
//     }

//     if (isTablet)
//       return this.setState(
//         {
//           tabOrientation: o,
//           fullscreen: force ? !this.state.fullscreen : this.state.fullscreen
//         },
//         () => {
//           this.props.onOrientationChange?.(o);
//           this.onProgress({ currentTime: cTime });
//           if (force) StatusBar.setHidden(this.state.fullscreen);
//           if (this.props.onFullscreen)
//             this.props.onFullscreen(this.state.fullscreen);
//         }
//       );
//     this.setState({ fullscreen: isLandscape }, () => {
//       StatusBar.setHidden(isLandscape);
//       this.onProgress({ currentTime: cTime });
//       if (this.props.onFullscreen)
//         this.props.onFullscreen(this.state.fullscreen);
//     });
//   };

//   filterVideosByResolution = () => {
//     let vpe = this.props.content.video_playback_endpoints.map(v => ({
//       ...v
//     }));
//     if (!aCasting)
//       vpe = vpe.filter(v =>
//         windowWidth < windowHeight
//           ? v.height <= -~windowWidth * pixR
//           : v.height <= -~windowHeight * pixR
//       );
//     vpe = aCasting
//       ? vpe.map(v => ({
//           ...v,
//           selected: v.height === this.props.quality
//         }))
//       : [
//           ...vpe.map(v => ({
//             ...v,
//             selected: v.height === this.props.quality
//           })),
//           {
//             height: 'Auto',
//             file: vpe[vpe.length - 1].file,
//             actualH: vpe[vpe.length - 1].height,
//             selected: this.props.quality === 'Auto'
//           }
//         ];

//     if (!vpe.find(v => v.selected))
//       return vpe.map(v => ({
//         ...v,
//         selected: v.height === 720
//       }));
//     return vpe;
//   };

//   selectQuality = async (q, skipRender) => {
//     let recommendedVideoQuality;
//     let {
//       state: { vpe },
//       props: {
//         content: { signal }
//       }
//     } = this;
//     if (q === 'Auto') {
//       let networkSpeed = await networkSpeedService.getNetworkSpeed(
//         vpe[0].file,
//         signal
//       );
//       if (networkSpeed.aborted) return;
//       recommendedVideoQuality = Object.create(vpe)
//         .sort((i, j) => (i.height < j.height ? 1 : -1))
//         .find(rsv => rsv.height <= networkSpeed.recommendedVideoQuality);
//     }
//     let newVPE = {
//       videoRefreshing: gCasting,
//       vpe: aCasting
//         ? vpe.map(v => ({
//             ...v,
//             selected: v.height === q
//           }))
//         : vpe.map(v => ({
//             ...v,
//             selected: v.height === q,
//             file:
//               q === 'Auto' && v.height === 'Auto'
//                 ? recommendedVideoQuality.file
//                 : v.file,
//             actualH:
//               q === 'Auto' && v.height === 'Auto'
//                 ? recommendedVideoQuality.height
//                 : v.height === 'Auto'
//                 ? v.actualH
//                 : v.height
//           }))
//     };
//     if (!newVPE.vpe.find(v => v.selected))
//       newVPE.vpe = newVPE.vpe.map(v => ({
//         ...v,
//         selected: v.height === 720
//       }));
//     if (skipRender) return newVPE.vpe;
//     else return this.setState(newVPE);
//   };

//   getVideoDimensions = () => {
//     let { fullscreen } = this.state;
//     let { width, height } = this.props.content.video_playback_endpoints[0];
//     let greaterVDim = width < height ? height : width,
//       lowerVDim = width < height ? width : height;

//     videoW = fullscreen
//       ? (windowHeight * width) / height
//       : isTablet
//       ? maxWidth
//       : windowWidth;
//     videoH = fullscreen
//       ? windowHeight
//       : isTablet
//       ? (maxWidth / width) * height
//       : (windowWidth / width) * height;

//     if (videoW > windowWidth) {
//       videoW = Math.round(windowWidth);
//       videoH = Math.round((videoW * lowerVDim) / greaterVDim);
//     }

//     if (windowWidth > windowHeight && isTablet && !fullscreen) {
//       // videoH = Math.round(windowHeight / 2);
//       // videoW = Math.round((videoH * greaterVDim) / lowerVDim);
//     }

//     return { width: videoW, height: videoH };
//   };

//   pResponder = () => {
//     return PanResponder.create({
//       onStartShouldSetPanResponder: () => true,
//       onShouldBlockNativeResponder: () => true,
//       onPanResponderTerminationRequest: () => true,
//       onStartShouldSetPanResponderCapture: () => false,
//       onPanResponderRelease: () => {
//         delete this.seeking;
//         this.updateVideoProgress();
//         clearTimeout(this.controlsTO);
//         this.controlsTO = setTimeout(
//           () =>
//             this.animateControls(this.state.paused ? 0 : -greaterWidthHeight),
//           3000
//         );
//       },
//       onPanResponderTerminate: () => {
//         delete this.seeking;
//         this.updateVideoProgress();
//         clearTimeout(this.controlsTO);
//         this.controlsTO = setTimeout(
//           () =>
//             this.animateControls(this.state.paused ? 0 : -greaterWidthHeight),
//           3000
//         );
//       },
//       onPanResponderGrant: ({ nativeEvent: { locationX } }, { dx, dy }) => {
//         clearTimeout(this.controlsTO);
//         this.animateControls(0);
//         if (this.videoRef) {
//           if (!isiOS)
//             this.onProgress({
//               currentTime: (locationX / videoW) * this.props.content.lengthInSec
//             });
//           this.videoRef.seek(
//             (locationX / videoW) * this.props.content.lengthInSec
//           );
//         }
//         if (gCasting)
//           GoogleCast.seek(
//             (locationX / videoW) * this.props.content.lengthInSec
//           );
//         return Math.abs(dx) > 2 || Math.abs(dy) > 2;
//       },
//       onPanResponderMove: (e, { moveX }) => {
//         this.seeking = true;
//         moveX = moveX - (windowWidth - videoW) / 2;
//         this.translateBlueX.setValue(moveX - videoW);
//         if (this.videoRef) {
//           if (!isiOS)
//             this.onProgress({
//               currentTime: (moveX / videoW) * this.props.content.lengthInSec
//             });
//           this.videoRef.seek((moveX / videoW) * this.props.content.lengthInSec);
//         }
//         if (gCasting)
//           GoogleCast.seek((moveX / videoW) * this.props.content.lengthInSec);
//         this.videoTimer.setProgress(
//           (moveX / videoW) * this.props.content.lengthInSec
//         );
//       }
//     }).panHandlers;
//   };

//   onProgress = ({ currentTime }) => {
//     cTime = currentTime;
//     if (this.seeking) return;
//     clearTimeout(this.bufferingTO);
//     clearTimeout(this.bufferingTooLongTO);
//     delete this.bufferingTO;
//     this.bufferingOpacity.setValue(0);
//     this.translateBlueX.setValue(
//       (currentTime * videoW) / this.props.content.lengthInSec - videoW
//     );
//     if (this.videoTimer) this.videoTimer.setProgress(currentTime);
//     if (!aCasting) {
//       this.bufferingTO = setTimeout(
//         () =>
//           this.bufferingOpacity.setValue(
//             this.state.paused || aCasting || gCasting ? 0 : 1
//           ),
//         3000
//       );
//       this.bufferingTooLongTO = setTimeout(
//         () => this.selectQuality('Auto'),
//         10000
//       );
//     }
//   };

//   toggleControls = controlsOverwrite => {
//     clearTimeout(this.controlsTO);
//     controlsOverwrite = isNaN(controlsOverwrite)
//       ? this.translateControls._value
//         ? 0
//         : -greaterWidthHeight
//       : controlsOverwrite;
//     this.animateControls(controlsOverwrite);
//     this.controlsTO = setTimeout(
//       () => !this.state.paused && this.animateControls(-greaterWidthHeight),
//       3000
//     );
//   };

//   togglePaused = (pausedOverwrite, skipActionOnCasting) => {
//     this.updateVideoProgress();
//     this.setState(({ paused }) => {
//       paused = typeof pausedOverwrite === 'boolean' ? pausedOverwrite : !paused;
//       if (gCasting && !skipActionOnCasting)
//         if (paused) GoogleCast.pause();
//         else GoogleCast.play();
//       this.animateControls(paused ? 0 : -greaterWidthHeight);
//       clearTimeout(this.bufferingTO);
//       clearTimeout(this.bufferingTooLongTO);
//       this.bufferingOpacity.setValue(paused || aCasting || gCasting ? 0 : 1);
//       return { paused };
//     });
//   };

//   animateControls = (toValue, speed) => {
//     if (this.props.type === 'audio' || aCasting || gCasting) return;
//     Animated.spring(this.translateControls, {
//       toValue,
//       speed: speed || 100,
//       bounciness: 12,
//       useNativeDriver: true
//     }).start();
//     this.translateControls._value = toValue;
//   };

//   handleBack = () => {
//     let { fullscreen, tabOrientation } = this.state;
//     if (fullscreen)
//       return this.orientationListener(
//         isTablet ? tabOrientation : fullscreen ? 'PORT' : 'LANDLEFT',
//         true
//       );
//     this.animateControls(greaterWidthHeight, 1);
//     this.props.onBack();
//   };

//   onLoad = () => {
//     if (this.videoRef) {
//       if (!isiOS)
//         this.onProgress({
//           currentTime: cTime || this.props.content.lastWatchedPosInSec
//         });
//       this.videoRef.seek(cTime || this.props.content.lastWatchedPosInSec);
//     }
//     if (gCasting)
//       GoogleCast.seek(cTime || this.props.content.lastWatchedPosInSec);
//     this.bufferingOpacity.setValue(0);
//   };

//   onSaveSettings = async (rate, quality, captions) => {
//     this.setState(
//       {
//         rate,
//         captionsHidden: captions === 'Off',
//         vpe: await this.selectQuality(quality, true)
//       },
//       () => {
//         this.props.onQualityChange?.(quality);
//         if (gCasting) this.gCastMedia();
//       }
//     );
//   };

//   formatMP3Name = mp3 => {
//     switch (mp3) {
//       case 'mp3_no_drums_no_click_url':
//         return 'Music Only'.toUpperCase();
//       case 'mp3_yes_drums_no_click_url':
//         return 'With Drums'.toUpperCase();
//       case 'mp3_no_drums_yes_click_url':
//         return 'With Metronome'.toUpperCase();
//       case 'mp3_yes_drums_yes_click_url':
//         return 'With Drums & Metronome'.toUpperCase();
//     }
//   };

//   selectMp3 = selectedMp3 => {
//     if (this.mp3ActionModal) this.mp3ActionModal.toggleModal();
//     this.setState(
//       ({ mp3s }) => ({
//         mp3s: mp3s.map(mp3 => ({
//           ...mp3,
//           selected: mp3.id === selectedMp3.id
//         }))
//       }),
//       () => {
//         if (gCasting) this.gCastMedia();
//       }
//     );
//   };

//   onEnd = () => {
//     this.orientationListener(
//       isTablet ? this.state.tabOrientation : 'PORT',
//       true
//     );
//     this.updateVideoProgress();
//     this.setState({ paused: true, fullscreen: false }, () => {
//       cTime = 0;
//       StatusBar.setHidden(false);
//       if (this.videoRef) {
//         if (!isiOS) this.onProgress({ currentTime: 0 });
//         this.videoRef.seek(0);
//       }
//       if (gCasting) GoogleCast.seek(0);
//       this.animateControls(0);
//       this.translateBlueX.setValue(-videoW);
//       this.videoTimer.setProgress(0);
//     });
//   };

//   onAudioBecomingNoisy = () => {
//     if (!this.state.paused) this.togglePaused();
//   };

//   onSeek = time => {
//     time = parseFloat(time);
//     let fullLength = parseFloat(this.props.content.lengthInSec);
//     if (time < 0) time = 0;
//     else if (time > fullLength) time = fullLength;

//     this.updateVideoProgress();
//     if (this.videoRef) this.videoRef.seek(time);
//     if (!isiOS || gCasting) this.onProgress({ currentTime: time });
//     if (gCasting) GoogleCast.seek(time);
//   };

//   manageOfflinePath = path => {
//     let { offPath } = this.props;
//     let isOnline = path.indexOf('http') > -1,
//       isDataImg = path.indexOf('data:image') > -1,
//       isAndroidPath = path.indexOf('file://') > -1,
//       isiOSPath = !isOnline && !isDataImg && !isAndroidPath;
//     if (!isOnline) {
//       if (isiOSPath) {
//         path = `${offPath}/${path}`;
//         return path;
//       }
//       if (isAndroidPath) {
//         path = path.replace('file://', `file://${offPath}`);
//         return path;
//       }
//     }
//     return path;
//   };

//   onError = ({ error: { code } }) => {
//     if (code === -11855) {
//       this.setState(
//         ({ vpe }) => {
//           let selectedHeight = vpe.find(v => v.selected).height;
//           return {
//             vpe: vpe.filter(
//               v => v.height < selectedHeight || v.height === 'Auto'
//             )
//           };
//         },
//         () => {
//           let { vpe } = this.state;
//           this.props.onQualityChange?.(vpe[vpe.length - 2].height);
//         }
//       );
//     } else if (code === -1009 && !connection) {
//       this.onLoad();
//     } else {
//       this.alert.toggle(
//         `We're sorry, there was an issue loading this video, try reloading the lesson.`,
//         `If the problem persists please contact support.`
//       );
//     }
//   };

//   render() {
//     let {
//       state: {
//         vpe,
//         mp3s,
//         rate,
//         paused,
//         fullscreen,
//         tabOrientation,
//         captionsHidden,
//         videoRefreshing
//       },
//       props: {
//         type,
//         content: {
//           captions,
//           buffering,
//           formatTime,
//           lengthInSec,
//           nextLessonId,
//           thumbnailUrl,
//           nextLessonUrl,
//           previousLessonId,
//           previousLessonUrl
//         }
//       }
//     } = this;

//     return (
//       <View
//         style={[
//           { alignItems: 'center', zIndex: 1 },
//           fullscreen
//             ? {
//                 width: '100%',
//                 height: '100%',
//                 position: 'absolute',
//                 justifyContent: 'center'
//               }
//             : {}
//         ]}
//       >
//         <View
//           style={[styles.videoBackgorund, { marginTop: fullscreen ? 0 : -11 }]}
//         />
//         <View style={this.getVideoDimensions()}>
//           {videoRefreshing ? (
//             <View style={{ width: '100%', height: '100%' }} />
//           ) : (
//             <RNVideo
//               paused={paused}
//               controls={false}
//               onEnd={this.onEnd}
//               resizeMode='cover'
//               onLoad={this.onLoad}
//               rate={parseFloat(rate)}
//               playInBackground={true}
//               playWhenInactive={true}
//               audioOnly={type === 'audio'}
//               onProgress={this.onProgress}
//               ignoreSilentSwitch={'ignore'}
//               progressUpdateInterval={1000}
//               ref={r => (this.videoRef = r)}
//               onRemotePlayPause={this.togglePaused}
//               fullscreen={isiOS ? false : fullscreen}
//               style={{ width: '100%', height: '100%' }}
//               onAudioBecomingNoisy={this.onAudioBecomingNoisy}
//               source={{
//                 uri: this.manageOfflinePath(
//                   type === 'audio'
//                     ? mp3s.find(mp3 => mp3.selected).value
//                     : vpe.find(v => v.selected).file
//                 )
//               }}
//               onExternalPlaybackChange={() => {
//                 if (isiOS) AirPlay.startScan();
//               }}
//               {...(aCasting || !captions
//                 ? {}
//                 : {
//                     selectedTextTrack: {
//                       type: 'title',
//                       value: captionsHidden ? 'Disabled' : 'English'
//                     },
//                     textTracks:
//                       type === 'video'
//                         ? [
//                             {
//                               language: 'en',
//                               uri:
//                                 'https://raw.githubusercontent.com/bogdan-vol/react-native-video/master/disabled.vtt',
//                               title: 'Disabled',
//                               type: TextTrackType.VTT // "text/vtt"
//                             },
//                             {
//                               language: 'en',
//                               uri: captions,
//                               title: 'English',
//                               type: TextTrackType.VTT // "text/vtt"
//                             }
//                           ]
//                         : []
//                   })}
//             />
//           )}
//           <TouchableOpacity
//             onPress={this.toggleControls}
//             style={{
//               width: '100%',
//               height: '100%',
//               ...styles.controlsContainer
//             }}
//           >
//             {type === 'audio' && (
//               <Image
//                 style={{
//                   width: '100%',
//                   height: '100%',
//                   position: 'absolute'
//                 }}
//                 source={{
//                   uri: this.manageOfflinePath(thumbnailUrl)
//                 }}
//               />
//             )}
//             <Animated.View
//               style={{
//                 ...styles.constrolsBackground,
//                 opacity:
//                   type === 'video'
//                     ? this.translateControls.interpolate({
//                         outputRange: [0, 0.5],
//                         inputRange: [-videoW, 0]
//                       })
//                     : 0.5
//               }}
//             />
//             <Animated.View
//               style={{
//                 position: 'absolute',
//                 alignSelf: 'center',
//                 opacity: this.bufferingOpacity
//               }}
//             >
//               <ActivityIndicator
//                 color='white'
//                 size={'large'}
//                 animating={buffering}
//               />
//             </Animated.View>
//             <TouchableOpacity
//               style={{
//                 ...styles.backContainer,
//                 transform: [
//                   { translateX: type === 'video' ? this.translateControls : 0 }
//                 ]
//               }}
//               onPress={this.handleBack}
//             >
//               {svgs[fullscreen ? 'x' : 'arrowLeft'](iconStyles.smallBackArrow)}
//             </TouchableOpacity>
//             <Animated.View
//               style={{
//                 flexDirection: 'row',
//                 transform: [
//                   { translateX: type === 'video' ? this.translateControls : 0 }
//                 ]
//               }}
//             >
//               <TouchableOpacity
//                 onPress={this.props.goToPreviousLesson}
//                 style={{
//                   flex: 1,
//                   alignItems: 'center',
//                   opacity: previousLessonId || previousLessonUrl ? 1 : 0.5
//                 }}
//                 disabled={!(previousLessonId || previousLessonUrl)}
//               >
//                 {svgs.prevLesson(iconStyle)}
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={{ flex: 1, alignItems: 'center' }}
//                 onPress={() => this.onSeek((cTime -= 10))}
//               >
//                 {svgs.back10(iconStyle)}
//               </TouchableOpacity>
//               <TouchableOpacity
//                 onPress={this.togglePaused}
//                 style={{ flex: 1, alignItems: 'center' }}
//               >
//                 {svgs[paused ? 'playSvg' : 'pause'](iconStyle)}
//               </TouchableOpacity>
//               <TouchableOpacity
//                 style={{ flex: 1, alignItems: 'center' }}
//                 onPress={() => this.onSeek((cTime += 10))}
//               >
//                 {svgs.forward10(iconStyle)}
//               </TouchableOpacity>
//               <TouchableOpacity
//                 onPress={this.props.goToNextLesson}
//                 style={{
//                   flex: 1,
//                   alignItems: 'center',
//                   opacity: nextLessonId || nextLessonUrl ? 1 : 0.5
//                 }}
//                 disabled={!(nextLessonUrl || nextLessonId)}
//               >
//                 {svgs.prevLesson({
//                   ...iconStyle,
//                   style: { transform: [{ rotate: '180deg' }] }
//                 })}
//               </TouchableOpacity>
//             </Animated.View>
//             <Animated.View
//               style={{
//                 bottom: fullscreen
//                   ? windowHeight > videoH
//                     ? 29
//                     : 29 + 25
//                   : 11,
//                 ...styles.bottomControlsContainer,
//                 transform: [
//                   { translateX: type === 'video' ? this.translateControls : 0 }
//                 ]
//               }}
//             >
//               <VideoTimer_V2
//                 formatTime={formatTime}
//                 lengthInSec={lengthInSec}
//                 ref={r => (this.videoTimer = r)}
//               />
//               {connection && type !== 'audio' && (
//                 <TouchableOpacity
//                   style={{
//                     padding: 10
//                   }}
//                   underlayColor={'transparent'}
//                   onPress={() => {
//                     this.videoSettings.toggle();
//                   }}
//                 >
//                   {svgs.videoQuality({ width: 20, height: 20, fill: 'white' })}
//                 </TouchableOpacity>
//               )}
//               {type !== 'audio' && (
//                 <TouchableOpacity
//                   style={{ padding: 10 }}
//                   underlayColor={'transparent'}
//                   onPress={() =>
//                     this.orientationListener(
//                       isTablet
//                         ? tabOrientation
//                         : fullscreen
//                         ? 'PORT'
//                         : 'LANDLEFT',
//                       true
//                     )
//                   }
//                 >
//                   {svgs.fullScreen({ height: 20, width: 20, fill: 'white' })}
//                 </TouchableOpacity>
//               )}
//               {type === 'audio' && (
//                 <TouchableOpacity
//                   style={styles.mp3TogglerContainer}
//                   onPress={() => this.mp3ActionModal.toggleModal()}
//                 >
//                   <Text
//                     maxFontSizeMultiplier={this.props.maxFontMultiplier}
//                     style={styles.mp3TogglerText}
//                   >
//                     {this.formatMP3Name(mp3s.find(mp3 => mp3.selected).key)}
//                   </Text>
//                   {svgs.arrowDown({ height: 20, width: 20, fill: '#ffffff' })}
//                 </TouchableOpacity>
//               )}
//             </Animated.View>
//           </TouchableOpacity>
//           {isiOS && (
//             <Animated.View
//               style={{
//                 top: 5,
//                 width: 1,
//                 right: 60,
//                 height: 1,
//                 position: 'absolute',
//                 transform: [
//                   {
//                     translateX: type === 'video' ? this.translateControls : 0
//                   }
//                 ]
//               }}
//             >
//               <TouchableOpacity
//                 activeOpacity={1}
//                 onPress={() => AirPlay.startScan()}
//               >
//                 <AirPlayButton />
//               </TouchableOpacity>
//             </Animated.View>
//           )}
//           <Animated.View
//             style={{
//               top: 7,
//               right: 60,
//               position: 'absolute',
//               transform: [
//                 { translateX: type === 'video' ? this.translateControls : 0 }
//               ]
//             }}
//           >
//             <CastButton
//               style={{
//                 width: 29,
//                 height: 29,
//                 tintColor: 'white'
//               }}
//             />
//           </Animated.View>
//         </View>
//         <Animated.View
//           {...this.pResponder()}
//           style={{
//             ...this.getVideoDimensions(),
//             ...styles.timerContainer,
//             position: fullscreen ? 'absolute' : 'relative',
//             bottom: fullscreen
//               ? windowHeight > videoH
//                 ? (windowHeight - videoH) / 2
//                 : 25
//               : 0,
//             transform: [
//               {
//                 translateX: fullscreen
//                   ? type === 'video'
//                     ? this.translateControls
//                     : 0
//                   : 0
//               }
//             ]
//           }}
//         >
//           <View style={styles.timerGrey}>
//             <Animated.View
//               style={{
//                 ...styles.timerBlue,
//                 transform: [{ translateX: this.translateBlueX }]
//               }}
//             />
//             <Animated.View
//               style={{
//                 ...styles.timerDot,
//                 transform: [{ translateX: this.translateBlueX }],
//                 opacity:
//                   type === 'video'
//                     ? this.translateControls.interpolate({
//                         outputRange: [0, 1],
//                         inputRange: [-videoW, 0]
//                       })
//                     : 1
//               }}
//             />
//           </View>
//           <View style={styles.timerCover} />
//         </Animated.View>
//         {fullscreen && <PrefersHomeIndicatorAutoHidden />}
//         <VideoSettings_V2
//           qualities={vpe}
//           showRate={!gCasting && !aCasting}
//           ref={r => (this.videoSettings = r)}
//           onSaveSettings={this.onSaveSettings}
//           showCaptions={!!captions && !gCasting && !aCasting}
//         />
//         {type === 'audio' && (
//           <ActionModal
//             modalStyle={{
//               width: '80%',
//               backgroundColor: 'white'
//             }}
//             ref={r => (this.mp3ActionModal = r)}
//           >
//             {mp3s.map(mp3 => (
//               <TouchableOpacity
//                 key={mp3.id}
//                 style={styles.mp3OptionContainer}
//                 onPress={() => this.selectMp3(mp3)}
//               >
//                 <Text
//                   maxFontSizeMultiplier={this.props.maxFontMultiplier}
//                   style={{
//                     ...styles.mp3OptionText,
//                     color: mp3.selected ? DRUMEO_BLUE : 'black'
//                   }}
//                 >
//                   {this.formatMP3Name(mp3.key)}
//                 </Text>
//                 {mp3.selected && (
//                   <View style={{ marginRight: 10 }}>
//                     {svgs.check({ height: 23, width: 23, fill: DRUMEO_BLUE })}
//                   </View>
//                 )}
//               </TouchableOpacity>
//             ))}
//           </ActionModal>
//         )}
//         <AnimatedCustomAlert
//           hideTryAgainBtn={true}
//           ref={r => (this.alert = r)}
//           additionalBtn={
//             <TouchableOpacity
//               style={{
//                 marginTop: 10,
//                 borderRadius: 50,
//                 backgroundColor: DRUMEO_BLUE
//               }}
//               onPress={() => {
//                 this.alert.toggle();
//                 if (this.props.onRefresh) this.props.onRefresh();
//               }}
//             >
//               <Text
//                 maxFontSizeMultiplier={this.props.maxFontMultiplier}
//                 style={{
//                   padding: 15,
//                   fontSize: 15,
//                   color: '#ffffff',
//                   textAlign: 'center',
//                   fontFamily: 'OpenSans-Bold'
//                 }}
//               >
//                 RELOAD LESSON
//               </Text>
//             </TouchableOpacity>
//           }
//           additionalTextBtn={
//             <TouchableOpacity
//               style={{ padding: 15 }}
//               onPress={this.props.toSupport}
//             >
//               <Text
//                 maxFontSizeMultiplier={this.props.maxFontMultiplier}
//                 style={{
//                   fontSize: 12,
//                   color: DRUMEO_BLUE,
//                   textAlign: 'center',
//                   fontFamily: 'OpenSans',
//                   textDecorationLine: 'underline'
//                 }}
//               >
//                 CONTACT SUPPORT
//               </Text>
//             </TouchableOpacity>
//           }
//         />
//       </View>
//     );
//   }
// }
// const styles = StyleSheet.create({
//   videoBackgorund: {
//     width: '100%',
//     height: '100%',
//     position: 'absolute',
//     backgroundColor: 'black'
//   },
//   backContainer: {
//     top: 0,
//     left: 0,
//     padding: 15,
//     position: 'absolute',
//     justifyContent: 'center'
//   },
//   controlsContainer: {
//     position: 'absolute',
//     alignItems: 'center',
//     justifyContent: 'center'
//   },
//   timerContainer: {
//     height: 29,
//     marginTop: -11,
//     overflow: 'hidden'
//   },
//   timerGrey: {
//     height: 7,
//     width: '100%',
//     marginTop: 11,
//     alignItems: 'center',
//     flexDirection: 'row',
//     backgroundColor: '#2F3334'
//   },
//   timerBlue: {
//     width: '100%',
//     height: '100%',
//     backgroundColor: DRUMEO_BLUE
//   },
//   timerDot: {
//     width: 22,
//     height: 22,
//     borderRadius: 11,
//     backgroundColor: DRUMEO_BLUE,
//     marginLeft: Math.sqrt(Math.pow(11, 2) - Math.pow(3.5, 2)) - 11
//   },
//   timerCover: {
//     top: 0,
//     left: 0,
//     width: '100%',
//     height: '100%',
//     position: 'absolute',
//     backgroundColor: 'transparent'
//   },
//   constrolsBackground: {
//     width: '100%',
//     height: '100%',
//     position: 'absolute',
//     justifyContent: 'center',
//     backgroundColor: 'black'
//   },
//   bottomControlsContainer: {
//     width: '100%',
//     position: 'absolute',
//     alignItems: 'center',
//     flexDirection: 'row',
//     justifyContent: 'center'
//   },
//   mp3TogglerContainer: {
//     position: 'absolute',
//     alignItems: 'center',
//     flexDirection: 'row'
//   },
//   mp3TogglerText: {
//     fontSize: 12,
//     color: 'white',
//     fontFamily: 'OpenSans'
//   },
//   mp3OptionContainer: {
//     padding: 10,
//     alignItems: 'center',
//     flexDirection: 'row',
//     borderBottomWidth: 1,
//     backgroundColor: 'white',
//     borderBottomColor: LIGHT_BORDER_COLOR
//   },
//   mp3OptionText: {
//     flex: 1,
//     fontSize: 10,
//     paddingLeft: 13,
//     color: '#ffffff',
//     fontFamily: 'OpenSans'
//   }
// });
