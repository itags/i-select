/*
* attributes:
* value, expanded, primary-button
*/
require('polyfill/polyfill-base.js');
require('js-ext/lib/string.js');
require('css');
require('./css/i-select.css');

var TRANS_TIME_SHOW = 0.3,
    TRANS_TIME_HIDE = 0.1,
    CLASS_ITAG_RENDERED = 'itag-rendered';

module.exports = function (window) {

    "use strict";
    var itagsCore = require('itags.core')(window),
        Event = require('event-dom')(window),
        DEFAULT_INVALID_VALUE = 'choose';

    require('focusmanager')(window);
    require('i-item')(window);
    require('i-head')(window);

    Event.before('manualfocus', function(e) {
        // the i-select itself is unfocussable, but its button is
        // we need to patch `manualfocus`,
        // which is emitted on node.focus()
        // a focus by userinteraction will always appear on the button itself
        // so we don't bother that
        var element = e.target;
        // cautious:  all child-elements that have `manualfocus` event are
        // subscribed as well: we NEED to inspect e.target and only continue
        // if e.target===i-select
        if (e.target.getTagName()==='I-SELECT') {
            e.preventDefault();
            element.itagReady().then(
                function() {
                    var button = element.getElement('button');
                    button && button.focus();
                }
            );
        }
    }, 'i-select');

    Event.after(['click', 'keydown'], function(e) {
        var element = e.target.getParent(),
            expanded, value, liNodes, focusNode;
        if ((e.type==='click') || (e.keyCode===40)) {
            expanded = element.model.expanded;
            value = element.model.value;
            if (!expanded) {
                liNodes = element.getAll('ul[fm-manage] > li');
                focusNode = liNodes[value-1];
                focusNode && focusNode.focus();
            }
            element.setAttr('expanded', expanded ? 'false' : 'true');
        }
    }, 'i-select > button');

    Event.after(['click', 'keypress'], function(e) {
        var liNode = e.target,
            element, index;
        if ((e.type==='click') || (e.keyCode===13)) {
            element = liNode.inside('i-select');
            index = liNode.getParent().getAll('li').indexOf(liNode);
            element.setAttrs([
                {name: 'expanded', value: 'false'},
                {name: 'value', value: index+1}
            ]);
            element.getElement('button').focus();
        }
    }, 'i-select ul[fm-manage] > li');

    itagsCore.defineItag('i-select', function() {
        var element = this,
            model = element.model,
            items = model.items,
            buttonTexts = model.buttonTexts,
            expanded, primaryButton, valueString, value, invalidValue,
            item, content, buttonText, len, i, markValue,
            button, container, itemsContainer, renderedBefore;

        // read the current state of the attributes:
        expanded = (element.getAttr('expanded')==='true');
        primaryButton = (element.getAttr('primary-button')==='true');
        valueString = element.getAttr('value');
        value = valueString.validateNumber() ? Math.max(0, parseInt(valueString, 10)) : 0;
        invalidValue = (element.getAttr('invalid-value') || DEFAULT_INVALID_VALUE);

        // store the state inside element.model:
        model.expanded = expanded;
        model.primaryButton = primaryButton;
        model.value = value;
        model.invalidValue = invalidValue;

        len = items.length;
        (value>len) && (value=0);
        markValue = value - 1;

        if (value>0) {
            buttonText = buttonTexts[markValue] || items[markValue];
        }
        else {
            buttonText = invalidValue;
        }

        // rebuild the button:
        button = element.getElement('button');
        button.toggleClass('pure-button-primary', primaryButton);
        button.getElement('div.btntext').setHTML(buttonText);

        // show or hide the content, note that when not rendered before, you should use transitions
        renderedBefore = element.hasClass(CLASS_ITAG_RENDERED);
        container = element.getElement('>div');
        if (expanded) {
            container.show(renderedBefore ? TRANS_TIME_SHOW : null);
        }
        else {
            container.hide(renderedBefore ? TRANS_TIME_HIDE : null);
        }

        itemsContainer = element.getElement('ul[fm-manage]');
        content = '';
        for (i=0; i<len; i++) {
            item = items[i];
            content += '<li'+((i===markValue) ? ' class="selected"' : '')+'>'+item+'</li>';
        }

        // set the items:
        itemsContainer.setHTML(content);
    }, {
        init: function() {
            var element = this,
                itemNodes = element.getAll('>i-item'),
                items = [],
                buttonTexts = [],
                content;

            itemNodes.forEach(function(node, i) {
                var header = node.getElement('i-head');
                if (header) {
                    buttonTexts[i] = header.getHTML();
                    header.remove(true);
                }
                items[items.length] = node.getHTML();
            });
            element.model.items = items;
            element.model.buttonTexts = buttonTexts;

            // building the template of the itag:
            content = '<button class="pure-button pure-button-bordered"><div class="pointer"></div><div class="btntext"></div></button>';
            // first: outerdiv which will be relative positioned
            // next: innerdiv which will be absolute positioned
            // also: hide the container by default --> updateUI could make it shown
            content += '<div class="itsa-hidden">' +
                         '<div>'+
                           '<ul fm-manage="li" fm-keyup="38" fm-keydown="40" fm-noloop="true"></ul>';
                         '</div>'+
                       '</div>';
            // set the content:
            element.setHTML(content);
        }
    });

};