import CodePrinter from 'CodePrinter';
import { codeprinter } from 'helpers/tests';

window.cp = codeprinter;
document.body.appendChild(cp.dom.mainNode);

// require all modules from tests directory and all subdirectories
const context = require.context('./tests', true, /(codeprinter|document|data|commands|caret)\.js$/);
context.keys().forEach(context);
