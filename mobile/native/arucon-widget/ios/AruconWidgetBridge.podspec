Pod::Spec.new do |s|
  s.name           = 'AruconWidgetBridge'
  s.version        = '0.1.0'
  s.summary        = 'Read-only Arucon widget snapshot bridge'
  s.description    = 'Publishes the six-field widget projection to a shared container and requests an OS timeline reload.'
  s.license        = { :type => 'Proprietary' }
  s.author         = 'Arucon'
  s.homepage       = 'https://github.com/gulatnaru/arucon-project'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { :git => 'https://github.com/gulatnaru/arucon-project.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.framework = 'WidgetKit'
  s.source_files = 'AruconWidgetBridge/**/*.{h,m,swift}'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end
