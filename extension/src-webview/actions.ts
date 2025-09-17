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

import { inject } from "inversify";
import { CommandExecutionContext, CommandResult, HiddenCommand, TYPES, isExportable, isHoverable, isSelectable, isViewport } from "sprotty";
import { Action, RequestAction, ResponseAction, generateRequestId } from "sprotty-protocol";


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

/** Command that is executed when SVG is requested by the server. */
export class SvgCommand extends HiddenCommand {
    static readonly KIND = RequestSvgAction.KIND;

    constructor(@inject(TYPES.Action) protected action: RequestSvgAction) {
        super();
    }

    /** Same functionality as for the default SVGCommand provided by Sprotty. */
    execute(context: CommandExecutionContext): CommandResult {
        if (isExportable(context.root)) {
            const root = context.modelFactory.createRoot(context.root);
            if (isExportable(root)) {
                if (isViewport(root)) {
                    root.zoom = 1;
                    root.scroll = { x: 0, y: 0 };
                }
                root.index.all().forEach(element => {
                    if (isSelectable(element) && element.selected)
                        {element.selected = false;}
                    if (isHoverable(element) && element.hoverFeedback)
                        {element.hoverFeedback = false;}
                });
                return {
                    model: root,
                    modelChanged: true,
                    cause: this.action
                };
            }
        }
        return {
            model: context.root,
            modelChanged: false
        };
    }
}

/** Send from client to server to start a cut set analysis with the start node given by the startId */
export interface CutSetAnalysisAction extends Action {
    kind: typeof CutSetAnalysisAction.KIND;
    startId: string
}
export namespace CutSetAnalysisAction {
    export const KIND = 'cutSetAnalysis';

    export function create(startId: string,): CutSetAnalysisAction {
        return {
            kind: KIND,
            startId,
        };
    }
}

/** Send from client to server to start a minimal cut set analysis with the start node given by the startId */
export interface MinimalCutSetAnalysisAction extends Action {
    kind: typeof MinimalCutSetAnalysisAction.KIND;
    startId: string
}
export namespace MinimalCutSetAnalysisAction {
    export const KIND = 'minimalCutSetAnalysis';

    export function create(startId: string,): MinimalCutSetAnalysisAction {
        return {
            kind: KIND,
            startId,
        };
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