/*
 * KIELER - Kiel Integrated Environment for Layout Eclipse RichClient
 *
 * http://rtsys.informatik.uni-kiel.de/kieler
 *
 * Copyright 2021-2023 by
 * + Kiel University
 *   + Department of Computer Science
 *     + Real-Time and Embedded Systems Group
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import { Action } from "sprotty-protocol";
import { SynthesisOption, ValuedSynthesisOption } from "./option-models";

/** Change the value of one or multiple render options. */
export interface SetRenderOptionAction extends Action {
    kind: typeof SetRenderOptionAction.KIND;
    id: string;
    value: unknown;
}

export namespace SetRenderOptionAction {
    export const KIND = "setRenderOption";

    export function create(id: string, value: unknown): SetRenderOptionAction {
        return {
            kind: KIND,
            id,
            value,
        };
    }

    export function isThisAction(action: Action): action is SetRenderOptionAction {
        return action.kind === SetRenderOptionAction.KIND;
    }
}

/** Resets all render options to default. */
export interface ResetRenderOptionsAction extends Action {
    kind: typeof ResetRenderOptionsAction.KIND;
}

export namespace ResetRenderOptionsAction {
    export const KIND = "resetRenderOptions";

    export function create(): ResetRenderOptionsAction {
        return {
            kind: KIND,
        };
    }

    export function isThisAction(action: Action): action is ResetRenderOptionsAction {
        return action.kind === ResetRenderOptionsAction.KIND;
    }
}

/** Request message from the server to update the diagram options widget on the client. */
export interface UpdateOptionsAction extends Action {
    kind: typeof UpdateOptionsAction.KIND;
    valuedSynthesisOptions: ValuedSynthesisOption[];
    clientId: string;
    _source?: string;
}

export namespace UpdateOptionsAction {
    export const KIND = "updateOptions";

    export function create(valuedSynthesisOptions: ValuedSynthesisOption[], clientId: string): UpdateOptionsAction {
        return {
            kind: KIND,
            valuedSynthesisOptions,
            clientId,
        };
    }

    export function isThisAction(action: Action): action is UpdateOptionsAction {
        return action.kind === UpdateOptionsAction.KIND;
    }
}

/** Change the value of one or multiple synthesis options. */
export interface SetSynthesisOptionsAction extends Action {
    kind: typeof SetSynthesisOptionsAction.KIND;
    options: SynthesisOption[];
}

export namespace SetSynthesisOptionsAction {
    export const KIND = "setSynthesisOptions";

    export function create(options: SynthesisOption[]): SetSynthesisOptionsAction {
        return {
            kind: KIND,
            options,
        };
    }

    export function isThisAction(action: Action): action is SetSynthesisOptionsAction {
        return action.kind === SetSynthesisOptionsAction.KIND;
    }
}

/** Contains storage option values. Is sent between webview and extension. */
export interface UpdateStorageAction extends Action {
    kind: typeof UpdateStorageAction.KIND;
    group: string;
    options: Record<string, any>;
}

export namespace UpdateStorageAction {
    export const KIND = "updateStorage";

    export function create(group: string, options: Record<string, any>): UpdateStorageAction {
        return {
            kind: KIND,
            group,
            options,
        };
    }

    export function isThisAction(action: Action): action is UpdateStorageAction {
        return action.kind === UpdateStorageAction.KIND;
    }
}
