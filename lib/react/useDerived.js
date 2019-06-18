"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var core_1 = require("../core");
var common_1 = require("./common");
/**
 * The given function is called whenever its array of inputs (which may or
 * may not contain observable values) is changed.
 *
 * The caller is re-rendered when the result is _not_ strictly equal to the
 * previous result.
 *
 * If none of the inputs will ever be an observable value, you should avoid
 * using this hook.
 */
function useDerived(derive, inputs) {
    var target = react_1.useMemo(function () { return new core_1.OTuple(inputs); }, inputs);
    var result = react_1.useRef(undefined);
    // Ensure the result is never outdated.
    react_1.useMemo(function () {
        result.current = derive.apply(void 0, target.get());
    }, [target, derive]);
    var forceUpdate = common_1.useForceUpdate();
    react_1.useEffect(function () {
        // Re-compute the result when an input changes.
        // Re-render when the result changes.
        return target.tap(function () {
            var nextResult = derive.apply(void 0, target.get());
            if (result.current !== nextResult) {
                result.current = nextResult;
                forceUpdate();
            }
        }).dispose;
    }, [target, derive]);
    return result.current;
}
exports.useDerived = useDerived;