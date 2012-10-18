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

jarPlug.main = {
	settings: {
		workmode: false
	},
	load: function() {
		console.log('Hey look, I loaded!')
	}
}

})(jQuery);

