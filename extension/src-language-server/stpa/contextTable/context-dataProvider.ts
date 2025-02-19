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

import { LangiumDocument } from "langium";
import { Range, URI } from "vscode-languageserver";
import { Model, Node } from "../../generated/ast.js";
import { getModel } from "../../utils.js";
import { StpaServices } from "../stpa-module.js";
import {
    ContextTableControlAction,
    ContextTableData,
    ContextTableRule,
    ContextTableSystemVariables,
    ContextTableVariable,
    ContextTableVariableValues,
} from "./utils-classes.js";

export class ContextTableProvider {
    protected services: StpaServices;

    constructor(services: StpaServices) {
        this.services = services;
    }

    /**
     * Determines the range in the current textdocument of the UCA which ID equals {@code ucaName}.
     * @param uri The uri of the current textdocument.
     * @param ucaName The name to identify the searched UCA.
     * @returns The range of the searched UCA or undefined if no UCA with {@code ucaName} could be found.
     */
    getRangeOfUCA(uri: URI, ucaName: string): Range | undefined {
        // get the current model
        const textDocuments = this.services.shared.workspace.LangiumDocuments;
        const currentDoc = textDocuments.getDocument(uri as any) as LangiumDocument<Model>;
        const model: Model = currentDoc.parseResult.value;

        let range: Range | undefined = undefined;
        model.rules.forEach((rule) =>
            rule.contexts.forEach((uca) => {
                if (uca.name === ucaName) {
                    range = uca.$cstNode?.range;
                    return;
                }
            })
        );
        return range;
    }

    /**
     * Collects all control actions and variables of the given system component and its sub-components.
     * @param component The system component to collect the data from.
     * @param actions The array to store the control actions.
     * @param variables The array to store the system variables.
     */
    protected collectControlActionsAndVariables(component: Node, actions: ContextTableControlAction[], variables: ContextTableSystemVariables[]): void {
        // control actions of the current system component
        component.actions.forEach((action) => {
            action.comms.forEach((command) => {
                actions.push({ controller: component.name, action: command.name });
            });
        });
        // variables of the current system component
        const variableValues: ContextTableVariableValues[] = [];
        component.variables.forEach((variable) => {
            variableValues.push({ name: variable.name, values: variable.values.map((value) => value.name) });
        });
        variables.push({ system: component.name, variables: variableValues });
        // recursive call for sub-components
        component.children.forEach((subComponent) => this.collectControlActionsAndVariables(subComponent, actions, variables));
    }

    /**
     * Collects all the data needed for constructing the context table.
     * @returns The data in a set of arrays.
     */
    async getData(uri: URI): Promise<ContextTableData> {
        // get the current model
        const model = await getModel(uri, this.services.shared) as Model;

        const actions: ContextTableControlAction[] = [];
        const variables: ContextTableSystemVariables[] = [];
        const rules: ContextTableRule[] = [];

        // collect control actions and variables
        model.controlStructure?.nodes.forEach((systemComponent) => {
            this.collectControlActionsAndVariables(systemComponent, actions, variables);
        });
        // collect rules
        model.rules.forEach((rule) => {
            rule.contexts.forEach((context) => {
                // determine context variables
                const contextVariables: ContextTableVariable[] = [];
                for (const assignedValue of context.assignedValues) {
                    if (assignedValue.variable?.ref?.name && assignedValue.value?.$refText) {
                        contextVariables.push({ name: assignedValue.variable.ref.name, value: assignedValue.value.$refText });
                    }
                }
                //determine hazards
                const hazards: string[] = [];
                const hazardList = context.list?.refs;
                hazardList?.forEach((hazard) => {
                    if (hazard.ref?.name) {
                        hazards.push(hazard.ref.name);
                    }
                });
                // create rule/uca
                if (rule.action?.ref?.name && rule.system?.ref?.name) {
                    rules.push({
                        id: context.name,
                        controlAction: { controller: rule.system.ref!.name, action: rule.action.ref!.name },
                        type: rule.type,
                        variables: contextVariables,
                        hazards: hazards,
                    });
                }
            });
        });
        return { rules: rules, actions: actions, systemVariables: variables };
    }
}
