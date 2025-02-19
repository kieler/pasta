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

import { AstNode } from "langium";
import { SModelElement } from "sprotty-protocol";
import {
    Context,
    Graph,
    Model,
    Node,
    isActionUCAs,
    isContext,
    isControllerConstraint,
    isHazard,
    isLoss,
    isLossScenario,
    isResponsibility,
    isRule,
    isSafetyConstraint,
    isSystemConstraint,
    isSystemResponsibilities,
    isUCA,
} from "../../generated/ast.js";
import { CSNode, PastaPort, STPANode } from "./stpa-interfaces.js";
import { STPAAspect } from "./stpa-model.js";
import { groupValue } from "./stpa-synthesis-options.js";

/**
 * Getter for the references contained in {@code node}.
 * @param node The STPAAspect which tracings should be returned.
 * @param hierarchy If this is true, subcomponents are children of their parents in the diagram, otherwise the relationship is represented by edges.
 * @returns The objects {@code node} is traceable to.
 */
export function getTargets(node: AstNode, hierarchy: boolean): AstNode[] {
    if (node) {
        const targets: AstNode[] = [];
        if (
            isHazard(node) ||
            isResponsibility(node) ||
            isSystemConstraint(node) ||
            isControllerConstraint(node) ||
            isSafetyConstraint(node)
        ) {
            for (const ref of node.refs) {
                if (ref?.ref) {
                    targets.push(ref.ref);
                }
            }
            // for subcomponents the parents must be declared as targets too, if hierarchy is false
            if (
                !hierarchy &&
                ((isHazard(node) && isHazard(node.$container)) ||
                    (isSystemConstraint(node) && isSystemConstraint(node.$container)))
            ) {
                targets.push(node.$container);
            }
        } else if (isLossScenario(node) && node.uca && node.uca.ref) {
            targets.push(node.uca.ref);
        } else if ((isUCA(node) || isContext(node) || isLossScenario(node)) && node.list) {
            const refs = node.list.refs.map(x => x.ref);
            for (const ref of refs) {
                if (ref) {
                    targets.push(ref);
                }
            }
        }
        return targets;
    } else {
        return [];
    }
}

/**
 * Determines the layer {@code node} should be in depending on the STPA aspect it represents.
 * @param node STPANode for which the layer should be determined.
 * @param hazardDepth Maximal depth of the hazard hierarchy.
 * @param sysConsDepth Maximal depth of the system-level constraint hierarchy.
 * @param map Maps control actions to group number.
 * @param groupUCAs Determines whether and how UCAs should be grouped.
 * @returns The number of the layer {@code node} should be in.
 */
function determineLayerForSTPANode(
    node: STPANode,
    hazardDepth: number,
    sysConsDepth: number,
    map: Map<string, number>,
    groupUCAs: groupValue
): number {
    switch (node.aspect) {
        case STPAAspect.LOSS:
            return 0;
        case STPAAspect.HAZARD:
            return 1 + node.hierarchyLvl;
        case STPAAspect.SYSTEMCONSTRAINT:
            return 2 + hazardDepth + node.hierarchyLvl;
        case STPAAspect.RESPONSIBILITY:
            return 3 + hazardDepth + sysConsDepth;
        case STPAAspect.UCA:
            // each UCA group gets its own layer
            switch (groupUCAs) {
                case groupValue.CONTROL_ACTION:
                    if (node.controlAction && !map.has(node.controlAction)) {
                        map.set(node.controlAction, map.size);
                    }
                    return 4 + hazardDepth + sysConsDepth + map.get(node.controlAction!)!;
                case groupValue.SYSTEM_COMPONENT:
                    if (
                        node.controlAction &&
                        !map.has(node.controlAction.substring(0, node.controlAction.indexOf(".")))
                    ) {
                        map.set(node.controlAction.substring(0, node.controlAction.indexOf(".")), map.size);
                    }
                    return (
                        4 +
                        hazardDepth +
                        sysConsDepth +
                        map.get(node.controlAction!.substring(0, node.controlAction!.indexOf(".")))!
                    );
                default:
                    return 4 + hazardDepth + sysConsDepth;
            }
        case STPAAspect.CONTROLLERCONSTRAINT:
            return 5 + hazardDepth + sysConsDepth + map.size;
        case STPAAspect.SCENARIO:
            return 6 + hazardDepth + sysConsDepth + map.size;
        case STPAAspect.SAFETYREQUIREMENT:
            return 7 + hazardDepth + sysConsDepth + map.size;
        default:
            return -1;
    }
}

/**
 * Sets the level property for {@code nodes} depending on the layer they should be in.
 * @param nodes The nodes representing the stpa components.
 * @param groupUCAs Determines whether and how UCAs are grouped.
 */
export function setLevelsForSTPANodes(nodes: STPANode[], groupUCAs: groupValue): void {
    // determines the maximal hierarchy depth of hazards and system constraints
    let maxHazardDepth = -1;
    let maxSysConsDepth = -1;
    for (const node of nodes) {
        if (node.aspect === STPAAspect.HAZARD) {
            maxHazardDepth = maxHazardDepth > node.hierarchyLvl ? maxHazardDepth : node.hierarchyLvl;
        }
        if (node.aspect === STPAAspect.SYSTEMCONSTRAINT) {
            maxSysConsDepth = maxSysConsDepth > node.hierarchyLvl ? maxSysConsDepth : node.hierarchyLvl;
        }
    }

    // used to determine which control action or system component belongs to which group number
    const map = new Map<string, number>();
    // sets level property to the layer of the nodes. Since we layout the relationship graph with the direction "UP",
    // the determined layer must be negated to get the correct layer.
    for (const node of nodes) {
        const layer = determineLayerForSTPANode(node, maxHazardDepth, maxSysConsDepth, map, groupUCAs);
        node.level = -layer;
    }
}

/**
 * Set the levels of the control structure nodes.
 * @param nodes The nodes representing the control structure.
 */
export function setLevelOfCSNodes(nodes: Node[]): void {
    const visited = new Map<string, Set<string>>();
    for (const node of nodes) {
        visited.set(node.name, new Set<string>());
        if (node.children) {
            // set levels of children seperately
            setLevelOfCSNodes(node.children);
        }
    }
    if (nodes.length > 0) {
        nodes[0].level = 0;
        assignLevel(nodes[0], visited);
    }
}

/**
 * Assigns the level to the connected nodes of {@code node} that are on the same hierarchical level.
 * @param node The node for which the connected nodes should be assigned a level.
 * @param visited The edges that have been visited.
 */
function assignLevel(node: Node, visited: Map<string, Set<string>>): void {
    for (const action of node.actions) {
        const target = action.target.ref;
        if (target && node.$container === target.$container && target && !visited.get(node.name)?.has(target.name)) {
            visited.get(node.name)?.add(target.name);
            if (target.level === undefined || target.level < node.level! + 1) {
                target.level = node.level! + 1;
            }
            assignLevel(target, visited);
        }
    }
    for (const feedback of node.feedbacks) {
        const target = feedback.target.ref;
        if (target && node.$container === target.$container && target && !visited.get(node.name)?.has(target.name)) {
            visited.get(node.name)?.add(target.name);
            if (target.level === undefined || target.level > node.level! - 1) {
                target.level = node.level! - 1;
            }
            assignLevel(target, visited);
        }
    }
}

/**
 * Creates a description for the given UCA context.
 * @param uca The UCA context.
 * @returns the description of the UCA context.
 */
export function createUCAContextDescription(uca: Context): string {
    const rule = uca.$container;
    const controlAction = rule.action.$refText;
    let description = rule.system.$refText;
    switch (rule.type) {
        case "not-provided":
            description += " did not provide " + controlAction;
            break;
        case "provided":
            description += " provided " + controlAction;
            break;
        case "too-late":
            description += " provided " + controlAction + " too late";
            break;
        case "too-early":
            description += " provided " + controlAction + " too early";
            break;
        case "wrong-time":
            description += " provided " + controlAction + " at the wrong time";
            break;
        case "applied-too-long":
            description += " applied " + controlAction + " too long";
            break;
        case "stopped-too-soon":
            description += " stopped " + controlAction + " too soon";
            break;
    }
    description += " in the context of ";
    for (let i = 0; i < uca.assignedValues.length; i++) {
        description += uca.assignedValues[i].variable.$refText + "=" + uca.assignedValues[i].value.$refText;
        if (i < uca.assignedValues.length - 1) {
            description += ", ";
        }
    }

    return description;
}

/**
 * Getter for the aspect of a STPA component.
 * @param node AstNode which aspect should determined.
 * @returns the aspect of {@code node}.
 */
export function getAspect(node: AstNode): STPAAspect {
    if (isLoss(node)) {
        return STPAAspect.LOSS;
    } else if (isHazard(node)) {
        return STPAAspect.HAZARD;
    } else if (isSystemConstraint(node)) {
        return STPAAspect.SYSTEMCONSTRAINT;
    } else if (isUCA(node) || isContext(node) || isRule(node) || isActionUCAs(node)) {
        return STPAAspect.UCA;
    } else if (isResponsibility(node) || isSystemResponsibilities(node)) {
        return STPAAspect.RESPONSIBILITY;
    } else if (isControllerConstraint(node)) {
        return STPAAspect.CONTROLLERCONSTRAINT;
    } else if (isLossScenario(node)) {
        return STPAAspect.SCENARIO;
    } else if (isSafetyConstraint(node)) {
        return STPAAspect.SAFETYREQUIREMENT;
    }
    return STPAAspect.UNDEFINED;
}

/** Needed to determine which node descriptions should be shown when the showLabels options is set to automatic */
export let currentCursorOffset: number;

/**
 * Sets the current cursor offset to {@code offset}.
 * @param offset The current cursor offset.
 */
export function setCurrentCursorOffset(offset: number): void {
    currentCursorOffset = offset;
}

/**
 * Determines the aspect of the component at the current cursor position.
 * @param model The current STPA model.
 * @returns the aspect of the component at the current cursor position.
 */
export function getCurrentAspect(model: Model): STPAAspect {
    let elements: AstNode[] = [];
    // add elements in the order they appear in the document
    elements = [
        ...model.losses,
        ...model.hazards,
        ...model.systemLevelConstraints,
        ...model.responsibilities,
        ...model.allUCAs,
        ...model.rules,
        ...model.controllerConstraints,
        ...model.scenarios,
        ...model.safetyCons,
    ];

    // find first element that is after the cursor position and return the aspect of the previous element
    const index = elements.findIndex(element => element.$cstNode && element.$cstNode.offset >= currentCursorOffset) - 1;
    if (index < 0) {
        return STPAAspect.LOSS;
    }
    return getAspect(elements[index]);
}

/**
 * Determines the aspects for which the descriptions should be shown, when the showLabels option is set to automatic.
 * @param model The current STPA model.
 * @returns the aspects for which the descriptions should be shown.
 */
export function getAspectsThatShouldHaveDesriptions(model: Model): STPAAspect[] {
    const aspectsToShowDescriptions: STPAAspect[] = [];
    switch (getCurrentAspect(model)) {
        case STPAAspect.LOSS:
            break;
        case STPAAspect.HAZARD:
            aspectsToShowDescriptions.push(STPAAspect.LOSS);
            aspectsToShowDescriptions.push(STPAAspect.HAZARD);
            break;
        case STPAAspect.SYSTEMCONSTRAINT:
            aspectsToShowDescriptions.push(STPAAspect.HAZARD);
            break;
        case STPAAspect.RESPONSIBILITY:
            aspectsToShowDescriptions.push(STPAAspect.SYSTEMCONSTRAINT);
            break;
        case STPAAspect.UCA:
            aspectsToShowDescriptions.push(STPAAspect.HAZARD);
            break;
        case STPAAspect.CONTROLLERCONSTRAINT:
            aspectsToShowDescriptions.push(STPAAspect.UCA);
            break;
        case STPAAspect.SCENARIO:
            aspectsToShowDescriptions.push(STPAAspect.UCA);
            aspectsToShowDescriptions.push(STPAAspect.HAZARD);
            break;
        case STPAAspect.SAFETYREQUIREMENT:
            aspectsToShowDescriptions.push(STPAAspect.SCENARIO);
            break;
        default:
            break;
    }
    return aspectsToShowDescriptions;
}

/**
 * Determines the least common ancestor of {@code node1} and {@code node2}.
 * @param node1 The first node.
 * @param node2 The second node.
 * @returns the least common ancestor of {@code node1} and {@code node2} or undefined if none exists.
 */
export function getCommonAncestor(node1: Node, node2: Node): Node | Graph | undefined {
    const node1Ancestors = getAncestors(node1);
    const node2Ancestors = getAncestors(node2);
    for (const ancestor of node1Ancestors) {
        if (node2Ancestors.includes(ancestor)) {
            return ancestor;
        }
    }
    return undefined;
}

/**
 * Calculates the ancestors of {@code node}.
 * @param node The node for which the ancestors should be calculated.
 * @returns the ancestors of {@code node}.
 */
export function getAncestors(node: Node): (Node | Graph)[] {
    const ancestors: (Node | Graph)[] = [];
    let current: Node | Graph | undefined = node;
    while (current?.$type !== "Graph") {
        ancestors.push(current.$container);
        current = current.$container;
    }
    return ancestors;
}

/**
 * Sorts the ports of the nodes in {@code nodes} based on their associated edges.
 * @param nodes The nodes which ports should be sorted.
 */
export function sortPorts(nodes: CSNode[]): void {
    for (const node of nodes) {
        // sort the ports of the children
        const children = (node.children?.filter(child => child.type.startsWith("node")) as CSNode[]) ?? [];
        sortPorts(children);

        // separate the ports from the other children
        const ports: PastaPort[] = [];
        const otherChildren: SModelElement[] = [];
        node.children?.forEach(child => {
            if (child.type.startsWith("port")) {
                ports.push(child as any as PastaPort);
            } else {
                otherChildren.push(child);
            }
        });

        // sort the ports based on their associated edges
        const newPorts: PastaPort[] = [];
        for (let i = 0; i < ports.length; i++) {
            const port = ports[i];
            newPorts.push(port);
            if (port.associatedEdge) {
                for (let j = i + 1; j < ports.length; j++) {
                    const otherPort = ports[j];
                    if (
                        (port.associatedEdge.node1 === otherPort.associatedEdge?.node2 &&
                            port.associatedEdge.node2 === otherPort.associatedEdge.node1) ||
                        // multiple edges between the same nodes may be defined
                        (port.associatedEdge.node1 === otherPort.associatedEdge?.node1 &&
                            port.associatedEdge.node2 === otherPort.associatedEdge.node2)
                    ) {
                        // associated edges connect the same nodes but in the opposite direction -> add the other port to the list to group them together
                        newPorts.push(otherPort);
                        ports.splice(j, 1);
                        j--;
                    }
                }
            }
        }

        node.children = [...otherChildren, ...newPorts];
    }
}
