"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var immer_1 = require("immer");
var common_1 = require("../common");
var immer_2 = require("../immer");
var symbols_1 = require("../symbols");
var Observable_1 = require("../types/Observable");
var OPath_1 = require("../types/OPath");
function watch(parent, arg) {
    var observable = Observable_1.getObservable(parent);
    if (!observable) {
        throw Error('Parent must be observable');
    }
    if (arguments.length == 1) {
        if (!immer_1.isDraftable(parent)) {
            throw Error('Parent cannot be watched');
        }
        observable = new OPath_1.OPath(observable, []);
        return immer_2.immer.useProxies
            ? new Proxy({ target: parent, observable: observable }, watchProxyHandler)
            : createLegacyProxy(parent, observable);
    }
    if (typeof arg == 'function') {
        return arg(watch(parent));
    }
    if (isWatchable(observable)) {
        return observable.watch(arg);
    }
    throw Error("Cannot watch property: \"" + arg + "\"");
}
exports.watch = watch;
function isWatchable(object) {
    return object && typeof object.watch == 'function';
}
var watchProxyHandler = {
    get: function (state, prop) {
        if (prop == symbols_1.$O) {
            return state.observable;
        }
        if (!isWatchable(state.observable)) {
            throw Error('Parent cannot be watched');
        }
        var target = state.target[prop];
        var observable = state.observable.watch(prop);
        return immer_1.isDraftable(target)
            ? new Proxy({ target: target, observable: observable }, watchProxyHandler)
            : observable;
    },
};
/**
 * Legacy Proxy
 */
var defineGetter = common_1.createDescriptor({ get: undefined, enumerable: true });
// For environments without Proxy support.
function createLegacyProxy(target, observable) {
    var proxy = common_1.isArray(target)
        ? []
        : Object.create(Object.getPrototypeOf(target));
    common_1.definePrivate(proxy, symbols_1.$O, observable);
    common_1.each(target, function (prop) {
        if (prop in proxy)
            return;
        defineGetter(proxy, prop, function () {
            if (!isWatchable(observable)) {
                throw Error('Parent cannot be watched');
            }
            var value = target[prop];
            return immer_1.isDraftable(value)
                ? createLegacyProxy(value, observable.watch(prop))
                : observable.watch(prop);
        });
    });
    return proxy;
}
