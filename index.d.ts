import React from 'react';
import { StyleProp, TextStyle, ViewStyle } from 'react-native';

declare module "RNVideoEnhanced" {
	interface VideoProps {
		repeat: boolean;
		paused: boolean;
		type: 'audio' | 'video';
		showControls: boolean;
		youtubeId: string | null;
		live: boolean;
		liveData?: {
			isLive?: boolean;
			live_event_end_time?: string;
			live_event_start_time?: string;
			live_event_end_time_in_timezone?: string;
			live_event_start_time_in_timezone?: string;
		};
		connection: boolean | null;
		maxWidth?: number | undefined;
		content: any;
		disableNext?: boolean;
		disablePrevious?: boolean;
		autoPlay?: boolean;
		listening?: boolean;
		showCastingOptions?: boolean;
		gCasting?: boolean;
		startTime?: number;
		endTime?: number;
		onGCastingChange?: (casting: boolean) => void;
		onRefresh: () => void;
		toSupport: () => void;
		onBack?: () => void;
		onEnd?: () => void;
		onStart?: () => void;
		onFullscreen?: (isFullscreen: boolean) => void;
		goToNextLesson?: () => void;
		goToPreviousLesson?: () => void;
		onUpdateVideoProgress?: (
			videoId: number,
			id: number,
			lengthInSec: number,
			currentTime: number,
			secondsPlayed: number,
			mediaCategory: string
		) => void;
		onPlayerReady?: () => void;
		styles: {
			iconColor: string;
			containerStyle?: ViewStyle;
			timerCursorBackground: string;
			beforeTimerCursorBackground: string;
			settings: {
				cancel: StyleProp<TextStyle>;
				selectedOptionTextColor: string;
				separatorColor?: string;
				background?: string;
				optionsBorderColor?: string;
				unselectedOptionTextColor?: string;
				save: StyleProp<TextStyle>;
				downloadIcon: {};
			};
			alert: {
				titleTextColor?: string;
				subtitleTextColor?: string;
				background?: string;
				contactSupport: StyleProp<TextStyle>;
				reloadLesson: {};
			};
		};
	}
	class Video extends React.Component<VideoProps, {}> { }

	export default Video;
}
