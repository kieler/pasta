/*
 * KIELER - Kiel Integrated Environment for Layout Eclipse RichClient
 *
 * http://rtsys.informatik.uni-kiel.de/kieler
 *
 * Copyright 2024 by
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

import { AstNode } from "langium";
import { IdCache } from "langium-sprotty";
import { SLabel, SModelElement } from "sprotty-protocol";
import { getDescription } from "../../utils.js";
import { CSEdge, CSNode, PastaPort, STPAEdge, STPANode } from "./stpa-interfaces.js";
import {
    DUMMY_NODE_TYPE,
    EDGE_LABEL_TYPE,
    EdgeType,
    HEADER_LABEL_TYPE,
    PORT_TYPE,
    PortSide,
    STPAAspect,
    STPA_NODE_TYPE,
} from "./stpa-model.js";
import { StpaSynthesisOptions } from "./stpa-synthesis-options.js";
import { getAspect } from "./utils.js";

/**
 * Creates an STPANode.
 * @param node The AstNode for which the STPANode should be created.
 * @param nodeId The ID of the STPANode.
 * @param lvl The hierarchy level of the STPANode.
 * @param children The children of the STPANode.
 * @returns an STPANode.
 */
export function createSTPANode(
    node: AstNode,
    nodeId: string,
    lvl: number,
    description: string,
    children: SModelElement[],
    options: StpaSynthesisOptions
): STPANode {
    return {
        type: STPA_NODE_TYPE,
        id: nodeId,
        aspect: getAspect(node),
        description: description,
        hierarchyLvl: lvl,
        children: children,
        layout: "stack",
        layoutOptions: {
            paddingTop: 10.0,
            paddingBottom: 10.0,
            paddingLeft: 10.0,
            paddingRight: 10.0,
        },
        modelOrder: options.getModelOrder(),
    };
}

/**
 * Creates a port.
 * @param id The ID of the port.
 * @param side The side of the port.
 * @returns a port.
 */
export function createPort(id: string, side: PortSide, assocEdge?: { node1: string; node2: string }): PastaPort {
    return {
        type: PORT_TYPE,
        id: id,
        side: side,
        size: {width: 1, height: 1},
        associatedEdge: assocEdge,
    };
}

/**
 * Creates an STPAEdge.
 * @param id The ID of the edge.
 * @param sourceId The ID of the source of the edge.
 * @param targetId The ID of the target of the edge.
 * @param children The children of the edge.
 * @param type The type of the edge.
 * @param aspect The aspect of the edge.
 * @returns an STPAEdge.
 */
export function createSTPAEdge(
    id: string,
    sourceId: string,
    targetId: string,
    children: SModelElement[],
    type: string,
    aspect: STPAAspect
): STPAEdge {
    return {
        type: type,
        id: id,
        sourceId: sourceId,
        targetId: targetId,
        children: children,
        aspect: aspect,
    };
}

/**
 * Creates a control structure edge based on the given arguments.
 * @param edgeId The ID of the edge that should be created.
 * @param sourceId The ID of the source of the edge.
 * @param targetId The ID of the target of the edge.
 * @param label The labels of the edge.
 * @param edgeType The type of the edge (control action or feedback edge).
 * @param idCache The ID cache of the STPA model.
 * @returns A control structure edge.
 */
export function createControlStructureEdge(
    edgeId: string,
    sourceId: string,
    targetId: string,
    label: string[],
    edgeType: EdgeType,
    sedgeType: string,
    idCache: IdCache<AstNode>,
    dummyLabel: boolean = true
): CSEdge {
    return {
        type: sedgeType,
        id: edgeId,
        sourceId: sourceId!,
        targetId: targetId!,
        edgeType: edgeType,
        children: createLabel(label, edgeId, idCache, EDGE_LABEL_TYPE, dummyLabel),
    };
}

/**
 * Generates SLabel elements for the given {@code label}.
 * @param label Labels to translate to SLabel elements.
 * @param id The ID of the element for which the label should be generated.
 * @param idCache The ID cache of the STPA model.
 * @param type The type of the label.
 * @param dummyLabel Determines whether a dummy label should be created to get a correct layout.
 * @returns SLabel elements representing {@code label}.
 */
export function createLabel(
    label: string[],
    id: string,
    idCache: IdCache<AstNode>,
    type: string,
    dummyLabel: boolean = true
): SLabel[] {
    const children: SLabel[] = [];
    if (label.find(l => l !== "")) {
        label.forEach(l => {
            children.push({
                type: type,
                id: idCache.uniqueId(id + "_label"),
                text: l,
            } as SLabel);
        });
    } else if (dummyLabel) {
        // needed for correct layout
        children.push({
            type: type,
            id: idCache.uniqueId(id + "_label"),
            text: " ",
        } as SLabel);
    }
    return children;
}

/**
 * Creates a dummy node.
 * @param idCache The ID cache of the STPA model.
 * @param level The level of the dummy node.
 * @returns a dummy node.
 */
export function createDummyNode(name: string, level: number | undefined, idCache: IdCache<AstNode>): CSNode {
    const dummyNode: CSNode = {
        type: DUMMY_NODE_TYPE,
        id: idCache.uniqueId("dummy" + name),
        layout: "stack",
        hasChildren: false,
        expanded: false,
        layoutOptions: {
            paddingTop: 10.0,
            paddingBottom: 10.0,
            paddngLeft: 10.0,
            paddingRight: 10.0,
        },
    };
    if (level) {
        dummyNode.level = level;
    }
    return dummyNode;
}

/**
 * Generates the labels for the given node based on {@code showDescription} and the label synthesis options.
 * @param showDescription Determines whether the description should be shown.
 * @param nodeId The ID of the node for which the labels should be generated.
 * @param nodeName The name of the node for which the labels should be generated.
 * @param idCache The ID cache of the STPA model.
 * @param nodeDescription The description of the node for which the labels should be generated.
 * @returns the labels for the given node.
 */
export function generateDescriptionLabels(
    showDescription: boolean,
    nodeId: string,
    nodeName: string,
    options: StpaSynthesisOptions,
    idCache: IdCache<AstNode>,
    nodeDescription?: string
): SModelElement[] {
    let children: SModelElement[] = [];
    if (nodeDescription && showDescription) {
        children = getDescription(
            nodeDescription ?? "",
            options.getLabelManagement(),
            options.getLabelShorteningWidth(),
            nodeId,
            idCache
        );
    }

    // show the name in the top line
    children.push(<SLabel>{
        type: showDescription ? HEADER_LABEL_TYPE : "label",
        id: idCache.uniqueId(nodeId + "_label"),
        text: nodeName,
    });
    return children;
}
