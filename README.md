# CodePrinter

CodePrinter is a lightweight code editor written in JavaScript. At this moment it supports 16 programming languages and has 12 themes.
This library was originally created only for my own purposes, but I'll be delighted if you want to use it.
It's a free and open-source project released under the MIT license.

### Requirements

+ Chrome 21+
+ Firefox 22+
+ Opera 12.1+
+ Safari 6.1+
+ Internet Explorer 10+

Older versions are not supported, because I think that they are
still alive by the fact that developers support them :-)

### Get Started
`index.html`
```html
<html>
  <head>
    <meta charset="utf-8">
    <link rel="stylesheet" type="text/css" href="CodePrinter.css">
    <script type="text/javascript" src="CodePrinter.js"></script>
  </head>
  <body>
    <textarea>function factorial(n) {
  if (n === 0) {
    return 1;
  }
  return n * factorial(n - 1);
}
console.log(factorial(7)); // 5040
</textarea>
    <script type="text/javascript">
      var cp = new CodePrinter(document.getElementsByTagName('textarea')[0], {
        theme: 'default',
        mode: 'JavaScript',
        lineNumbers: true,
        fontSize: 12
      });
    </script>
  </body>
</html>
```
The constructor allows you to enter the source code as a first argument. It could be a `String` or `HTMLElement` (like textarea).
You can also specify custom options by providing the next argument (an object) which will overwrite the default settings.
