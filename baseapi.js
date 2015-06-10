/**
 * base api
 */
var $ = require('zepto');

var config = require('runtime').config;

var BaseAPI = function () {
    if (window.sessionStorage) {
        this.dataStorage = sessionStorage;
    } else {
        this.dataStorage = {};
    }
    this.requestQueue = {};
}

BaseAPI.prototype = {
    request: function (conf) {
        var url = conf.url,
            method = conf.method,
            _this = this,
            cacheKey = _this.getCacheKey(url, conf.data),
            cache,
            time = conf.url.indexOf('?') > -1 ? '&time='+ new Date().getTime() : '?time='+ new Date().getTime();

        if (typeof method == 'undefined' || !$.inArray(method, ['get', 'post'])) {
            method = 'get';
        }

        if (method == 'get') {
            cache = this.getCache(cacheKey);
            if (cache) {
                return conf.callback(cache);
            }
        }

        if (!this.requestQueue[cacheKey]) {
            this.requestQueue[cacheKey] = [];
        }
        var queue = this.requestQueue[cacheKey];
        queue.push(conf.callback);
        if (queue.length == 1) {
            $.ajax({
                type: method,
                url: url + time,
                data: conf.data,
                xhrFields: conf.xhrFields,
                dataType: conf.dataType || 'json',
                jsonp: conf.jsonp || 'callback',
                success: function (res) {
                    //@todo 错误码处理
                    if (method = 'get') {
                        _this.setCache(cacheKey, res, conf.expires);
                    }
                    var callbacks = _this.requestQueue[cacheKey];
                    _this.requestQueue[cacheKey] = null;
                    $.each(callbacks, function (_, fn) {
                        fn(res);
                    });
                },
                error: function(){
                    _this.requestQueue[cacheKey] = null;
                }
            });
        }

    },
    getCacheKey: function (url, params) {
        if (typeof params == 'undefined') {
            return url;
        }
        if (typeof params == 'object') {
            var tmp = params;
            params = '';
            $.each(tmp, function (k, v) {
                params += '&' + k + '=' + v;
            });
            tmp = null;
        }
        if (typeof params == 'string') {
            url += url.indexOf('?') > -1 ? '&' + params : '?' + params;
        }
        return decodeURIComponent(url);
    },
    getCache: function (key) {
        try {
            var cacheData = JSON.parse(this.dataStorage[key]);
            if (cacheData.expires < new Date().getTime()) {
                this.dataStorage[key] = null;
                return null;
            }
            return cacheData.data;
        } catch (_) {
            return null;
        }
    },
    setCache: function (key, value, expires) {
        var expires = expires || config.dataCacheExpires;
        if (expires <= 0) {
            return;
        }
        var cacheData = {
            data: value,
            expires: new Date().getTime() + expires
        }
        this.dataStorage[key] = JSON.stringify(cacheData);
    }
}

module.exports = BaseAPI;