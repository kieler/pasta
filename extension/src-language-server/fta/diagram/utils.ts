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

import { AstNode } from "langium";
import {
    isAND,
    isComponent,
    isCondition,
    isGate,
    isInhibitGate,
    isKNGate,
    isOR,
    isTopEvent,
} from "../../generated/ast.js";
import { FTNodeType } from "./fta-model.js";

/**
 * Determines the type of the given {@code node}.
 * @param node AstNode, which type should be determined.
 * @returns the type of the given {@code node}.
 */
export function getFTNodeType(node: AstNode): FTNodeType {
    if (isTopEvent(node)) {
        return FTNodeType.TOPEVENT;
    } else if (isComponent(node)) {
        return FTNodeType.COMPONENT;
    } else if (isCondition(node)) {
        return FTNodeType.CONDITION;
    } else if (isAND(node)) {
        return FTNodeType.AND;
    } else if (isOR(node)) {
        return FTNodeType.OR;
    } else if (isKNGate(node)) {
        return FTNodeType.KN;
    } else if (isInhibitGate(node)) {
        return FTNodeType.INHIBIT;
    }
    return FTNodeType.UNDEFINED;
}

/**
 * Collects the references contained in {@code node}.
 * @param node The AstNode we want the the references from.
 * @returns The elements the given {@code node} is traceable to.
 */
export function getTargets(node: AstNode): AstNode[] {
    const targets: AstNode[] = [];
    // only the top event and gates have children/targets
    if (isTopEvent(node) && node.child.ref) {
        targets.push(node.child.ref);
    }
    if (isGate(node)) {
        for (const child of node.children) {
            if (child.ref) {
                targets.push(child.ref);
            }
        }
    }
    // inhibit gate has an additional child
    if (isInhibitGate(node)) {
        for (const child of node.condition) {
            if (child.ref) {
                targets.push(child.ref);
            }
        }
    }
    return targets;
}
