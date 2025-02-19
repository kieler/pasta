/*
 * KIELER - Kiel Integrated Environment for Layout Eclipse RichClient
 *
 * http://rtsys.informatik.uni-kiel.de/kieler
 *
 * Copyright 2021-2024 by
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

import { Point, SEdge, SNode, SPort } from "sprotty-protocol";
import { EdgeType, PortSide, STPAAspect } from "./stpa-model.js";

export interface ParentNode extends SNode {
    modelOrder: boolean;
}

/**
 * Node representing a STPA component.
 */
export interface STPANode extends SNode {
    aspect: STPAAspect;
    description: string;
    hierarchyLvl: number;
    highlight?: boolean;
    level?: number;
    controlAction?: string;
    modelOrder?: boolean;
}

/**
 * Edge representing an edge in the relationship graph.
 */
export interface STPAEdge extends SEdge {
    aspect: STPAAspect;
    highlight?: boolean;
    junctionPoints?: Point[];
}

/** Port representing a port in the STPA graph. */
export interface PastaPort extends SPort {
    side?: PortSide;
    /** Saves start and end of the edge for which the port was created. Needed to sort the ports based on their associacted edges. */
    associatedEdge?: { node1: string; node2: string };
}

/**
 * Node representing a system component in the control structure.
 */
export interface CSNode extends SNode {
    level?: number;
    hasMissingFeedback?: boolean;
    hasChildren: boolean;
    expanded: boolean;
}

/**
 * Edge representing control actions and feedback in the control structure.
 */
export interface CSEdge extends SEdge {
    edgeType: EdgeType;
}
