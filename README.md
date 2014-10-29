CodePrinter
===========

CodePrinter is a lightweight code editor written in JavaScript. At this moment it supports 13 programming languages and has 13 themes. It's a free and open-source project released under the MIT license.

Usage
-----
First you must to include a main script of CodePrinter in your HTML document.
```html
<script type="text/javascript" src="CodePrinter.js"></script>
```

And then create a CodePrinter object
```javascript
var cp = new CodePrinter();
// and add a node to the DOM structure
cp.appendTo(document.body); // is equals to document.body.appendChild(cp.mainElement)
```

The constructor allows you to enter the source code as a first argument. It could be a String or HTMLElement (like textarea). You can also specify custom options by providing the next argument (an object) which will overwrite the default settings. 
More information will soon be found on the [Wiki](https://github.com/tsapeta/CodePrinter/wiki).
