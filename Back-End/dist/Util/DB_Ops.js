"use strict";
/* DB Operations responses */
Object.defineProperty(exports, "__esModule", { value: true });
var DB_OPS;
(function (DB_OPS) {
    DB_OPS[DB_OPS["SUCCESS"] = 0] = "SUCCESS";
    DB_OPS[DB_OPS["MOSTLY_OK"] = 1] = "MOSTLY_OK";
    DB_OPS[DB_OPS["FAILURE"] = 2] = "FAILURE";
})(DB_OPS || (DB_OPS = {}));
;
//Default export
exports.default = DB_OPS;
