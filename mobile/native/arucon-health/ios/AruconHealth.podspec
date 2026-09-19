Pod::Spec.new do |s|
  s.name           = 'AruconHealth'
  s.version        = '0.1.0'
  s.summary        = 'Disabled-by-default Arucon native health boundary'
  s.description    = 'Build-linked contract boundary. It does not read health data or request permission.'
  s.license        = { :type => 'Proprietary' }
  s.author         = 'Arucon'
  s.homepage       = 'https://github.com/gulatnaru/arucon-project'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { :git => 'https://github.com/gulatnaru/arucon-project.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.source_files = 'AruconHealth/**/*.{h,m,swift}'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end
