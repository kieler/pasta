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

// The types of diagram elements
export const STPA_NODE_TYPE = 'node:stpa';
export const PARENT_TYPE= 'node:parent';
export const CS_NODE_TYPE = 'node:cs';
export const CS_INVISIBLE_SUBCOMPONENT_TYPE = 'node:invisibleSubcomponent';
export const PROCESS_MODEL_PARENT_NODE_TYPE = 'node:processModelParent';
export const DUMMY_NODE_TYPE = 'node:dummy';
export const EDGE_TYPE = 'edge';
export const CS_EDGE_TYPE = 'edge:controlStructure';
export const CS_INTERMEDIATE_EDGE_TYPE = 'edge:cs-intermediate';
export const STPA_EDGE_TYPE = 'edge:stpa';
export const STPA_INTERMEDIATE_EDGE_TYPE = 'edge:stpa-intermediate';
export const PORT_TYPE = 'port:pasta';
export const HEADER_LABEL_TYPE = 'label:header';
export const PASTA_LABEL_TYPE = 'label';
export const EDGE_LABEL_TYPE = 'label:xref';

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
    UNDEFINED
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
    UNDEFINED
}

/** Possible sides for a port. */
export enum PortSide {
    WEST,
    EAST,
    NORTH,
    SOUTH
}