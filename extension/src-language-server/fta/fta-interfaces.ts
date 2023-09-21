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

import { SEdge, SNode } from "sprotty-protocol";
import { FTNodeType } from "./fta-model";


/**
 * Node representing a FTA component.
 */
export interface FTANode extends SNode{
    nodeType: FTNodeType,
    description: string
    highlight?: boolean
    k?: number
    n?: number

}

/**
 * Edge representing an edge in the fault Tree.
 */
export interface FTAEdge extends SEdge {
    highlight?: boolean
}