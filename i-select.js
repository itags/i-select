// See for all prototypes: https://developer.mozilla.org/en-US/docs/Web/API
module.exports = function (window) {

    "use strict";
    var ItagBase = require('itags.core')(window),
        ISelectClass;

    ISelectClass = ItagBase.subClass('i-select', function() {
        // ISelectClass.$super.constructor.call(this);
        this.setHTML('I am rendered '+this.dummy);
    }, {
        dummy: 10
    });

    return ISelectClass;

};