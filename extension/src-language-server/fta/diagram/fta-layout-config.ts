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

import { LayoutOptions } from "elkjs";
import { DefaultLayoutConfigurator } from "sprotty-elk/lib/elk-layout.js";
import { SModelIndex, SNode } from "sprotty-protocol";
import { FTAGraph, FTANode, FTAPort } from "./fta-interfaces.js";
import { FTA_DESCRIPTION_NODE_TYPE, FTA_NODE_TYPE, FTA_PORT_TYPE, FTNodeType, PortSide } from "./fta-model.js";

export class FtaLayoutConfigurator extends DefaultLayoutConfigurator {
    protected graphOptions(sgraph: FTAGraph, _index: SModelIndex): LayoutOptions {
        const options: LayoutOptions = {
            "org.eclipse.elk.direction": "DOWN",
            "org.eclipse.elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
            "org.eclipse.elk.portConstraints": "FIXED_SIDE",
            "org.eclipse.elk.spacing.portPort": "0.0",
            "org.eclipse.elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
        };

        if (sgraph.modelOrder) {
            options["org.eclipse.elk.layered.considerModelOrder.strategy"] = "NODES_AND_EDGES";
            options["org.eclipse.elk.layered.crossingMinimization.forceNodeModelOrder"] = "true";
            options["org.eclipse.elk.separateConnectedComponents"] = "false";
        }
        return options;
    }

    protected nodeOptions(snode: SNode, _index: SModelIndex): LayoutOptions | undefined {
        const options: LayoutOptions = {
            "org.eclipse.elk.portConstraints": "FIXED_SIDE",
            "org.eclipse.elk.spacing.portPort": "0.0",
            "org.eclipse.elk.nodeLabels.placement": "INSIDE V_CENTER H_CENTER",
        };
        switch (snode.type) {
            case FTA_NODE_TYPE:
                switch ((snode as FTANode).nodeType) {
                    case FTNodeType.PARENT:
                        options["org.eclipse.elk.direction"] = "DOWN";
                        options["org.eclipse.elk.padding"] = "[top=0.0,left=0.0,bottom=10.0,right=0.0]";
                        options["org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers"] = "2";
                        break;
                    case FTNodeType.COMPONENT:
                    case FTNodeType.CONDITION:
                        options["org.eclipse.elk.nodeSize.constraints"] = "MINIMUM_SIZE, NODE_LABELS";
                        options["org.eclipse.elk.nodeSize.minimum"] = "(30, 30)";
                        options["org.eclipse.elk.spacing.labelNode"] = "20.0";
                        break;
                    case FTNodeType.AND:
                    case FTNodeType.OR:
                    case FTNodeType.KN:
                    case FTNodeType.INHIBIT:
                        options["org.eclipse.elk.nodeSize.constraints"] = "MINIMUM_SIZE";
                        options["org.eclipse.elk.nodeSize.minimum"] = "(32.34, 35)";
                        break;
                }
                break;
            case FTA_DESCRIPTION_NODE_TYPE:
                options["org.eclipse.elk.nodeSize.constraints"] = "NODE_LABELS";
                break;
        }
        return options;
    }

    protected portOptions(sport: FTAPort, _index: SModelIndex): LayoutOptions | undefined {
        if (sport.type === FTA_PORT_TYPE) {
            let side = "";
            if ((sport as FTAPort).side) {
                side = PortSide[(sport as FTAPort).side!].toUpperCase();
            }
            return {
                "org.eclipse.elk.port.side": side,
            };
        }
    }
}
