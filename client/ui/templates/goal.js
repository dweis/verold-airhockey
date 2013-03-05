var _ = require('underscore');

_.templateSettings = {
    interpolate : /\{\{(.+?)\}\}/g
};

module.exports = _.template(
  'GOAL!' +
  '<p>{{name}} scored!</p>');
