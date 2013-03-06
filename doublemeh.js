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

var mehCount = 0,
	muted = false;
	
var doublemeh = jarPlug.doublemeh = {
	settings: {
	},
	load: function() {
		API.addEventListener(API.DJ_ADVANCE, doublemeh.dj_advance);
		$('#button-vote-negative').click(doublemeh.meh);
		return true;
	},
	unload: function() {
		$('#button-vote-negative').unbind('click', doublemeh.meh);
		API.removeEventListener(API.DJ_ADVANCE, doublemeh.dj_advance);
		return true;
	},
	dj_advance: function() {
		//new dj, reset the meh counter and unmute after terrible song
		mehCount = 0;
		if (muted) {
			doublemeh.mute(false);
			muted = false; //make sure we set ourselves as not having muted
		}
	},
	meh: function() {
		//add a meh to the counter
		//if we trigger then force a mute
		mehCount++;
		if (mehCount == 2)
		{
			doublemeh.mute(true);
		}
	},
	mute: function(state) {
		//don't bother if we're already in the selected state
		if (state === Playback.isMuted)
		{
			return;
		}
		
		//set the mute (or unset it)
		Playback.onSoundButtonClick();
		
		//set the muted state so we know where we stand
		muted = state;
	}	
}
})(jQuery);
