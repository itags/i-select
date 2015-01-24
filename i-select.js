/*
* attributes:
* value, expanded, primary-button
*/
require('polyfill/polyfill-base.js');
require('js-ext/lib/string.js');
require('css');
require('./css/i-select.css');

var TRANS_TIME_SHOW = 3,
    TRANS_TIME_HIDE = 1,
    NATIVE_OBJECT_OBSERVE = !!Object.observe,
    CLASS_ITAG_RENDERED = 'itag-rendered',
    utils = require('utils'),
    laterSilent = utils.laterSilent,
    later = utils.later;

module.exports = function (window) {
    "use strict";

    require('itags.core')(window);

    var DEFAULT_INVALID_VALUE = 'choose',
        itagName = 'i-select',
        DOCUMENT = window.document,
        Event;

    if (!window.ITAGS[itagName]) {
        Event = require('event-dom')(window);
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
            if (element.getTagName()==='I-SELECT') {
                e.preventDefault();
                element.itagReady().then(
                    function() {
                        var button = element.getElement('button');
                        button && button.focus();
                    }
                );
            }
        }, 'i-select');

        Event.after('blur', function(e) {
            // the i-select itself is unfocussable, but its button is
            // we need to patch `manualfocus`,
            // which is emitted on node.focus()
            // a focus by userinteraction will always appear on the button itself
            // so we don't bother that
            var element = e.target,
                model;
            e.preventRender();
            // cautious:  all child-elements that have `manualfocus` event are
            // subscribed as well: we NEED to inspect e.target and only continue.
            //
            // I didn;t figure out why, but it seems we need `later`
            // in order to make the i-select prevent from acting unpredictable.
            // maybe because of the responsetime of the click-event
            laterSilent(function() {
                // if e.target===i-select
                if ((element.getTagName()==='I-SELECT') && !element.hasClass('focussed')) {
                    model = element.model;
                    model.expanded = false;
                    NATIVE_OBJECT_OBSERVE || DOCUMENT.refreshItags();
                }
            },350);
        }, 'i-select');

        Event.before('keydown', function(e) {
            if (e.keyCode===40) {
                // prevent minus windowscroll:
                e.preventDefaultContinue();
            }
        }, 'i-select > button');

        // CAUTIOUS: it seems `tap` will be subscribed 8 times!!!
        // TODO: figure out why not once
        Event.after(['click', 'keydown'], function(e) {
            var element = e.target.getParent(),
                expanded, value, liNodes, focusNode, model;
            if ((e.type==='click') || (e.keyCode===40)) {
                (e.keyCode===40) && e.preventDefault();
                model = element.model;
                expanded = model.expanded;
                value = element.model.value;
                if (!expanded) {
                    liNodes = element.getAll('ul[fm-manage] > li');
                    focusNode = liNodes[value-1];
                    focusNode && focusNode.focus();
                }
                model.expanded = !expanded;
            }
        }, 'i-select > button');

        // CAUTIOUS: it seems `tap` will be subscribed 8 times!!!
        // TODO: figure out why not once
        Event.after(['click', 'keypress'], function(e) {
            var liNode = e.target,
                element, index, model;
            if ((e.type==='click') || (e.keyCode===13)) {
                element = liNode.inside('i-select');
                model = element.model;
                index = liNode.getParent().getAll('li').indexOf(liNode);
                model.expanded = false;
                model.value = index+1;
                element.getElement('button').focus();
            }
        }, 'i-select ul[fm-manage] > li');

        window.document.createItag('i-select', {
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
            },
            args: {
                expanded: 'boolean',
                'primary-button': 'boolean',
                value: 'string',
                'invalid-value': 'string'
            },
            sync: function() {
console.warn('sybcing');
                // inside sync, YOU CANNOT change attributes which are part of `args` !!!
                // those actions will be ignored.

                // BE CAREFUL to start async actions here:
                // be aware that before ending, this method can run again
                // if you do, then make sure to handle possible running
                // async actions well !!!

                var element = this,
                    model = element.model,
                    items = model.items,
                    buttonTexts = model.buttonTexts,
                    value = model.value,
                    item, content, buttonText, len, i, markValue, containerShowing,
                    button, container, itemsContainer, renderedBefore;

                len = items.length;
                (value>len) && (value=0);
                markValue = value - 1;

                if (value>0) {
                    buttonText = buttonTexts[markValue] || items[markValue];
                }
                else {
                    buttonText = model['invalid-value'] || DEFAULT_INVALID_VALUE;
                }

                // rebuild the button:
                button = element.getElement('button');
                button.toggleClass('pure-button-primary', model['primary-button']);
                button.getElement('div.btntext').setHTML(buttonText);

                // show or hide the content, note that when not rendered before, you should use transitions
                renderedBefore = element.hasClass(CLASS_ITAG_RENDERED);
                container = element.getElement('>div');

                // NOTE: we can't get showing transitioned work well at the moment.
                // therefore show and hide imemdiatelyt for now
                // TODO: fix transition
                // containerShowing = container.getData('nodeShowed');
                if (model.expanded) {
                    container.show();
                    // (containerShowing===true) || container.show(renderedBefore ? TRANS_TIME_SHOW : null);
                }
                else {
                    container.hide();
                    // (containerShowing===false) || container.hide(renderedBefore ? TRANS_TIME_HIDE : null);
                }

                itemsContainer = element.getElement('ul[fm-manage]');
                content = '';
                for (i=0; i<len; i++) {
                    item = items[i];
                    content += '<li'+((i===markValue) ? ' class="selected"' : '')+'>'+item+'</li>';
                }

                // set the items:
                itemsContainer.setHTML(content);
            }
        });
    }

    return window.ITAGS[itagName];

};