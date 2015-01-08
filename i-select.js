/*
* attributes:
* value, expanded, primary-button
*/
require('polyfill/polyfill-base.js');
require('js-ext/lib/string.js');
require('css');
require('./css/i-select.css');

module.exports = function (window) {

    "use strict";
    var itagsCore = require('itags.core')(window),
        Event = require('event-dom')(window),
        DEFAULT_INVALID_VALUE = 'choose';

    require('focusmanager')(window);

    Event.after('click', function(e) {
        var element = e.target.getParent(),
            expanded = element.getAttr('expanded')==='true',
            value, liNodes, focusNode;
        if (!expanded) {
            value = element.getValue1();
            liNodes = element.getAll('li');
            focusNode = liNodes[value-1];
console.warn(focusNode);
            focusNode && focusNode.focus();
        }
        element.setAttr('expanded', expanded ? 'false' : 'true');
    }, 'i-select button');

    Event.after('click', function(e) {
        var liNode = e.target,
            element = liNode.inside('i-select'),
            index = liNode.getParent().getAll('li').indexOf(liNode);
        element.setAttrs([
            // {name: 'expanded', value: 'false'},
            {name: 'value', value: index+1}
        ]);
    }, 'i-select li');

    itagsCore.defineElement( 'i-select', function() {
        var element = this,
            expanded = element.isExpanded(),
            primaryButton = element.isPrimaryBtn(),
            value = element.getValue1(),
            items = element.getItems(),
            item, content, buttonText, len, i, markValue;
console.warn('dummy: '+element.dummy);
console.warn(element.getValue1);
console.warn('value: '+element.getValue1());
        len = items.length;
        (value>len) && (value=0);
        markValue = value - 1;
        buttonText = (value>0) ? items[markValue] : element.getInvalidValue();

        // building the content of the itag:
        content = '<button class="pure-button pure-button-bordered'+(primaryButton ? ' pure-button-primary' : '')+'">'+buttonText+'</button>';
        // first: outerdiv which will be relative positioned
        if (expanded) {
            content += '<div>';
        }
        else {
            content += '<div class="itsa-hidden">';
        }
        content += '<div>'; // innerdiv which will be absolute positioned
        content += '<ul fm-manage="li" fm-keyup="38" fm-keydown="40">';
        for (i=0; i<len; i++) {
            item = items[i];
            content += '<li'+((i===markValue) ? ' id="dummy" class="selected"' : '')+'>'+String(item)+'</li>';
        }
        content += '</ul>';
        content += '</div>';

        // set the content:
        element.setHTML(content);
    }, {
        dummy: 23,
        getValue1: function() {
console.warn('invoking getValue');
            var valueString = this.getAttr('value');
console.warn('valueString '+valueString);
            return valueString.validateNumber() ? Math.max(0, parseInt(valueString, 10)) : 0;
        },
        getItems: function() {
            var items;
            try {
                items = JSON.parse(this.getAttr('items'));
                Array.isArray(items) || (items=[]);
            }
            catch (e) {
                items = [];
            }
            return items;
        },
        getInvalidValue: function() {
            return this.getAttr('invalid-value') || DEFAULT_INVALID_VALUE;
        },
        isExpanded: function() {
            return this.getAttr('expanded')==='true';
        },
        isPrimaryBtn: function() {
            return this.getAttr('primary-button')==='true';
        }
    });

};