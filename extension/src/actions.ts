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

import { Action, JsonMap } from "sprotty-protocol";
import { ContextTableData } from "./utils-classes";

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

/** Send to server to generate SVGs for the STPA result report */
export interface GenerateSVGsAction extends Action {
    kind: typeof GenerateSVGsAction.KIND;
    uri: string;
    options?: JsonMap;
}

export namespace GenerateSVGsAction {
    export const KIND = "generateSVGs";

    export function create(uri: string, options?: JsonMap): GenerateSVGsAction {
        return {
            kind: KIND,
            uri,
            options,
        };
    }

    export function isThisAction(action: Action): action is GenerateSVGsAction {
        return action.kind === GenerateSVGsAction.KIND;
    }
}

/** Send from client to server to start a cut set analysis with the start node given by the startId */
export interface CutSetAnalysisAction extends Action {
    kind: typeof CutSetAnalysisAction.KIND;
    startId: string;
}
export namespace CutSetAnalysisAction {
    export const KIND = "cutSetAnalysis";

    export function create(startId: string): CutSetAnalysisAction {
        return {
            kind: KIND,
            startId,
        };
    }
}

/** Send from client to server to start a minimal cut set analysis with the start node given by the startId */
export interface MinimalCutSetAnalysisAction extends Action {
    kind: typeof MinimalCutSetAnalysisAction.KIND;
    startId: string;
}
export namespace MinimalCutSetAnalysisAction {
    export const KIND = "minimalCutSetAnalysis";

    export function create(startId: string): MinimalCutSetAnalysisAction {
        return {
            kind: KIND,
            startId,
        };
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

/** Send to server to update the diagram. */
export interface UpdateDiagramAction extends Action {
    kind: typeof UpdateDiagramAction.KIND;
    options?: JsonMap;
}

export namespace UpdateDiagramAction {
    export const KIND = "updateDiagram";

    export function create(options?: JsonMap): UpdateDiagramAction {
        return {
            kind: KIND,
            options,
        };
    }

    export function isThisAction(action: Action): action is UpdateDiagramAction {
        return action.kind === UpdateDiagramAction.KIND;
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

/** Adds a row to the table. */
export interface SendContextTableDataAction extends Action {
    kind: typeof SendContextTableDataAction.KIND;
    data: ContextTableData;
}

export namespace SendContextTableDataAction {
    export const KIND = "sendContextTableData";

    export function create(data: ContextTableData): SendContextTableDataAction {
        return {
            kind: SendContextTableDataAction.KIND,
            data,
        };
    }

    export function isThisAction(action: Action): action is SendContextTableDataAction {
        return action.kind === SendContextTableDataAction.KIND;
    }
}
