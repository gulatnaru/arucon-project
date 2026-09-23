Pod::Spec.new do |s|
  s.name           = 'AruconHealth'
  s.version        = '0.1.0'
  s.summary        = 'Disabled-by-default Arucon native health boundary'
  s.description    = 'Build-linked contract boundary. It does not read health data or request permission.'
  s.license        = { :type => 'Proprietary' }
  s.author         = 'Arucon'
  s.homepage       = 'https://github.com/gulatnaru/arucon-project'
  # Keep the disabled scaffold linkable by the app target so Expo can register
  # the contract module without enabling a health API or permission.
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { :git => 'https://github.com/gulatnaru/arucon-project.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.source_files = 'AruconHealth/**/*.{h,m,swift}'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end
