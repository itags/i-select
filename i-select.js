// See for all prototypes: https://developer.mozilla.org/en-US/docs/Web/API
module.exports = function (window) {
    "use strict";
    var itagsCore = require('itags.core')(window),
        iSelectProto = itagsCore.defineCE('i-select', function () {
            this.setHTML('<div>I am inner</div>');
        }, window.HTMLButtonElement.prototype);

};