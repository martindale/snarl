/*
Copyright 2012, Coding Soundtrack
All rights reserved.

Authors:
ging

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

//don't autowoot if the user already clicked meh
var userMeh = false,
	mehTime = 0;

var autowoot = jarPlug.autowoot = {
	settings: {
		delay: 3*1000, //how long to wait (minimum) before wooting
		spread: 5*1000, //random delay up to this amount so we don't all woot at once
		minMehDelay: 5*1000, //how long a meh might come in before DJ_ADVANCE event
		enabled: true //false if you hate fun
	},
	load: function() {
		API.addEventListener(API.DJ_ADVANCE, autowoot.callback);
		$('#button-vote-negative').click(autowoot.meh);
		return true;
	},
	unload: function() {
		API.removeEventListener(API.DJ_ADVANCE, autowoot.callback);
		$('#button-vote-negative').unbind('click', autowoot.meh);
		return true;
	},
	callback: function(obj) {
		//null obj means nobody is playing
		if (null === obj || !autowoot.settings.enabled) {
			return;
		}

		//since we just advanced, we haven't meh'd yet
		if (mehTime + autowoot.settings.minMehDelay < (new Date()).getTime())
		{
			userMeh = false;
		}
		
		setTimeout(autowoot.woot, autowoot.settings.delay + Math.floor(Math.random() * autowoot.settings.spread));
	},
	woot: function() {
		//only vote if the user hasn't yet
		if (!userMeh) {
			$('#button-vote-positive').click();
		}
	},
	meh: function() {
		userMeh = true;
		mehTime = (new Date()).getTime();
	}
}

})(jQuery);
