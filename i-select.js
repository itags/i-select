/**
 * Provides several methods that override native Element-methods to work with the vdom.
 *
 *
 * <i>Copyright (c) 2014 ITSA - https://github.com/itsa</i>
 * <br>
 * New BSD License - http://choosealicense.com/licenses/bsd-3-clause/
 *
 * @module vdom
 * @submodule extend-element
 * @class Element
 * @since 0.0.1
*/


/*
* attributes:
* value, expanded, primary-button, invalid-value
*/

require('polyfill/polyfill-base.js');
require('js-ext/lib/string.js');
require('css');
require('./css/i-select.css');

var utils = require('utils'),
    asyncSilent = utils.asyncSilent,
    laterSilent = utils.laterSilent,
    DELAY_BLURCLOSE = 125,
    SUPPRESS_DELAY = 175;

module.exports = function (window) {
    "use strict";


    var DEFAULT_INVALID_VALUE = 'choose',
        itagCore =  require('itags.core')(window),
        itagName = 'i-select',
        DOCUMENT = window.document,
        HIDDEN = 'itsa-hidden',
        SHOW = 'i-select-show',
        Event, Itag;

    if (!window.ITAGS[itagName]) {
        Event = require('event-mobile')(window);
        require('event-dom/extra/blurnode.js')(window);
        require('focusmanager')(window);
        require('i-item')(window);
        require('i-head')(window);

        Event.before(itagName+':manualfocus', function(e) {
            // the i-select itself is unfocussable, but its button is
            // we need to patch `manualfocus`,
            // which is emitted on node.focus()
            // a focus by userinteraction will always appear on the button itself
            // so we don't bother that
            var element = e.target;
            e.preventDefault();
            element.itagReady().then(
                function() {
                    var button = element.getElement('button');
                    button && button.focus(true);
                }
            );
        });

        Event.before('keydown', function(e) {
            if (e.keyCode===40) {
                // prevent minus windowscroll:
                e.preventDefaultContinue();
            }
        }, 'i-select > button');

        Event.after(['tap', 'keydown'], function(e) {
            var element = e.target.getParent(),
                e_type = e.type,
                model, ulNode, liNode, inactive;
            if ((e_type==='tap') || (e.keyCode===40)) {
                model = element.model;
                if (e.keyCode===40) {
                    e.preventDefault();
                    model.expanded = true;
                }
                else {
                    inactive = element.hasData('_suppressClose');
                    if (inactive) {
                        console.warn('not reacting to '+e_type+'-event: button is in pauzed state');
                        return;
                    }
                    model.expanded = !model.expanded;
                    if (!model.expanded) {
                        liNode = element.getElement('ul[fm-manage] >li[fm-defaultitem]');
                        liNode && liNode.focus(true);
                    }
                }
                if (model.expanded) {
                    ulNode = element.getElement('ul[fm-manage]');
                    ulNode && ulNode.focus(true);
                }
                if (model.expanded || (e_type==='tap')) {
                    element.setData('_suppressClose', true);
                    laterSilent(function() {
                        element.removeData('_suppressClose');
                    }, SUPPRESS_DELAY);
                    ulNode = element.getElement('ul[fm-manage]');
                    ulNode && ulNode.focus(true);
                }
            }
        }, 'i-select > button');

        Event.after(['tap', 'keypress'], function(e) {
            var liNode = e.target,
                e_type = e.type,
                element, index, ulNode, model, inactive;
            if ((e_type==='tap') || (e.keyCode===13)) {
                element = liNode.inside('i-select');
                model = element.model;
                // check for model.expanded --> a hidden selectbox might react on an enterpress
                if (model.expanded) {
                    inactive = element.hasData('_suppressClose');
                    if (inactive) {
                        console.warn('not reacting to '+e_type+'-event: button is in pauzed state');
                        return;
                    }
                    model = element.model;
                    ulNode = liNode.getParent();
                    index = ulNode.getAll('li').indexOf(liNode);
                    model.expanded = false;
                    model.value = index+1;
                    if (e_type==='tap') {
                        element.setData('_suppressClose', true);
                        laterSilent(function() {
                            element.removeData('_suppressClose');
                        }, SUPPRESS_DELAY);
                        ulNode = element.getElement('ul[fm-manage]');
                        ulNode && ulNode.focus(true);
                    }
                    // prevent that the focus will be reset to the focusmanager
                    // when re-synced --> we want the focus on the button:
                    ulNode.removeClass('focussed');
                    asyncSilent(function() {
                        element.focus(true);
                    });
                }
            }
        }, 'i-select ul[fm-manage] > li');

        Event.defineEvent(itagName+':valuechange')
             .unPreventable()
             .noRender();

        Event.after('*:change', function(e) {
            var element = e.target,
                prevValue = element.getData('i-select-value'),
                model = element.model,
                newValue = model.value,
                markValue;
            if (prevValue!==newValue) {
                markValue = newValue - 1;

                /**
                * Emitted when a the i-select changes its value
                *
                * @event i-select:valuechange
                * @param e {Object} eventobject including:
                * @param e.target {HtmlElement} the i-select element
                * @param e.prevValue {Number} the selected item, starting with 1
                * @param e.newValue {Number} the selected item, starting with 1
                * @param e.buttonText {String} the text that will appear on the button
                * @param e.listText {String} the text as it is in the list
                * @since 0.1
                */
                element.emit('valuechange', {
                    prevValue: prevValue,
                    newValue: newValue,
                    buttonText: model.buttonTexts[markValue] || model.items[markValue],
                    listText: model.items[markValue]
                });
            }
            element.setData('i-select-value', newValue);
        }, itagCore.itagFilter);

        Itag = DOCUMENT.createItag(itagName, {
            /*
             *
             * @property attrs
             * @type Object
             * @since 0.0.1
            */
            attrs: {
                expanded: 'boolean',
                'primary-button': 'boolean',
                value: 'string',
                'invalid-value': 'string'
            },

           /**
            * Redefines the childNodes of both the vnode as well as its related dom-node. The new
            * definition replaces any previous nodes. (without touching unmodified nodes).
            *
            * Syncs the new vnode's childNodes with the dom.
            *
            * @method _setChildNodes
            * @param newVChildNodes {Array} array with vnodes which represent the new childNodes
            * @private
            * @chainable
            * @since 0.0.1
            */
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

                element.setValueOnce('items', items);
                element.setValueOnce('buttonTexts', buttonTexts);

                // store its current value, so that valueChange-event can fire:
                element.setData('i-select-value', element.model.value);

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

                element.setupEvents();
                // set the content:
                element.setHTML(content);
            },

            setupEvents: function() {
                var element = this;
                Event.after('tapoutside', function(e) {
                    // at the end of the eventstack: give `tapoutside` a way to set the '_suppressClose'-data when needed
                    // just async will do
                    asyncSilent(function() {
                        if (!element.hasData('_suppressClose') && !element.contains(e.sourceTarget)) {
                            element.model.expanded = false;
                            DOCUMENT.refreshItags();
                        }
                    });
                }, 'i-select');
                element.selfAfter('blurnode', function() {
                    // at the end of the eventstack: give `blurnode` a way to set the '_suppressClose'-data when needed
                    // need a bit more time because there is time inbetween the blur vs click events
                    laterSilent(function() {
                        if (!element.hasData('_suppressClose')) {
                            element.model.expanded = false;
                            DOCUMENT.refreshItags();
                        }
                    }, DELAY_BLURCLOSE);
                });
            },

           /**
            * Redefines the childNodes of both the vnode as well as its related dom-node. The new
            * definition replaces any previous nodes. (without touching unmodified nodes).
            *
            * Syncs the new vnode's childNodes with the dom.
            *
            * @method _setChildNodes
            * @param newVChildNodes {Array} array with vnodes which represent the new childNodes
            * @private
            * @chainable
            * @since 0.0.1
            */
            sync: function() {
console.warn('syncing i-select');
                // inside sync, YOU CANNOT change attributes which are part of `attrs` !!!
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
                    item, content, buttonText, len, i, markValue,
                    button, container, itemsContainer, hiddenTimer;

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
                button.toggleClass('pure-button-primary', !!model['primary-button']);
                button.getElement('div.btntext').setHTML(buttonText);

                container = element.getElement('>div');

                if (model.expanded) {
                    hiddenTimer = container.getData('_hiddenTimer');
                    hiddenTimer && hiddenTimer.cancel();
                    container.setClass(SHOW);
                    container.removeClass(HIDDEN);
                }
                else {
                    container.removeClass(SHOW);
                    // hide the layer completely: we need to access anything underneath:
                    hiddenTimer = laterSilent(function() {
                        container.setClass(HIDDEN);
                    }, 110);
                    container.setData('_hiddenTimer', hiddenTimer);
                }

                itemsContainer = element.getElement('ul[fm-manage]');
                content = '';
                for (i=0; i<len; i++) {
                    item = items[i];
                    content += '<li'+((i===markValue) ? ' class="selected" fm-defaultitem="true"' : '')+'>'+item+'</li>';
                }

                // set the items:
                itemsContainer.setHTML(content, true);
            }
        });

        Itag.setItagDirectEventResponse(['keypress', 'keydown']);
    }

    return window.ITAGS[itagName];
};