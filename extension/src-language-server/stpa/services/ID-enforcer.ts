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

import { CstNode, isCompositeCstNode, LangiumDocument } from "langium";
import { TextDocumentContentChangeEvent } from "vscode";
import { Range, RenameParams, TextEdit } from "vscode-languageserver";
import {
    ActionUCAs,
    ControllerConstraint,
    DCARule,
    Hazard,
    isHazard,
    isModel,
    isRule,
    isSystemConstraint,
    Loss,
    LossScenario,
    Model,
    Rule,
    SafetyConstraint,
    SystemConstraint,
    SystemResponsibilities,
} from "../../generated/ast.js";
import { StpaServices } from "../stpa-module.js";
import { collectElementsWithSubComps, elementWithName, elementWithRefs } from "../utils.js";

/**
 * Default prefixes for the different STPA aspects.
 */
class IDPrefix {
    static Loss = "L";
    static Hazard = "H";
    static SystemConstraint = "SC";
    static Responsibility = "R";
    static Rule = "RL";
    static UCA = "UCA";
    static ControllerConstraint = "C";
    static LossScenario = "Scenario";
    static SafetyRequirement = "SR";
    static DCA = "DCA";
    static DCARule = "DRL";
}

/**
 * Contains methods to enforce correct IDs on STPA components.
 */
export class IDEnforcer {
    /** Determines whether ID enforcement is enabled. */
    protected enabled: boolean = true;

    /** langium services for the stpa DSL */
    protected readonly stpaServices: StpaServices;

    /** Current document uri for which IDs are enforced.  */
    protected currentUri: string;
    /** Current document for which IDs are enforced.  */
    protected currentDocument: LangiumDocument<Model>;

    constructor(stpaServices: StpaServices) {
        this.stpaServices = stpaServices;
    }

    /**
     * Enables the ID enforcement.
     */
    enable(): void {
        this.enabled = true;
    }

    /**
     * Disables the ID enforcement.
     */
    disable(): void {
        this.enabled = false;
    }

    /**
     * Checks and enforces IDs for STPA components belonging to the same aspect where the given change happened.
     * @param changes The text document changes.
     * @param uri The uri of the document that has changed.
     * @returns the text edits needed to enforce the correct IDs.
     */
    async enforceIDs(changes: TextDocumentContentChangeEvent[], uri: string): Promise<TextEdit[]> {
        if (!this.enabled) {
            return [];
        }
        // update current document information
        this.currentUri = uri;
        this.currentDocument = this.stpaServices.shared.workspace.LangiumDocuments.getDocument(
            uri as any
        ) as LangiumDocument<Model>;

        // ID enforcement can only be done if the parser has no errors. Otherwise other syntax elements than IDs are interpreted as IDs.
        if (
            this.currentDocument.parseResult.lexerErrors.length !== 0 ||
            this.currentDocument.parseResult.parserErrors.length !== 0
        ) {
            return [];
        }

        let edits: TextEdit[] = [];
        for (const change of changes) {
            // calculates the elements that need to be considered for ID enforcement and the prefix that should be used for it
            const modifiedAspect = this.findModifiedAspect(change.rangeOffset);
            if (modifiedAspect) {
                const elements: elementWithName[] = modifiedAspect.elements;
                const prefix = modifiedAspect.prefix;
                // enforce IDs on the affected elements
                edits = edits.concat(await this.enforceIDsOnElements(elements, prefix, change));

                // rule IDs must be handled separately
                if (modifiedAspect.ruleElements.length !== 0) {
                    edits = edits.concat(
                        await this.enforceIDsOnElements(
                            modifiedAspect.ruleElements,
                            isRule(modifiedAspect.ruleElements[0]) ? IDPrefix.Rule : IDPrefix.DCARule,
                            change
                        )
                    );
                }
            }
        }
        return edits;
    }

    /**
     * Enforces IDs on the given elements using the given {@code prefix}.
     * @param elements The elements which IDs should be checked and possibly updated.
     * @param prefix The prefix for the new IDs.
     * @param change The text change that triggered the enforcing of IDs. Needed because only the elements below the modified one are checked.
     * @param edits The edits needed to enforce the calculated IDs.
     */
    protected async enforceIDsOnElements(
        elements: elementWithName[],
        prefix: string,
        change: TextDocumentContentChangeEvent
    ): Promise<TextEdit[]> {
        let edits: TextEdit[] = [];
        // index of the modified element
        let index = elements.findIndex(element => element.$cstNode && element.$cstNode.offset >= change.rangeOffset);
        if (index < 0) {
            // modified element is the last one
            index = elements.length;
            // references to a deleted element must be deleted
            edits = edits.concat(this.deleteReferences(prefix + (index + 1)));
        } else {
            // compute edits for renaming the elements below the modified element
            edits = await this.enforceIDsBelowModifiedElement(index, elements, prefix, change.text === "");
        }

        // create edit to rename the modified element
        const modifiedElement = elements[index - 1];
        if (modifiedElement && modifiedElement.$cstNode && modifiedElement.name !== prefix + index) {
            // calculate the range of the ID of the modified element
            const range = modifiedElement.$cstNode.range;
            const newRange = {
                start: { line: range.start.line, character: range.start.character },
                end: { line: range.start.line, character: range.start.character + modifiedElement.name.length },
            };
            this.fixHazardRange(newRange, prefix, modifiedElement);
            newRange.end.character = newRange.start.character + modifiedElement.name.length;
            newRange.end.line = newRange.start.line;
            // create the edit
            const modifiedElementEdit = TextEdit.replace(newRange, prefix + index);
            edits.push(modifiedElementEdit);
        }
        return edits;
    }

    /**
     * For some reason the range of the hazard is not correct. This method fixes this manually.
     * @param range The range of the hazard.
     * @param prefix The prefix to check whether the modified element is a hazard.
     * @param modifiedElement The modified element.
     */
    protected fixHazardRange(range: Range, prefix: string, modifiedElement: elementWithName): void {
        // range for hazards is wrong (dont know why), so it must be adjusted
        if (prefix === "H") {
            range.start.character -= 2 + modifiedElement.name.length;
        }
    }

    /**
     * Enforces correct IDs on the {@code elements} which index is higher than or equal to {@code index} using {@code prefix} for the new ID.
     * Depending on {@code decrease} the start element is chosen.
     * @param index The index of the first element that should be checked.
     * @param elements The elements which IDs should be checked and possibley updated.
     * @param prefix The prefix for the new ID of the elements. The new ID will be the prefix + index of the element.
     * @param decrease Determines where to start. If "false", the last element is the start element.
     *      Otherwise the first element after the modified one is the start element.
     * @returns The edits for renaming the elements.
     */
    protected async enforceIDsBelowModifiedElement(
        index: number,
        elements: elementWithName[],
        prefix: string,
        decrease: boolean
    ): Promise<TextEdit[]> {
        // guarantee that the index is not out of bounds
        if (index < 0) {
            index = 0;
        }
        // compute edits to rename all elements
        let edits: TextEdit[] = [];
        // renaming is only needed, when elements not have the correct ID yet
        if (elements[elements.length - 1].name !== prefix + elements.length) {
            const modifiedElement = elements[index];
            if (decrease) {
                // IDs of the elements are decreased so we must start with the lowest ID

                // references to a deleted element must be deleted
                edits = edits.concat(this.deleteReferences(prefix + (index + 1)));

                // rename elements below the deleted one
                for (let i = index; i < elements.length; i++) {
                    const renameEdits = await this.renameID(elements[i], prefix, i + 1);
                    edits = edits.concat(renameEdits);
                }
            } else {
                // IDs of the elements are increased so we must start with the largest ID
                for (let i = elements.length - 1; i >= index; i--) {
                    const elementToRename = elements[i];
                    if (modifiedElement && elementToRename.name !== modifiedElement.name) {
                        // rename the current element
                        const renameEdits = await this.renameID(elementToRename, prefix, i + 1);
                        edits = edits.concat(renameEdits);
                    } else {
                        // if the element to rename has the same name as the modified element it must be renamed manually
                        // and the references are updated by calling the rename function with the modified element
                        if (elementToRename.$cstNode) {
                            // rename current element manually
                            const range = elementToRename.$cstNode.range;
                            range.end.character = range.start.character + elementToRename.name.length;
                            range.end.line = range.start.line;
                            const modifiedElementEdit = TextEdit.replace(range, prefix + (i + 1));
                            edits.push(modifiedElementEdit);
                        }
                        // rename references by calling the rename function with the modified element
                        let renameEdits = await this.renameID(modifiedElement, prefix, i + 1);
                        // delete the edit that renames the modified element (undo the renaming for this element)
                        if (modifiedElement.$cstNode) {
                            const range = modifiedElement.$cstNode.range;
                            renameEdits = renameEdits.filter(
                                edit =>
                                    !(
                                        edit.range.start.line === range.start.line &&
                                        edit.range.start.character === range.start.character
                                    )
                            );
                        }
                        // add the edits to the list
                        edits = edits.concat(renameEdits);
                    }
                }
            }
        }
        return edits;
    }

    /**
     * Deleted references to the component with the given {@code name}.
     * @param name Name of the component to which references should be deleted.
     * @returns edits to delete references to the component with the given name.
     */
    protected deleteReferences(name: string): TextEdit[] {
        // components of the model
        const model: Model = this.currentDocument.parseResult.value;
        const hazards = collectElementsWithSubComps(model.hazards) as Hazard[];
        const sysCons = collectElementsWithSubComps(model.systemLevelConstraints) as SystemConstraint[];
        const responsibilities = model.responsibilities?.map(r => r.responsiblitiesForOneSystem).flat(1);
        const ucas = model.allUCAs
            ?.map(sysUCA =>
                sysUCA.providingUcas.concat(sysUCA.notProvidingUcas, sysUCA.wrongTimingUcas, sysUCA.continousUcas)
            )
            .flat(1);
        const contexts = model.rules?.map(rule => rule.contexts).flat(1);
        const scenarioHazards = model.scenarios.map(scenario => scenario.list);
        const scenarioUCAs = model.scenarios;

        // collect all elements that have a reference list
        const elementsWithRefs: (elementWithRefs | LossScenario)[] = [
            ...hazards,
            ...sysCons,
            ...responsibilities,
            ...ucas.map(uca => uca.list),
            ...contexts.map(context => context.list),
            ...model.controllerConstraints,
            ...scenarioHazards,
            ...scenarioUCAs,
            ...model.safetyCons,
        ];

        // compute edits to delete references to the given name
        const edits: TextEdit[] = [];
        for (const node of elementsWithRefs) {
            if (node && isCompositeCstNode(node.$cstNode)) {
                const children = node.$cstNode.children;
                const index = children.findIndex(token => token.text === name);
                if (index !== -1) {
                    // delete the reference
                    const range = children[index].range;
                    // if it es not the only reference in the reference list a comma must be deleted as well
                    if (children[index - 1].text === ",") {
                        range.start = children[index - 1].range.start;
                    } else if (children[index + 1].text === ",") {
                        range.end = children[index + 1].range.end;
                    }
                    const modifiedElementEdit = TextEdit.del(range);
                    edits.push(modifiedElementEdit);
                }
            }
        }
        return edits;
    }

    /**
     * Renames the given {@code element} with {@code prefix} + {@code counter}.
     * @param element The element to rename.
     * @param prefix The prefix for the new ID.
     * @param counter The counter for the new ID.
     * @returns The edits to rename the given element and its references.
     */
    protected async renameID(element: elementWithName, prefix: string, counter: number): Promise<TextEdit[]> {
        let edits: TextEdit[] = [];
        if (element && element.$cstNode) {
            // parameters needed for renaming
            const params: RenameParams = {
                textDocument: this.currentDocument.textDocument,
                position: element.$cstNode.range.start,
                newName: prefix + counter,
            };
            // compute the textedits for renaming
            const edit = await this.stpaServices.lsp.RenameProvider!.rename(this.currentDocument, params);
            if (edit !== undefined && edit.changes !== undefined) {
                edits = edits.concat(edit.changes[this.currentUri]);
            }
            // rename children
            if ((isHazard(element) || isSystemConstraint(element)) && element.subComponents.length !== 0) {
                let index = 1;
                for (const child of element.subComponents) {
                    edits = edits.concat(await this.renameID(child, prefix + counter + ".", index));
                    index++;
                }
            }
        }
        // return the edits
        return edits;
    }

    /**
     * Determines the STPA aspect the given {@code offset} belongs to. When the offset belongs to a subcomponent only the elements on the same hierarchy level are considered.
     * @param offset Offset in the file, for which the corresponding aspect should be determined.
     * @returns the elements and prefix of the STPA aspect corresponding to the given offset.
     */
    protected findModifiedAspect(
        offset: number
    ): { elements: elementWithName[]; prefix: string; ruleElements: elementWithName[] } | undefined {
        const model: Model = this.currentDocument.parseResult.value;

        let elements: elementWithName[] = [];
        let prefix = "";
        let ruleElements: elementWithName[] = [];

        let node = this.findLeafNodeAtOffset(this.currentDocument.parseResult.value.$cstNode!, offset);
        while (node && !isModel(node?.element) && !isModel(node?.element.$container)) {
            node = node?.parent;
        }

        // determine the aspect for the given offset
        if (!node) {
            return undefined;
        } else {
            switch (node.element.$type) {
                case Loss:
                    elements = model.losses;
                    prefix = IDPrefix.Loss;
                    break;
                case Hazard:
                    // sub-components must be considered when determining the affected elements
                    const modifiedHazard = this.findAffectedSubComponents(model.hazards, IDPrefix.Hazard, offset);
                    elements = modifiedHazard.elements;
                    prefix = modifiedHazard.prefix;
                    break;
                case SystemConstraint:
                    // sub-components must be considered when determining the affected elements
                    const modifiedSystemConstraint = this.findAffectedSubComponents(
                        model.systemLevelConstraints,
                        IDPrefix.SystemConstraint,
                        offset
                    );
                    elements = modifiedSystemConstraint.elements;
                    prefix = modifiedSystemConstraint.prefix;
                    break;
                case SystemResponsibilities:
                    elements = model.responsibilities.flatMap(resp => resp.responsiblitiesForOneSystem);
                    prefix = IDPrefix.Responsibility;
                    break;
                case ActionUCAs:
                case Rule:
                    elements = model.allUCAs.flatMap(sysUCA =>
                        sysUCA.notProvidingUcas.concat(
                            sysUCA.providingUcas,
                            sysUCA.wrongTimingUcas,
                            sysUCA.continousUcas
                        )
                    );
                    elements = elements.concat(model.rules.flatMap(rule => rule.contexts));
                    prefix = IDPrefix.UCA;
                    // rules must be handled separately since they are mixed with the UCAs
                    ruleElements = model.rules;
                    break;
                case ControllerConstraint:
                    elements = model.controllerConstraints;
                    prefix = IDPrefix.ControllerConstraint;
                    break;
                case LossScenario:
                    elements = model.scenarios;
                    prefix = IDPrefix.LossScenario;
                    break;
                case SafetyConstraint:
                    elements = model.safetyCons;
                    prefix = IDPrefix.SafetyRequirement;
                    break;
                case DCARule:
                    elements = model.allDCAs.flatMap(dca => dca.contexts);
                    prefix = IDPrefix.DCA;
                    // rules must be handled separately since they are mixed with the DCAs
                    ruleElements = model.allDCAs;
                    break;
            }
        }

        return { elements, prefix, ruleElements };
    }

    /**
     * Changes the method from sprotty to return the closest CstNode to the given offset.
     * @param node The node to start the search from.
     * @param offset The offset for which the closest node should be determined.
     * @returns the closest node to the given offset.
     */
    protected findLeafNodeAtOffset(node: CstNode, offset: number): CstNode | undefined {
        if (isCompositeCstNode(node)) {
            let firstChild = 0;
            let lastChild = node.children.length - 1;
            while (firstChild < lastChild) {
                const middleChild = Math.floor((firstChild + lastChild) / 2);
                const n = node.children[middleChild];
                if (n.offset > offset) {
                    lastChild = middleChild - 1;
                } else if (n.end <= offset) {
                    firstChild = middleChild + 1;
                } else {
                    return this.findLeafNodeAtOffset(n, offset);
                }
            }
            if (firstChild === lastChild) {
                return this.findLeafNodeAtOffset(node.children[firstChild], offset);
            }
        }
        return node;
    }

    /**
     * Determines the elements affected by the given {@code offfset}.
     * @param originalElements The top-level elements which may be affected by the offset.
     * @param originalPrefix The prefix for the top-level elements.
     * @param offset Offset in the file for which the affected components should be determined.
     * @returns the elements affected by the offset and their prefix.
     */
    protected findAffectedSubComponents(
        originalElements: Hazard[] | SystemConstraint[],
        originalPrefix: string,
        offset: number
    ): { elements: Hazard[] | SystemConstraint[]; prefix: string } {
        let elements = originalElements;
        let prefix = originalPrefix;
        // index of the affected element
        let index = elements.findIndex(element => element.$cstNode && element.$cstNode.offset >= offset);
        if (index < 0) {
            // modified element is the last one
            index = elements.length - 1;
        }
        const element = elements[index];

        // check whether the children are affected
        // if the children are affected, it must be checked whether they have again affected children
        // otherwise the current elements are the affected ones
        if (
            element.subComponents.length !== 0 &&
            element.subComponents[0].$cstNode &&
            element.subComponents[0].$cstNode.offset <= offset
        ) {
            const modified = this.findAffectedSubComponents(element.subComponents, element.name + ".", offset);
            elements = modified.elements;
            prefix = modified.prefix;
        }
        return { elements, prefix };
    }
}
