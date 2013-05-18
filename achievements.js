module.exports = {
  description: {}
  ,achievements: {
   
	//100 different artists
	differentArtists: function(p){
    ns = [1,50,100,250,1000]
    module.exports.description['differentArtists1'] = "Play a song"
		var index
    for (var i = 1; i<=4; i++){
			index = parseInt(i)
      module.exports.description['differentArtists'+ns[index]] = "Play songs from " + ns[index] + " different artists"
    }
		return function(callback){
      console.log(p)
			p.playHistory({}, '_song', function(err, plays){
        var artists = plays.map(function(p){return p._song.author})
        var artists = artists.getUnique()
        var rs = [] 
        ns.forEach(function(n){
          if (artists.length >= n) {
            rs.push('differentArtists'+n)
          }
        })
			  callback(null, rs)	
				})
      }
  }
	//Play an artist beginning with every letter of the alphabet
	//50 songs never played before
	//Curate 50 songs
	//Play a song that has never been played before
	//Wait over an hour to play your song
	//Chat 1000 lines in chat
	//Play 100 different songs
	//Play a song last played over a month ago
	//Your song gets curated
	//Set a bio
	}
}
Array.prototype.getUnique = function(){
   var u = {}, a = [];
   for(var i = 0, l = this.length; i < l; ++i){
      if(u.hasOwnProperty(this[i])) {
         continue;
      }
      a.push(this[i]);
      u[this[i]] = 1;
   }
   return a;
}
