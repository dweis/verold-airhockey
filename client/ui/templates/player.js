var _ = require('underscore');

_.templateSettings = {
    interpolate : /\{\{(.+?)\}\}/g
};

module.exports = _.template(
  '<span style="float: left;">' +
  '<img src="{{gravatarUrl}}" align="left"/>' +
  '</span>' +
  '<span>' +
  '<h1>{{name}}</h1>' +
  '<div class="score">{{score}}</div>' +
  '</span>');
