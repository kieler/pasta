/*
 * KIELER - Kiel Integrated Environment for Layout Eclipse RichClient
 *
 * http://rtsys.informatik.uni-kiel.de/kieler
 *
 * Copyright 2021-2023 by
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

import { SEdgeImpl, SModelElementImpl, SNodeImpl } from "sprotty";
import { PORT_TYPE, PastaPort, PortSide, STPAAspect, STPAEdge, STPANode, STPA_EDGE_TYPE, STPA_INTERMEDIATE_EDGE_TYPE, STPA_NODE_TYPE } from "./stpa-model";


/**
 * Function for getting all STPANodes in a relationship graph.
 * @param target The target node, which is part of the STPA model.
 * @returns All STPANodes of a present relationship graph.
 */
export function getAllRelationshipGraphNodes(target: SModelElementImpl): STPANode[] {
    const allNodes: STPANode[] = [];

    collectAllChildren(target.root.children as SNodeImpl[], allNodes as SNodeImpl[]);
    // Filter for STPA nodes only
    return allNodes.filter(node => node.type === STPA_NODE_TYPE) as STPANode[];
}

/**
 * Collects all children of the nodes in {@code nodes}.
 * @param nodes The nodes, which children should be selected.
 * @param children List that is filled by this method with the childrens of {@code nodes}.
 */
export function collectAllChildren(nodes: SNodeImpl[], children: SNodeImpl[]): void {
    for (const node of nodes) {
        if (node.children.length !== 0) {
            const childrenNodes = node.children.filter(child => child.type.startsWith('node')) as SNodeImpl[];
            children.push(...childrenNodes);
            collectAllChildren(childrenNodes, children);
        }
    }
}

/**
 * Gets the nodes and egde connected to {@code node} that should be highlighted.
 * @param node The node for which the connected elements should be determined.
 * @returns The highlighted nodes.
 */
export function getConnectedElements(node: SNodeImpl): (STPANode | STPAEdge)[] {
    const elements: (STPANode | STPAEdge)[] = [];
    elements.push(node as STPANode);
    // getting four sub components
    gettingOutgoingForSubcomponents(node as STPANode, elements);
    // to find the connected edges and nodes of the selected node, the ports are inspected
    for (const port of node.children.filter(child => child.type === PORT_TYPE)) {
        // the edges for a port are defined in the parent node
        // hence we have to search in the children of the parent node
        for (const child of node.parent.children) {
            if ((node as STPANode).aspect === STPAAspect.SYSTEMCONSTRAINT && (node.parent as STPANode).aspect !== STPAAspect.SYSTEMCONSTRAINT) {
                // for the top system constraint node the intermediate outoging edges should not be highlighted
                if (child.type === STPA_EDGE_TYPE) {
                    getIncomingEdges(child as STPAEdge, port as PastaPort, elements);
                    getOutgoingEdges(child as STPAEdge, port as PastaPort, elements);
                }
            } else if (child.type === STPA_INTERMEDIATE_EDGE_TYPE) {
                // the intermediate edges should in general only be highlighted when they are outgoing edges
                getOutgoingEdges(child as STPAEdge, port as PastaPort, elements);
            } else if (child.type === STPA_EDGE_TYPE) {
                // get incoming and outgoing edges
                getIncomingEdges(child as STPAEdge, port as PastaPort, elements);
                getOutgoingEdges(child as STPAEdge, port as PastaPort, elements);
            }
        }
    }
    return elements;
}

/**
 * Gets the predecessor nodes and edges based on the {@code edge} that should be highlighted.
 * @param edge The edge which source and further predecessors should be inspected.
 */
function getPredNodes(edge: SEdgeImpl, elements: SModelElementImpl[]): void {
    const node = edge.source?.type.startsWith('port') ? edge.source.parent as SNodeImpl : edge.source as SNodeImpl;
    elements.push(node as STPANode);
    if (isSubConstraint(node)) {
        getSubConsParent(node as STPANode, elements);
    }
    // get subhazards and their incoming edges
    if (node.type === STPA_NODE_TYPE && (node as STPANode).aspect === STPAAspect.HAZARD) {
        const subHazards = node.children.filter(child => child.type === STPA_NODE_TYPE) as STPANode[];
        for (const subH of subHazards) {
            elements.push(subH);
            for (const port of subH.children.filter(child => child.type === PORT_TYPE && (child as PastaPort).side === PortSide.SOUTH)) {
                for (const child of subH.parent.children) {
                    if (child.type.startsWith('edge:stpa')) {
                        getIncomingEdges(child as STPAEdge, port as PastaPort, elements);
                    }
                }
            }
        }
    }
    // get incoming edges from node by going over the ports
    for (const port of node.children.filter(child => child.type === PORT_TYPE && (child as PastaPort).side === PortSide.SOUTH)) {
        for (const child of node.parent.children) {
            if (child.type.startsWith('edge:stpa')) {
                getIncomingEdges(child as STPAEdge, port as PastaPort, elements);
            }
        }
    }
}

/**
 * Gets nodes and edges based on the {@code edge} that should be highlighted.
 * @param edge The edge which target and further successors should be inspected.
 */
function getSuccNodes(edge: SEdgeImpl, elements: SModelElementImpl[]): void {
    const node = edge.target?.type.startsWith('port') ? edge.target.parent as STPANode : edge.target as STPANode;
    elements.push(node);
    gettingOutgoingForSubcomponents(node, elements);
    // get outgoing edges from node by going over the ports
    for (const port of node.children.filter(child => child.type === PORT_TYPE && (child as PastaPort).side === PortSide.NORTH)) {
        for (const child of node.parent.children) {
            if (child.type.startsWith('edge:stpa')) {
                getOutgoingEdges(child as STPAEdge, port as PastaPort, elements);
            }
        }
    }
}

/**
 * Get parents and their outgoing edges of {@code node} for highlighting.
 * @param node The subcomponent node.
 * @param elements The elements to be highlighted.
 */
function gettingOutgoingForSubcomponents(node: STPANode, elements: SModelElementImpl[]): void {
    // for sub-systemconstraints the parent node(s) should be highlighted as well
    if (isSubConstraint(node)) {
        getSubConsParent(node, elements); // TODO: maybe change in the future, so that it works for all hierachy levels
    }
    // for sub-hazards the parent node(s) and its outgoing edges should be highlighted as well
    if (isSubHazard(node)) {
        gettingOutgoingForSubcomponents(node.parent as STPANode, elements);
        elements.push(node.parent as STPANode);
        for (const port of (node.parent as STPANode).children.filter(child => child.type === PORT_TYPE && (child as PastaPort).side === PortSide.NORTH)) {
            for (const child of (node.parent as STPANode).parent.children) {
                if (child.type.startsWith('edge:stpa')) {
                    getOutgoingEdges(child as STPAEdge, port as PastaPort, elements);
                }
            }
        }
    }
}

/**
 * Gets the {@code edge}, its source node, and further predecessors if {@code edge} starts in {@code port}.
 * @param edge The edge which target and further successors should be inspected.
 * @param port The port which is checked to be the source of the {@code edge}.
 * @param elements The elements which should be highlighted.
 */
function getIncomingEdges(edge: STPAEdge, port: PastaPort, elements: SModelElementImpl[]): void {
    if (edge.targetId === port.id) {
        // if the edge leads to another edge, highlight all connected edges
        let furtherEdge: STPAEdge | undefined = edge;
        while (furtherEdge) {
            edge = furtherEdge;
            elements.push(edge);
            furtherEdge = (edge.parent as STPANode).parent.children.find(child => child.type.startsWith('edge:stpa') && (child as STPAEdge).targetId === edge.sourceId) as STPAEdge;
        }
        // get the predecessor nodes
        getPredNodes(edge, elements);
    }
}

/**
 * Gets the {@code edge}, its target node, and further succesors if {@code edge} starts in {@code port}.
 * @param edge The edge which target and further successors should be inspected.
 * @param port The port which is checked to be the source of the {@code edge}.
 * @param elements The elements which should be highlighted.
 */
function getOutgoingEdges(edge: STPAEdge, port: PastaPort, elements: SModelElementImpl[]): void {
    if (edge.sourceId === port.id) {
        // if the edge leads to another edge, highlight all connected edges
        let furtherEdge: STPAEdge | undefined = edge;
        while (furtherEdge) {
            edge = furtherEdge;
            elements.push(edge);
            if ((edge.parent as STPANode).aspect === STPAAspect.SYSTEMCONSTRAINT) {
                furtherEdge = (edge.parent as STPANode).parent.children.find(child => child.type.startsWith('edge:stpa') && (child as STPAEdge).sourceId === edge.targetId) as STPAEdge;
            } else {
                furtherEdge = edge.target?.parent.children.find(child => child.type.startsWith('edge:stpa') && (child as STPAEdge).sourceId === edge.targetId) as STPAEdge;
            }
        }
        // get successor nodes
        getSuccNodes(edge, elements);
    }
}

/**
 * Determines if {@code node} is a sub-hazard.
 * @param node The SNode that should be inspected.
 * @returns whether {@code node} is a sub-hazard.
 */
function isSubHazard(node: SNodeImpl): boolean {
    return node.type === STPA_NODE_TYPE && (node as STPANode).aspect === STPAAspect.HAZARD
        && node.parent.type === STPA_NODE_TYPE && (node.parent as STPANode).aspect === STPAAspect.HAZARD;
}

/**
 * Determines if {@code node} is a sub-constraint.
 * @param node The SNode that should be inspected.
 * @returns whether {@code node} is a sub-constraint.
 */
function isSubConstraint(node: SNodeImpl): boolean {
    return node.type === STPA_NODE_TYPE && (node as STPANode).aspect === STPAAspect.SYSTEMCONSTRAINT
        && node.parent.type === STPA_NODE_TYPE && (node.parent as STPANode).aspect === STPAAspect.SYSTEMCONSTRAINT;
}

/**
 * Gets the parents of the system constraint {@code node} that should be highlighted.
 * @param node The node, which parents should be added.
 */
function getSubConsParent(node: STPANode, elements: SModelElementImpl[]): void {
    let parent = node;
    while (parent.parent.type === STPA_NODE_TYPE && (parent.parent as STPANode).aspect === STPAAspect.SYSTEMCONSTRAINT) {
        parent = parent.parent as STPANode;
        elements.push(parent);
    }
}

/**
 * Gets all nodes that have the same aspect as {@code selected} and are at the same hierarchy level that should be highlighted.
 * @param selected The node that determines the aspect that should be highlighted.
 * @returns The highlighted ndoes.
 */
export function getSameAspect(selected: STPANode): STPANode[] {
    const elements: STPANode[] = [];
    const allNodes: STPANode[] = [];
    collectAllChildren((selected.parent as SNodeImpl).parent.children as SNodeImpl[], allNodes);
    allNodes.forEach(node => {
        if (node.aspect === selected.aspect) {
            elements.push(node);
        }
    });
    // if the selected node is a sub-hazard or -sysconstraint, the parent should be highlighted too
    if (selected.parent.type === STPA_NODE_TYPE && ((selected.parent as STPANode).aspect === STPAAspect.HAZARD || (selected.parent as STPANode).aspect === STPAAspect.SYSTEMCONSTRAINT)) {
        elements.push(selected.parent as STPANode);
    }
    return elements;
}
