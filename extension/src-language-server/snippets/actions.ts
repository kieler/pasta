/*
 * KIELER - Kiel Integrated Environment for Layout Eclipse RichClient
 *
 * http://rtsys.informatik.uni-kiel.de/kieler
 *
 * Copyright 2022-2024 by
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

import { VNode } from "snabbdom";
import { Action, RequestAction, ResponseAction, generateRequestId } from "sprotty-protocol";
import { WebviewSnippet } from "./snippet-model.js";

/** Request message from the server to the client to get the svgs of the snippets. */
export interface RequestWebviewSnippetsAction extends RequestAction<SendWebviewSnippetsAction> {
    kind: typeof RequestWebviewSnippetsAction.KIND;
    snippets: WebviewSnippet[];
    clientId: string;
    requestId: string;
}

export namespace RequestWebviewSnippetsAction {
    export const KIND = "updateSnippets";

    export function create(snippets: WebviewSnippet[], clientId: string): RequestWebviewSnippetsAction {
        return {
            kind: KIND,
            snippets: snippets,
            clientId,
            requestId: generateRequestId(),
        };
    }

    export function isThisAction(action: Action): action is RequestWebviewSnippetsAction {
        return action.kind === RequestWebviewSnippetsAction.KIND;
    }
}

/** Message to the language server containing the svgs of the snippets. */
export interface SendWebviewSnippetsAction extends ResponseAction {
    kind: typeof SendWebviewSnippetsAction.KIND;
    snippets: VNode[];
    responseId: string;
}

export namespace SendWebviewSnippetsAction {
    export const KIND = "updateSnippets";

    export function create(snippets: VNode[], requestId: string = ""): SendWebviewSnippetsAction {
        return {
            kind: KIND,
            snippets: snippets,
            responseId: requestId,
        };
    }

    export function isThisAction(action: Action): action is SendWebviewSnippetsAction {
        return action.kind === SendWebviewSnippetsAction.KIND;
    }
}

/** Message to the language server to add definition of a selected snippet in the editor. */
export interface ExecuteSnippetAction extends Action {
    kind: typeof ExecuteSnippetAction.KIND;
    id: string;
}

export namespace ExecuteSnippetAction {
    export const KIND = "executeSnippet";

    export function create(id: string): ExecuteSnippetAction {
        return {
            kind: KIND,
            id,
        };
    }

    export function isThisAction(action: Action): action is ExecuteSnippetAction {
        return action.kind === ExecuteSnippetAction.KIND;
    }
}

/** Message from extension to langauge server containing the default snippets as string. */
export interface SendDefaultSnippetsAction extends Action {
    kind: typeof SendDefaultSnippetsAction.KIND;
    snippets: string[];
}

export namespace SendDefaultSnippetsAction {
    export const KIND = "sendSnippets";

    export function create(snippets: string[]): SendDefaultSnippetsAction {
        return {
            kind: KIND,
            snippets: snippets,
        };
    }

    export function isThisAction(action: Action): action is SendDefaultSnippetsAction {
        return action.kind === SendDefaultSnippetsAction.KIND;
    }
}

/** Message to the language server to add a snippet to the librabry. */
export interface AddSnippetAction extends Action {
    kind: typeof AddSnippetAction.KIND;
    text: string;
}

export namespace AddSnippetAction {
    export const KIND = "addSnippet";

    export function create(text: string): AddSnippetAction {
        return {
            kind: KIND,
            text,
        };
    }

    export function isThisAction(action: Action): action is AddSnippetAction {
        return action.kind === AddSnippetAction.KIND;
    }
}
