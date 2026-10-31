Output docs/demo.gif
Set Shell "bash"
Set FontSize 16
Set Width 1200
Set Height 880
Set Padding 20
Set Theme "Catppuccin Mocha"
Set TypingSpeed 30ms
Set Framerate 15
Set LoopOffset 0
Hide
Type "export PS1='$ '; clear"
Enter
Sleep 500ms
Show
Type "node bin/grid-area-drift.js examples/before.css examples/after.css --selector .layout"
Enter
Sleep 12s
