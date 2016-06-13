define.class(function(require){

	// var ASTScanner = require('$system/parse/astscanner')
	var WiredWalker = require('$system/parse/wiredwalker')
	var OneJSParser =  require('$system/parse/onejsparser')
	var RpcProxy = require('$system/rpc/rpcproxy')

	var wiredwalker = new WiredWalker()

	// parser and walker for wired attributes
	var onejsparser = new OneJSParser()
	onejsparser.parser_cache = {}

	// internal, create an rpc proxy
	this.createRpcProxy = function(parent){
		return RpcProxy.createFromObject(this, parent)
	}
	// the RPCProxy class reads these booleans to skip RPC interface creation for this prototype level
	this.rpcproxy = false

	// add a listener to an attribute
	this.addListener = function(key, cb){
		if(!this.__lookupSetter__(key)){
			this.defineAttribute(key, this[key])
		}
		var listen_key = '_listen_' + key
		var array
		if(!this.hasOwnProperty(listen_key)) array = this[listen_key] = []
		else array = this[listen_key]
		if(array.indexOf(cb) === -1){
			array.push(cb)
		}
	}

	// Mixes in another class or object, just pass in any number of object or class references. They are copied on key by key
	this.mixin = function(){
		for(var i = 0; i < arguments.length; i++){
			var obj = arguments[i]
			if(typeof obj === 'function') obj = obj.prototype
			for(var key in obj){
				// copy over getters and setters
				if(obj.__lookupGetter__(key) || obj.__lookupSetter__(key)){
					// ignore it
				}
				else{
					// other
					this[key] = obj[key]
				}
			}
		}
	}

	// // internal, returns true if attribute has any listeners
	// this.hasListeners = function(key){
	// 	var listen_key = '_listen_' + key
	// 	var on_key = 'on' + key
	// 	if(on_key in this || listen_key in this && this[listen_key].length) return true
	// 	return false
	// }

	// // internal, remove all listeners from a node
	// this.removeAllListeners = function(){
	// 	var keys = Object.keys(this)
	// 	for(var i = 0; i < keys.length; i++){
	// 		var key = keys[i]
	// 		if(key.indexOf('_listen_') === 0){
	// 			this[key] = undefined
	// 		}
	// 	}
	// }

	// // internal, mark an attribute as persistent accross live reload / renders
	// this.definePersist = function(arg){
	// 	if (!this.hasOwnProperty("_persists")){
	//
	// 		if (this._persists){
	// 			this._persists = Object.create(this._persists)
	// 		}
	// 		else{
	// 			this._persists = {}
	// 		}
	// 	}
	// 	this._persists[arg] = 1
	// }

	// // internal, check if an attribute has a listener with a .name property set to fnname
	// this.hasListenerProp = function(key, prop, value){
	// 	var listen_key = '_listen_' + key
	// 	if(!this.hasOwnProperty(listen_key)) return false
	// 	var listeners = this[listen_key]
	// 	if(!listeners) return false
	// 	for(var i = 0; i < listeners.length; i++){
	// 		if(listeners[i][prop] === value) return true
	// 	}
	// 	return false
	// }

	// // remove a listener from an attribute, uses the actual function reference to find it
	// // if you dont pass in a function reference it removes all listeners
	// this.removeListener = function(key, cb){
	// 	var listen_key = '_listen_' + key
	// 	if(!this.hasOwnProperty(listen_key)) return
	// 	var cbs = this[listen_key]
	// 	if(cbs){
	// 		if(cb){
	// 			var idx = cbs.indexOf(cb)
	// 			if(idx !== -1) cbs.splice(idx,1)
	// 		}
	// 		else{
	// 			cbs.length = 0
	// 		}
	// 	}
	// }

	// mixin setter API to easily assign mixins using an is: syntax in the constructors
	Object.defineProperty(this, 'is', {
		set:function(value){
			// lets copy on value.
			if(Array.isArray(value)){
				for(var i = 0; i<value.length; i++) this.is = value[i]
				return
			}
			if(typeof value === 'function') value = value.prototype
			if(typeof value === 'object'){
				for(var key in value){
					this[key] = value[key]
				}
			}
		}
	})

	// internal, set the wired function for an attribute
	this.setWiredAttribute = function(key, value){
		if(!this.hasOwnProperty('_wiredfns')) this._wiredfns = this._wiredfns?Object.create(this._wiredfns):{}
		this._wiredfns[key] = value
		this['_wiredfn_'+key] = value
	}

	// internal, connect a wired attribute up to its listeners
	this.connectWiredAttribute = function(key, initarray){
		var wiredfn_key = '_wiredfn_' + key
		var wiredcl_key = '_wiredcl_' + key
		var wiredfn = this[wiredfn_key]
		var ast = onejsparser.parse(wiredfn.toString())
		var state = wiredwalker.newState()

		wiredwalker.expand(ast, null, state)

		var bindcall = function(){
			var deps = bindcall.deps
			if(deps && !bindcall.initialized){
				bindcall.initialized = true
				for(var i = 0; i < deps.length; i++) deps[i]()
			}
			this[key] = this[wiredfn_key].call(this, this[wiredcl_key].find, this.rpc)
		}.bind(this)

		this[wiredcl_key] = bindcall
		bindcall.find = {}

		for(var j = 0; j < state.references.length; j++){
			var ref = state.references[j]
			var obj = {'this':this,'find':bindcall.find,'rpc':this.rpc}
			for(var k = 0; k < ref.length; k++){

				var part = ref[k]
				if(k === ref.length - 1){
					// lets add a listener
					if(!obj || !obj.isAttribute || !obj.isAttribute(part)){
						console.error("Attribute does not exist: "+ref.join('.') + " (at " + part + ") in wiring " + this[wiredfn_key].toString())
						continue
					}

					obj.addListener(part, bindcall)

					if(obj.hasWires(part) && !obj.wiredCall(part)){
						obj.connectWiredAttribute(part)
						if(!bindcall.deps) bindcall.deps = []
						bindcall.deps.push(obj.wiredCall(part))
					}
					}
					else{
						var newobj = obj[part]
						if(!newobj){
							if(obj === bindcall.find){ // lets make an alias on this, scan the parent chain
								obj = this.find(part)
								if(obj) bindcall.find[part] = obj
								/*
								while(obj){
									if(part in obj){
										if(part in this) console.log("Aliasing error with "+part)
										//console.log("ALIASING" + part, this)
										obj = this[part] = obj[part]
										break
									}
									obj = obj.parent
								}*/
							}
						}
						else obj = newobj
						if(!obj) console.log('Cannot find part ' + part + ' in ' + ref.join('.') + ' in propertybind', this)
					}
				}
			}
			if(initarray) initarray.push(bindcall)
		}

	// internal, connect all wires using the initarray returned by connectWiredAttribute
	this.connectWires = function(initarray, depth){

		var immediate = false
		if(!initarray) {
			initarray = []
			immediate = true
		}

		if(this._wiredfns){
			for(var key in this._wiredfns){
				this.connectWiredAttribute(key, initarray)
			}
		}
		// lets initialize bindings on all nested classes
		var nested = this.constructor.nested
		if(nested) for(var name in nested){
			var nest = this[name.toLowerCase()]
			if(nest.connectWires){
				nest.connectWires(initarray, depth)
			}
		}
		if(immediate === true){
			for(var i = 0; i < initarray.length; i++){
				initarray[i]()
			}
		}
	}

	// internal, does nothing sofar
	this.disconnectWires = function(){
	}

	// internal, check if an attribute has wires connected
	this.hasWires = function(key){
		var wiredfn_key = '_wiredfn_' + key
		return wiredfn_key in this
	}

	// internal, returns the wired-call for an attribute
	this.wiredCall = function(key){
		var wiredcl_key = '_wiredcl_' + key
		return this[wiredcl_key]
	}

	// internal, used by the attribute setter to start a 'motion' which is an auto-animated attribute
	this.startMotion = function(key, value){
		if(!this.screen) return false
		return this.screen.startMotion(this, key, value)
	}

	// internal, return a function that can be assigned as a listener to any value, and then re-emit on this as attribute key
	this.emitForward = function(key){
		return function(value){
			this.emit(key, value)
		}.bind(this)
	}

	// internal, animate an attribute with an animation object see animate
	this.animateAttributes = function(arg){
		// count
		var arr = []
		for(var key in arg){
			var value = arg[key]
			if(typeof value === 'object'){
				var resolve, reject
				var promise = new Promise(function(res, rej){ resolve = res, reject = rej })
				promise.resolve = resolve
				promise.reject = reject
				arr.push(promise)
				this.startAnimation(key, undefined, value, promise)
			}
			else{
				if(typeof value === 'string'){
					value = value.toLowerCase()
					if(value === 'stop'){
						this.stopAnimation(key)
					}
					else if(value === 'play'){
						this.playAnimation(key)
					}
					else if(value === 'pause'){
						this.pauseAnimation(key)
					}
				}
				resolve()
			}
		}
		if(arr.length <= 1) return arr[0]
		return Promise.all(arr)
	}

	// internal, hide a property, pass in any set of strings
	this.hideProperty = function(){
		for(var i = 0; i<arguments.length; i++){
			var arg = arguments[i]
			if(Array.isArray(arg)){
				for(var j = 0; j<arg.length; j++){
					Object.defineProperty(this, arg[j],{enumerable:false, configurable:true, writeable:true})
				}
			}
			else{
				Object.defineProperty(this, arg,{enumerable:false, configurable:true, writeable:true})
			}
		}
	}

	this.hideProperty(Object.keys(this))

	// internal, used by find and findChild
	this._findChild = function(name, ignore){
		if(this === ignore) return
		if(this.name === name){
			return this
		}
		if(this.children) {
			for(var i = 0; i < this.children.length; i ++){
				var child = this.children[i]
				if(child === ignore) continue
				var ret = child._findChild(name, ignore)
				if(ret !== undefined){
					return ret
				}
			}
		}
	}

	// Finds a child node by name.
	this.findChild = function(name){
		if(!this.find_cache) this.find_cache = {}
		var child = this.find_cache[name]
		if(child && !child.destroyed) return child
		child = this.find_cache[name] = this._findChild(name)
		return child
	}

	// Finds a parent node by name.
	this.find = function(name){
		var child = this.findChild(name)
		var node = this
		while(child === undefined && node.parent){
			child = node.parent._findChild(name, node)
			node = node.parent
		}
		this.find_cache[name] = child
		return child
	}

	// internal, check if property is an attribute
	this.isAttribute = function(key){
		var setter = this.__lookupSetter__(key)
		if(setter !== undefined && setter.isAttribute) return true
		else return false
	}

	this.emitFlags = function(flag, keys){
		for(var i = 0; i < keys.length; i++ ){
			this['_flag_'+keys[i]] |= flag
		}
	}

	// internal, emits an event recursively on all children
	this.emitRecursive = function(key, event, block){
		if(block && block.indexOf(child)!== -1) return
		this.emit(key, event)
		for(var a in this.children){
			var child = this.children[a]
			child.emitRecursive(key, event)
		}
	}

	// // internal, returns the attribute config object (the one passed into this.attributes={attr:{config}}
	// this.getAttributeConfig = function(key){
	// 	return this._attributes[key]
	// }

	// Object.defineProperty(this, 'style', {
	// 	get:function(){
	// 		return this._style
	// 	},
	// 	set:function(v){
	// 		if(!this.hasOwnProperty('_style')) this._style = Object.create(this._style)
	// 		if(typeof v === 'object'){
	// 			for(var key in v){
	// 				var value = v[key]
	// 				if(typeof value === 'object'){
	// 					var base = this._style[key]
	// 					if(!base) this._style[key] = value
	// 					else{
	// 						var obj = this._style[key] = Object.create(base)
	// 						for(var subkey in value){
	// 							obj[subkey] = value[subkey]
	// 						}
	// 					}
	// 				}
	// 				else{
	// 					this._style[key] = v[key]
	// 				}
	// 			}
	// 		}
	// 		else if(typeof v === 'function'){
	// 			v.call(this._style)
	// 		}
	// 	}
	// })
	//
	// var Style = define.class(function(){
	//
	// 	this.composeStyle = function(){
	// 		// lets find the highest matching level
	// 		for(var i = arguments.length - 1; i >= 0; i--){
	// 			var match = arguments[i]
	// 			if(!match) continue
	// 			var style = this[match]
	// 			if(style){
	// 				if(i === 0) return style
	// 				if(style._composed) return style
	// 				style = {}
	// 				// lets compose a style from the match stack
	// 				for(var j = 0; j <= i; j++){
	// 					var level = this[arguments[j]]
	// 					if(level){
	// 						for(var key in level) style[key] = level[key]
	// 					}
	// 				}
	// 				Object.defineProperty(style, '_composed', {value:1})
	// 				Object.defineProperty(style, '_match', {value:match})
	//
	// 				// lets store it back
	// 				this[match] = style
	// 				return style
	// 			}
	// 		}
	// 	}
	//
	// 	this.lookup = function(name, props){
	// 		// lets return a matching style
	// 		return this.composeStyle(
	// 			'$',
	// 			'$_' + props.class,
	// 			name,
	// 			name + '_' + props.class,
	// 			name + '_' + props.name
	// 		)
	// 	}
	// })
	//
	// this._style = new Style()
	//
	// this.atStyleConstructor = function(original, props, where){
	// 	// lets see if we have it in _styles
	// 	var name = original.name
	//
	// 	var propobj = props && Object.getPrototypeOf(props) === Object.prototype? props: {}
	//
	// 	// we need to flush this cache on livereload
	// 	//var cacheid = name + '_' + propobj.class + '_' + propobj.name
	// 	//var cache = this._style._cache || (this._style._cache = {})
	//
	// 	//var found = cache[cacheid]
	// 	//if(found) return found
	// 	var style = this._style.lookup(name, propobj)
	//
	// 	// find the base class
	// 	var base = original
	// 	if(this.constructor.outer) base = this.constructor.outer.atStyleConstructor(original, propobj, 'outer')
	// 	else if(this !== this.composition && this !== this.screen && this.screen){
	// 		base = this.screen.atStyleConstructor(original, propobj, 'screen')
	// 	}
	// 	else if(this.composition !== this && this.composition) base = this.composition.atStyleConstructor(original, propobj, 'composition')
	//
	// 	// 'quick' out
	// 	var found = style && style._base && style._base[name] === base && style._class && style._class[name]
	// 	if(found){
	// 		return /*cache[cacheid] =*/ found
	// 	}
	//
	// 	if(!style) return /*cache[cacheid] =*/  base
	//
	// 	if(!style._class){
	// 		Object.defineProperty(style, '_class', {value:{}, configurable:true})
	// 		Object.defineProperty(style, '_base', {value:{}, configurable:true})
	// 	}
	//
	// 	// (re)define the class
	// 	if(style._base[name] !== base || !style._class[name]){
	// 		var clsname = base.name + '_' +(where?where+'_':'')+ (style._match||'star')
	// 		var cls = style._class[name] = base.extend(style, original.outer, clsname)
	// 		style._base[name] = base
	// 		return /*cache[cacheid] =*/ cls
	// 	}
	//
	// 	return /*cache[cacheid] =*/ original
	// }


	// Old define attribute

	// // internal, define an attribute, use the attributes =  api
	// this.defineAttribute = function(key, config){
	//
	// 	// lets create an attribute
	// 	var is_config =  config instanceof Config
	// 	var is_attribute = key in this
	// 	// use normal value assign
	//
	// 	var islistener = false
	// 	if(key[0] === 'o' && key[1] === 'n'){
	// 		if(this.__lookupSetter__(key.slice(2))) islistener = true
	// 	}
	//
	// 	if(is_attribute && !is_config || islistener || typeof config === 'function' && !config.is_wired){
	// 		this[key] = config
	// 		return
	// 	}
	//
	// 	// autoprocess the config
	// 	if(is_config){
	// 		config = config.config
	// 	}
	// 	else{ // its a value
	// 		config = {value: config}
	// 	}
	// 	// figure out the type
	// 	if(!is_attribute && !config.type){
	// 		var value = config.value
	//
	// 		if(typeof value === 'object'){
	// 			if(value && typeof value.struct === 'function') config.type = value.struct
	// 			else if(Array.isArray(value)) config.type = Array
	// 			else config.type = Object
	// 		}
	// 		else if(typeof value === 'number'){
	// 			config.type = float
	// 		}
	// 		else if(typeof value === 'boolean'){
	// 			config.type = boolean
	// 		}
	// 		else if(typeof value === 'function'){
	// 			if(!value.is_wired){
	// 				config.type = Function
	// 			}
	// 			else{ // an undefined wire is automatically a number
	// 				config.value = 0
	// 				config.type = Number
	// 			}
	// 		}
	// 		else if(typeof value === 'string'){
	// 			config.type = String
	// 		}
	// 	}
	// 	if(config.persist){
	// 		// this.definePersist(key)
	// 	}
	//
	// 	if(!this.hasOwnProperty('_attributes')){
	// 		this._attributes = this._attributes?Object.create(this._attributes):{}
	// 	}
	// 	if(is_attribute){ // extend the config
	// 		//if('type' in config) throw new Error('Cannot redefine type of attribute '+key)
	// 		var newconfig = Object.create(this._attributes[key])
	// 		for(var prop in config){
	// 			newconfig[prop] = config[prop]
	// 		}
	// 		this._attributes[key] = newconfig
	// 		if('value' in config) this[key] = config.value
	// 		if('listeners' in config){
	// 			var listeners = config.listeners
	// 			for(var i = 0; i < listeners.length; i++){
	// 				// this.addListener(key, listeners[i])
	// 			}
	// 		}
	//
	// 		return
	// 	}
	//
	// 	var value_key = '_' + key
	// 	var on_key = 'on' + key
	// 	var listen_key = '_listen_' + key
	// 	var animinit_key = '_animinit_' + key
	//
	// 	//var config_key = '_config_' + key
	// 	var get_key = '_get_' + key
	// 	var set_key = '_set_' + key
	// 	var flag_key = '_flag_' + key
	//
	// 	this[flag_key] = 0
	//
	// 	if(!config.group) config.group  = this.constructor.name
	// 	if(config.animinit) this[animinit_key] = 0
	// 	var init_value = key in this? this[key]:config.value
	//
	// 	if(init_value !== undefined){
	// 		var type = config.type
	// 		if(typeof init_value === 'function'){
	// 			if(init_value.is_wired) this.setWiredAttribute(key, init_value)
	// 			else if(type !== Function){
	// 				//this.addListener(on_key, init_value)
	// 				this[on_key] = init_value
	// 			}
	// 			else this[value_key] = init_value
	// 		}
	// 		else{
	// 			if(type && type !== Object && type !== Array && type !== Function){
	// 				this[value_key] = type(init_value)
	// 			}
	// 			else{
	// 				this[value_key] = init_value
	// 			}
	// 		}
	// 	}
	// 	this._attributes[key] = config
	//
	// 	if(config.listeners) this[listen_key] = config.listeners
	//
	// 	var setter
	// 	// define attribute gettersetters
	//
	// 	// block attribute emission on objects with an environment thats (stub it)
	// 	if(config.alias){
	// 		var alias_key = '_' + config.alias
	// 		var aliasstore_key = '_alias_'+config.alias
	// 		setter = function(value){
	// 			var mark
	//
	// 			var config = this._attributes[key]
	//
	// 			if(this[set_key] !== undefined) value = this[set_key](value)
	// 			if(typeof value === 'function'){
	// 				if(value.is_wired) return this.setWiredAttribute(key, value)
	// 				if(config.type !== Function){
	// 					//this.addListener(on_key, value)
	// 					this[on_key] = value
	// 					return
	// 				}
	// 			}
	// 			if(typeof value === 'object'){
	// 				if(value instanceof Mark){
	// 					mark = value.mark
	// 					value = value.value
	// 				}
	// 				else if(value instanceof Config){
	// 					this.defineAttribute(key, value)
	// 					return
	// 				}
	// 				else if(value instanceof Animate){
	// 					return this.startAnimation(key, value)
	// 				}
	// 			}
	// 			if(typeof value === 'object' && value !== null && value.atAttributeAssign){
	// 				value.atAttributeAssign(this, key)
	// 			}
	//
	// 			if(!mark && config.motion){
	// 				// lets copy our value in our property
	// 				this[value_key] = this[alias_key][config.index]
	// 				this.startAnimation(key, value)
	// 				return
	// 			}
	//
	// 			var store
	// 			if(!this.hasOwnProperty(alias_key)){
	// 				store = this[alias_key]
	// 				store = this[alias_key] = store.struct(store)
	// 			}
	// 			else{
	// 				store = this[alias_key]
	// 			}
	// 			var old = this[value_key]
	// 			this[value_key] = store[config.index] = value
	//
	// 			// emit alias
	// 			this.emit(config.alias, {setter:true, via:key, key:config.alias, owner:this, value:this[alias_key], mark:mark})
	//
	// 			if(this.atAttributeSet !== undefined) this.atAttributeSet(key, value)
	// 			// emit self
	// 			this.emit(key,  {setter:true, key:key, owner:this, old:old, value:value, mark:mark})
	// 		}
	//
	// 		// add a listener to the alias
	// 		var aliasarray = this[aliasstore_key]
	// 		if(!aliasarray) this[aliasstore_key] = aliasarray = []
	//
	// 		aliasarray.push(function(value){
	// 			var old = this[value_key]
	// 			var val = this[value_key] = value[config.index]
	// 			this.emit(key, {setter:true, key:key, owner:this, value:val, old:old})
	// 		})
	// 		// initialize value
	// 		this[value_key] = this[alias_key][config.index]
	// 	}
	// 	else {
	// 		var aliasstore_key = '_alias_'+key
	// 		setter = function(value){
	// 			var mark
	//
	// 			var config = this._attributes[key]
	//
	// 			if(this[set_key] !== undefined) value = this[set_key](value)
	// 			if(typeof value === 'function'){
	// 				if(value.is_wired) return this.setWiredAttribute(key, value)
	// 				if(config.type !== Function){
	// 					//this.addListener(on_key, value)
	// 					this[on_key] = value
	// 					return
	// 				}
	// 			}
	// 			if(typeof value === 'object'){
	// 				if(value instanceof Mark){
	// 					mark = value.mark
	// 					value = value.value
	// 				}
	// 				else if(value instanceof Config){
	// 					this.defineAttribute(key, value)
	// 					return
	// 				}
	// 				else if(value instanceof Animate){
	// 					return this.startAnimation(key, undefined, value.track)
	// 				}
	// 			}
	// 			if(typeof value === 'object' && value !== null && value.atAttributeAssign){
	// 				value.atAttributeAssign(this, key)
	// 			}
	//
	// 			var type = config.type
	// 			if(type){
	// 				if(type !== Object && type !== Array && type !== Function) value = type(value)
	// 			}
	//
	// 			if((!mark && (!config.animinit || this[animinit_key]++)) && config.motion && this.startAnimation(key, value)){
	// 				// store the end value
	// 				return
	// 			}
	// 			var old = this[value_key]
	// 			this[value_key] = value
	//
	// 			var aliases = this[aliasstore_key]
	// 			if(aliases){
	// 				for(var i = 0; i<aliases.length;i++){
	// 					aliases[i].call(this, value)
	// 				}
	// 			}
	//
	// 			if(this.atAttributeSet !== undefined) this.atAttributeSet(key, value)
	// 			this.emit(key, {setter:true, owner:this, key:key, old:old, value:value, mark:mark})
	// 		}
	// 	}
	//
	// 	setter.isAttribute = true
	// 	Object.defineProperty(this, key, {
	// 		configurable:true,
	// 		enumerable:true,
	// 		get: function(){
	// 			if(this.atAttributeGetFlag){
	// 				this[flag_key] |= this.atAttributeGetFlag
	// 			}
	// 			return this[value_key]
	// 		},
	// 		set: setter
	// 	})
	// }
})