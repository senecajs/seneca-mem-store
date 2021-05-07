"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clean = void 0;
// NOTE: This function removes any props containing $.
//
function clean(what) {
    if (Array.isArray(what)) {
        return cleanArray(what);
    }
    return cleanObject(what);
    function cleanArray(ary) {
        return ary.filter(x => !isPrivateProp(x));
    }
    function cleanObject(obj) {
        const out = {};
        const public_props = Object.getOwnPropertyNames(what)
            .filter(p => !isPrivateProp(p));
        for (const p of public_props) {
            out[p] = obj[p];
        }
        return out;
    }
    function isPrivateProp(prop) {
        return prop.includes('$');
    }
}
exports.clean = clean;
//# sourceMappingURL=common.js.map