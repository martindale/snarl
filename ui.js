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
					left: Main.WIDTH/2-200,
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
	},
	unload: function() {
		$(".jarPlug").remove();

		ui.checkOverlay();

		return true;
	}
}

})(jQuery);

