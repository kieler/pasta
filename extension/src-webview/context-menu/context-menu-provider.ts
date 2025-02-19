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

import { injectable } from "inversify";
import { IContextMenuItemProvider, LabeledAction, SModelRootImpl } from "sprotty";
import { Point } from "sprotty-protocol";
import { CutSetAnalysisAction, MinimalCutSetAnalysisAction } from "../actions";
import { FTANode, FTA_GRAPH_TYPE, FTA_NODE_TYPE } from "../fta/fta-model";

@injectable()
export class ContextMenuProvider implements IContextMenuItemProvider {
    getItems(root: Readonly<SModelRootImpl>, _lastMousePosition?: Point): Promise<LabeledAction[]> {
        if (root.type === FTA_GRAPH_TYPE) {
            // find node that was clicked on
            let clickedNode: FTANode | undefined;
            root.children.forEach((child) => {
                if (child.type === FTA_NODE_TYPE) {
                    if ((child as FTANode).selected) {
                        clickedNode = child as FTANode;
                    } else {
                        const children = child.children.filter((child) => child.type === FTA_NODE_TYPE);
                        const selectedChild = children.find(child => (child as FTANode).selected);
                        if (selectedChild) {
                            clickedNode = selectedChild as FTANode;
                        }
                    }
                }
            });
            // create context menu items
            return Promise.resolve([
                {
                    label: "Cut Set Analysis",
                    actions: [{ kind: "cutSetAnalysis", startId: clickedNode?.id } as CutSetAnalysisAction],
                } as LabeledAction,
                {
                    label: "Minimal Cut Set Analysis",
                    actions: [{ kind: "minimalCutSetAnalysis", startId: clickedNode?.id} as MinimalCutSetAnalysisAction]
                } as LabeledAction
            ]);
        } else {
            return Promise.resolve([]);
        }
    }
}
