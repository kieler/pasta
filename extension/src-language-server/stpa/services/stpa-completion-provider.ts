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

import { MaybePromise } from "langium";
import {
    CompletionAcceptor,
    CompletionContext,
    CompletionValueItem,
    DefaultCompletionProvider,
    NextFeature,
} from "langium/lsp";
import { CompletionItemKind } from "vscode-languageserver";
import {
    Context,
    ControllerConstraint,
    LossScenario,
    Model,
    Node,
    Rule,
    UCA,
    VerticalEdge,
    isModel,
    isVerticalEdge,
} from "../../generated/ast.js";

/**
 * Generates UCA text for loss scenarios by providing an additional completion item.
 */
export class STPACompletionProvider extends DefaultCompletionProvider {
    protected enabled: boolean = true;

    /**
     * Overrides the default completionFor method to provide an additional completion item for generating UCA text in loss scenarios.
     * @param context The completion context.
     * @param next The next feature of the current rule to be called.
     * @param acceptor The completion acceptor to add the completion items.
     */
    protected completionFor(
        context: CompletionContext,
        next: NextFeature,
        acceptor: CompletionAcceptor
    ): MaybePromise<void> {
        super.completionFor(context, next, acceptor);
        if (this.enabled) {
            this.completionForSystemComponent(context, next, acceptor);
            this.completionForScenario(context, next, acceptor);
            this.completionForUCA(context, next, acceptor);
            this.completionForUCARule(context, next, acceptor);
            this.completionForControllerConstraints(context, next, acceptor);
        }
    }

    /**
     * Adds a completion item for generating controller constraints if the current context is a controller constraint.
     * @param context The completion context.
     * @param next The next feature of the current rule to be called.
     * @param acceptor The completion acceptor to add the completion items.
     */
    protected completionForControllerConstraints(
        context: CompletionContext,
        next: NextFeature,
        acceptor: CompletionAcceptor
    ): void {
        if (next.type === ControllerConstraint && next.property === "name") {
            // get the model for the current controller constraint
            let model = context.node;
            while (model && !isModel(model)) {
                model = model.$container;
            }
            if (isModel(model)) {
                let generatedText = ``;
                model.rules.forEach(rule => {
                    const system = rule.system.ref?.label ?? rule.system.$refText;
                    const controlAction = `the control action '${rule.action.ref?.label}'`;
                    rule.contexts.forEach(context => {
                        // create constraint text for each context
                        generatedText += `C "${system}`;
                        const contextText = this.createContextText(context, true);
                        switch (rule.type) {
                            case "not-provided":
                                generatedText += ` must provide ${controlAction}, while ${contextText}.`;
                                break;
                            case "provided":
                                generatedText += ` must not provided ${controlAction}, while ${contextText}.`;
                                break;
                            case "too-late":
                                generatedText += ` must provide ${controlAction} in time, while ${contextText}.`;
                                break;
                            case "too-early":
                                generatedText += ` must not provide ${controlAction} before ${contextText}.`;
                                break;
                            case "stopped-too-soon":
                                generatedText += ` must not stop ${controlAction} too soon, while ${contextText}.`;
                                break;
                            case "applied-too-long":
                                generatedText += ` must not apply ${controlAction} too long, while ${contextText}.`;
                                break;
                        }
                        // add reference to the UCA
                        generatedText += `" [${context.name}]\n`;
                    });
                });

                // add the generated text as completion item
                acceptor(context, {
                    label: "Generate Constraints for the UCAs",
                    kind: CompletionItemKind.Snippet,
                    insertText: generatedText,
                    detail: "Inserts a controller constraint for each UCA.",
                    sortText: "0",
                });
            }
        }
    }

    /**
     * Adds a completion item for generating a system component if the current context is a system component.
     * @param context The completion context.
     * @param next The next feature of the current rule to be called.
     * @param acceptor The completion acceptor to add the completion items.
     */
    protected completionForSystemComponent(
        context: CompletionContext, next: NextFeature, acceptor: CompletionAcceptor): void {
        if (next.type === Node && next.property === "name") {
            const generatedText = `Comp {
    hierarchyLevel 0
    label "Component"
    processModel {
    }
    controlActions {
    }
    feedback {
    }
}`;
            acceptor(context, {
                label: "Generate System Component",
                kind: CompletionItemKind.Text,
                insertText: generatedText,
                detail: "Inserts a system component.",
                sortText: "0",
            });
        }
    }

    /**
     * Adds completion items for generating rules for UCAs if the current context is a rule.
     * @param context The completion context.
     * @param next The next feature of the current rule to be called.
     * @param acceptor The completion acceptor to add the completion items.
     */
    protected completionForUCARule(context: CompletionContext, next: NextFeature, acceptor: CompletionAcceptor): void {
        if ((context.node?.$type === Rule || next.type === Rule) && next.property === "name") {
            const templateRuleItem = this.generateTemplateRuleItem();
            acceptor(context, templateRuleItem);
            const model = context.node?.$type === Model ? context.node : context.node?.$container;
            if (isModel(model)) {
                const controlActions = this.collectControlActions(model);
                const rulesForEverythingItem = this.generateRulesForEverythingItem(controlActions);
                acceptor(context, rulesForEverythingItem);
                const ruleForSpecificControlActionItems =
                    this.generateRuleForSpecificControlActionItems(controlActions);
                ruleForSpecificControlActionItems.forEach(item => acceptor(context, item));
            }
        }
    }

    /**
     * Determines all control actions in the given model.
     * @param model The model for which the control actions should be collected.
     */
    protected collectControlActions(model: Model): VerticalEdge[] {
        const actions: VerticalEdge[] = [];
        model.controlStructure?.nodes.forEach(node => {
            actions.push(...this.getControlActions(node));
        });
        return actions;
    }

    /**
     * Gets all control actions for the given node and its children.
     * @param node The node for which the control actions should be collected.
     * @returns the control actions for the given node and its children.
     */
    protected getControlActions(node: Node): VerticalEdge[] {
        const actions = node.actions;
        node.children.forEach(child => {
            actions.push(...this.getControlActions(child));
        });
        return actions;
    }

    /**
     * Creates for each control action a completion item for generating a rule for this control action.
     * @param controlActions The control actions for which the rules should be generated.
     */
    protected generateRuleForSpecificControlActionItems(controlActions: VerticalEdge[]): CompletionValueItem[] {
        const items: CompletionValueItem[] = [];
        let counter = 3;
        for (const controlAction of controlActions) {
            for (const action of controlAction.comms) {
                const item: CompletionValueItem = {
                    label: `Generate a rule for ${controlAction.$container.name}.${action.name}`,
                    kind: CompletionItemKind.Snippet,
                    insertText: `RL {
    controlAction: ${controlAction.$container.name}.${action.name}
    type: 
    contexts: {
    }
}`,
                    detail: `Inserts a rule for ${controlAction.$container.name}.${action.name} with missing content.`,
                    sortText: `${counter}`,
                };
                items.push(item);
                counter++;
            }
        }
        return items;
    }

    /**
     * Creates a completion item for generating a rule for every possible control action and type combination.
     * @param controlActions The control actions for which the rules should be generated.
     * @returns a completion item for generating a rule for every possible control action and type combination.
     */
    protected generateRulesForEverythingItem(controlActions: VerticalEdge[]): CompletionValueItem {
        let insertText = ``;
        let counter = 0;
        for (const controlAction of controlActions) {
            for (const action of controlAction.comms) {
                for (const type of [
                    "not-provided",
                    "provided",
                    "too-early",
                    "too-late",
                    "wrong-time",
                    "applied-too-long",
                    "stopped-too-soon",
                ]) {
                    insertText += `RL${counter} {
    controlAction: ${controlAction.$container.name}.${action.name}
    type: ${type}
    contexts: {
    }
}
`;
                    counter++;
                }
            }
        }
        const item: CompletionValueItem = {
            label: `Generate rules for every control action and type combination`,
            kind: CompletionItemKind.Snippet,
            insertText: insertText,
            detail: "Inserts for every control action rules for every UCA type.",
            sortText: "1",
        };
        return item;
    }

    /**
     * Creates a completion item for generating a template rule.
     * @returns a completion item for generating a template rule.
     */
    protected generateTemplateRuleItem(): CompletionValueItem {
        return {
            label: "Generate template Rule",
            kind: CompletionItemKind.Snippet,
            insertText: `RL {
    controlAction: 
    type: 
    contexts: {
    }
}`,
            detail: "Inserts a rule with missing content.",
            sortText: "0",
        };
    }

    /**
     * Adds completion items for generating UCA text for a UCA if the current context is a UCA.
     * @param context The completion context.
     * @param next The next feature of the current rule to be called.
     * @param acceptor The completion acceptor to add the completion items.
     */
    protected completionForUCA(context: CompletionContext, next: NextFeature, acceptor: CompletionAcceptor): void {
        if (context.node?.$type === UCA && next.property === "description") {
            const generatedItems = this.generateTextForUCAWithPlainText(
                context.node as UCA,
                context.node.$containerProperty
            );

            if (generatedItems.length > 0) {
                generatedItems.forEach(item => acceptor(context, item));
            }
        }
    }

    /**
     * Generates completion items for the given UCA {@code uca}.
     * @param uca The UCA for which the completion items should be generated.
     * @param property The property in which the UCA is contained. Should be one of "notProvidingUcas", "providingUcas", "wrongTimingUcas", or "continousUcas".
     * @returns completion items for the given UCA.
     */
    protected generateTextForUCAWithPlainText(uca: UCA, property?: string): CompletionValueItem[] {
        const actionUca = uca.$container;
        const system = actionUca.system.ref?.label ?? actionUca.system.$refText;
        let controlAction = `the control action '${actionUca.action.ref?.label}'`;
        const parent = actionUca.action.ref?.$container;
        if (isVerticalEdge(parent)) {
            controlAction += ` to ${parent.target.ref?.label ?? parent.target.$refText}`;
        }
        switch (property) {
            case "notProvidingUcas":
                const notProvidedItem = {
                    label: "Generate not provided UCA Text",
                    kind: CompletionItemKind.Text,
                    insertText: `${system} did not provide ${controlAction}, TODO`,
                    detail: "Inserts the starting text for this UCA.",
                    sortText: "0",
                };
                return [notProvidedItem];
            case "providingUcas":
                const providedItem = {
                    label: "Generate provided UCA Text",
                    kind: CompletionItemKind.Text,
                    insertText: `${system} provided ${controlAction}, TODO`,
                    detail: "Inserts the starting text for this UCA.",
                    sortText: "0",
                };
                return [providedItem];
            case "wrongTimingUcas":
                const tooEarlyItem = {
                    label: "Generate too-early UCA Text",
                    kind: CompletionItemKind.Text,
                    insertText: `${system} provided ${controlAction} before TODO`,
                    detail: "Inserts the starting text for this UCA.",
                    sortText: "0",
                };
                const tooLateItem = {
                    label: "Generate too-late UCA Text",
                    kind: CompletionItemKind.Text,
                    insertText: `${system} provided ${controlAction} after TODO`,
                    detail: "Inserts the starting text for this UCA.",
                    sortText: "1",
                };
                return [tooEarlyItem, tooLateItem];
            case "continousUcas":
                const stoppedTooSoonItem = {
                    label: "Generate stopped-too-soon UCA Text",
                    kind: CompletionItemKind.Text,
                    insertText: `${system} stopped ${controlAction} before TODO`,
                    detail: "Inserts the starting text for this UCA.",
                    sortText: "0",
                };
                const appliedTooLongItem = {
                    label: "Generate applied-too-long UCA Text",
                    kind: CompletionItemKind.Text,
                    insertText: `${system} still applied ${controlAction} after TODO`,
                    detail: "Inserts the starting text for this UCA.",
                    sortText: "1",
                };
                return [stoppedTooSoonItem, appliedTooLongItem];
        }
        return [];
    }

    /**
     * Adds a completion item for generating UCA text for a scenario and completion items to generate basic scenarios if the current context is a loss scenario.
     * @param context The completion context.
     * @param next The next feature of the current rule to be called.
     * @param acceptor The completion acceptor to add the completion items.
     */
    protected completionForScenario(context: CompletionContext, next: NextFeature, acceptor: CompletionAcceptor): void {
        if (context.node?.$type === LossScenario && next.property === "description") {
            const generatedText = this.generateScenarioForUCA(context.node as LossScenario);
            if (generatedText !== "") {
                acceptor(context, {
                    label: "Generate UCA Text",
                    kind: CompletionItemKind.Text,
                    insertText: generatedText,
                    detail: "Inserts the UCA text for this scenario.",
                    sortText: "0",
                });
            }
        }
        if (next.type === LossScenario && next.property === "name") {
            const model =
                context.node?.$type === LossScenario ? context.node.$container : context.node?.$container?.$container;
            if (isModel(model)) {
                const generatedBasicScenariosText = this.generateBasicScenarios(model);
                if (generatedBasicScenariosText !== "") {
                    acceptor(context, {
                        label: "Generate Basic Scenarios",
                        kind: CompletionItemKind.Snippet,
                        insertText: generatedBasicScenariosText,
                        detail: "Creates basic scenarios for all UCAs.",
                        sortText: "0",
                    });
                }
            }
        }
    }

    /**
     * Creates text for basic scenarios for all UCAs in the given {@code model}.
     * @param model The model for which the basic scenarios should be generated.
     * @returns the generated basic scenarios as text.
     */
    protected generateBasicScenarios(model: Model): string {
        let text = ``;
        model.rules.forEach(rule => {
            const system = rule.system.ref?.label ?? rule.system.$refText;
            const controlAction = `the control action '${rule.action.ref?.label}'`;
            rule.contexts.forEach(context => {
                // add scenario for actuator/controlled process failure
                let scenario = `${system}`;
                const contextText = this.createContextText(context, false);
                switch (rule.type) {
                    case "not-provided":
                        scenario += ` provided ${controlAction}, while ${contextText}, but it is not executed.`;
                        break;
                    case "provided":
                        scenario += ` not provided ${controlAction}, while ${contextText}, but it is executed.`;
                        break;
                    case "too-late":
                        scenario += ` provided ${controlAction} in time, while ${contextText}, but it is executed too late.`;
                        break;
                    case "too-early":
                        scenario += ` provided ${controlAction} in time, while ${contextText}, but it is already executed before.`;
                        break;
                    case "stopped-too-soon":
                        scenario += ` applied ${controlAction} long enough, while ${contextText}, but execution is stopped too soon.`;
                        break;
                    case "applied-too-long":
                        scenario += ` stopped ${controlAction} in time, while ${contextText}, but it is executed too long.`;
                        break;
                }
                text += `S for ${context.name} "${scenario} TODO"\n`;
                // add scenarios for incorrect process model values
                const scenarioStart = this.generateScenarioForUCAWithContextTable(context);
                switch (rule.type) {
                    case "not-provided":
                    case "provided":
                        context.assignedValues.forEach(assignedValue => {
                            text += `S for ${context.name} "${scenarioStart} Because ${system} incorrectly believes that ${assignedValue.variable.$refText} is not ${assignedValue.value.$refText}. TODO"\n`;
                        });
                        break;
                    case "too-late":
                        context.assignedValues.forEach(assignedValue => {
                            text += `S for ${context.name} "${scenarioStart} Because ${system} realized too late that ${assignedValue.variable.$refText} is ${assignedValue.value.$refText}. TODO"\n`;
                        });
                        break;
                    case "stopped-too-soon":
                        context.assignedValues.forEach(assignedValue => {
                            text += `S for ${context.name} "${scenarioStart} Because ${system} incorrectly believes that ${assignedValue.variable.$refText} is not ${assignedValue.value.$refText} anymore. TODO"\n`;
                        });
                        break;
                    case "applied-too-long":
                        context.assignedValues.forEach(assignedValue => {
                            text += `S for ${context.name} "${scenarioStart} Because ${system} realized too late that ${assignedValue.variable.$refText} is not ${assignedValue.value.$refText} anymore. TODO"\n`;
                        });
                        break;
                }
            });
        });
        return text;
    }

    /**
     * Generates the UCA text for the given scenario {@code scenario}.
     * If no UCA is reference an empty string is returned.
     * @param scenario The scenario node for which the UCA text should be generated.
     */
    protected generateScenarioForUCA(scenario: LossScenario): string {
        const uca = scenario.uca?.ref;
        if (uca) {
            if (uca.$type === Context) {
                return this.generateScenarioForUCAWithContextTable(uca) + " TODO";
            } else {
                return this.generateScenarioForUCAWithPlainText(uca);
            }
        }
        return "";
    }

    /**
     * Generates a scenario text for a UCA defined with a context table.
     * @param context The UCA context for which the scenario should be generated.
     * @returns the generated scenario text.
     */
    protected generateScenarioForUCAWithContextTable(context: Context): string {
        const rule = context.$container;
        const system = rule.system.ref?.label ?? rule.system.$refText;
        let text = `${system}`;
        const controlAction = `the control action '${rule.action.ref?.label}'`;
        switch (rule.type) {
            case "not-provided":
                text += ` did not provide ${controlAction}`;
                break;
            case "provided":
                text += ` provided ${controlAction}`;
                break;
            case "stopped-too-soon":
                text += ` stopped ${controlAction} too soon`;
                break;
            case "applied-too-long":
                text += ` applied ${controlAction} too long`;
                break;
            case "too-early":
                text += ` provided ${controlAction} too early`;
                break;
            case "too-late":
                text += ` provided ${controlAction} too late`;
                break;
            case "wrong-time":
                text += ` provided ${controlAction} at the wrong time`;
                break;
        }

        text += `, while`;
        text += this.createContextText(context, false);
        text += ".";

        return text;
    }

    /**
     * Creates a text for the given context {@code context}.
     * @param context The context for which the text should be generated.
     * @param present If true the text is generated in present tense, otherwise in past tense.
     * @returns the generated text.
     */
    protected createContextText(context: Context, present: boolean): string {
        let text = ``;
        const tense = present ? "is" : "was";
        context.assignedValues.forEach((assignedValue, index) => {
            if (index > 0) {
                text += ",";
            }
            if (context.assignedValues.length > 1 && index === context.assignedValues.length - 1) {
                text += " and";
            }
            text += ` ${assignedValue.variable.$refText} ${tense} ${assignedValue.value.$refText}`;
        });
        return text;
    }

    /**
     * Generates a scenario text for a UCA defined with plain text.
     * @param uca The UCA for which the scenario should be generated.
     * @returns the generated scenario text.
     */
    protected generateScenarioForUCAWithPlainText(uca: UCA): string {
        return `${uca.description} TODO`;
    }
}
