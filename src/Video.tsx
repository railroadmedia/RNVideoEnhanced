import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  Image,
  AppState,
  Animated,
  StyleSheet,
  PanResponder,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  GestureResponderHandlers,
  useWindowDimensions,
  LayoutChangeEvent,
} from 'react-native';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import ReactNativeBlobUtil from 'react-native-blob-util';
import WebView, { WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';
import Orientation, {
  LANDSCAPE_LEFT,
  LANDSCAPE_RIGHT,
  PORTRAIT,
} from 'react-native-orientation-locker';
import RNVideo, {
  LoadError,
  OnBufferData,
  OnLoadData,
  OnProgressData,
  TextTrackType,
} from 'react-native-video';
import GoogleCast, {
  CastButton,
  MediaLoadRequest,
  RemoteMediaClient,
} from 'react-native-google-cast';
import PrefersHomeIndicatorAutoHidden from 'react-native-home-indicator';

import ActionModal from './ActionModal';
import VideoTimer from './VideoTimer';
import VideoSettings from './VideoSettings';
import AnimatedCustomAlert from './AnimatedCustomAlert';
import DoubleTapArea from './DoubleTapArea';
import networkSpeedService from './services/networkSpeed.service';
import LiveTimer from './LiveTimer';

import { svgs } from './img/svgs';
import { IS_IOS, IS_TABLET, PIX_R, getMP3Array } from './helper';
import type { IContent, IMp3, IVpe } from './entity';
import type ISvg from './img/ISvg';
import Mp3Option from './Mp3Option';
const { AirPlay, AirPlayButton, AirPlayListener } = require('react-native-airplay-ios');

const iconStyle = { width: 40, height: 40, fill: 'white' };
let playPressedFirstTime = true;
let secondsPlayed = 0;
let startPlaySec = 0;
let endPlaySec = 0;
let videoW: number;
let videoH: number;
let aCasting: boolean | undefined;
let gCasting: boolean;
let orientation: string;
let offlinePath: string;
let quality: string | number = 'Auto';

interface IVideo {
  onPlayerReady?: () => void;
  youtubeId?: string;
  content: IContent;
  type: 'audio' | 'video';
  toSupport: () => void;
  onBack?: () => void;
  connection: boolean | null;
  goToNextLesson?: () => void;
  goToPreviousLesson?: () => void;
  disableNext?: boolean;
  disablePrevious?: boolean;
  autoPlay?: boolean;
  live: boolean;
  liveData?: {
    isLive?: boolean;
    live_event_end_time?: string;
    live_event_start_time?: string;
    live_event_end_time_in_timezone?: string;
    live_event_start_time_in_timezone?: string;
  };
  startTime?: number;
  endTime?: number;
  onStart?: () => void;
  quality?: number;
  onEnd?: () => void;
  onGCastingChange?: (casting: boolean) => void;
  onACastingChange?: (casting?: boolean) => void;
  gCasting?: boolean;
  onRefresh: () => void;
  showControls: boolean;
  paused: boolean;
  onFullscreen?: (isFullscreen: boolean) => void;
  orientationIsLocked?: boolean;
  repeat: boolean;
  onUpdateVideoProgress?: (
    videoId: number | string,
    id: number,
    lengthInSec: number,
    currentTime: number,
    secondsPlayed: number,
    mediaCategory: string,
    apiCallDelay?: number
  ) => void;
  listening?: boolean;
  styles: {
    mp3ListPopup?: any;
    afterTimerCursorBackground?: string;
    mp3TogglerTextColor?: string;
    smallPlayerControls?: ISvg;
    timerText?: { left: TextStyle; right: TextStyle } | undefined;
    largePlayerControls?: ISvg;
    iconColor: string;
    containerStyle?: ViewStyle;
    timerCursorBackground: string;
    beforeTimerCursorBackground: string;
    alert: {
      titleTextColor: string;
      subtitleTextColor: string;
      background: string;
      contactSupport: TextStyle;
      reloadLesson: { color: string; background: string };
    };
  };
  maxWidth?: number;
  onOrientationChange?: (o: any) => void;
  onQualityChange?: (qual?: string | number) => void;
  maxFontMultiplier?: number;
  showCastingOptions?: boolean;
  orientation?: string;
  aCasting?: boolean;
  offlinePath?: string;
}

const Video = forwardRef<
  {
    onSeek: (timeCode: number | string) => void;
    togglePaused: (pausedOverwrite?: boolean, skipActionOnCasting?: boolean) => void;
    updateVideoProgress: (apiCallDelay?: number) => void;
  },
  IVideo
>((props, ref) => {
  const {
    autoPlay,
    connection,
    content,
    disableNext,
    disablePrevious,
    startTime,
    endTime,
    goToNextLesson,
    goToPreviousLesson,
    listening,
    live,
    liveData,
    maxFontMultiplier,
    onBack,
    onStart,
    onEnd,
    onFullscreen,
    onGCastingChange,
    onACastingChange,
    onPlayerReady,
    onRefresh,
    onUpdateVideoProgress,
    orientationIsLocked,
    styles: propStyles,
    toSupport,
    type,
    youtubeId,

    maxWidth,
    onOrientationChange,
    onQualityChange,
  } = props;
  quality = props?.quality || quality;
  aCasting = props?.aCasting || aCasting;
  gCasting = props?.aCasting || gCasting;
  orientation = props?.orientation || orientation;
  offlinePath =
    props?.offlinePath || IS_IOS
      ? ReactNativeBlobUtil.fs.dirs.LibraryDir
      : ReactNativeBlobUtil.fs.dirs.DocumentDir;
  const googleCastSession = GoogleCast.getSessionManager();
  const insets = useSafeAreaInsets();
  const { width: wWidth, height: wHeight } = useWindowDimensions();

  const [rate, setRate] = useState<string>('1.0');
  const [paused, setPaused] = useState<boolean>(true);
  const [captionsHidden, setCaptionsHidden] = useState<boolean>(true);
  const [videoRefreshing, setVideoRefreshing] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isControlVisible, setIsControlVisible] = useState<boolean>(true);
  const [repeat, setRepeat] = useState<boolean>(false);
  const [liveEnded, setLiveEnded] = useState<boolean>(false);
  const [buffering, setBuffering] = useState<boolean>(true);
  const [mp3Length, setMp3Length] = useState<number>(0);
  const [mp3s, setMp3s] = useState<IMp3[]>([]);
  const [vpe, setVpe] = useState<IVpe[] | undefined>();
  const [fullscreen, setFullscreen] = useState<boolean>();
  const [showPoster, setShowPoster] = useState(true);
  const [showCastingOptions, setShowCastingOptions] = useState<boolean>();
  const [tabOrientation, setTabOrientation] = useState<string | undefined>(
    IS_TABLET ? orientation || (wWidth > wHeight ? 'LANDSCAPE' : 'PORTRAIT') : undefined
  );

  const cTime = useRef<number>(
    autoPlay ? (startTime ? startTime : 0) : content?.last_watch_position_in_seconds || 0
  );
  const seekTime = useRef<number>(0);
  const seeking = useRef<boolean>();
  const videoPlayStatus = useRef<boolean>();
  const progressBarPositionX = useRef<number>(0);

  const translateControls = useRef<any>(new Animated.Value(1));
  const translateControlsRef = useRef<number>();
  const translateBlueX = useRef(new Animated.Value(-videoW + 11));
  const googleCastClient = useRef<RemoteMediaClient>();
  const controlsTO = useRef<NodeJS.Timeout | undefined>();
  const webViewRef = useRef<WebView>(null);
  const videoRef = useRef<RNVideo>(null);
  const videoTimerRef = useRef<React.ElementRef<typeof VideoTimer>>(null);
  const videoSettingsRef = useRef<React.ElementRef<typeof VideoSettings>>(null);
  const mp3ActionModalRef = useRef<React.ElementRef<typeof ActionModal>>(null);
  const alertRef = useRef<React.ElementRef<typeof AnimatedCustomAlert>>(null);
  const endVideoFlagRef = useRef<boolean>(false);

  const minsToStart = (startDate: string): number =>
    Math.ceil((Date.parse(startDate) - Date.now()) / (1000 * 60));

  const hasPrevious =
    disablePrevious !== undefined
      ? !disablePrevious
      : content?.previous_lesson &&
        (content?.previous_lesson.id || content?.previous_lesson.mobile_app_url);
  const hasNext =
    disableNext !== undefined
      ? !disableNext
      : content?.next_lesson && (content?.next_lesson.id || content?.next_lesson.mobile_app_url);
  const audioOnly = content?.type === 'play-along' && listening;
  const minsToStartValue = minsToStart(liveData?.live_event_start_time_in_timezone || '');
  const showTimer =
    (!!liveData && !liveData?.isLive) ||
    liveEnded ||
    (!!liveData && liveData?.isLive && minsToStartValue < 15 && minsToStartValue > 0);

  useEffect(() => {
    getVideoDimensions();

    if (!youtubeId) {
      setBuffering(true);
    }

    translateBlueX.current?.setOffset(-11); // Offsets half the timer dot width so its centered.

    if (!youtubeId) {
      setVpe(filterVideosByResolution());
    }
    setFullscreen(!IS_TABLET && wWidth > wHeight);
    setPaused(props?.paused);
    setRepeat(props?.repeat ? props.repeat : false);
    setShowControls(props?.showControls);
    setShowCastingOptions(
      props?.showCastingOptions !== undefined ? props?.showCastingOptions : true
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    props?.aCasting,
    props?.autoPlay,
    props?.offlinePath,
    props?.orientation,
    props?.paused,
    props?.quality,
    props.repeat,
    props?.showCastingOptions,
    props?.showControls,
    props?.startTime,
    youtubeId,
  ]);

  useEffect(() => {
    if (!youtubeId) {
      if (gCasting) {
        setShowControls(false);
      }
      googleCastSession?.getCurrentCastSession().then(client => {
        if (!client) {
          return (gCasting = false);
        } else {
          gCasting = true;
        }
        const remoteMediaClient = client.client;

        remoteMediaClient?.getMediaStatus().then(st => {
          setShowControls(true);
          setPaused(false);
          googleCastClient.current = remoteMediaClient;
          gCastProgressListener();
          if (gCasting) {
            gCastMedia(
              st?.mediaInfo?.metadata?.title === props?.content?.title ? st?.streamPosition : 0
            );
          }
        });
      });
      appleCastingListeners();
      googleCastingListeners();
      selectQuality(quality || 'Auto');
    }
    const handleAppStateChange = (state: string): void => {
      if (state === (IS_IOS ? 'inactive' : 'background') && !youtubeId) {
        setPaused(true);
        updateVideoProgress();
      }
      toggleControls(true);
      clearTimeout(controlsTO.current);
    };
    const stateListener = AppState.addEventListener('change', handleAppStateChange);

    Orientation.getOrientation(orientationListener);
    Orientation.addDeviceOrientationListener(orientationListener);

    return () => {
      playPressedFirstTime = true;
      secondsPlayed = 0;
      clearTimeout(controlsTO.current);
      if (!youtubeId) {
        setPaused(true);
      }
      if (!!stateListener) {
        stateListener.remove();
      }
      Orientation.removeDeviceOrientationListener(orientationListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!connection && !youtubeId) {
      selectQuality('Auto');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection, youtubeId]);

  useEffect(() => {
    cTime.current = autoPlay ? 0 : content?.last_watch_position_in_seconds || 0;
    playPressedFirstTime = true;
    secondsPlayed = 0;

    const updatedMp3s = getMP3Array(content);
    if (updatedMp3s?.[0]) {
      updatedMp3s[0].selected = true;
    }
    setMp3s(updatedMp3s);
    if (!youtubeId) {
      setVpe(filterVideosByResolution());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content?.id]);

  useImperativeHandle(ref, () => ({
    onSeek,
    togglePaused,
    updateVideoProgress,
  }));

  const appleCastingListeners = (): void => {
    if (!IS_IOS) {
      return;
    }
    const { captions, signal, video_playback_endpoints } = content;
    AirPlayListener.addListener('deviceConnected', async ({ devices }: any) => {
      try {
        if (devices[0]?.portType === 'AirPlay') {
          animateControls(1);
          aCasting = true;
          onACastingChange?.(true);
          const svpe = vpe?.find(v => v?.selected);
          const networkSpeed = await networkSpeedService.getNetworkSpeed(
            vpe?.[0]?.file,
            offlinePath,
            signal
          );
          if (networkSpeed?.aborted) {
            return;
          }
          setVideoRefreshing(!!captions);
          setVideoRefreshing(false);
          if (video_playback_endpoints) {
            setVpe([
              ...video_playback_endpoints?.map(v => ({
                ...v,
                selected: v?.height === svpe?.height,
              })),
              {
                height: 'Auto',
                selected: svpe?.height === 'Auto',
                actualH: networkSpeed.recommendedVideoQuality,
                file: Object.create(video_playback_endpoints)
                  ?.sort((i: { height: number }, j: { height: number }) =>
                    i?.height < j?.height ? 1 : -1
                  )
                  ?.find(
                    (v: { height: number }) => v?.height <= networkSpeed.recommendedVideoQuality
                  )?.file,
              },
            ]);
          }
        } else {
          aCasting = undefined;
          onACastingChange?.();
          setVideoRefreshing(!!captions);
          setVideoRefreshing(false);
          setVpe(filterVideosByResolution());
        }
      } catch (e) {}
    });
  };

  const googleCastingListeners = async (): Promise<void> => {
    googleCastSession?.onSessionEnding(() => {
      delete googleCastClient.current;
      gCasting = false;
      onGCastingChange?.(false);
      setVideoRefreshing(false);
      setVpe(filterVideosByResolution());
      setShowPoster(false);
      animateControls(paused ? 1 : 0);
    });

    googleCastSession?.onSessionStarted(({ client }) => {
      googleCastClient.current = client;
      animateControls(1);
      gCasting = true;
      onGCastingChange?.(true);
      gCastMedia();
      gCastProgressListener();
      setShowPoster(true);
    });
  };

  const gCastProgressListener = (): void => {
    googleCastClient.current?.onMediaProgressUpdated?.((progress: number) => {
      if (!progress) {
        return;
      }
      progress = Math.round(progress);
      const { length_in_seconds } = content;
      if (progress === length_in_seconds - 1) {
        googleCastClient.current?.pause();
        return onEndVideo();
      }
      onProgress({ currentTime: progress });
    });
  };

  const gCastMedia = useCallback(
    async (time?: number): Promise<void> => {
      const { title, signal, captions, description, video_playback_endpoints, length_in_seconds } =
        content;
      const svpe = vpe?.find(v => v?.selected);
      try {
        const networkSpeed = await networkSpeedService.getNetworkSpeed(
          vpe?.[0]?.file,
          offlinePath,
          signal
        );
        if (networkSpeed.aborted) {
          return;
        }
        setPaused(false);
        setVideoRefreshing(true);
        if (video_playback_endpoints) {
          setVpe([
            ...video_playback_endpoints?.map(v => ({
              ...v,
              selected: v?.height === svpe?.height,
            })),
            {
              height: 'Auto',
              selected: svpe?.height === 'Auto',
              actualH: networkSpeed.recommendedVideoQuality,
              file: Object.create(video_playback_endpoints)
                ?.sort((i: { height: number }, j: { height: number }) =>
                  i?.height < j?.height ? 1 : -1
                )
                ?.find((v: { height: number }) => v?.height <= networkSpeed.recommendedVideoQuality)
                ?.file,
            },
          ]);
        }

        const castOptions: MediaLoadRequest = {
          mediaInfo: {
            contentUrl:
              (type === 'video'
                ? !!vpe?.find(v => v.selected)?.originalFile
                  ? vpe?.find(v => v.selected)?.originalFile
                  : vpe?.find(v => v.selected)?.file
                : mp3s?.find(mp3 => mp3.selected)?.value) || '',
            metadata: {
              type: 'movie',
              studio: 'Drumeo',
              title: title || '',
              subtitle: description || '',
            },
            streamDuration: mp3Length || length_in_seconds,
          },
          playbackRate: parseFloat(rate),
          startTime: Math.round(time || cTime.current || 0),
        };
        if (captions && castOptions?.mediaInfo) {
          castOptions.mediaInfo.mediaTracks = [
            {
              id: 1, // assign a unique numeric ID
              type: 'text',
              subtype: 'subtitles',
              name: 'English Subtitle',
              contentId: captions,
              language: 'en-US',
            },
          ];
        }
        googleCastClient.current?.loadMedia(castOptions);
        if (captions) {
          if (!captionsHidden) {
            googleCastClient.current?.onMediaPlaybackStarted(s => {
              if (s?.playerState === 'playing') {
                googleCastClient.current?.setActiveTrackIds([1]);
                googleCastClient.current?.setTextTrackStyle({
                  backgroundColor: '#00000000',
                  edgeType: 'outline',
                  edgeColor: '#000000FF',
                  fontFamily: 'OpenSans',
                });
              }
            });
          } else {
            googleCastClient.current?.onMediaPlaybackStarted(s => {
              if (s?.playerState === 'playing') {
                googleCastClient.current?.setActiveTrackIds([]);
              }
            });
          }
        }
      } catch (e) {
        gCasting = false;
        onGCastingChange?.(false);
        googleCastSession?.endCurrentSession();
      }
    },
    [captionsHidden, content, googleCastSession, mp3Length, mp3s, onGCastingChange, rate, type, vpe]
  );

  const updateVideoProgress = async (apiCallDelay?: number): Promise<void> => {
    onUpdateVideoProgress?.(
      youtubeId || content?.vimeo_video_id,
      content?.id,
      mp3Length || content?.length_in_seconds || 0,
      cTime.current,
      secondsPlayed,
      youtubeId ? 'youtube' : 'vimeo',
      apiCallDelay
    );
    secondsPlayed = 0;
  };

  const orientationListener = (o: string, force?: boolean): (() => void) | undefined => {
    if (orientationIsLocked) {
      return;
    }

    orientation = o.includes('UPSIDE') ? PORTRAIT : o;

    if (o.includes('UNKNOWN') || o.includes('FACE') || o.includes('UPSIDE')) {
      return;
    }

    Orientation.unlockAllOrientations();
    const isLandscape = o.includes('LAND');

    if (force) {
      if (o.includes('LEFT')) {
        Orientation.lockToLandscapeLeft();
      } else if (o.includes('RIGHT')) {
        Orientation.lockToLandscapeRight();
      } else {
        Orientation.lockToPortrait();
      }
    }
    const fs = !IS_TABLET || live ? isLandscape : force ? !fullscreen : fullscreen;

    onOrientationChange?.(o);
    if (mp3Length > 0) {
      if (Math.trunc(cTime.current) !== mp3Length) {
        onProgress({ currentTime: cTime.current || 0 });
      }
    } else {
      if (Math.trunc(cTime.current) !== content?.length_in_seconds) {
        onProgress({ currentTime: cTime.current || 0 });
      }
    }
    onFullscreen?.(!!fs);

    if (IS_TABLET) {
      setTabOrientation(
        o.includes('LEFT') ? LANDSCAPE_LEFT : o.includes('RIGHT') ? LANDSCAPE_RIGHT : PORTRAIT
      );
    }

    setFullscreen(fs);
  };

  const filterVideosByResolution = (): IVpe[] | undefined => {
    let vpeTemp: IVpe[] | undefined = content?.video_playback_endpoints?.map(v => ({
      ...v,
    }));
    if (!aCasting) {
      vpeTemp = vpeTemp?.filter(v =>
        wWidth < wHeight
          ? (v?.height as number) <= -~wWidth * PIX_R
          : (v?.height as number) <= -~wHeight * PIX_R
      );
    }
    vpeTemp = aCasting
      ? vpeTemp?.map(v => ({
          ...v,
          selected: v?.height === quality,
        }))
      : [
          ...(vpeTemp?.map(v => ({
            ...v,
            selected: v?.height === quality,
          })) || []),
          {
            height: 'Auto',
            file: vpeTemp?.[vpeTemp?.length - 1]?.file,
            actualH: vpeTemp?.[vpeTemp?.length - 1]?.height,
            selected: quality === 'Auto',
          },
        ];

    if (!vpeTemp?.find(v => v?.selected)) {
      return vpeTemp?.map(v => ({
        ...v,
        selected: v?.height === 720,
      }));
    }
    return vpeTemp;
  };

  const updateBlueX = useCallback((): void => {
    if (!translateBlueX.current) {
      return;
    }
    const secLength = mp3Length > 0 ? mp3Length : content?.length_in_seconds;
    const translate =
      cTime.current !== undefined && !!secLength
        ? (cTime.current * videoW) / secLength - videoW
        : -videoW;

    if (!isNaN(translate) && isFinite(translate)) {
      translateBlueX.current.setValue(translate);
    }
  }, [content?.length_in_seconds, mp3Length]);

  const onSeek = (time: string | number): void => {
    time = parseFloat(time as string);
    if (!isNaN(time)) {
      const fullLength = mp3Length || content.length_in_seconds;
      if (time < 0) {
        time = 0;
      } else if (time > fullLength) {
        time = fullLength;
      }

      if (showPoster) {
        setShowPoster(gCasting ? true : false);
      } else if (gCasting) {
        setShowPoster(true);
      }
      if (videoRef.current) {
        videoRef.current?.seek?.(time);
      }
      if (webViewRef.current) {
        webViewRef.current?.injectJavaScript(`seekTo(${time})`);
      }
      if (!IS_IOS || gCasting) {
        onProgress({ currentTime: time });
      }
      googleCastClient.current?.seek({ position: time || 0 });
    }
  };

  const handleLiveBack = (): void => {
    onBack?.();
  };

  const handleYtBack = (): void => {
    webViewRef.current?.injectJavaScript(`(function() {
      onBack();
    })()`);
  };

  const getVideoDimensions = useCallback((): {
    width: number | string;
    height?: number | string;
    aspectRatio?: number;
  } => {
    let width;
    let height;

    if (youtubeId) {
      if (fullscreen && !IS_TABLET) {
        if (live) {
          return {
            width: '100%',
            aspectRatio: 16 / 9,
            height: undefined,
          };
        }
        return {
          width: '100%',
          height: '100%',
        };
      }
      if (type === 'audio') {
        width = 640;
        height = 360;
      } else {
        return { width: '100%', aspectRatio: 16 / 9 };
      }
    } else {
      width = content?.video_playback_endpoints?.[0]?.width || 0;
      height = content?.video_playback_endpoints?.[0]?.height || 0;
    }

    const greaterVDim = width < height ? height : width;
    const lowerVDim = width < height ? width : height;

    videoW = fullscreen
      ? ((IS_IOS ? wHeight - (insets?.bottom || 0) : wHeight) * width) / height
      : maxWidth || wWidth;
    videoH = fullscreen
      ? IS_IOS
        ? wHeight - (insets?.bottom || 0)
        : wHeight
      : ((maxWidth || wWidth) / width) * height;

    if (videoW > wWidth) {
      videoW = Math.round(wWidth);
      videoH = Math.round((videoW * lowerVDim) / greaterVDim);
    }

    if (wWidth > wHeight && IS_TABLET && !fullscreen && !maxWidth) {
      videoW = Math.round((wWidth * 2) / 3);
      videoH = Math.round((videoW * lowerVDim) / greaterVDim);
    }
    updateBlueX();
    return { width: videoW, height: videoH };
  }, [
    content?.video_playback_endpoints,
    fullscreen,
    insets?.bottom,
    live,
    maxWidth,
    type,
    updateBlueX,
    wHeight,
    wWidth,
    youtubeId,
  ]);

  const onWebViewMessage = ({ nativeEvent: { data } }: WebViewMessageEvent): void => {
    const parsedData = JSON.parse(data);

    switch (parsedData.eventType) {
      case 'playerReady':
        if (props?.autoPlay && webViewRef.current) {
          webViewRef.current?.injectJavaScript(`playVideo()`);
        }
        onPlayerReady?.();
        break;
      case 'playerStateChange':
        cTime.current = parsedData.data?.target?.playerInfo?.currentTime;
        if (parsedData.data?.data === 1) {
          startPlaySec = cTime.current;
        }
        if (parsedData.data?.data === 2) {
          endPlaySec = cTime.current;
          secondsPlayed = endPlaySec - startPlaySec;
          if (secondsPlayed > 0) {
            updateVideoProgress();
          }
        }
        if (parsedData.data?.data === 0) {
          onEndVideo();
        }
        break;
      case 'back':
        cTime.current = parsedData.currentTime;
        endPlaySec = cTime.current;
        secondsPlayed = endPlaySec - startPlaySec;
        handleBack();
        break;
    }
  };

  const onNavigationStateChange = ({ url }: WebViewNavigation): void => {
    if (url.includes(`www.youtube.com`)) {
      webViewRef.current?.stopLoading();
    }
  };

  const onEndVideo = (): void => {
    updateVideoProgress();
    if (autoPlay) {
      goToNextLesson?.();
      return;
    }
    orientationListener(tabOrientation || 'PORT', !IS_TABLET);
    endVideoFlagRef.current = true;
    setPaused(true);
  };

  useEffect(() => {
    if (!autoPlay && paused && endVideoFlagRef.current) {
      cTime.current = 0;
      if (!IS_IOS) {
        onProgress({ currentTime: 0 });
      }
      googleCastClient.current?.seek({ position: 0 });
      animateControls(1);
      updateBlueX();
      videoTimerRef.current?.setProgress(0);
      if (videoRef.current) {
        videoRef.current?.seek?.(0);
      }
      endVideoFlagRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  const onLoad = (videoDetails?: OnLoadData): void => {
    if (youtubeId && listening && videoDetails?.duration) {
      setMp3Length(videoDetails?.duration);
    }
    if (videoRef.current) {
      videoRef.current?.seek?.(
        autoPlay ? startTime || 0 : cTime.current || content?.last_watch_position_in_seconds || 0
      );
      onPlayerReady?.();
    }
    if (!IS_IOS || youtubeId) {
      onProgress({
        currentTime: autoPlay
          ? startTime || 0
          : cTime.current || content?.last_watch_position_in_seconds || 0,
      });
    }
    const position = autoPlay
      ? startTime || 0
      : cTime.current || content?.last_watch_position_in_seconds || 0;
    googleCastClient.current?.seek({
      position: position,
    });
    setBuffering(false);
    if (autoPlay) {
      toggleControls();
      togglePaused(false, false);
    }
  };

  const onError = ({ error }: LoadError): void => {
    const { code } = error;

    if (code === -11855) {
      const selectedHeight = vpe?.find(v => v?.selected)?.height;
      const newVpe = vpe?.filter(v => v?.height < (selectedHeight || -1) || v?.height === 'Auto'); // check selectedHeight
      setVpe(newVpe);

      props?.onQualityChange?.(newVpe?.[newVpe?.length - 2]?.height);
    } else if (code === -1009 && !connection) {
      onLoad?.();
    } else {
      alertRef.current?.toggle(
        `We're sorry, there was an issue loading this video, try reloading the lesson.`,
        `If the problem persists please contact support.`
      );
    }
  };

  const onBuffer = ({ isBuffering }: OnBufferData): void => {
    if (!aCasting && !gCasting && !youtubeId) {
      setBuffering(isBuffering);
    }
  };

  const onProgress = ({ currentTime }: OnProgressData | { currentTime: number }): void => {
    if (currentTime === undefined) {
      return;
    }

    if (currentTime > 0) {
      secondsPlayed++;
    }
    getVideoDimensions();
    cTime.current = currentTime;

    if (seeking.current) {
      return;
    }
    updateBlueX();
    if (videoTimerRef.current) {
      videoTimerRef.current?.setProgress(currentTime);
    }
    if (!!endTime && endTime === Math.floor(currentTime)) {
      onEnd?.();
    }
    if (mp3Length > 0 && mp3Length === Math.floor(currentTime)) {
      onEndVideo();
    } else if (
      content?.length_in_seconds &&
      content?.length_in_seconds === Math.floor(currentTime)
    ) {
      onEndVideo();
    }
  };

  const toggleControls = (controlsOverwrite?: boolean): void => {
    clearTimeout(controlsTO.current);
    controlsOverwrite =
      controlsOverwrite === undefined
        ? translateControlsRef.current
          ? false
          : true
        : controlsOverwrite;

    controlsTO.current = setTimeout(() => {
      if (!paused) {
        animateControls(0);
      }
    }, 3000);
    translateControls.current?.stopAnimation(() => {
      animateControls(controlsOverwrite ? 1 : 0);
    });
  };

  const animateControls = useCallback(
    (toValue?: number, speed?: number): void => {
      if ((content.type === 'play-along' && listening) || aCasting || gCasting) {
        return;
      }
      const updateValue = toValue !== undefined ? toValue : paused ? 1 : 0;
      Animated.timing(translateControls.current, {
        toValue: updateValue,
        duration: speed || 100,
        useNativeDriver: true,
      }).start();
      translateControlsRef.current = updateValue;
      setIsControlVisible(updateValue === 1 ? true : false);
    },
    [paused, listening, content?.type]
  );

  const togglePaused = (pausedOverwrite?: boolean, skipActionOnCasting?: boolean): void => {
    const pausedState = typeof pausedOverwrite === 'boolean' ? pausedOverwrite : !paused;

    let showPosterState = showPoster;
    if (gCasting) {
      showPosterState = true;
    } else if (showPosterState) {
      showPosterState = false;
    }
    if (!pausedState && playPressedFirstTime) {
      updateVideoProgress();
      playPressedFirstTime = false;
    }
    if (gCasting && !skipActionOnCasting) {
      if (pausedState) {
        googleCastClient.current?.pause();
      } else {
        googleCastClient.current?.play();
      }
    }
    animateControls(pausedState ? 1 : 0);
    setPaused(pausedState);
    setShowPoster(showPosterState);
  };

  const onAudioBecomingNoisy = (): void => {
    if (!paused) {
      togglePaused();
    }
  };

  const onExternalPlaybackChange = (): void => {
    if (IS_IOS) {
      AirPlay.startScan();
    }
  };

  const onStartLiveTimer = (): void => onStart?.();

  const onEndLiveTimer = (): void => {
    webViewRef.current?.injectJavaScript(`(function() {
        window.video.pause();
      })()`);
    setLiveEnded(true);
    onEnd?.();
  };

  const onDoubleTapBackward = (): void => onSeek((cTime.current -= 10));
  const onDoubleTapForward = (): void => onSeek((cTime.current += 10));

  const onPressVideoSettings = (): void => videoSettingsRef.current?.toggle();

  const onPressFullScreen = (): void => {
    orientationListener(
      fullscreen
        ? IS_TABLET
          ? orientation.includes('PORT')
            ? PORTRAIT
            : orientation
          : PORTRAIT
        : tabOrientation || LANDSCAPE_LEFT,
      true
    );
  };

  const onPressMp3Toggler = (): void => mp3ActionModalRef.current?.toggleModal();

  const handleBack = (): (() => void) | undefined => {
    if (fullscreen) {
      setFullscreen(false);
      return orientationListener(
        IS_TABLET ? (orientation.includes('PORT') ? PORTRAIT : orientation) : PORTRAIT,
        true
      );
    }
    if (IS_TABLET) {
      Orientation.unlockAllOrientations();
    }
    animateControls(1, 1);
    onBack?.();
  };

  const onPressAirPlay = (): void => AirPlay.startScan();

  const onTimerLayout = (event: LayoutChangeEvent): void => {
    const {
      nativeEvent: {
        layout: { x },
      },
    } = event;
    progressBarPositionX.current =
      fullscreen && (insets?.left || 0) > 0 && IS_IOS ? (insets?.left || 0) + x : x;
  };

  const pResponder = (): GestureResponderHandlers =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onShouldBlockNativeResponder: () => true,
      onPanResponderTerminationRequest: () => true,
      onStartShouldSetPanResponderCapture: () => false,
      onPanResponderRelease: () => {
        delete seeking.current;
        let updatePauseState = paused;
        if (videoPlayStatus.current) {
          updatePauseState = !paused;
          togglePaused();
        }
        delete videoPlayStatus.current;
        onSeek(seekTime.current);
        cTime.current = seekTime.current;
        updateVideoProgress();
        clearTimeout(controlsTO.current);
        controlsTO.current = setTimeout(() => {
          animateControls(updatePauseState ? 1 : 0);
        }, 3000);
      },
      onPanResponderTerminate: () => {
        delete seeking.current;
        let updatePauseState = paused;
        if (videoPlayStatus.current) {
          updatePauseState = !paused;
          togglePaused(updatePauseState);
        }
        delete videoPlayStatus.current;
        onSeek(seekTime.current);
        cTime.current = seekTime.current;
        updateVideoProgress();
        clearTimeout(controlsTO.current);
        controlsTO.current = setTimeout(() => {
          animateControls(updatePauseState ? 1 : 0);
        }, 3000);
      },
      onPanResponderGrant: ({ nativeEvent: { locationX } }, { dx, dy }) => {
        clearTimeout(controlsTO.current);
        animateControls(1);
        seekTime.current =
          (locationX / videoW) * (mp3Length > 0 ? mp3Length : content.length_in_seconds);
        if (!IS_IOS) {
          onProgress({ currentTime: seekTime.current });
        }
        googleCastClient.current?.seek({ position: seekTime.current });
        return Math.abs(dx) > 2 || Math.abs(dy) > 2;
      },
      onPanResponderMove: (_, { moveX }) => {
        seeking.current = true;
        if (!paused) {
          videoPlayStatus.current = true;
          togglePaused();
        }
        moveX = moveX - progressBarPositionX.current;
        const translate = moveX - videoW;
        if (moveX < 0 || translate > 0) {
          return;
        }
        translateBlueX.current.setValue(translate);
        seekTime.current =
          (moveX / videoW) * (mp3Length > 0 ? mp3Length : content.length_in_seconds);
        if (!IS_IOS) {
          onProgress({ currentTime: seekTime.current });
        }
        videoTimerRef.current?.setProgress(seekTime.current);
      },
    }).panHandlers;

  const selectQuality = useCallback(
    async (q: string | number, skipRender?: boolean): Promise<IVpe[] | undefined> => {
      let recommendedVideoQuality: IVpe | undefined;
      if (q === 'Auto') {
        recommendedVideoQuality = vpe?.find(v => !v?.file?.includes('http'));
        if (!recommendedVideoQuality) {
          const networkSpeed = await networkSpeedService.getNetworkSpeed(
            vpe?.[0]?.file,
            offlinePath,
            content?.signal
          );
          if (networkSpeed?.aborted) {
            return;
          }
          recommendedVideoQuality = Object.create(vpe || [])
            .sort((i: IVpe, j: IVpe) => (i?.height < j?.height ? 1 : -1))
            .find((rsv: IVpe) => rsv?.height <= networkSpeed?.recommendedVideoQuality);
        }
      }
      let newVPE = aCasting
        ? vpe?.map(v => ({
            ...v,
            selected: v?.height === q,
          }))
        : vpe?.map(v => ({
            ...v,
            selected: v?.height === q,
            file: q === 'Auto' && v?.height === 'Auto' ? recommendedVideoQuality?.file : v?.file,
            actualH:
              q === 'Auto' && v?.height === 'Auto'
                ? recommendedVideoQuality?.actualH || recommendedVideoQuality?.height
                : v?.height === 'Auto'
                  ? v?.actualH
                  : v?.height,
          }));
      if (!newVPE?.find(v => v.selected)) {
        newVPE = newVPE?.map(v => ({
          ...v,
          selected: v?.height === 720,
        }));
      }
      if (skipRender) {
        return newVPE;
      } else {
        setVideoRefreshing(gCasting);
        setVpe(newVPE);
        return;
      }
    },
    [vpe, content?.signal]
  );

  const onSaveSettings = useCallback(
    (newRate: string, qual: string | number, captions: string): void => {
      setRate(newRate);
      setCaptionsHidden(captions === 'Off');
      selectQuality(qual, true).then(v => {
        if (JSON.stringify(vpe) !== JSON.stringify(v)) {
          setBuffering(true);
        }
        setTimeout(() => {
          setVpe(v);
          quality = qual;
          onQualityChange?.(qual);
          if (gCasting) {
            gCastMedia();
          }
        }, 100);
      });
    },
    [gCastMedia, onQualityChange, selectQuality, vpe]
  );

  const renderVideoSettings = useMemo(
    () => (
      <>
        {!youtubeId && connection && vpe && (
          <VideoSettings
            qualities={vpe?.sort((i, j) =>
              i?.height < j?.height || j?.height === 'Auto' ? 1 : -1
            )}
            showRate={!aCasting}
            ref={videoSettingsRef}
            onSaveSettings={onSaveSettings}
            maxFontMultiplier={maxFontMultiplier}
            showCaptions={!!content?.captions && !aCasting}
          />
        )}
      </>
    ),
    [youtubeId, connection, vpe, content?.captions, onSaveSettings, maxFontMultiplier]
  );

  const formatMP3Name = (mp3?: string): string | undefined => {
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

  const selectMp3 = useCallback(
    (selectedMp3: IMp3): void => {
      if (mp3ActionModalRef.current) {
        mp3ActionModalRef.current?.toggleModal();
      }
      setMp3s(
        mp3s?.map(mp3 => ({
          ...mp3,
          selected: mp3.id === selectedMp3.id,
        }))
      );
      if (gCasting) {
        gCastMedia();
      }
    },
    [mp3s, gCastMedia]
  );

  const renderMp3ActionModal = useMemo(
    () => (
      <>
        {audioOnly && (
          <ActionModal modalStyle={styles.mp3OptionsContainer} ref={mp3ActionModalRef}>
            {mp3s?.map(mp3 => (
              <Mp3Option
                key={mp3.id}
                mp3={mp3}
                selectMp3={selectMp3}
                formatMP3Name={formatMP3Name}
                styles={propStyles?.mp3ListPopup}
                maxFontMultiplier={maxFontMultiplier}
              />
            ))}
          </ActionModal>
        )}
      </>
    ),
    [audioOnly, mp3s, propStyles?.mp3ListPopup, maxFontMultiplier, selectMp3]
  );

  const onPressReload = (): void => {
    alertRef.current?.toggle();
    onRefresh();
  };

  const onPressSupport = (): void => {
    alertRef.current?.toggle();
    toSupport?.();
  };

  return (
    <SafeAreaView
      edges={fullscreen && !live ? ['top', 'bottom'] : ['top']}
      style={fullscreen ? styles.fullscreenSafeArea : {}}
    >
      {!maxWidth && <View style={styles.maxWidth} />}
      {(!!liveData || (!!youtubeId && !audioOnly && !fullscreen)) && onBack && (
        <TouchableOpacity
          style={styles.backBtn}
          onPress={!!liveData ? handleLiveBack : handleYtBack}
        >
          {svgs.arrowLeft({
            width: 18,
            height: 18,
            fill: fullscreen ? 'white' : propStyles?.iconColor || 'white',
          })}
        </TouchableOpacity>
      )}
      <View style={[styles.videoContainer, fullscreen ? styles.videoContainerFullscreen : {}]}>
        <View style={getVideoDimensions()}>
          {!videoRefreshing && (
            <>
              {!!youtubeId && !audioOnly ? (
                <WebView
                  originWhitelist={['*']}
                  androidLayerType={'hardware'}
                  scalesPageToFit={true}
                  javaScriptEnabled={true}
                  domStorageEnabled={false}
                  mixedContentMode='always'
                  startInLoadingState={false}
                  allowsFullscreenVideo={true}
                  userAgent={
                    IS_TABLET && IS_IOS
                      ? `Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X) AppleWebKit/ 604.1.21 (KHTML, like Gecko) Version/ 12.0 Mobile/17A6278a Safari/602.1.26`
                      : undefined
                  }
                  ref={webViewRef}
                  allowsInlineMediaPlayback={true}
                  onMessage={onWebViewMessage}
                  mediaPlaybackRequiresUserAction={false}
                  automaticallyAdjustContentInsets={false}
                  style={styles.webview}
                  onNavigationStateChange={onNavigationStateChange}
                  source={{
                    baseUrl: 'https://www.musora.com',
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
                                  start: '${
                                    autoPlay
                                      ? startTime
                                        ? startTime
                                        : 0
                                      : content?.last_watch_position_in_seconds
                                  }',
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
                (audioOnly ? mp3s && mp3s?.length > 0 : vpe && vpe?.length > 0) && (
                  <RNVideo
                    paused={paused}
                    repeat={repeat}
                    controls={false}
                    onEnd={onEndVideo}
                    resizeMode='cover'
                    onLoad={onLoad}
                    onError={onError}
                    onBuffer={onBuffer}
                    rate={parseFloat(rate)}
                    playInBackground={false}
                    playWhenInactive={true}
                    audioOnly={audioOnly}
                    onProgress={onProgress}
                    ignoreSilentSwitch={'ignore'}
                    progressUpdateInterval={1000}
                    ref={videoRef}
                    onRemotePlayPause={togglePaused}
                    fullscreen={IS_IOS ? false : fullscreen}
                    style={styles.videoStyles}
                    onAudioBecomingNoisy={onAudioBecomingNoisy}
                    source={{
                      uri: audioOnly
                        ? mp3s?.find(mp3 => mp3?.selected)?.value
                        : vpe?.find(v => v?.selected)?.file,
                    }}
                    onExternalPlaybackChange={onExternalPlaybackChange}
                    {...(aCasting || !content?.captions || typeof content?.captions !== 'string'
                      ? {}
                      : {
                          selectedTextTrack: {
                            type: 'title',
                            value: captionsHidden ? 'Disabled' : 'English',
                          },
                          textTracks:
                            type === 'video'
                              ? [
                                  {
                                    language: 'en',
                                    uri: 'https://raw.githubusercontent.com/bogdan-vol/react-native-video/master/disabled.vtt',
                                    title: 'Disabled',
                                    type: TextTrackType.VTT, // "text/vtt"
                                  },
                                  {
                                    language: 'en',
                                    uri: content?.captions,
                                    title: 'English',
                                    type: TextTrackType.VTT, // "text/vtt"
                                  },
                                ]
                              : [],
                        })}
                  />
                )
              )}
            </>
          )}
          {live && (
            <LiveTimer
              endTime={`${liveData?.live_event_end_time} UTC`}
              startTime={`${liveData?.live_event_start_time} UTC`}
              thumbnailUrl={content?.thumbnail_url}
              visible={!!showTimer}
              onStart={onStartLiveTimer}
              onEnd={onEndLiveTimer}
            />
          )}
          {(!youtubeId || audioOnly) && (
            <TouchableOpacity onPress={() => toggleControls()} style={styles.controlsContainer}>
              {(audioOnly || showPoster) && (
                <Image
                  source={{
                    uri: `https://www.musora.com/musora-cdn/image/${content?.thumbnail_url}`,
                  }}
                  style={styles.imgBackground}
                />
              )}
              {!!isControlVisible && (
                <Animated.View
                  style={{
                    ...styles.constrolsBackground,
                    opacity:
                      type === 'video'
                        ? translateControls.current?.interpolate({
                            outputRange: [0, 0.5],
                            inputRange: [0, 1],
                          })
                        : 0.5,
                  }}
                />
              )}
              {!!buffering && !paused && (
                <Animated.View style={styles.actIndicatorView}>
                  <ActivityIndicator color={'white'} size={'large'} animating={buffering} />
                </Animated.View>
              )}
              {!youtubeId && (
                <View style={styles.controlsContainer}>
                  <DoubleTapArea
                    styles={styles.leftDoubleTap}
                    onDoubleTap={onDoubleTapBackward}
                    onSingleTap={toggleControls}
                  />
                  <DoubleTapArea
                    styles={styles.rightDoubleTap}
                    onDoubleTap={onDoubleTapForward}
                    onSingleTap={toggleControls}
                  />
                </View>
              )}
              {showControls && (
                <Animated.View
                  style={{
                    flexDirection: 'row',
                    opacity: type === 'video' ? translateControls.current : 1,
                  }}
                >
                  <DoubleTapArea styles={styles.doubleTapArea} onDoubleTap={onDoubleTapBackward}>
                    {goToPreviousLesson && isControlVisible && (
                      <TouchableOpacity
                        onPress={goToPreviousLesson}
                        style={{
                          ...styles.changeLessonBtn,
                          opacity: hasPrevious ? 1 : 0.5,
                        }}
                        disabled={!hasPrevious}
                      >
                        {svgs.prevLesson({
                          ...iconStyle,
                          ...propStyles?.largePlayerControls,
                        })}
                      </TouchableOpacity>
                    )}
                  </DoubleTapArea>
                  {isControlVisible && (
                    <TouchableOpacity onPress={() => togglePaused()} style={styles.pausedBtn}>
                      {svgs[paused ? 'playSvg' : 'pause']({
                        ...iconStyle,
                        ...propStyles?.largePlayerControls,
                      })}
                    </TouchableOpacity>
                  )}
                  <DoubleTapArea styles={styles.doubleTapArea} onDoubleTap={onDoubleTapForward}>
                    {goToNextLesson && isControlVisible && (
                      <TouchableOpacity
                        onPress={goToNextLesson}
                        style={{
                          ...styles.changeLessonBtn,
                          opacity: hasNext ? 1 : 0.5,
                        }}
                        disabled={!hasNext}
                      >
                        {svgs.prevLesson({
                          ...{ ...iconStyle, ...propStyles?.largePlayerControls },
                          style: styles.prevLessonIcon,
                        })}
                      </TouchableOpacity>
                    )}
                  </DoubleTapArea>
                </Animated.View>
              )}
              {(!gCasting || (gCasting && googleCastClient.current)) && (
                <Animated.View
                  style={{
                    ...styles.bottomControlsContainer,
                    bottom: fullscreen ? 30 + 25 : 11,
                    opacity: type === 'video' ? translateControls.current : 1,
                  }}
                >
                  <VideoTimer
                    live={live}
                    styles={propStyles?.timerText}
                    length_in_seconds={mp3Length || content?.length_in_seconds}
                    ref={videoTimerRef}
                    maxFontMultiplier={maxFontMultiplier}
                  />
                  {!!isControlVisible && (
                    <>
                      {!youtubeId && connection && !audioOnly && (
                        <TouchableOpacity
                          style={styles.fullscreenBtn}
                          onPress={onPressVideoSettings}
                        >
                          {svgs.videoQuality({
                            width: 20,
                            height: 20,
                            fill: 'white',
                            ...propStyles?.smallPlayerControls,
                          })}
                        </TouchableOpacity>
                      )}
                      {!audioOnly && onFullscreen && (
                        <TouchableOpacity style={styles.fullscreenBtn} onPress={onPressFullScreen}>
                          {svgs.fullScreen({
                            width: 20,
                            height: 20,
                            fill: 'white',
                            ...propStyles?.smallPlayerControls,
                          })}
                        </TouchableOpacity>
                      )}
                      {audioOnly && (
                        <TouchableOpacity
                          style={styles.mp3TogglerContainer}
                          onPress={onPressMp3Toggler}
                        >
                          <Text
                            maxFontSizeMultiplier={maxFontMultiplier}
                            style={{
                              ...styles.mp3TogglerText,
                              color: propStyles?.mp3TogglerTextColor || 'white',
                            }}
                          >
                            {formatMP3Name(mp3s?.find(mp3 => mp3?.selected)?.key)}
                          </Text>
                          {svgs.arrowDown({
                            height: 20,
                            width: 20,
                            fill: '#ffffff',
                            ...propStyles?.smallPlayerControls,
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
                    opacity: type === 'video' ? translateControls.current : 1,
                  }}
                >
                  {!!isControlVisible && (
                    <TouchableOpacity style={styles.backContainer} onPress={handleBack}>
                      {svgs[fullscreen ? 'x' : 'arrowLeft']({
                        width: 18,
                        height: 18,
                        fill: '#ffffff',
                        ...propStyles?.smallPlayerControls,
                      })}
                    </TouchableOpacity>
                  )}
                </Animated.View>
              )}
            </TouchableOpacity>
          )}
          {!youtubeId && showCastingOptions && (
            <>
              {IS_IOS && (
                <Animated.View
                  style={{
                    ...styles.airPlayContainer,
                    right: 49,
                    opacity: type === 'video' ? translateControls.current : 1,
                  }}
                >
                  {!!isControlVisible && (
                    <TouchableOpacity activeOpacity={1} onPress={onPressAirPlay}>
                      <AirPlayButton />
                    </TouchableOpacity>
                  )}
                </Animated.View>
              )}
              <Animated.View
                style={{
                  ...styles.castBtnContainer,
                  right: 10,
                  opacity: type === 'video' ? translateControls.current : 1,
                }}
              >
                {!!isControlVisible && (
                  <CastButton style={[styles.castBtn, propStyles?.smallPlayerControls]} />
                )}
              </Animated.View>
            </>
          )}
        </View>
      </View>

      {(!youtubeId || audioOnly) &&
        showControls &&
        (!gCasting || (gCasting && googleCastClient.current)) && (
          <Animated.View
            onLayout={onTimerLayout}
            {...pResponder()}
            style={{
              ...getVideoDimensions(),
              ...styles.timerContainer,
              position: fullscreen ? 'absolute' : 'relative',
              bottom: fullscreen ? (wHeight > videoH ? (wHeight - videoH) / 2 : 5) : 0,
              opacity: fullscreen ? (type === 'video' ? translateControls.current : 1) : 1,
            }}
          >
            <View
              style={{
                ...styles.timerGrey,
                backgroundColor: propStyles?.afterTimerCursorBackground || '#2F3334',
              }}
            >
              <Animated.View
                style={{
                  ...styles.timerBlue,
                  transform: [{ translateX: translateBlueX.current }],
                  backgroundColor: propStyles?.beforeTimerCursorBackground || 'red',
                }}
              />
              <Animated.View
                style={{
                  ...styles.timerDot,
                  backgroundColor: propStyles?.timerCursorBackground || 'red',
                  transform: [{ translateX: translateBlueX.current }],
                  opacity: type === 'video' ? translateControls.current : 1,
                }}
              />
            </View>
            <View style={styles.timerCover} />
          </Animated.View>
        )}

      {fullscreen && <PrefersHomeIndicatorAutoHidden />}
      {renderVideoSettings}
      {renderMp3ActionModal}
      <AnimatedCustomAlert
        styles={propStyles?.alert}
        ref={alertRef}
        maxFontMultiplier={maxFontMultiplier}
        additionalBtn={
          <TouchableOpacity
            style={[
              styles.reloadLessonBtn,
              { backgroundColor: propStyles?.alert?.reloadLesson?.background || 'black' },
            ]}
            onPress={onPressReload}
          >
            <Text
              maxFontSizeMultiplier={maxFontMultiplier}
              style={[
                styles.reloadLessonText,
                { color: propStyles?.alert?.reloadLesson?.color || 'white' },
              ]}
            >
              {'RELOAD LESSON'}
            </Text>
          </TouchableOpacity>
        }
        additionalTextBtn={
          <TouchableOpacity style={styles.contactSupportBtn} onPress={onPressSupport}>
            <Text
              maxFontSizeMultiplier={maxFontMultiplier}
              style={[styles.contactSupportText, propStyles?.alert?.contactSupport]}
            >
              {'CONTACT SUPPORT'}
            </Text>
          </TouchableOpacity>
        }
      />
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
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
  backBtn: {
    zIndex: 5,
    padding: 10,
    alignSelf: 'flex-start',
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
  },
  videoStyles: {
    width: '100%',
    height: '100%',
  },
  controlsContainer: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imgBackground: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  constrolsBackground: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    justifyContent: 'center',
    backgroundColor: 'black',
  },
  actIndicatorView: {
    position: 'absolute',
    alignSelf: 'center',
  },
  leftDoubleTap: {
    flex: 1,
    position: 'absolute',
    left: 0,
    width: '40%',
    height: '100%',
  },
  rightDoubleTap: {
    flex: 1,
    alignItems: 'center',
    position: 'absolute',
    right: 0,
    width: '40%',
    height: '100%',
  },
  pausedBtn: {
    flex: 1,
    alignItems: 'center',
  },
  doubleTapArea: {
    width: '43%',
    alignItems: 'center',
  },
  changeLessonBtn: {
    flex: 1,
    alignItems: 'center',
  },
  prevLessonIcon: {
    transform: [{ rotate: '180deg' }],
  },
  bottomControlsContainer: {
    width: '100%',
    position: 'absolute',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  fullscreenBtn: {
    padding: 10,
  },
  mp3TogglerContainer: {
    position: 'absolute',
    alignItems: 'center',
    flexDirection: 'row',
  },
  mp3TogglerText: {
    fontSize: 12,
    fontFamily: 'OpenSans',
  },
  backContainer: {
    top: 0,
    left: 0,
    padding: 15,
    position: 'absolute',
    justifyContent: 'center',
  },
  airPlayContainer: {
    top: 4.5,
    width: 66,
    height: 34,
    position: 'absolute',
  },
  castBtnContainer: {
    top: 7,
    position: 'absolute',
  },
  castBtn: {
    width: 29,
    height: 29,
    tintColor: 'white',
  },
  menuBtnContainer: {
    top: 7,
    right: 10,
    position: 'absolute',
  },
  timerContainer: {
    height: 29,
    marginTop: -11,
    overflow: 'hidden',
  },
  timerGrey: {
    height: 7,
    width: '100%',
    marginTop: 11,
    alignItems: 'center',
    flexDirection: 'row',
  },
  timerBlue: {
    width: '100%',
    height: '100%',
  },
  timerDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginLeft: Math.sqrt(Math.pow(11, 2) - Math.pow(3.5, 2)) - 11,
  },
  timerCover: {
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    position: 'absolute',
    backgroundColor: 'transparent',
  },
  mp3OptionsContainer: {
    width: '80%',
  },
  reloadLessonBtn: {
    marginTop: 10,
    borderRadius: 50,
  },
  reloadLessonText: {
    padding: 15,
    fontSize: 15,
    textAlign: 'center',
    fontFamily: 'OpenSans-Bold',
  },
  contactSupportBtn: {
    padding: 15,
  },
  contactSupportText: {
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'OpenSans',
    textDecorationLine: 'underline',
  },
});

export default Video;
