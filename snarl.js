var config = require('./config');

var Remote = require('maki-remote');
var remote = new Remote('http://localhost:9200');

var rest = require('restler');

remote.on('message', function(msg) {
  console.log('message received:', msg);
  
  if (msg.method === 'patch') {
    var ops = msg.params.ops;
    if (!ops.length) return;
    
    ops.forEach(function(op) {
      if (msg.params.channel === '/invitations') {
        var invitation = op.value;
        console.log('invitation:', invitation);
        
        // TODO: investigate whether Slack API allows this...
        /* var channels = invitation.topics.map(function(topic) {
          return snarl.slack.channelMap[topic].id;
        }); */
        
        // TODO: contact Slack and figure out how to make this work in a single call
        /*var channels = invitation.topics[0].split(',').map(function(topic) {
          return '#' + topic;
        });
        
        console.log('sending channels:', channels);  */

        rest.post('https://slack.com/api/users.admin.invite', {
          data: {
            email: invitation.email,
            //channels: channels.join(','),
            token: config.slack.token
          }
        }).on('complete', function(data) {
          console.log('slack API request returned:', data);
        });
      }
      
      if (msg.params.channel === '/people') {
        console.log('person!', JSON.stringify(op));
      }
    });

  }

});

remote.on('open', function() {
  console.log('remote is open.');
});

remote.init();

var Snarl = require('./lib/snarl');
var snarl = new Snarl(config);

snarl.use(require('./plugins/erm'));
snarl.autoload();

snarl.start(function(err) {
  console.log('snarl is started.');
});
