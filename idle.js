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
var users = {},
	displays = [],
	interval = null;

var idle = jarPlug.idle = {
	settings: {
		minIdle: 0*60 //5 minutes of idle before displaying
	},
	load: function() {
		//start listening
		API.addEventListener(API.CHAT, idle.chat);
		API.addEventListener(API.USER_JOIN, idle.userJoin);
		API.addEventListener(API.USER_LEAVE, idle.userLeave);
		
		//assume everyone's idle time starts now
		var now = (new Date()).getTime();
		$.each(API.getUsers(), function(){users[this.id] = now;});
		
		//create the displays
		for (var i=0; i<5; i++)
		{
			displays.push(idle.getDisplayDiv(i));
		}
		
		//start the displays updating
		interval = setInterval(idle.update, 1000);

		return true;
	},
	unload: function() {
		//stop updating
		clearInterval(interval);
		
		//stop listening
		API.removeEventListener(API.CHAT, idle.chat);
		API.removeEventListener(API.USER_JOIN, idle.userJoin);
		API.removeEventListener(API.USER_LEAVE, idle.userLeave);
		
		//clean up the users list
		users = {};
		
		//clear the idle displays
		$.each(displays, function(){
			this.parentNode.removeChild(this);
		});
		displays = [];
		
		return true;
	},
	getIdle: function() {
		var now = (new Date()).getTime();
		$.each(API.getDJs(), function(i){
			console.log(this.username, (now - users[this.id]) / 1000, i);
		});
	},
	chat: function(data) {
		//reset the idle time for the user that just talked
		users[data.fromID] = (new Date()).getTime();
	},
	userJoin: function(data) {
		//add a user if they just arrived
		users[data.id] = (new Date()).getTime();
	},
	userLeave: function(data) {
		//drop a user if they leave
		delete users[data.id];
	},
	getDisplayDiv: function(id) {
		var d = document.createElement('div');
		
		//each box needs to be positioned pretty precisely
		var l = 0;
		switch (id)
		{
			case 0: l = 566; break;
			case 1: l = 256; break;
			case 2: l = 181; break;
			case 3: l = 104; break;
			case 4: l =  22; break;
		}
		
		//style the element
		$(d).css({width: '90px',
			position: 'absolute',
			top: '140px',
			'text-align': 'center',
			left: l + 'px'});
			
		//add it to the UI
		$('#dj-booth').append(d);
		
		//return it so we can keep track of it
		return d;
	},
	update: function() {
		var now = (new Date()).getTime();
		$.each(API.getDJs(), function(i){
			displays[i].innerHTML = idle.format((now - users[this.id]) / 1000);
		});
	},
	format: function(seconds) {
		//minutes:seconds if we meet minimum idle standard, otherwise nothing
		if (seconds >= idle.settings.minIdle)
		{
			var m = Math.floor(seconds / 60),
				s = Math.floor(seconds % 60);
			return m + ':' + (s < 10 ? '0' : '') + s;
		}
		
		return '';
	}
}

})(jQuery);