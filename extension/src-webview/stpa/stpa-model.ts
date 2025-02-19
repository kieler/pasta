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

import { SEdgeImpl, SLabelImpl, SNodeImpl, SPortImpl, alignFeature, boundsFeature, connectableFeature, fadeFeature, layoutContainerFeature, layoutableChildFeature, selectFeature, expandFeature } from "sprotty";
import { EdgePlacement, Point } from "sprotty-protocol";

// The types of diagram elements
export const STPA_NODE_TYPE = 'node:stpa';
export const PARENT_TYPE = 'node:parent';
export const CS_NODE_TYPE = 'node:cs';
export const CS_INVISIBLE_SUBCOMPONENT_TYPE = 'node:invisibleSubcomponent';
export const PROCESS_MODEL_PARENT_NODE_TYPE = 'node:processModelParent';
export const DUMMY_NODE_TYPE = 'node:dummy';
export const EDGE_TYPE = 'edge';
export const CS_EDGE_TYPE = 'edge:controlStructure';
export const STPA_EDGE_TYPE = 'edge:stpa';
export const STPA_INTERMEDIATE_EDGE_TYPE = 'edge:stpa-intermediate';
export const CS_INTERMEDIATE_EDGE_TYPE = 'edge:cs-intermediate';
export const PORT_TYPE = 'port:pasta';
export const HEADER_LABEL_TYPE = 'label:header';
export const PASTA_LABEL_TYPE = 'label';
export const EDGE_LABEL_TYPE = 'label:xref';

export class ParentNode extends SNodeImpl {
    modelOrder: boolean;
    static readonly DEFAULT_FEATURES = [connectableFeature, selectFeature, layoutContainerFeature, fadeFeature];
}

/**
 * Node representing an STPA component.
 */
export class STPANode extends SNodeImpl {
    static readonly DEFAULT_FEATURES = [connectableFeature, selectFeature, layoutContainerFeature, fadeFeature];

    aspect: STPAAspect = STPAAspect.UNDEFINED;
    description: string = "";
    hierarchyLvl: number = 0;
    highlight?: boolean;
    level?: number;
    controlAction?: string;
    modelOrder?: boolean;
}

/**
 * Edge representing an edge in the relationship graph.
 */
export class STPAEdge extends SEdgeImpl {
    aspect: STPAAspect = STPAAspect.UNDEFINED;
    highlight?: boolean;
    junctionPoints?: Point[];
    static readonly DEFAULT_FEATURES = [fadeFeature];
}

/** Port representing a port in the STPA graph. */
export class PastaPort extends SPortImpl {
    side?: PortSide;
    /** Saves start and end of the edge for which the port was created. Needed to sort the ports based on their associacted edges. */
    associatedEdge?: { node1: string; node2: string };
}

/**
 * Node representing a system component in the control structure.
 */
export class CSNode extends SNodeImpl {
    level?: number;
    hasMissingFeedback?: boolean;
    hasChildren: boolean;
    expanded: boolean;
    static readonly DEFAULT_FEATURES = [connectableFeature, selectFeature, layoutContainerFeature, fadeFeature, expandFeature];
}

/**
 * Edge representing control actions and feedback in the control structure.
 */
export class CSEdge extends SEdgeImpl {
    edgeType: EdgeType = EdgeType.UNDEFINED;
    static readonly DEFAULT_FEATURES = [fadeFeature];
}

export class EdgeLabel extends SLabelImpl {
    // alignFeature is not used here, otherwise multiple labels for one edge would be placed on top of each other
    static readonly DEFAULT_FEATURES = [boundsFeature, alignFeature, layoutableChildFeature, fadeFeature];
    
    override edgePlacement = <EdgePlacement> {
        rotate: false,
        side: "on",
    };
}

/**
 * The different aspects of STPA.
 */
export enum STPAAspect {
    LOSS,
    HAZARD,
    SYSTEMCONSTRAINT,
    RESPONSIBILITY,
    UCA,
    CONTROLLERCONSTRAINT,
    SCENARIO,
    SAFETYREQUIREMENT,
    UNDEFINED,
}

/**
 * Possible edge types.
 */
export enum EdgeType {
    CONTROL_ACTION,
    FEEDBACK,
    MISSING_FEEDBACK,
    INPUT,
    OUTPUT,
    UNDEFINED,
}

/** Possible sides for a port. */
export enum PortSide {
    WEST,
    EAST,
    NORTH,
    SOUTH,
}
