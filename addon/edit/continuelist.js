// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

(function(mod) {
  if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
  else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
  else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
  "use strict";

  var listRE = /^(\s*)(>[> ]*|[*+-] \[[x ]\]\s|[*+-]\s|(\d+)([.)]))(\s*)/,
      emptyListRE = /^(\s*)(>[> ]*|[*+-] \[[x ]\]|[*+-]|(\d+)[.)])(\s*)$/,
      unorderedListRE = /[*+-]\s/;

  CodeMirror.commands.newlineAndIndentContinueMarkdownList = function(cm) {
    if (cm.getOption("disableInput")) return CodeMirror.Pass;
    var ranges = cm.listSelections(), replacements = [];
    for (var i = 0; i < ranges.length; i++) {
      var pos = ranges[i].head;
      var eolState = cm.getStateAfter(pos.line);
      var inList = eolState.list !== false;
      var inQuote = eolState.quote !== 0;

      var line = cm.getLine(pos.line), match = listRE.exec(line);
      var cursorBeforeBullet = /^\s*$/.test(line.slice(0, pos.ch));
      if (!ranges[i].empty() || (!inList && !inQuote) || !match || cursorBeforeBullet) {
        cm.execCommand("newlineAndIndent");
        return;
      }
      if (emptyListRE.test(line)) {
        if (!/>\s*$/.test(line)) cm.replaceRange("", {
          line: pos.line, ch: 0
        }, {
          line: pos.line, ch: pos.ch + 1
        });
        replacements[i] = "\n";
      } else {
        var indent = match[1], after = match[5];
        var bullet = unorderedListRE.test(match[2]) || match[2].indexOf(">") >= 0
          ? match[2].replace("x", " ")
          : (parseInt(match[3], 10) + 1) + match[4];

        replacements[i] = "\n" + indent + bullet + after;

        incrementRemainingMarkdownListNumbers(cm, pos);
      }
    }

    cm.replaceSelections(replacements);
  };

  function incrementRemainingMarkdownListNumbers(cm, pos, lookAhead = 1) {
    var nextLineNumber = pos.line + lookAhead;
    var nextLine = cm.getLine(nextLineNumber), nextItem = listRE.exec(nextLine);

    if (nextItem) {
      var startItem = listRE.exec(cm.getLine(pos.line));
      var startIndent = startItem[1], nextIndent = nextItem[1];

      var newNumber = (parseInt(startItem[3], 10) + lookAhead);
      var nextNumber = (parseInt(nextItem[3], 10));

      if ((newNumber === nextNumber) && (startIndent === nextIndent)) {
        var replaceLine = nextLine.replace(
          listRE, nextIndent + (nextNumber + 1) + nextItem[4] + nextItem[5]
        );
        cm.replaceRange(replaceLine, {
          line: nextLineNumber, ch: 0
        }, {
          line: nextLineNumber, ch: nextLine.length
        });
        incrementRemainingMarkdownListNumbers(cm, pos, lookAhead + 1);
        return;
      }
    }
  }
});
