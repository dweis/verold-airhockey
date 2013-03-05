var Backbone = require('backbone')
  , _ = require('underscore');

var PlayerModel = Backbone.Model.extend({
  toJSON: function() {
    var json = _.clone(this.attributes);

    json.gravatarUrl = 'http://en.gravatar.com/avatar/' + json.gravatarHash + '?s=64&d=retro';

    return json;
  }
});

module.exports = PlayerModel;
