var _ = require('underscore')

_.templateSettings = {
    interpolate : /\{\{(.+?)\}\}/g
};

module.exports = _.template(
  '<div class="spectator">' +
  '<img src="{{gravatarUrl}}"/>' +
  '<h1>{{name}}</h1>' +
  '</div>');
