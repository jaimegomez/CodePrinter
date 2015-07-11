# CodePrinter Changelog

## 0.8.3 / 2015-07-11
+ Merging the results of parsing if possible.
+ Improved existing tests and added new for CSS and HTML parsers.
+ Fixed bug in removeBeforeCursor/removeAfterCursor which resulted in erroneous data in history.
+ Fixed line highlighting after breaking the selection.

## 0.8.2 / 2015-07-05
+ Fixed toggling comments.
+ Invoke forward parsing after wrapping the selection.
+ Reduced flickering when scrolling.
+ Fixed restoring line's classes when the lines returned to the view.
+ Added support for EcmaScript 6 in the JavaScript mode.
+ Added launchers for CommonJS and AMD modules system.

## 0.8.1 / 2015-05-13
+ Improved attaching and detaching documents from the editor.
+ Fixed tabs rendering.
+ Fixed keyboard sequence of shortcut to redo command.
+ Making auto indent after pasting.
+ Some minor changes in CSS and JavaScript parsers.

## 0.8.0 / 2015-04-07
+ A completely new model of parsers, based on iterators instead of regular expressions.
+ All of the existing parsers had been rewritten.
+ Significant performance improvement in scrolling and rendering.
+ Became independent of external libraries.
+ Standardizing event names (lowerCamelCase).
+ And much more fixes and improvements.
