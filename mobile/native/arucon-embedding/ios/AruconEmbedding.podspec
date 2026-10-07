Pod::Spec.new do |s|
  s.name = 'AruconEmbedding'
  s.version = '0.1.0'
  s.summary = 'Optional pinned text embedding experiment; no sensors or economic commands'
  s.description = 'REBOOT-01 local text-only EmbeddingGemma 2 port, with explicit unavailability fallback.'
  s.license = { :type => 'Proprietary' }
  s.author = 'Arucon'
  s.homepage = 'https://github.com/gulatnaru/arucon-project'
  s.source = { :git => 'https://github.com/gulatnaru/arucon-project.git' }
  s.platforms = { :ios => '15.1' }
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = 'AruconEmbedding/**/*.swift'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  # Artifacts are verified/prepared by the project-local script and not committed.
  if File.directory?(File.join(__dir__, 'vendor/MediaPipeTasksRetrieval.xcframework'))
    # Google's graph archive has no lib prefix. Link its verified source path
    # explicitly; CocoaPods' inferred -l name would not resolve on a clean build.
    s.vendored_frameworks = Dir.glob(File.join(__dir__, 'vendor/*.xcframework')).reject { |p| p.include?('MediaPipeTaskGraphs_library') }.map { |p| p.sub(__dir__ + '/', '') }
    s.preserve_paths = 'vendor/MediaPipeTaskGraphs_library.xcframework'
    s.frameworks = ['Accelerate', 'AVFoundation', 'CoreMedia', 'AudioToolbox', 'CoreGraphics', 'CoreImage', 'CoreVideo', 'QuartzCore']
    s.libraries = ['c++', 'sqlite3']
    # Force only Google's calculator-registration archive, never all RN/Expo archives.
    s.user_target_xcconfig = {
      'OTHER_LDFLAGS[sdk=iphonesimulator*]' => '$(inherited) -Wl,-force_load,"$(PODS_ROOT)/../../native/arucon-embedding/ios/vendor/MediaPipeTaskGraphs_library.xcframework/ios-arm64-simulator/MediaPipeTaskGraphs_library.a"',
      'OTHER_LDFLAGS[sdk=iphoneos*]' => '$(inherited) -Wl,-force_load,"$(PODS_ROOT)/../../native/arucon-embedding/ios/vendor/MediaPipeTaskGraphs_library.xcframework/ios-arm64/MediaPipeTaskGraphs_library.a"'
    }
  end
end
