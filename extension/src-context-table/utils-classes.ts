/*
 * KIELER - Kiel Integrated Environment for Layout Eclipse RichClient
 *
 * http://rtsys.informatik.uni-kiel.de/kieler
 *
 * Copyright 2022 by
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

/** Type for control actions for the context table. */
export class ContextTableControlAction {
    controller: string;
    action: string;
}

/** The variables for each system, needed for the context table. */
export class ContextTableSystemVariables {
    system: string;
    variables: ContextTableVariableValues[];
}

/** The possible values for a variable in the context table. */
export class ContextTableVariableValues {
    name: string;
    values: string[];
}

/** An instantation of a variable, needed for the contexts in the context table. */
export class ContextTableVariable {
    name: string;
    value: string;
}

/** A rule for the context table. */
export class ContextTableRule {
    id: string;
    controlAction: ContextTableControlAction;
    type: string;
    variables: ContextTableVariable[];
    hazards: string[];
}

/** Data the context table expects from the language server. */
export class ContextTableData {
    rules: ContextTableRule[];
    actions: ContextTableControlAction[];
    systemVariables: ContextTableSystemVariables[];
}

/** Types of control actions. */
export enum Type {
    PROVIDED,
    NOT_PROVIDED,
    BOTH,
}

/** A row in the context table. */
export class Row {
    variables: ContextTableVariable[];
    results: { hazards: string[]; rules: ContextTableRule[] }[];
}
