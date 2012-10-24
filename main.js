/*
Copyright 2012, Coding Soundtrack
All rights reserved.

Authors:
Chris Vickery <chrisinajar@gmail.com>

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
		dependencies: ['main'],
		url: jarPlug.baseUrl + "ui.js",
		load: true,
		unload: true,
	},
	autowoot: {
		dependencies: [],
		url: jarPlug.baseUrl + "autowoot.js",
		load: true,
		unload: true,
	}
});

var defaultModules = [
	'ui'
];
var keyPrefix = "jarplug_";

var defaultSettings = {
	hidevideo: false
}

try {
	if (localStorage.jarplug_settings)
		jarPlug.settings = JSON.parse(localStorage.jarplug_settings)
	else
		jarPlug.settings = defaultSettings
} catch(e) {
	jarPlug.settings = defaultSettings
}

var main = jarPlug.main = {
	settings: {
		workmode: false
	},
	load: function() {
		console.log('Hey look, I loaded!')

		main.autoLoadPlugins();

		$(jarPlug).on('settingsChanged', main.settingsChanged);
		$.each(jarPlug.settings, function(key, value) {
			main.settingsChanged(false, key);
		})
		return true;
	},
	settingsChanged: function(event, name) {
		if (event)
			main.putValue('settings', jarPlug.settings)
		switch (name) {
			case 'hidevideo':
				if (jarPlug.settings[name])
					$("#playback").hide();
				else
					$("#playback").show();

		}
	},
	getSettings: function() {
		return {
			name: 'General',
			options: {
				'Hide Video Player': jarPlug.ui.createSettingsElement('hidevideo', 'checkbox')
				, 'Auto Woot': 	jarPlug.ui.createSettingsElement('module:autowoot', 'checkbox')
				, ' ': 			jarPlug.ui.createSettingsElement(jarPlug.reload, 'button')
													.text("Reload jarPlug")
			}
		}
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
		if (!(autoLoad instanceof Array))
			autoLoad = defaultModules;

		if ($.inArray(name, autoLoad) === -1)
			autoLoad.push(name);

		main.putValue('autoload', autoLoad);
	},
	removeModule: function(name) {
		jarPlug.unloadModule(name);
		console.log('Yo, fuck "' + name + '"')
		var autoLoad = main.getValue('autoload');
		if (autoLoad instanceof Array) {
			autoLoad = $.grep(autoLoad, function(value) {
				return value !== name;
			});
		}
		main.putValue('autoload', autoLoad);
	},
	hasModule: function(name) {
		var autoLoad = main.getValue('autoload');

		if (autoLoad instanceof Array) {
			return ($.inArray(name, autoLoad) !== -1)
		} else {
			return ($.inArray(name, defaultModules) !== -1)
		}
	},
	autoLoadPlugins: function() {
		var autoLoad = main.getValue('autoload');
		if (!(autoLoad instanceof Array)) {
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

