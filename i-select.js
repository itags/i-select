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
* value, expanded, invalid-value
*/

require('./css/i-select.css');

var DELAY_BLURCLOSE = 125,
    SUPPRESS_DELAY = 175;

module.exports = function (window) {
    "use strict";

    require('itags.core')(window);

    var DEFAULT_INVALID_VALUE = 'choose',
        itagName = 'i-select',
        ITSA = window.ITSA,
        async = ITSA.async,
        later = ITSA.later,
        Event = ITSA.Event,
        HIDDEN = 'itsa-hidden',
        SHOW = 'i-select-show',
        Itag, IFormElement;

    if (!window.ITAGS[itagName]) {

        IFormElement = require('i-formelement')(window);

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

        Event.before('tap', function(e) {
            // prevent nested focusmanager (parent) to refocus on the button:
            e._noFocus = true;
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
                        console.info('not reacting to '+e_type+'-event: button is in pauzed state');
                        return;
                    }
                    model.expanded = !model.expanded;
                    if (!model.expanded) {
                        liNode = element.getElement('span[plugin-fm="true"] >option[fm-defaultitem]');
                        liNode && liNode.focus();
                    }
                }
                if (model.expanded) {
                    ulNode = element.getElement('span[plugin-fm="true"]');
                    ulNode && ulNode.focus();
                }
                if (model.expanded || (e_type==='tap')) {
                    element.setData('_suppressClose', true);
                    later(function() {
                        element.removeData('_suppressClose');
                    }, SUPPRESS_DELAY);
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
                        console.info('not reacting to '+e_type+'-event: button is in pauzed state');
                        return;
                    }
                    model = element.model;
                    ulNode = liNode.getParent();
                    index = ulNode.getAll('option').indexOf(liNode);
                    model.expanded = false;
                    model.value = index+1;
                    if (e_type==='tap') {
                        element.setData('_suppressClose', true);
                        later(function() {
                            element.removeData('_suppressClose');
                        }, SUPPRESS_DELAY);
                        ulNode = element.getElement('span[plugin-fm="true"]');
                        ulNode && ulNode.focus();
                    }
                    // prevent that the focus will be reset to the focusmanager
                    // when re-synced --> we want the focus on the button:
                    ulNode.removeClass('focussed');
                    async(function() {
                        element.focus();
                    });
                }
            }
        }, 'i-select span[plugin-fm="true"] > option');

        Event.defineEvent(itagName+':valuechange').unPreventable();

        Event.after(itagName+':change', function(e) {
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
        });

        Itag = IFormElement.subClass(itagName, {
            /*
             *
             * @property attrs
             * @type Object
             * @since 0.0.1
            */
            attrs: {
                expanded: 'boolean',
                disabled: 'boolean',
                value: 'string',
                'i-prop': 'string',
                'invalid-value': 'string',
                'reset-value': 'string'
            },

           /**
            * Redefines the childNodes of both the vnode as well as its related dom-node. The new
            * definition replaces any previous nodes. (without touching unmodified nodes).
            *
            * Syncs the new vnode's childNodes with the dom.
            *
            * @method init
            * @chainable
            * @since 0.0.1
            */
            init: function() {
                var element = this,
                    designNode = element.getItagContainer(),
                    itemNodes = designNode.getAll('>option'),
                    items = [],
                    buttonTexts = [],
                    value = element.model.value;
                itemNodes.forEach(function(node, i) {
                    var header = node.getElement('span[is="button"]');
                    if (header) {
                        buttonTexts[i] = header.getHTML();
                    }
                    items[items.length] = node.getHTML(header);
                });

                element.defineWhenUndefined('items', items)
                       .defineWhenUndefined('buttonTexts', buttonTexts)
                        // set the reset-value to the inital-value in case `reset-value` was not present
                       .defineWhenUndefined('reset-value', value);

                // store its current value, so that valueChange-event can fire:
                element.setData('i-select-value', value);

                element.cleanupEvents();
                element.setupEvents();
            },

           /**
            * Redefines the childNodes of both the vnode as well as its related dom-node. The new
            * definition replaces any previous nodes. (without touching unmodified nodes).
            *
            * Syncs the new vnode's childNodes with the dom.
            *
            * @method render
            * @chainable
            * @since 0.0.1
            */
            render: function() {
                var element = this,
                    content;
                // building the template of the itag:
                content = '<button><span class="pointer"></span><span class="btntext"></span></button>';
                // first: outerdiv which will be relative positioned
                // next: innerdiv which will be absolute positioned
                // also: hide the container by default --> updateUI could make it shown
                content += '<span class="itsa-hidden">' +
                             '<span>'+
                               '<span plugin-fm="true" fm-manage="option" fm-keyup="38" fm-keydown="40" fm-noloop="true"></span>';
                             '</span>'+
                           '</span>';
                // set the content:
                element.setHTML(content);
            },

            cleanupEvents: function() {
                this._outsideListener && this._outsideListener.detach();
            },

            currentToReset: function() {
                var model = this.model;
                model['reset-value'] = model.value;
            },

            reset: function() {
                var model = this.model;
                model.value = model['reset-value'];
            },

            setupEvents: function() {
                var element = this;
                // because the tapoutside event is not set through element.salfAfter, we need to detach the event when needed:
                element._outsideListener = Event.after('tapoutside', function(e) {
                    async(function() {
                        if (!element.hasData('_suppressClose') && !element.contains(e.sourceTarget)) {
                            element.model.expanded = false;
                        }
                    });
                }, 'i-select');
                element.selfAfter(
                    'blurnode',
                    function(e) {
                        if (e.target===element) {
                            // at the end of the eventstack: give `blurnode` a way to set the '_suppressClose'-data when needed
                            // need a bit more time because there is time inbetween the blur vs click events
                            later(function() {
                                if (!element.hasData('_suppressClose')) {
                                    element.model.expanded = false;
                                }
                            }, DELAY_BLURCLOSE);
                        }
                    }
                );
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
                // inside sync, YOU CANNOT change attributes which are part of `attrs` !!!
                // those actions will be ignored.

                // BE CAREFUL to start async actions here:
                // be aware that before ending, this method can run again
                // if you do, then make sure to handle possible running
                // async actions well !!!
                var element = this,
                    model = element.model,
                    items = model.items || [],
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
                button.toggleClass('i-nonexpandable', (len<2));
                button.getElement('span.btntext').setHTML(buttonText);

                container = element.getElement('>span');

                if (model.expanded && !model.disabled && !element.hasClass('i-disabled') && (len>1)) {
                    hiddenTimer = container.getData('_hiddenTimer');
                    hiddenTimer && hiddenTimer.cancel();
                    container.setClass(SHOW);
                    container.removeClass(HIDDEN);
                }
                else {
                    container.removeClass(SHOW);
                    // hide the layer completely: we need to access anything underneath:
                    hiddenTimer = later(function() {
                        container.setClass(HIDDEN);
                    }, 110);
                    container.setData('_hiddenTimer', hiddenTimer);
                }

                itemsContainer = element.getElement('span[plugin-fm="true"]');
                content = '';
                for (i=0; i<len; i++) {
                    item = items[i];
                    content += '<option'+((i===markValue) ? ' class="selected" fm-defaultitem="true"' : '')+'>'+item+'</option>';
                }

                // set the items:
                itemsContainer.setHTML(content, true);
            },

            destroy: function() {
                this.cleanupEvents();
            }
        });

        window.ITAGS[itagName] = Itag;
    }

    return window.ITAGS[itagName];
};