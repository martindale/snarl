/*
Copyright 2012, Coding Soundtrack
All rights reserved.

Authors:


Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met: 

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer. 
2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution. 

I am not responsible for any cat exploits

*/

// jarPlug

(function($, undefined) {
if (!jarPlug) return;

jarPlug.modules = $.extend(jarPlug.modules, {
	// STOCK MODULES
	ui: {
		dependencies: [],
		url: jarPlug.baseUrl + "ui.js",
		load: true,
		unload: true,
	}
});

var defaultModules = [
	'ui'
];
var keyPrefix = "jarplug_";

var main = jarPlug.main = {
	settings: {
		workmode: false
	},
	load: function() {
		console.log('Hey look, I loaded!')

		main.autoLoadPlugins();

		return true;
	},
	getValue: function(key) {
		key = keyPrefix + key;
		var value = localStorage[key];
		if (typeof value !== 'string')
			return value;
		try {
			value = JSON.parse(value);
		} catch (e) {
		}
		return value;
	},
	putValue: function(key, value) {
		key = keyPrefix + key;
		if (typeof value !== 'string')
			value = JSON.stringify(value);

		localStorage[key] = value;
	},
	addModule: function(name) {
		jarPlug.loadModule(name);

		var autoLoad = main.getValue('autoload');
		if (typeof autoLoad !== 'array')
			autoLoad = defaultModules;

		if ($.inArray(autoLoad, name) !== -1)
			autoLoad.push(name);

		main.putValue('autoload', autoLoad);
	},
	removeModule: function(name) {
		jarPlug.unloadModule(name);

		var autoLoad = main.getValue('autoload');
		if (typeof autoLoad === 'array') {
			autoLoad = $.grep(autoLoad, function(value) {
				return value !== name;
			});
		}
		main.putValue('autoload', autoLoad);
	},
	autoLoadPlugins: function() {
		var autoLoad = main.getValue('autoload');
		if (typeof autoLoad !== 'array') {
			autoLoad = defaultModules;
			main.putValue('autoload', autoLoad);
		}

		return jarPlug.exec(function() {
			var flow = this;
			$.each(autoLoad, function(i, module) {
				jarPlug.loadModule(module).done(flow.MULTI());
			})
			flow.MULTI()();
		});
	}
}

})(jQuery);

