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
Require grid-area-drift
Hide
Type "export PS1='$ '; unset PROMPT_COMMAND; clear"
Enter
Sleep 500ms
Type "grid-area-drift before.css after.css --selector .layout"
Sleep 500ms
Show
Sleep 1s
Enter
Sleep 12s
