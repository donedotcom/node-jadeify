var assert = require('assert');
var vm = require('vm');
var fs = require('fs');

var browserify = require('browserify');
var jadeify = require('jadeify');

var jade = require('jade');
var jsdom = require('jsdom');

exports.vars = function () {
    var bundle = browserify({
        require : { jquery : 'jquery-browserify' },
        watch : false,
    });
    bundle.use(jadeify(__dirname + '/vars', 'jade'));
    
    var to = setTimeout(function () {
        assert.fail('never finished');
    }, 5000);
    
    bundle.on('ready', function (src) {
        fs.readFile(__dirname + '/vars/index.jade', function (err, file) {
            var html = jade.render(file);
            
            jsdom.env(html, function (err, window) {
                clearTimeout(to);
                
                if (err) assert.fail(err);
                
                var c = {
                    setTimeout : process.nextTick,
                    assert : assert,
                    window : window,
                };
                vm.runInNewContext(src, c);
                
                assert.ok(c.require.modules.jadeify);
                assert.ok(c.require('jadeify/views')['index.jade']);
                
                assert.equal(
                    html,
                    c.require('jade').render(
                        c.require('jadeify/views')['index.jade']
                    )
                );
                
                var $ = c.require('jquery');
                var msg = c.require('jadeify')('msg.jade', {
                    title : 'oh hello',
                    body : 'nice night for a test',
                }).appendTo($('#messages'));
                assert.ok(msg instanceof $);
                
                assert.equal(
                    $('#messages .msg .title div').text(),
                    'oh hello'
                );
                
                assert.equal(
                    $('#messages .msg .body').text(),
                    'nice night for a test'
                );
                
                msg.vars.title = 'BREAKING NEWS';
                
                assert.equal(
                    $('#messages .msg .title div').text(),
                    'BREAKING NEWS'
                );
                
                // body doesn't use the $ in the template so it doesn't get
                // modified...
                msg.vars.body = '...';
                assert.equal(
                    $('#messages .msg .body').text(),
                    'nice night for a test'
                );
                
                // expression test with calling $var()
                assert.equal($('#messages .msg .exp div').text(), '555');
                msg.vars.x = 999;
                assert.equal($('#messages .msg .exp div').text(), '999');
            });
        });
    });
};
