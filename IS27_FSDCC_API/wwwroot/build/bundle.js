
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }

    new Set();
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    // we need to store the information for multiple documents because a Svelte application could also contain iframes
    // https://github.com/sveltejs/svelte/issues/3624
    new Map();

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
     * Event dispatchers are functions that can take two arguments: `name` and `detail`.
     *
     * Component events created with `createEventDispatcher` create a
     * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
     * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
     * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
     * property and can contain any type of data.
     *
     * https://svelte.dev/docs#run-time-svelte-createeventdispatcher
     */
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    const _boolean_attributes = [
        'allowfullscreen',
        'allowpaymentrequest',
        'async',
        'autofocus',
        'autoplay',
        'checked',
        'controls',
        'default',
        'defer',
        'disabled',
        'formnovalidate',
        'hidden',
        'inert',
        'ismap',
        'loop',
        'multiple',
        'muted',
        'nomodule',
        'novalidate',
        'open',
        'playsinline',
        'readonly',
        'required',
        'reversed',
        'selected'
    ];
    /**
     * List of HTML boolean attributes (e.g. `<input disabled>`).
     * Source: https://html.spec.whatwg.org/multipage/indices.html
     */
    new Set([..._boolean_attributes]);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.58.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* svelte-src\lib\EmployeeList.svelte generated by Svelte v3.58.0 */
    const file$2 = "svelte-src\\lib\\EmployeeList.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    const get_default_slot_changes$1 = dirty => ({ item: dirty & /*items*/ 2 });
    const get_default_slot_context$1 = ctx => ({ item: /*item*/ ctx[6] });

    // (20:12) {#each items as item}
    function create_each_block$1(ctx) {
    	let span;
    	let t;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], get_default_slot_context$1);

    	const block = {
    		c: function create() {
    			span = element("span");
    			if (default_slot) default_slot.c();
    			t = space();
    			attr_dev(span, "class", "svelte-kmec1s");
    			add_location(span, file$2, 20, 12, 542);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);

    			if (default_slot) {
    				default_slot.m(span, null);
    			}

    			append_dev(span, t);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope, items*/ 10)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[3],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[3], dirty, get_default_slot_changes$1),
    						get_default_slot_context$1
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(20:12) {#each items as item}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div1;
    	let div0;
    	let p;
    	let span;
    	let t0;
    	let t1;
    	let button;
    	let t3;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*items*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			p = element("p");
    			span = element("span");
    			t0 = text(/*title*/ ctx[0]);
    			t1 = space();
    			button = element("button");
    			button.textContent = "Close";
    			t3 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(span, file$2, 16, 16, 377);
    			attr_dev(button, "class", "close-button");
    			add_location(button, file$2, 17, 16, 415);
    			attr_dev(p, "class", "title-section svelte-kmec1s");
    			add_location(p, file$2, 15, 12, 334);
    			attr_dev(div0, "class", "list-container svelte-kmec1s");
    			add_location(div0, file$2, 14, 8, 292);
    			attr_dev(div1, "class", "modal-background svelte-kmec1s");
    			add_location(div1, file$2, 13, 0, 252);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, p);
    			append_dev(p, span);
    			append_dev(span, t0);
    			append_dev(p, t1);
    			append_dev(p, button);
    			append_dev(div0, t3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div0, null);
    				}
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*Close*/ ctx[2], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*title*/ 1) set_data_dev(t0, /*title*/ ctx[0]);

    			if (dirty & /*$$scope, items*/ 10) {
    				each_value = /*items*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div0, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('EmployeeList', slots, ['default']);
    	const dispatch = createEventDispatcher();

    	function Close(event) {
    		dispatch('close', event);
    	}

    	let { title = '' } = $$props;
    	let { items = [] } = $$props;
    	const writable_props = ['title', 'items'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<EmployeeList> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('title' in $$props) $$invalidate(0, title = $$props.title);
    		if ('items' in $$props) $$invalidate(1, items = $$props.items);
    		if ('$$scope' in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		Close,
    		title,
    		items
    	});

    	$$self.$inject_state = $$props => {
    		if ('title' in $$props) $$invalidate(0, title = $$props.title);
    		if ('items' in $$props) $$invalidate(1, items = $$props.items);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [title, items, Close, $$scope, slots];
    }

    class EmployeeList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { title: 0, items: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "EmployeeList",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get title() {
    		throw new Error("<EmployeeList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<EmployeeList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get items() {
    		throw new Error("<EmployeeList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set items(value) {
    		throw new Error("<EmployeeList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* svelte-src\lib\TreeNode.svelte generated by Svelte v3.58.0 */

    const file$1 = "svelte-src\\lib\\TreeNode.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    const get_default_slot_changes_1 = dirty => ({ node: dirty & /*node*/ 2 });
    const get_default_slot_context_1 = ctx => ({ node: /*node*/ ctx[1] });
    const get_default_slot_changes = dirty => ({ node: dirty & /*node*/ 2 });
    const get_default_slot_context = ctx => ({ node: /*node*/ ctx[1] });

    // (10:1) {#if childNodes && childNodes.length}
    function create_if_block$1(ctx) {
    	let div;
    	let current;
    	let each_value = /*childNodes*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "children");
    			add_location(div, file$1, 10, 2, 204);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div, null);
    				}
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*childNodes, childProp, $$scope, node*/ 23) {
    				each_value = /*childNodes*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(10:1) {#if childNodes && childNodes.length}",
    		ctx
    	});

    	return block;
    }

    // (13:4) <svelte:self node={child} {childProp} let:node>
    function create_default_slot$1(ctx) {
    	let t;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], get_default_slot_context_1);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    			t = space();
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			insert_dev(target, t, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope, node*/ 18)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[4],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[4], dirty, get_default_slot_changes_1),
    						get_default_slot_context_1
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(13:4) <svelte:self node={child} {childProp} let:node>",
    		ctx
    	});

    	return block;
    }

    // (12:3) {#each childNodes as child}
    function create_each_block(ctx) {
    	let treenode;
    	let current;

    	treenode = new TreeNode({
    			props: {
    				node: /*child*/ ctx[5],
    				childProp: /*childProp*/ ctx[0],
    				$$slots: {
    					default: [
    						create_default_slot$1,
    						({ node }) => ({ 1: node }),
    						({ node }) => node ? 2 : 0
    					]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(treenode.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(treenode, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const treenode_changes = {};
    			if (dirty & /*childProp*/ 1) treenode_changes.childProp = /*childProp*/ ctx[0];

    			if (dirty & /*$$scope, node*/ 18) {
    				treenode_changes.$$scope = { dirty, ctx };
    			}

    			treenode.$set(treenode_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(treenode.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(treenode.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(treenode, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(12:3) {#each childNodes as child}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let t;
    	let current;
    	const default_slot_template = /*#slots*/ ctx[3].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[4], get_default_slot_context);
    	let if_block = /*childNodes*/ ctx[2] && /*childNodes*/ ctx[2].length && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (default_slot) default_slot.c();
    			t = space();
    			if (if_block) if_block.c();
    			attr_dev(div, "class", "node-outer svelte-gyun54");
    			add_location(div, file$1, 7, 0, 118);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			append_dev(div, t);
    			if (if_block) if_block.m(div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope, node*/ 18)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[4],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[4])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[4], dirty, get_default_slot_changes),
    						get_default_slot_context
    					);
    				}
    			}

    			if (/*childNodes*/ ctx[2] && /*childNodes*/ ctx[2].length) if_block.p(ctx, dirty);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (default_slot) default_slot.d(detaching);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('TreeNode', slots, ['default']);
    	let { node } = $$props;
    	let { childProp = "children" } = $$props;
    	let childNodes = node[childProp];

    	$$self.$$.on_mount.push(function () {
    		if (node === undefined && !('node' in $$props || $$self.$$.bound[$$self.$$.props['node']])) {
    			console.warn("<TreeNode> was created without expected prop 'node'");
    		}
    	});

    	const writable_props = ['node', 'childProp'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<TreeNode> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('node' in $$props) $$invalidate(1, node = $$props.node);
    		if ('childProp' in $$props) $$invalidate(0, childProp = $$props.childProp);
    		if ('$$scope' in $$props) $$invalidate(4, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({ node, childProp, childNodes });

    	$$self.$inject_state = $$props => {
    		if ('node' in $$props) $$invalidate(1, node = $$props.node);
    		if ('childProp' in $$props) $$invalidate(0, childProp = $$props.childProp);
    		if ('childNodes' in $$props) $$invalidate(2, childNodes = $$props.childNodes);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [childProp, node, childNodes, slots, $$scope];
    }

    class TreeNode extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { node: 1, childProp: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TreeNode",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get node() {
    		throw new Error("<TreeNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set node(value) {
    		throw new Error("<TreeNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get childProp() {
    		throw new Error("<TreeNode>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set childProp(value) {
    		throw new Error("<TreeNode>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* svelte-src\App.svelte generated by Svelte v3.58.0 */

    const { Error: Error_1, console: console_1 } = globals;
    const file = "svelte-src\\App.svelte";

    // (189:0) {:else}
    function create_else_block_1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Loading...";
    			add_location(p, file, 189, 1, 5201);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(189:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (160:0) {#if root}
    function create_if_block_3(ctx) {
    	let previous_key = /*root*/ ctx[2];
    	let key_block_anchor;
    	let current;
    	let key_block = create_key_block(ctx);

    	const block = {
    		c: function create() {
    			key_block.c();
    			key_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			key_block.m(target, anchor);
    			insert_dev(target, key_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*root*/ 4 && safe_not_equal(previous_key, previous_key = /*root*/ ctx[2])) {
    				group_outros();
    				transition_out(key_block, 1, 1, noop);
    				check_outros();
    				key_block = create_key_block(ctx);
    				key_block.c();
    				transition_in(key_block, 1);
    				key_block.m(key_block_anchor.parentNode, key_block_anchor);
    			} else {
    				key_block.p(ctx, dirty);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(key_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(key_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(key_block_anchor);
    			key_block.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(160:0) {#if root}",
    		ctx
    	});

    	return block;
    }

    // (181:5) {:else}
    function create_else_block(ctx) {
    	let t0;
    	let button;
    	let mounted;
    	let dispose;

    	function click_handler_3() {
    		return /*click_handler_3*/ ctx[24](/*node*/ ctx[35]);
    	}

    	const block = {
    		c: function create() {
    			t0 = text("Vacant\r\n\t\t\t\t\t\t");
    			button = element("button");
    			button.textContent = "Assign Employee";
    			add_location(button, file, 182, 6, 5057);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler_3, false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(181:5) {:else}",
    		ctx
    	});

    	return block;
    }

    // (174:5) {#if node.employee}
    function create_if_block_4(ctx) {
    	let span;
    	let t0;
    	let t1_value = /*node*/ ctx[35].employee.employeeNumber + "";
    	let t1;
    	let br;
    	let t2;
    	let t3_value = /*node*/ ctx[35].employee.firstName + "";
    	let t3;
    	let t4;
    	let t5_value = /*node*/ ctx[35].employee.lastName + "";
    	let t5;
    	let t6;
    	let button0;
    	let t8;
    	let button1;
    	let mounted;
    	let dispose;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[22](/*node*/ ctx[35]);
    	}

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[23](/*node*/ ctx[35]);
    	}

    	const block = {
    		c: function create() {
    			span = element("span");
    			t0 = text("Employee Number: ");
    			t1 = text(t1_value);
    			br = element("br");
    			t2 = text("\r\n\t\t\t\t\t\t\tName: ");
    			t3 = text(t3_value);
    			t4 = space();
    			t5 = text(t5_value);
    			t6 = space();
    			button0 = element("button");
    			button0.textContent = "Edit";
    			t8 = space();
    			button1 = element("button");
    			button1.textContent = "Unassign";
    			add_location(br, file, 175, 54, 4777);
    			add_location(span, file, 174, 6, 4715);
    			add_location(button0, file, 178, 6, 4869);
    			add_location(button1, file, 179, 6, 4954);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			append_dev(span, br);
    			append_dev(span, t2);
    			append_dev(span, t3);
    			append_dev(span, t4);
    			append_dev(span, t5);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, button0, anchor);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, button1, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", click_handler_1, false, false, false, false),
    					listen_dev(button1, "click", click_handler_2, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[1] & /*node*/ 16 && t1_value !== (t1_value = /*node*/ ctx[35].employee.employeeNumber + "")) set_data_dev(t1, t1_value);
    			if (dirty[1] & /*node*/ 16 && t3_value !== (t3_value = /*node*/ ctx[35].employee.firstName + "")) set_data_dev(t3, t3_value);
    			if (dirty[1] & /*node*/ 16 && t5_value !== (t5_value = /*node*/ ctx[35].employee.lastName + "")) set_data_dev(t5, t5_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(button1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(174:5) {#if node.employee}",
    		ctx
    	});

    	return block;
    }

    // (164:2) <TreeNode node={root} childProp="subordinates" let:node>
    function create_default_slot_1(ctx) {
    	let div;
    	let span1;
    	let span0;
    	let t0;
    	let t1_value = /*node*/ ctx[35].title + "";
    	let t1;
    	let br;
    	let t2;
    	let t3_value = /*node*/ ctx[35].positionNumber + "";
    	let t3;
    	let t4;
    	let button;
    	let t6;
    	let span2;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[21](/*node*/ ctx[35]);
    	}

    	function select_block_type_1(ctx, dirty) {
    		if (/*node*/ ctx[35].employee) return create_if_block_4;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			span1 = element("span");
    			span0 = element("span");
    			t0 = text("Title: ");
    			t1 = text(t1_value);
    			br = element("br");
    			t2 = text("\r\n\t\t\t\t\t\tPosition Number: ");
    			t3 = text(t3_value);
    			t4 = space();
    			button = element("button");
    			button.textContent = "New Subordinate Position";
    			t6 = space();
    			span2 = element("span");
    			if_block.c();
    			add_location(br, file, 167, 25, 4500);
    			add_location(span0, file, 166, 5, 4467);
    			add_location(button, file, 170, 5, 4571);
    			attr_dev(span1, "class", "svelte-8dtylf");
    			add_location(span1, file, 165, 4, 4454);
    			attr_dev(span2, "class", "svelte-8dtylf");
    			add_location(span2, file, 172, 4, 4675);
    			attr_dev(div, "class", "nodeContent svelte-8dtylf");
    			add_location(div, file, 164, 3, 4423);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span1);
    			append_dev(span1, span0);
    			append_dev(span0, t0);
    			append_dev(span0, t1);
    			append_dev(span0, br);
    			append_dev(span0, t2);
    			append_dev(span0, t3);
    			append_dev(span1, t4);
    			append_dev(span1, button);
    			append_dev(div, t6);
    			append_dev(div, span2);
    			if_block.m(span2, null);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[1] & /*node*/ 16 && t1_value !== (t1_value = /*node*/ ctx[35].title + "")) set_data_dev(t1, t1_value);
    			if (dirty[1] & /*node*/ 16 && t3_value !== (t3_value = /*node*/ ctx[35].positionNumber + "")) set_data_dev(t3, t3_value);

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(span2, null);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(164:2) <TreeNode node={root} childProp=\\\"subordinates\\\" let:node>",
    		ctx
    	});

    	return block;
    }

    // (163:1) {#key root}
    function create_key_block(ctx) {
    	let treenode;
    	let current;

    	treenode = new TreeNode({
    			props: {
    				node: /*root*/ ctx[2],
    				childProp: "subordinates",
    				$$slots: {
    					default: [
    						create_default_slot_1,
    						({ node }) => ({ 35: node }),
    						({ node }) => [0, node ? 16 : 0]
    					]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(treenode.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(treenode, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const treenode_changes = {};
    			if (dirty[0] & /*root*/ 4) treenode_changes.node = /*root*/ ctx[2];

    			if (dirty[1] & /*$$scope, node*/ 48) {
    				treenode_changes.$$scope = { dirty, ctx };
    			}

    			treenode.$set(treenode_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(treenode.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(treenode.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(treenode, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_key_block.name,
    		type: "key",
    		source: "(163:1) {#key root}",
    		ctx
    	});

    	return block;
    }

    // (193:0) {#if showPositionModal}
    function create_if_block_2(ctx) {
    	let div2;
    	let div1;
    	let p;
    	let t0;
    	let t1;
    	let div0;
    	let label0;
    	let t2;
    	let input0;
    	let t3;
    	let label1;
    	let t4;
    	let input1;
    	let t5;
    	let span;
    	let button0;
    	let t7;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			p = element("p");
    			t0 = text(/*newPositionTitle*/ ctx[10]);
    			t1 = space();
    			div0 = element("div");
    			label0 = element("label");
    			t2 = text("Position No\r\n\t\t\t\t\t");
    			input0 = element("input");
    			t3 = space();
    			label1 = element("label");
    			t4 = text("Position Title\r\n\t\t\t\t\t");
    			input1 = element("input");
    			t5 = space();
    			span = element("span");
    			button0 = element("button");
    			button0.textContent = "Save";
    			t7 = space();
    			button1 = element("button");
    			button1.textContent = "Cancel";
    			add_location(p, file, 195, 3, 5319);
    			attr_dev(input0, "type", "number");
    			add_location(input0, file, 199, 5, 5418);
    			add_location(label0, file, 197, 4, 5386);
    			attr_dev(input1, "type", "text");
    			add_location(input1, file, 203, 5, 5535);
    			add_location(label1, file, 201, 4, 5500);
    			add_location(button0, file, 206, 5, 5619);
    			add_location(button1, file, 207, 5, 5725);
    			add_location(span, file, 205, 4, 5606);
    			attr_dev(div0, "class", "modal-input-inner svelte-8dtylf");
    			add_location(div0, file, 196, 3, 5349);
    			attr_dev(div1, "class", "modal-input svelte-8dtylf");
    			add_location(div1, file, 194, 2, 5289);
    			attr_dev(div2, "class", "modal-background svelte-8dtylf");
    			add_location(div2, file, 193, 1, 5255);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, p);
    			append_dev(p, t0);
    			append_dev(div1, t1);
    			append_dev(div1, div0);
    			append_dev(div0, label0);
    			append_dev(label0, t2);
    			append_dev(label0, input0);
    			set_input_value(input0, /*newPosition*/ ctx[4].positionNumber);
    			append_dev(div0, t3);
    			append_dev(div0, label1);
    			append_dev(label1, t4);
    			append_dev(label1, input1);
    			set_input_value(input1, /*newPosition*/ ctx[4].title);
    			append_dev(div0, t5);
    			append_dev(div0, span);
    			append_dev(span, button0);
    			append_dev(span, t7);
    			append_dev(span, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[25]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[26]),
    					listen_dev(button0, "click", /*click_handler_4*/ ctx[27], false, false, false, false),
    					listen_dev(button1, "click", /*CloseNewPosition*/ ctx[13], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*newPositionTitle*/ 1024) set_data_dev(t0, /*newPositionTitle*/ ctx[10]);

    			if (dirty[0] & /*newPosition*/ 16 && to_number(input0.value) !== /*newPosition*/ ctx[4].positionNumber) {
    				set_input_value(input0, /*newPosition*/ ctx[4].positionNumber);
    			}

    			if (dirty[0] & /*newPosition*/ 16 && input1.value !== /*newPosition*/ ctx[4].title) {
    				set_input_value(input1, /*newPosition*/ ctx[4].title);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(193:0) {#if showPositionModal}",
    		ctx
    	});

    	return block;
    }

    // (216:0) {#if showEmployeeModal}
    function create_if_block_1(ctx) {
    	let div2;
    	let div1;
    	let p;
    	let t0;
    	let t1_value = /*selectedEmployee*/ ctx[6].employeeNumber + "";
    	let t1;
    	let t2;
    	let div0;
    	let label0;
    	let t3;
    	let input0;
    	let t4;
    	let label1;
    	let t5;
    	let input1;
    	let t6;
    	let span;
    	let button0;
    	let t8;
    	let button1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			p = element("p");
    			t0 = text("Edit Employee No. ");
    			t1 = text(t1_value);
    			t2 = space();
    			div0 = element("div");
    			label0 = element("label");
    			t3 = text("First Name\r\n\t\t\t\t\t");
    			input0 = element("input");
    			t4 = space();
    			label1 = element("label");
    			t5 = text("Last Name\r\n\t\t\t\t\t");
    			input1 = element("input");
    			t6 = space();
    			span = element("span");
    			button0 = element("button");
    			button0.textContent = "Save";
    			t8 = space();
    			button1 = element("button");
    			button1.textContent = "Cancel";
    			add_location(p, file, 218, 3, 5922);
    			attr_dev(input0, "type", "text");
    			add_location(input0, file, 222, 5, 6053);
    			add_location(label0, file, 220, 4, 6022);
    			attr_dev(input1, "type", "text");
    			add_location(input1, file, 226, 5, 6163);
    			add_location(label1, file, 224, 4, 6133);
    			add_location(button0, file, 229, 5, 6255);
    			add_location(button1, file, 230, 5, 6333);
    			add_location(span, file, 228, 4, 6242);
    			attr_dev(div0, "class", "modal-input-inner svelte-8dtylf");
    			add_location(div0, file, 219, 3, 5985);
    			attr_dev(div1, "class", "modal-input svelte-8dtylf");
    			add_location(div1, file, 217, 2, 5892);
    			attr_dev(div2, "class", "modal-background svelte-8dtylf");
    			add_location(div2, file, 216, 1, 5858);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, p);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(div1, t2);
    			append_dev(div1, div0);
    			append_dev(div0, label0);
    			append_dev(label0, t3);
    			append_dev(label0, input0);
    			set_input_value(input0, /*selectedEmployee*/ ctx[6].firstName);
    			append_dev(div0, t4);
    			append_dev(div0, label1);
    			append_dev(label1, t5);
    			append_dev(label1, input1);
    			set_input_value(input1, /*selectedEmployee*/ ctx[6].lastName);
    			append_dev(div0, t6);
    			append_dev(div0, span);
    			append_dev(span, button0);
    			append_dev(span, t8);
    			append_dev(span, button1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler_1*/ ctx[28]),
    					listen_dev(input1, "input", /*input1_input_handler_1*/ ctx[29]),
    					listen_dev(button0, "click", /*click_handler_5*/ ctx[30], false, false, false, false),
    					listen_dev(button1, "click", /*CloseEditEmployee*/ ctx[16], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*selectedEmployee*/ 64 && t1_value !== (t1_value = /*selectedEmployee*/ ctx[6].employeeNumber + "")) set_data_dev(t1, t1_value);

    			if (dirty[0] & /*selectedEmployee*/ 64 && input0.value !== /*selectedEmployee*/ ctx[6].firstName) {
    				set_input_value(input0, /*selectedEmployee*/ ctx[6].firstName);
    			}

    			if (dirty[0] & /*selectedEmployee*/ 64 && input1.value !== /*selectedEmployee*/ ctx[6].lastName) {
    				set_input_value(input1, /*selectedEmployee*/ ctx[6].lastName);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(216:0) {#if showEmployeeModal}",
    		ctx
    	});

    	return block;
    }

    // (239:0) {#if showEmployeeList}
    function create_if_block(ctx) {
    	let employeelist;
    	let current;

    	employeelist = new EmployeeList({
    			props: {
    				title: /*listTitle*/ ctx[9],
    				items: /*employeeList*/ ctx[8],
    				$$slots: {
    					default: [
    						create_default_slot,
    						({ item: employee }) => ({ 34: employee }),
    						({ item: employee }) => [0, employee ? 8 : 0]
    					]
    				},
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	employeelist.$on("close", /*CloseEmployeeList*/ ctx[18]);

    	const block = {
    		c: function create() {
    			create_component(employeelist.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(employeelist, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const employeelist_changes = {};
    			if (dirty[0] & /*listTitle*/ 512) employeelist_changes.title = /*listTitle*/ ctx[9];
    			if (dirty[0] & /*employeeList*/ 256) employeelist_changes.items = /*employeeList*/ ctx[8];

    			if (dirty[0] & /*selectedPosition*/ 2 | dirty[1] & /*$$scope, employee*/ 40) {
    				employeelist_changes.$$scope = { dirty, ctx };
    			}

    			employeelist.$set(employeelist_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(employeelist.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(employeelist.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(employeelist, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(239:0) {#if showEmployeeList}",
    		ctx
    	});

    	return block;
    }

    // (240:1) <EmployeeList     title={listTitle}    items={employeeList}    on:close={CloseEmployeeList}   let:item = {employee}>
    function create_default_slot(ctx) {
    	let span;
    	let t0;
    	let t1_value = /*employee*/ ctx[34].employeeNumber + "";
    	let t1;
    	let br;
    	let t2_value = /*employee*/ ctx[34].firstName + "";
    	let t2;
    	let t3;
    	let t4_value = /*employee*/ ctx[34].lastName + "";
    	let t4;
    	let t5;
    	let button;
    	let mounted;
    	let dispose;

    	function click_handler_6() {
    		return /*click_handler_6*/ ctx[31](/*employee*/ ctx[34]);
    	}

    	const block = {
    		c: function create() {
    			span = element("span");
    			t0 = text("Employee No. ");
    			t1 = text(t1_value);
    			br = element("br");
    			t2 = text(t2_value);
    			t3 = space();
    			t4 = text(t4_value);
    			t5 = space();
    			button = element("button");
    			button.textContent = "Select";
    			add_location(br, file, 245, 40, 6633);
    			add_location(span, file, 244, 1, 6585);
    			add_location(button, file, 247, 1, 6691);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			append_dev(span, br);
    			append_dev(span, t2);
    			append_dev(span, t3);
    			append_dev(span, t4);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler_6, false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[1] & /*employee*/ 8 && t1_value !== (t1_value = /*employee*/ ctx[34].employeeNumber + "")) set_data_dev(t1, t1_value);
    			if (dirty[1] & /*employee*/ 8 && t2_value !== (t2_value = /*employee*/ ctx[34].firstName + "")) set_data_dev(t2, t2_value);
    			if (dirty[1] & /*employee*/ 8 && t4_value !== (t4_value = /*employee*/ ctx[34].lastName + "")) set_data_dev(t4, t4_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(240:1) <EmployeeList     title={listTitle}    items={employeeList}    on:close={CloseEmployeeList}   let:item = {employee}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let current_block_type_index;
    	let if_block0;
    	let t0;
    	let t1;
    	let t2;
    	let if_block3_anchor;
    	let current;
    	const if_block_creators = [create_if_block_3, create_else_block_1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*root*/ ctx[2]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	let if_block1 = /*showPositionModal*/ ctx[3] && create_if_block_2(ctx);
    	let if_block2 = /*showEmployeeModal*/ ctx[5] && create_if_block_1(ctx);
    	let if_block3 = /*showEmployeeList*/ ctx[7] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			t2 = space();
    			if (if_block3) if_block3.c();
    			if_block3_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, t0, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert_dev(target, t2, anchor);
    			if (if_block3) if_block3.m(target, anchor);
    			insert_dev(target, if_block3_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block0 = if_blocks[current_block_type_index];

    				if (!if_block0) {
    					if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block0.c();
    				} else {
    					if_block0.p(ctx, dirty);
    				}

    				transition_in(if_block0, 1);
    				if_block0.m(t0.parentNode, t0);
    			}

    			if (/*showPositionModal*/ ctx[3]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_2(ctx);
    					if_block1.c();
    					if_block1.m(t1.parentNode, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*showEmployeeModal*/ ctx[5]) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_1(ctx);
    					if_block2.c();
    					if_block2.m(t2.parentNode, t2);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*showEmployeeList*/ ctx[7]) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);

    					if (dirty[0] & /*showEmployeeList*/ 128) {
    						transition_in(if_block3, 1);
    					}
    				} else {
    					if_block3 = create_if_block(ctx);
    					if_block3.c();
    					transition_in(if_block3, 1);
    					if_block3.m(if_block3_anchor.parentNode, if_block3_anchor);
    				}
    			} else if (if_block3) {
    				group_outros();

    				transition_out(if_block3, 1, 1, () => {
    					if_block3 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block3);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block3);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(t0);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(t1);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach_dev(t2);
    			if (if_block3) if_block3.d(detaching);
    			if (detaching) detach_dev(if_block3_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const url_root = 'https://localhost:7007/api/';

    async function PutEmployee(employee) {
    	const url = url_root + 'employees/' + employee.employeeNumber;

    	let response = await fetch(url, {
    		method: 'PUT',
    		headers: {
    			'Accept': 'application/json',
    			'Content-Type': 'application/json'
    		},
    		body: JSON.stringify(employee)
    	});

    	if (!response.ok) {
    		throw new Error(response.text());
    	}
    }

    async function PostPosition(position) {
    	const url = url_root + 'positions/';

    	let response = await fetch(url, {
    		method: 'POST',
    		headers: {
    			'Accept': 'application/json',
    			'Content-Type': 'application/json'
    		},
    		body: JSON.stringify(position)
    	});

    	if (!response.ok) {
    		throw new Error(response.text());
    	}
    }

    async function PutPosition(position) {
    	const url = url_root + 'positions/' + position.positionNumber;

    	let response = await fetch(url, {
    		method: 'PUT',
    		headers: {
    			'Accept': 'application/json',
    			'Content-Type': 'application/json'
    		},
    		body: JSON.stringify(position)
    	});

    	if (!response.ok) {
    		throw new Error(response.text());
    	}
    }

    function instance($$self, $$props, $$invalidate) {
    	let newPositionTitle;
    	let listTitle;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);

    	function GetStaffDirectory() {
    		const url = url_root + 'staffdirectory';
    		fetch(url).then(response => response.json()).then(data => $$invalidate(2, root = data)).catch(error => console.error('Failed to retrieve staff directory.', error));
    	}

    	function GetEmployees() {
    		const url = url_root + 'employees';
    		fetch(url).then(response => response.json()).then(data => $$invalidate(8, employeeList = data)).catch(error => console.error('Failed to retrieve employee list.', error));
    	}

    	//Opens the form to insert a new position in the hierarchy
    	function ShowNewPositionModal(supervisorPosition) {
    		$$invalidate(0, selectedSuper = supervisorPosition);
    		$$invalidate(3, showPositionModal = true);
    	}

    	function CreateNewPosition(newPosition, supervisorPositionNumber) {
    		PostPosition({
    			positionNumber: newPosition.positionNumber,
    			title: newPosition.title,
    			employeeNumber: null,
    			supervisorPositionNumber
    		}).then(GetStaffDirectory).then(CloseNewPosition).catch(error => console.error('Failed to create position.', error));
    	}

    	function CloseNewPosition() {
    		$$invalidate(3, showPositionModal = false);
    	}

    	//Opens the form for editing an employee's name
    	function ShowEditEmployeeModal(employee) {
    		$$invalidate(6, selectedEmployee = employee);
    		$$invalidate(5, showEmployeeModal = true);
    	}

    	function UpdateEmployee(employee) {
    		PutEmployee(employee).then(GetStaffDirectory).then(CloseEditEmployee).catch(error => console.error('Failed to update employee.', error));
    	}

    	function CloseEditEmployee() {
    		$$invalidate(5, showEmployeeModal = false);
    	}

    	//Opens the list to select an employee for assignment
    	function ShowEmployeeList(position) {
    		$$invalidate(1, selectedPosition = position);
    		GetEmployees();
    		$$invalidate(7, showEmployeeList = true);
    	}

    	function CloseEmployeeList() {
    		$$invalidate(7, showEmployeeList = false);
    	}

    	function AssignEmployee(position, employeeNumber) {
    		position.employeeNumber = employeeNumber;
    		PutPosition(position).then(GetStaffDirectory).then(CloseEmployeeList).catch(error => console.error('Failed to update position.', error));
    	}

    	function UnassignEmployee(position) {
    		position.employee = null;
    		position.employeeNumber = null;
    		PutPosition(position).then(GetStaffDirectory).catch(error => console.error('Failed to update position.', error));
    	}

    	let root = null;
    	let showPositionModal = false;
    	let selectedSuper = {};
    	let newPosition = {};
    	let showEmployeeModal = false;
    	let selectedEmployee;
    	let showEmployeeList = false;
    	let selectedPosition = {};
    	let employeeList = [];
    	GetStaffDirectory();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = node => ShowNewPositionModal(node);
    	const click_handler_1 = node => ShowEditEmployeeModal(node.employee);
    	const click_handler_2 = node => UnassignEmployee(node);
    	const click_handler_3 = node => ShowEmployeeList(node);

    	function input0_input_handler() {
    		newPosition.positionNumber = to_number(this.value);
    		$$invalidate(4, newPosition);
    	}

    	function input1_input_handler() {
    		newPosition.title = this.value;
    		$$invalidate(4, newPosition);
    	}

    	const click_handler_4 = () => CreateNewPosition(newPosition, selectedSuper.positionNumber);

    	function input0_input_handler_1() {
    		selectedEmployee.firstName = this.value;
    		$$invalidate(6, selectedEmployee);
    	}

    	function input1_input_handler_1() {
    		selectedEmployee.lastName = this.value;
    		$$invalidate(6, selectedEmployee);
    	}

    	const click_handler_5 = () => UpdateEmployee(selectedEmployee);
    	const click_handler_6 = employee => AssignEmployee(selectedPosition, employee.employeeNumber);

    	$$self.$capture_state = () => ({
    		EmployeeList,
    		TreeNode,
    		url_root,
    		GetStaffDirectory,
    		GetEmployees,
    		PutEmployee,
    		PostPosition,
    		PutPosition,
    		ShowNewPositionModal,
    		CreateNewPosition,
    		CloseNewPosition,
    		ShowEditEmployeeModal,
    		UpdateEmployee,
    		CloseEditEmployee,
    		ShowEmployeeList,
    		CloseEmployeeList,
    		AssignEmployee,
    		UnassignEmployee,
    		root,
    		showPositionModal,
    		selectedSuper,
    		newPosition,
    		showEmployeeModal,
    		selectedEmployee,
    		showEmployeeList,
    		selectedPosition,
    		employeeList,
    		listTitle,
    		newPositionTitle
    	});

    	$$self.$inject_state = $$props => {
    		if ('root' in $$props) $$invalidate(2, root = $$props.root);
    		if ('showPositionModal' in $$props) $$invalidate(3, showPositionModal = $$props.showPositionModal);
    		if ('selectedSuper' in $$props) $$invalidate(0, selectedSuper = $$props.selectedSuper);
    		if ('newPosition' in $$props) $$invalidate(4, newPosition = $$props.newPosition);
    		if ('showEmployeeModal' in $$props) $$invalidate(5, showEmployeeModal = $$props.showEmployeeModal);
    		if ('selectedEmployee' in $$props) $$invalidate(6, selectedEmployee = $$props.selectedEmployee);
    		if ('showEmployeeList' in $$props) $$invalidate(7, showEmployeeList = $$props.showEmployeeList);
    		if ('selectedPosition' in $$props) $$invalidate(1, selectedPosition = $$props.selectedPosition);
    		if ('employeeList' in $$props) $$invalidate(8, employeeList = $$props.employeeList);
    		if ('listTitle' in $$props) $$invalidate(9, listTitle = $$props.listTitle);
    		if ('newPositionTitle' in $$props) $$invalidate(10, newPositionTitle = $$props.newPositionTitle);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*selectedSuper*/ 1) {
    			$$invalidate(10, newPositionTitle = selectedSuper && `Add new position under Position No. ${selectedSuper.positionNumber}:  ${selectedSuper.title}`);
    		}

    		if ($$self.$$.dirty[0] & /*selectedPosition*/ 2) {
    			$$invalidate(9, listTitle = selectedPosition && `Assign employee to Position No. ${selectedPosition.positionNumber}:  ${selectedPosition.title}`);
    		}
    	};

    	return [
    		selectedSuper,
    		selectedPosition,
    		root,
    		showPositionModal,
    		newPosition,
    		showEmployeeModal,
    		selectedEmployee,
    		showEmployeeList,
    		employeeList,
    		listTitle,
    		newPositionTitle,
    		ShowNewPositionModal,
    		CreateNewPosition,
    		CloseNewPosition,
    		ShowEditEmployeeModal,
    		UpdateEmployee,
    		CloseEditEmployee,
    		ShowEmployeeList,
    		CloseEmployeeList,
    		AssignEmployee,
    		UnassignEmployee,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		input0_input_handler,
    		input1_input_handler,
    		click_handler_4,
    		input0_input_handler_1,
    		input1_input_handler_1,
    		click_handler_5,
    		click_handler_6
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {}, null, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
