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

I am not responsible for the actions of your parents

*/


(function($, undefined) {
if (!jarPlug) return;

var ui = jarPlug.ui = {
	settings: {
		workmode: false
	},
	load: function() {
		ui.createSideButton();
		console.log('Hey look, ui loaded!')

		return true;
	},
	createSideButton: function() {
		var menu = $("<div />", {
			class: 'jarPlug ui-corner-all',
			css: {
				height: 25,
				width: 30,
				position: 'absolute',
				top: 48,
				right: 4,
				color: 'white',
				border: '1px solid white',
				overflow: 'hidden'
			}
		})
		.hover(function() {
			$(this).css({
				border: '1px solid #9cbde6',
				backgroundColor: '#42a5dc'
			})
		},function() {
			$(this).css({
				border: '1px solid white',
				backgroundColor: 'transparent'
			})
		})
		.append(
			$("<span />", {
				text: "Jar",
				css: {
					position: 'relative',
					top: -4,
					left: 0,
					fontFamily: '"CalgaryScript", Helvetica, Arial, sans-serif',
					fontSize: '26px'
				}
			})
		)
		.click(ui.showSettings)

		$("#user-meta").append(menu);
	},
	createModalWindow: function(title) {
		var dialog = $('<div />', {
				class: 'jarPlug dialog',
				css: {
					position: 'absolute',
					left: (Main.WIDTH/2) - 200 + Main.LEFT,
					top: 344-250,
					width: 400,
					height: 500
				}
			})
			.append(
				$("<div />", {
					class: 'dialog-header'
				})
				.append(
					$("<span />", {
						text: title
					})
				)
				.append(
					$("<div />", {
						class: 'dialog-close-button'
					})
					.click(function() {
						dialog.remove();
						ui.checkOverlay();
					})
				)
				.append(
					$("<div />", {
						class: 'dialog-header-line'
					})
				)
			)
			.append(
				$("<div />", {
					class: 'dialog-body'
				})
			)
			.appendTo($("#dialog-box"));

		$("#dialog-container").show();
		return dialog.find('.dialog-body');
	},
	checkOverlay: function() {
		if ($("#dialog-container").children().length === 2 && $("#dialog-box").children().length == 0)
			$("#dialog-container").hide();
	},
	showSettings: function() {
		var dialog = ui.createModalWindow("jarPlug Settings");
		dialog.css({
			paddingLeft: 10,
			paddingRight: 10
		})

		var settings = ui.getSettingsMap();
		$.each(settings, function(name, conf) {
			dialog.append('<h2>' + name + '</h2>');

			$.each(conf, function(name, widget) {
				dialog.append(
					$("<div />")
						.append(widget)
						.append(name)
				)
			});
		});
	},
	// Function for getting the settings objects from the other plugins
	// Plugins can either export a div to be used in the settings window or they can claim their own "tab"
	// "tabbed" settings gets full control over the window, can resize, so on...
	// normal ones cannot. They are just a div being placed into the settings window.
	// essentially it's simple and advanced mode.
	getSettingsMap: function() {
		var settings = {};
		console.log('getSettingsMap!!!!!!!!')
		$.each(jarPlug, function(name, module) {
			if (typeof module.getSettings === 'function') {
				console.log('Checking settings for ' + name);
				var msett = module.getSettings();
				settings[msett.name] = msett.options;
			}
		});

		return settings;
	},
	createSettingsElement: function(name, type) {
		var isModule = false;
		var isFunction = typeof name === 'function';
		if (!isFunction && name.indexOf("module:") === 0) {
			isModule = true;
			name = name.substring(7).trim()
		}
		var widget;
		switch (type) {
			case 'checkbox':
				widget = $("<input />", {
					type: 'checkbox'
				})
				.data('jarPlugGetValue', function() {
					return widget.attr('checked')=='checked';
				})
				.data('jarPlugSetValue', function(value) {
					if(value)
						widget.attr('checked', 'checked');
					else
						widget.removeAttr('checked');
				})
				break;
			case 'button':
				if (!isFunction)
					throw new Error('Button elements only work with callback functions')
				widget = $("<button />")
					.click(name);
		}

		var curValue;

		if (!isFunction)
			curValue = widget.data('jarPlugGetValue')();

		if (!isFunction && isModule) {
			widget.change(function() {
				if (widget.data('jarPlugGetValue')() === true) {
					jarPlug.main.addModule(name)
					$(jarPlug).trigger('settingsChanged', name, true);
				} else if (widget.data('jarPlugGetValue')() === false) {
					jarPlug.main.removeModule(name)
					$(jarPlug).trigger('settingsChanged', name, false);
				}
			})
			$(jarPlug).on('settingsChanged', function(event, eventName, value) {
				if (name !== eventName)
					return;
				widget.data('jarPlugSetValue')(jarPlug.main.hasModule(name));
				console.log('Setting my ui based on ', jarPlug.main.hasModule(name))
			})
			curValue = jarPlug.main.hasModule(name);
		} else if (!isFunction) {
			widget.change(function() {
				jarPlug.settings[name] = widget.data('jarPlugGetValue')();
				$(jarPlug).trigger('settingsChanged', name);
			})


			$(jarPlug).on('settingsChanged', function(event, eventName) {

				if (name !== eventName)
					return;
				var setter = widget.data('jarPlugSetValue');
				if (typeof setter === 'function')
					setter(jarPlug.settings[name]);
			})
			curValue = jarPlug.settings[name];
		}

		if (!isFunction)
			widget.data('jarPlugSetValue')(curValue);

		return widget;
	},
	unload: function() {
		$(".jarPlug").remove();

		ui.checkOverlay();

		return true;
	}
}

})(jQuery);

