/*
 * KIELER - Kiel Integrated Environment for Layout Eclipse RichClient
 *
 * http://rtsys.informatik.uni-kiel.de/kieler
 *
 * Copyright 2023 by
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

import { Action, JsonMap, RequestAction, generateRequestId, ResponseAction } from "sprotty-protocol";

/** Send to server to generate SVGs for the STPA result report */
export interface GenerateSVGsAction extends Action {
    kind: typeof GenerateSVGsAction.KIND
    uri: string
    options?: JsonMap;
}

export namespace GenerateSVGsAction {
    export const KIND = "generateSVGs";
    

    export function create(
        uri: string,
        options?: JsonMap
    ): GenerateSVGsAction {
        return {
            kind: KIND,
            uri,
            options
        };
    }

    export function isThisAction(action: Action): action is GenerateSVGsAction {
        return action.kind === GenerateSVGsAction.KIND;
    }
}

/** Requests the current SVG from the client. */
export interface RequestSvgAction extends RequestAction<SvgAction> {
    kind: typeof RequestSvgAction.KIND
}

export namespace RequestSvgAction {
    export const KIND = 'requestSvg';

    export function create(): RequestSvgAction {
        return {
            kind: KIND,
            requestId: generateRequestId()
        };
    }
}

/** Send from client to server containing the requested SVG and its width. */
export interface SvgAction extends ResponseAction {
    kind: typeof SvgAction.KIND;
    svg: string
    width: number
    responseId: string
}
export namespace SvgAction {
    export const KIND = 'svg';

    export function create(svg: string, width: number, requestId: string): SvgAction {
        return {
            kind: KIND,
            svg,
            width,
            responseId: requestId
        };
    }
}

/** Send to server to update the diagram. */
export interface UpdateDiagramAction extends Action {
    kind: typeof UpdateDiagramAction.KIND
    options?: JsonMap;
}

export namespace UpdateDiagramAction {
    export const KIND = "updateDiagram";
    

    export function create(
        options?: JsonMap
    ): UpdateDiagramAction {
        return {
            kind: KIND,
            options
        };
    }

    export function isThisAction(action: Action): action is UpdateDiagramAction {
        return action.kind === UpdateDiagramAction.KIND;
    }
}

/** Triggers a diagram/view update on highlight. */
export interface HighlightUpdateAction extends Action {
    kind: typeof HighlightUpdateAction.KIND;
    highlightedIds: string[];
}

export namespace HighlightUpdateAction {
    export const KIND = "highlightUpdate";

    export function create(highlightedIds: string[]): HighlightUpdateAction {
        return {
            kind: KIND,
            highlightedIds,
        };
    }

    export function isThisAction(action: Action): action is HighlightUpdateAction {
        return action.kind === HighlightUpdateAction.KIND;
    }
}