var _ = require('underscore');

_.templateSettings = {
    interpolate : /\{\{(.+?)\}\}/g
};

module.exports = _.template(
  '<div class="player">' +
  '<img src="{{gravatarUrl}}"/>' +
  '<h2>Player {{playerNumber}}</h2>' + 
  '<h1>{{name}}</h1>' +
  '<p>Score: {{score}}</p>' +
  '</div>');
