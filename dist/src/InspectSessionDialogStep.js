"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (getSession, defaultAddress) => class InspectSessionDialogStep {
    constructor(sessionInspector, address) {
        if (!address && !defaultAddress) {
            throw new Error('InspectSessionDialogStep requires a default address or an address be provided');
        }
        this.address = address || defaultAddress;
        this.sessionInspector = sessionInspector;
    }
    execute() {
        return getSession(this.address)
            .then(this.sessionInspector);
    }
};
//# sourceMappingURL=InspectSessionDialogStep.js.map