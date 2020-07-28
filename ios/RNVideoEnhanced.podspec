require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name           = 'RNVideoEnhanced'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = package['author']
  s.homepage       = package['repository']['url']
  s.source         = { :git => 'https://github.com/bogdan-vol/RNVideoEnhanced.git', :tag => s.version.to_s }

  s.ios.deployment_target = "10.0"
  s.tvos.deployment_target = "10.0"

  s.source_files = "ios/**/*.{h,m}"
  s.dependency "React"
  s.dependency "react-native-video"
  s.dependency "react-native-airplay-ios"
  s.dependency "react-native-google-cast"
  s.dependency "react-native-home-indicator"
  s.dependency "react-native-orientation-locker"
end
