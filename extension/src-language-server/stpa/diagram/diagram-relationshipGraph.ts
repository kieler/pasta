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
import { SModelElement, SNode } from "sprotty-protocol";
import { Hazard, Model, SystemConstraint, isContext, isHazard, isSystemConstraint, isUCA } from "../../generated/ast.js";
import { labelManagementValue } from "../../synthesis-options.js";
import { collectElementsWithSubComps, leafElement } from "../utils.js";
import { createLabel, createPort, createSTPAEdge, createSTPANode, generateDescriptionLabels } from "./diagram-elements.js";
import { CustomModel } from "./filtering.js";
import { ParentNode, STPAEdge, STPANode } from "./stpa-interfaces.js";
import {
    EDGE_LABEL_TYPE,
    PARENT_TYPE,
    PortSide,
    STPAAspect,
    STPA_EDGE_TYPE,
    STPA_INTERMEDIATE_EDGE_TYPE,
    STPA_NODE_TYPE,
} from "./stpa-model.js";
import { StpaSynthesisOptions, showLabelsValue } from "./stpa-synthesis-options.js";
import {
    createUCAContextDescription,
    getAspect,
    getAspectsThatShouldHaveDesriptions,
    getTargets,
    setLevelsForSTPANodes,
} from "./utils.js";

/**
 * Creates the relationship graph for the STPA model.
 * @param filteredModel The filtered STPA model.
 * @param model The STPA model.
 * @param idToSNode The map of the generated IDs to their generated SNodes.
 * @param options The synthesis options of the STPA model.
 * @param idCache The ID cache of the STPA model.
 * @returns the relationship graph for the STPA model.
 */
export function createRelationshipGraph(
    filteredModel: CustomModel,
    model: Model,
    idToSNode: Map<string, SNode>,
    options: StpaSynthesisOptions,
    idCache: IdCache<AstNode>
): ParentNode {
    const children = createRelationshipGraphChildren(filteredModel, model, idToSNode, options, idCache);

    // filtering the nodes of the STPA graph
    const stpaNodes: STPANode[] = [];
    for (const node of children ?? []) {
        if (node.type === STPA_NODE_TYPE) {
            stpaNodes.push(node as STPANode);
        }
    }
    // each node should be placed in a specific layer based on the aspect. therefore positions must be set
    setLevelsForSTPANodes(stpaNodes, options.getGroupingUCAs());

    return {
        type: PARENT_TYPE,
        id: "relationships",
        children: children,
        modelOrder: options.getModelOrder(),
    };
}

/**
 * Creates the children for the relationship graph.
 * @param filteredModel The filtered STPA model.
 * @param model The STPA model.
 * @param idToSNode The map of the generated IDs to their generated SNodes.
 * @param options The synthesis options of the STPA model.
 * @param idCache The ID cache of the STPA model.
 * @returns the children of the relationship graph.
 */
export function createRelationshipGraphChildren(
    filteredModel: CustomModel,
    model: Model,
    idToSNode: Map<string, SNode>,
    options: StpaSynthesisOptions,
    idCache: IdCache<AstNode>
): SModelElement[] {
    const showLabels = options.getShowLabels();
    const labelManagement = options.getLabelManagement();
    // aspects that should have a description when showLabel option is set to automatic
    const aspectsToShowDescriptions = getAspectsThatShouldHaveDesriptions(model);
    // determine the children for the STPA graph
    // for each component a node is generated with edges representing the references of the component
    // in order to be able to set the target IDs of the edges, the nodes must be created in the correct order
    const showLossLabel = showLabelOfAspect(STPAAspect.LOSS, aspectsToShowDescriptions, showLabels, labelManagement);
    let stpaChildren: SModelElement[] = filteredModel.losses?.map(l =>
        generateSTPANode(l, showLossLabel, idToSNode, options, idCache)
    );
    const showHazardDescription = showLabelOfAspect(
        STPAAspect.HAZARD,
        aspectsToShowDescriptions,
        showLabels,
        labelManagement
    );
    const showSystemConstraintDescription = showLabelOfAspect(
        STPAAspect.SYSTEMCONSTRAINT,
        aspectsToShowDescriptions,
        showLabels,
        labelManagement
    );
    // the hierarchy option determines whether subcomponents are contained in ther parent or not
    if (!options.getHierarchy()) {
        // subcomponents have edges to the parent
        const hazards = collectElementsWithSubComps(filteredModel.hazards);
        const sysCons = collectElementsWithSubComps(filteredModel.systemLevelConstraints);
        stpaChildren = stpaChildren?.concat([
            ...hazards
                .map(hazard => generateAspectWithEdges(hazard, showHazardDescription, idToSNode, options, idCache))
                .flat(1),
            ...sysCons
                .map(systemConstraint =>
                    generateAspectWithEdges(
                        systemConstraint,
                        showSystemConstraintDescription,
                        idToSNode,
                        options,
                        idCache
                    )
                )
                .flat(1),
        ]);
    } else {
        // subcomponents are contained in the parent
        stpaChildren = stpaChildren?.concat([
            ...filteredModel.hazards
                ?.map(hazard => generateAspectWithEdges(hazard, showHazardDescription, idToSNode, options, idCache))
                .flat(1),
            ...filteredModel.systemLevelConstraints
                ?.map(systemConstraint =>
                    generateAspectWithEdges(
                        systemConstraint,
                        showSystemConstraintDescription,
                        idToSNode,
                        options,
                        idCache
                    )
                )
                .flat(1),
            ...filteredModel.systemLevelConstraints
                ?.map(systemConstraint =>
                    systemConstraint.subComponents?.map(subsystemConstraint =>
                        generateEdgesForSTPANode(subsystemConstraint, undefined, idToSNode, options, idCache)
                    )
                )
                .flat(2),
        ]);
    }
    const showResponsibilitiesDescription = showLabelOfAspect(
        STPAAspect.RESPONSIBILITY,
        aspectsToShowDescriptions,
        showLabels,
        labelManagement
    );
    const showUCAsDescription = showLabelOfAspect(
        STPAAspect.UCA,
        aspectsToShowDescriptions,
        showLabels,
        labelManagement
    );
    const showControllerConstraintDescription = showLabelOfAspect(
        STPAAspect.CONTROLLERCONSTRAINT,
        aspectsToShowDescriptions,
        showLabels,
        labelManagement
    );
    const showScenarioDescription = showLabelOfAspect(
        STPAAspect.SCENARIO,
        aspectsToShowDescriptions,
        showLabels,
        labelManagement
    );
    const showSafetyConsDescription = showLabelOfAspect(
        STPAAspect.SAFETYREQUIREMENT,
        aspectsToShowDescriptions,
        showLabels,
        labelManagement
    );
    stpaChildren = stpaChildren?.concat([
        ...filteredModel.responsibilities
            ?.map(r =>
                r.responsiblitiesForOneSystem.map(resp =>
                    generateAspectWithEdges(resp, showResponsibilitiesDescription, idToSNode, options, idCache)
                )
            )
            .flat(2),
        ...filteredModel.allUCAs
            ?.map(sysUCA =>
                sysUCA.providingUcas
                    .concat(sysUCA.notProvidingUcas, sysUCA.wrongTimingUcas, sysUCA.continousUcas)
                    .map(uca => generateAspectWithEdges(uca, showUCAsDescription, idToSNode, options, idCache))
            )
            .flat(2),
        ...filteredModel.rules
            ?.map(rule =>
                rule.contexts.map(context =>
                    generateAspectWithEdges(context, showUCAsDescription, idToSNode, options, idCache)
                )
            )
            .flat(2),
        ...filteredModel.controllerConstraints
            ?.map(c => generateAspectWithEdges(c, showControllerConstraintDescription, idToSNode, options, idCache))
            .flat(1),
        ...filteredModel.scenarios
            ?.map(s => generateAspectWithEdges(s, showScenarioDescription, idToSNode, options, idCache))
            .flat(1),
        ...filteredModel.safetyCons
            ?.map(sr => generateAspectWithEdges(sr, showSafetyConsDescription, idToSNode, options, idCache))
            .flat(1),
    ]);
    return stpaChildren;
}

/**
 * Determines whether the label of the given {@code aspect} should be shown based on the given {@code showLabels} and {@code labelManagement}.
 * @param aspect The aspect for which the label should be shown.
 * @param aspectsToShowDescriptions The aspects that should have a description when the showLabel option is set to automatic.
 * @param showLabels The showLabel option of the STPA model.
 * @param labelManagement The labelManagement option of the STPA model.
 * @returns whether the label of the given {@code aspect} should be shown.
 */
function showLabelOfAspect(
    aspect: STPAAspect,
    aspectsToShowDescriptions: STPAAspect[],
    showLabels: showLabelsValue,
    labelManagement: labelManagementValue
): boolean {
    if (labelManagement === labelManagementValue.NO_LABELS) {
        return false;
    }
    if (showLabels === showLabelsValue.ALL) {
        return true;
    }
    switch (aspect) {
        case STPAAspect.LOSS:
            return (
                showLabels === showLabelsValue.LOSSES ||
                (showLabels === showLabelsValue.AUTOMATIC && aspectsToShowDescriptions.includes(STPAAspect.LOSS))
            );
        case STPAAspect.HAZARD:
            return (
                showLabels === showLabelsValue.HAZARDS ||
                (showLabels === showLabelsValue.AUTOMATIC && aspectsToShowDescriptions.includes(STPAAspect.HAZARD))
            );
        case STPAAspect.SYSTEMCONSTRAINT:
            return (
                showLabels === showLabelsValue.SYSTEM_CONSTRAINTS ||
                (showLabels === showLabelsValue.AUTOMATIC &&
                    aspectsToShowDescriptions.includes(STPAAspect.SYSTEMCONSTRAINT))
            );
        case STPAAspect.RESPONSIBILITY:
            return (
                showLabels === showLabelsValue.RESPONSIBILITIES ||
                (showLabels === showLabelsValue.AUTOMATIC &&
                    aspectsToShowDescriptions.includes(STPAAspect.RESPONSIBILITY))
            );
        case STPAAspect.UCA:
            return (
                showLabels === showLabelsValue.UCAS ||
                (showLabels === showLabelsValue.AUTOMATIC && aspectsToShowDescriptions.includes(STPAAspect.UCA))
            );
        case STPAAspect.CONTROLLERCONSTRAINT:
            return (
                showLabels === showLabelsValue.CONTROLLER_CONSTRAINTS ||
                (showLabels === showLabelsValue.AUTOMATIC &&
                    aspectsToShowDescriptions.includes(STPAAspect.CONTROLLERCONSTRAINT))
            );
        case STPAAspect.SCENARIO:
            return (
                showLabels === showLabelsValue.SCENARIOS ||
                (showLabels === showLabelsValue.AUTOMATIC && aspectsToShowDescriptions.includes(STPAAspect.SCENARIO))
            );
        case STPAAspect.SAFETYREQUIREMENT:
            return (
                showLabels === showLabelsValue.SAFETY_CONSTRAINTS ||
                (showLabels === showLabelsValue.AUTOMATIC &&
                    aspectsToShowDescriptions.includes(STPAAspect.SAFETYREQUIREMENT))
            );
    }
    return false;
}

/**
 * Generates a node and the edges for the given {@code node}.
 * @param node STPA component for which a node and edges should be generated.
 * @param idCache The ID cache of the STPA model.
 * @returns A node representing {@code node} and edges representing the references {@code node} contains.
 */
export function generateAspectWithEdges(
    node: leafElement,
    showDescription: boolean,
    idToSNode: Map<string, SNode>,
    options: StpaSynthesisOptions,
    idCache: IdCache<AstNode>
): SModelElement[] {
    // node must be created first in order to access the id when creating the edges
    const stpaNode = generateSTPANode(node, showDescription, idToSNode, options, idCache);
    // uca nodes need to save their control action in order to be able to group them by the actions
    if ((isUCA(node) || isContext(node)) && node.$container.system.ref) {
        stpaNode.controlAction = node.$container.system.ref.name + "." + node.$container.action.ref?.name;
    }

    let nodePort: SModelElement | undefined;
    if (options.getUseHyperEdges()) {
        const nodeId = idCache.getId(node);
        nodePort = createPort(idCache.uniqueId(nodeId + "_outPort"), PortSide.NORTH);
        stpaNode?.children?.push(nodePort);
    }

    const elements: SModelElement[] = generateEdgesForSTPANode(node, nodePort, idToSNode, options, idCache);
    elements.push(stpaNode);
    return elements;
}

/**
 * Generates a single STPANode for the given {@code node}.
 * @param node The STPA component the node should be created for.
 * @param idCache The ID cache of the STPA model.
 * @returns A STPANode representing {@code node}.
 */
export function generateSTPANode(
    node: leafElement,
    showDescription: boolean,
    idToSNode: Map<string, SNode>,
    options: StpaSynthesisOptions,
    idCache: IdCache<AstNode>
): STPANode {
    const nodeId = idCache.uniqueId(node.name.replace(/[.]/g, "_"), node);
    // determines the hierarchy level for subcomponents. For other components the value is 0.
    let lvl = 0;
    let container = node.$container;
    while (isHazard(container) || isSystemConstraint(container)) {
        lvl++;
        container = container.$container;
    }

    let children: SModelElement[] = generateDescriptionLabels(
        showDescription,
        nodeId,
        node.name,
        options,
        idCache,
        isContext(node) ? createUCAContextDescription(node) : node.description
    );
    // if the hierarchy option is true, the subcomponents are added as children to the parent
    if (options.getHierarchy() && isHazard(node) && node.subComponents.length !== 0) {
        // adds subhazards
        children = children.concat(
            node.subComponents?.map((sc: Hazard) => generateSTPANode(sc, showDescription, idToSNode, options, idCache))
        );
    }
    if (options.getHierarchy() && isSystemConstraint(node) && node.subComponents.length !== 0) {
        // adds subconstraints
        children = children.concat(
            node.subComponents?.map((sc: SystemConstraint) =>
                generateSTPANode(sc, showDescription, idToSNode, options, idCache)
            )
        );
    }

    if (isContext(node)) {
        // context UCAs have no description
        const result = createSTPANode(node, nodeId, lvl, "", children, options);
        idToSNode.set(nodeId, result);
        return result;
    } else {
        const result = createSTPANode(node, nodeId, lvl, node.description, children, options);
        idToSNode.set(nodeId, result);
        return result;
    }
}

/**
 * Generates the edges for {@code node}.
 * @param node STPA component for which the edges should be created.
 * @param nodePort The port of the node.
 * @param idToSNode The map of the generated IDs to their generated SNodes.
 * @param options The synthesis options of the STPA model.
 * @param idCache The ID cache of the STPA model.
 * @returns Edges representing the references {@code node} contains.
 */
export function generateEdgesForSTPANode(
    node: AstNode,
    nodePort: SModelElement | undefined,
    idToSNode: Map<string, SNode>,
    options: StpaSynthesisOptions,
    idCache: IdCache<AstNode>
): SModelElement[] {
    const elements: SModelElement[] = [];
    // for every reference an edge is created
    // if hierarchy option is false, edges from subcomponents to parents are created too
    const targets = getTargets(node, options.getHierarchy());

    for (const target of targets) {
        const edge = generateSTPAEdge(node, nodePort?.id, target, "", idToSNode, idCache);
        if (edge) {
            elements.push(edge);
        }
    }
    return elements;
}

/**
 * Generates a single STPAEdge based on the given arguments.
 * @param source The source of the edge.
 * @param sourcePortId The ID of the source port of the edge.
 * @param target The target of the edge.
 * @param label The label of the edge.
 * @param idToSNode The map of the generated IDs to their generated SNodes.
 * @param idCache The ID cache of the STPA model.
 * @returns An STPAEdge.
 */
export function generateSTPAEdge(
    source: AstNode,
    sourcePortId: string | undefined,
    target: AstNode,
    label: string,
    idToSNode: Map<string, SNode>,
    idCache: IdCache<AstNode>
): STPAEdge | undefined {
    // get the IDs
    const targetId = idCache.getId(target);
    const sourceId = idCache.getId(source);
    const edgeId = idCache.uniqueId(`${sourceId}_${targetId}`, undefined);

    if (sourceId && targetId) {
        // create the label of the edge
        let children: SModelElement[] = [];
        if (label !== "") {
            children = createLabel([label], edgeId, idCache, EDGE_LABEL_TYPE);
        }

        if ((isHazard(target) || isSystemConstraint(target)) && target.$container?.$type !== "Model") {
            // if the target is a subcomponent we need to add several ports and edges through the hierarchical structure
            return generateIntermediateIncomingSTPAEdges(
                target,
                source,
                sourceId,
                sourcePortId,
                edgeId,
                children,
                idToSNode,
                idCache
            );
        } else {
            // otherwise it is sufficient to add ports for source and target
            let targetPortId: string | undefined;
            if (sourcePortId) {
                // if hyperedges are used, the source port is already given
                const targetNode = idToSNode.get(targetId!);
                targetPortId = idCache.uniqueId(edgeId + "_newTransition");
                targetNode?.children?.push(createPort(targetPortId, PortSide.SOUTH));
            } else {
                const portIds = createPortsForSTPAEdge(
                    sourceId,
                    PortSide.NORTH,
                    targetId,
                    PortSide.SOUTH,
                    edgeId,
                    idToSNode,
                    idCache
                );
                sourcePortId = portIds.sourcePortId;
                targetPortId = portIds.targetPortId;
            }

            // add edge between the two ports
            return createSTPAEdge(edgeId, sourcePortId, targetPortId, children, STPA_EDGE_TYPE, getAspect(source));
        }
    }
}

/**
 * Create the source and target port for the edge with the given {@code edgeId}.
 * @param sourceId The id of the source node.
 * @param sourceSide The side of the source node the edge should be connected to.
 * @param targetId The id of the target node.
 * @param targetSide The side of the target node the edge should be connected to.
 * @param edgeId The id of the edge.
 * @param idToSNode The map of the generated IDs to their generated SNodes.
 * @param idCache The id cache of the STPA model.
 * @returns the ids of the source and target port the edge should be connected to.
 */
export function createPortsForSTPAEdge(
    sourceId: string,
    sourceSide: PortSide,
    targetId: string,
    targetSide: PortSide,
    edgeId: string,
    idToSNode: Map<string, SNode>,
    idCache: IdCache<AstNode>
): { sourcePortId: string; targetPortId: string } {
    // add ports for source and target
    const sourceNode = idToSNode.get(sourceId);
    const sourcePortId = idCache.uniqueId(edgeId + "_newTransition");
    sourceNode?.children?.push(createPort(sourcePortId, sourceSide));

    const targetNode = idToSNode.get(targetId!);
    const targetPortId = idCache.uniqueId(edgeId + "_newTransition");
    targetNode?.children?.push(createPort(targetPortId, targetSide));

    return { sourcePortId, targetPortId };
}

/**
 * Generates incoming edges between the {@code source}, the top parent(s), and the {@code target}.
 * @param target The target of the edge.
 * @param source The source of the edge.
 * @param sourceId The ID of the source of the edge.
 * @param sourcePortId The ID of the source port of the edge.
 * @param edgeId The ID of the original edge.
 * @param children The children of the original edge.
 * @param idToSNode The map of the generated IDs to their generated SNodes.
 * @param idCache The ID cache of the STPA model.
 * @returns an STPAEdge to connect the {@code source} (or its top parent) with the top parent of the {@code target}.
 */
export function generateIntermediateIncomingSTPAEdges(
    target: AstNode,
    source: AstNode,
    sourceId: string,
    sourcePortId: string | undefined,
    edgeId: string,
    children: SModelElement[],
    idToSNode: Map<string, SNode>,
    idCache: IdCache<AstNode>
): STPAEdge {
    // add ports to the target and its (grand)parents
    const targetPortIds = generatePortsForSTPAHierarchy(target, edgeId, PortSide.SOUTH, idToSNode, idCache);

    // add edges between the ports
    let current: AstNode | undefined = target;
    for (let i = 0; current && current?.$type !== "Model"; i++) {
        const currentNode = idToSNode.get(idCache.getId(current.$container)!);
        const edgeType = i === 0 ? STPA_EDGE_TYPE : STPA_INTERMEDIATE_EDGE_TYPE;
        currentNode?.children?.push(
            createSTPAEdge(
                idCache.uniqueId(edgeId),
                targetPortIds[i + 1],
                targetPortIds[i],
                children,
                edgeType,
                getAspect(source)
            )
        );
        current = current?.$container;
    }

    if (isSystemConstraint(source) && source.$container?.$type !== "Model") {
        // if the source is a sub-sytemconstraint we also need intermediate edges to the top system constraint
        return generateIntermediateOutgoingSTPAEdges(
            source,
            edgeId,
            children,
            targetPortIds[targetPortIds.length - 1],
            idToSNode,
            idCache
        );
    } else {
        if (!sourcePortId) {
            // add port for source node
            const sourceNode = idToSNode.get(sourceId);
            sourcePortId = idCache.uniqueId(edgeId + "_newTransition");
            sourceNode?.children?.push(createPort(sourcePortId, PortSide.NORTH));
        }

        // add edge from source to top parent of the target
        return createSTPAEdge(
            edgeId,
            sourcePortId,
            targetPortIds[targetPortIds.length - 1],
            children,
            STPA_INTERMEDIATE_EDGE_TYPE,
            getAspect(source)
        );
    }
}

/**
 * Generates outgoing edges between the {@code source}, its top parent(s), and {@code targetPortId}.
 * @param source The source of the original edge.
 * @param edgeId The ID of the original edge.
 * @param children The children of the original edge.
 * @param targetPortId The ID of the target port.
 * @param idToSNode The map of the generated IDs to their generated SNodes.
 * @param idCache The ID cache of the STPA model.
 * @returns the STPAEdge to connect the top parent of the {@code source} with the {@code targetPortId}.
 */
export function generateIntermediateOutgoingSTPAEdges(
    source: AstNode,
    edgeId: string,
    children: SModelElement[],
    targetPortId: string,
    idToSNode: Map<string, SNode>,
    idCache: IdCache<AstNode>
): STPAEdge {
    // add ports to the source and its (grand)parents
    const sourceIds = generatePortsForSTPAHierarchy(source, edgeId, PortSide.NORTH, idToSNode, idCache);

    // add edges between the ports
    let current: AstNode | undefined = source;
    for (let i = 0; current && current?.$type !== "Model"; i++) {
        const currentNode = idToSNode.get(idCache.getId(current.$container)!);
        currentNode?.children?.push(
            createSTPAEdge(
                idCache.uniqueId(edgeId),
                sourceIds[i],
                sourceIds[i + 1],
                children,
                STPA_INTERMEDIATE_EDGE_TYPE,
                getAspect(source)
            )
        );
        current = current?.$container;
    }

    return createSTPAEdge(
        edgeId,
        sourceIds[sourceIds.length - 1],
        targetPortId,
        children,
        STPA_INTERMEDIATE_EDGE_TYPE,
        getAspect(source)
    );
}

/**
 * Generates ports for the {@code current} and its (grand)parents.
 * @param current The current node.
 * @param edgeId The ID of the original edge for which the ports are created.
 * @param side The side of the ports.
 * @param idToSNode The map of the generated IDs to their generated SNodes.
 * @param idCache The ID cache of the STPA model.
 * @returns the IDs of the created ports.
 */
export function generatePortsForSTPAHierarchy(
    current: AstNode | undefined,
    edgeId: string,
    side: PortSide,
    idToSNode: Map<string, SNode>,
    idCache: IdCache<AstNode>
): string[] {
    const ids: string[] = [];
    while (current && current?.$type !== "Model") {
        const currentId = idCache.getId(current);
        const currentNode = idToSNode.get(currentId!);
        const portId = idCache.uniqueId(edgeId + "_newTransition");
        currentNode?.children?.push(createPort(portId, side));
        ids.push(portId);
        current = current?.$container;
    }
    return ids;
}
