# RNVideoEnhanced
Customizable video player, based on [react-native-video](https://github.com/react-native-community/react-native-video).
## List of changes:
* Styles
* Airplay
* Captions
* Speed rate
* Google Cast
* Mp3 support
* Offline mode
* Orientation handle
* Custom error handler
* Manual quality handler
* Auto video quality handler
* Android 10 edge navigation gesture handle
* Video controls are customised for musora mobile apps
* Fullscreen functionality on iOS is modified in order to use the custom video controls
## Libraries used
* [rn-fetch-blob](https://github.com/joltup/rn-fetch-blob)
* [react-native-video](https://github.com/bogdan-vol/react-native-video)
* [react-native-airplay-ios](https://github.com/gazedash/react-native-airplay-ios)
* [react-native-device-info](https://github.com/react-native-community/react-native-device-info)
* [react-native-google-cast](https://github.com/react-native-google-cast/react-native-google-cast)
* [react-native-home-indicator](https://github.com/flowkey/react-native-home-indicator)
* [react-native-orientation-locker](https://github.com/wonday/react-native-orientation-locker)
## Installation
```
npm i --save https://github.com/bogdan-vol/RNVideoEnhanced.git
```
Add podspecs to your Podfile then ```pod install```

Inside ```AppDelegate.m```:
```
...
#import <RNHomeIndicator.h>
#import <GoogleCast/GoogleCast.h>
...
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  GCKCastOptions* options = [[GCKCastOptions alloc] initWithReceiverApplicationID:kGCKDefaultMediaReceiverApplicationID];
  options.physicalVolumeButtonsWillControlDeviceVolume = YES;
  [GCKCastContext setSharedInstanceWithOptions:options];
  RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];
  ...
}
```
Replace ```UIViewController *rootViewController = [UIViewController new];``` with ```UIViewController *rootViewController = [HomeIndicatorViewController new];```

## Props
Prop | Type | Required | Description
-----|------|----------|------------
quality | number | no | if you want the video to be loaded with a predefined quality
offlinePath | string | yes | the path to the containing folder from which a downloaded video/mp3 can be loaded
aCasting | bool | no | if you want to start the video in airplay mode
gCasting | bool | no | if you want to start the video in google casting mode
connection | bool | yes | the connection state of the device
onBack | func | yes | the back functionality
toSupport | func | no | if there a support page or functionality in case of an error
onRefresh | func | yes | the refresh func in case of an error
maxFontMultiplier | number | no | [maxFontSizeMultiplier](https://reactnative.dev/docs/text#maxfontsizemultiplier)
onFullscreen | func | no | fullscreen toggle callback
goToNextLesson | func | yes | next lesson func
goToPreviousLesson | func | yes | previous lesson func
onQualityChange | func | no | quality change callback
onACastingChange | func | no | airplay state change callback
onGCastingChange | func | no | google cast state change callback
onOrientationChange | func | no | orientation change callback
type | string | yes | 'audio' || 'video'
onUpdateVideoProgress | func | no | video progress callback
content | object | yes | [check mocks](https://github.com/bogdan-vol/RNVideoEnhanced/blob/master/index.js)
styles | object | no | see below
```
{
   "smallPlayerControls":{
      "width":20,
      "height":20,
      "fill":"green",
      "color":"green",
      "tintColor":"green"
   },
   "largePlayerControls":{
      "width":40,
      "height":40,
      "fill":"green",
      "color":"green",
      "tintColor":"green"
   },
   "mp3ListPopup":{
      "background":"red",
      "borderBottomColor":"green",
      "selectedTextColor":"green",
      "unselectedTextColor":"black",
      "checkIcon":{
         "width":20,
         "height":20,
         "fill":"green"
      }
   },
   "mp3TogglerTextColor":"green",
   "afterTimerCursorBackground":"#2F3334",
   "timerCursorBackground":"colors.pianoteRed",
   "beforeTimerCursorBackground":"colors.pianoteRed",
   "timerText":{
      "left":{
         "padding":10,
         "color":"green"
      },
      "right":{
         "padding":10,
         "color":"red"
      }
   },
   "settings":{
      "background":"purple",
      "separatorColor":"red",
      "optionsBorderColor":"red",
      "selectedOptionTextColor":"red",
      "unselectedOptionTextColor":"green",
      "save":{
         "background":"green",
         "color":"yellow"
      },
      "cancel":{
         "background":"yellow",
         "color":"green"
      },
      "downloadIcon":{
         "width":20,
         "height":20,
         "fill":"pink"
      }
   },
   "alert":{
      "background":"purple",
      "titleTextColor":"blue",
      "subtitleTextColor":"green",
      "reloadLesson":{
         "color":"green",
         "background":"blue"
      },
      "contactSupport":{
         "color":"green",
         "background":"blue"
      }
   }
}
```
