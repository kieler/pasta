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

import './css/table.css';
import { Table } from '@kieler/table-webview/lib/table';
import { SendContextTableDataAction } from './actions';
import { createHeaderElement, createHeaderRow, createRow, createTable, createTHead, patch } from './html';
import {
    addSelector, addText, ContextCell, ContextTableControlAction, convertControlActionsToStrings, replaceSelector, ContextTableRule, ContextTableSystemVariables,
    Type, ContextTableVariable, ContextTableVariableValues, Row
} from './utils';
import { VNode } from "snabbdom";
import { createResults, determineUsedRules } from './context-table-logic';

interface vscode {
    postMessage(message: any): void;
}
declare const vscode: vscode;

export class ContextTable extends Table {

    /** Ids for the html elements */
    protected actionSelectorId = "select_action";
    protected typeSelectorId = "select_type";
    protected tableId = "context_table";

    // data of the table
    protected rules: ContextTableRule[] = [];
    protected controlActions: ContextTableControlAction[] = [];
    protected systemVariables: ContextTableSystemVariables[] = [];

    // variables to store the currently selected options of the select elements in
    protected selectedControlAction: ContextTableControlAction;
    protected selectedType: Type = Type.PROVIDED;
    protected currentVariables: ContextTableVariableValues[] = [];

    // position where the subheaders should stick
    protected stickValue = "33px";

    // the calculated contexts and the rules for the result columns
    protected contexts: ContextTableVariable[][] = [];
    protected resultsRules: ContextTableRule[][][] = [];
    // determines which resultsRules index belongs to which context index
    protected resultRulesToContext = new Map<number, number>();

    // determines which hazard combinations in the result columns belong to which resultRules indices
    // needed to detect which rows can be merged
    // protected resultToResultRules = new Map<string, number[]>();
    // needed to map a resultRules to its hazard string
    // protected resultRulesToHazards = new Map<number, string>();


    // TODO: change these properties to options
    // protected logicalSimplification = true;
    // protected mergeSubsets = true;
    // protected mergeNos = true;

    // used for highlighting selected element
    protected lastSelected: HTMLElement;

    constructor() {
        super();
        document.addEventListener('click', (event) => {
            const node = event.target;
            const owner = (node as HTMLElement).parentElement;
            if (owner) {
                if (this.lastSelected) {
                    this.lastSelected.parentElement?.classList.remove('focused');
                    this.lastSelected.classList.remove('selected');
                }
                this.lastSelected = node as HTMLElement;
                owner.classList.add('focused');
                (node as HTMLElement).classList.add('selected');
            }
        });
    }

    protected handleMessages(message: any): void {
        const action = message.data.action;
        if (action) {
            if (SendContextTableDataAction.isThisAction(action)) {
                this.handleData(action as SendContextTableDataAction);
            } else {
                super.handleMessages(message);
            }
        } else {
            super.handleMessages(message);
        }
    }

    /**
     * Updates the data of the context table.
     * @param action SendContextTableDataAction that contains the data needed to create the table contents.
     */
    protected handleData(action: SendContextTableDataAction): void {
        this.rules = action.data.rules;
        this.controlActions = action.data.actions;
        this.systemVariables = action.data.systemVariables;
        this.updateActionSelector();
        this.updateTable();
    }

    protected handleResetTable(): void {
        this.contexts = [];
        this.resultsRules = [];
        const table = document.getElementById(this.tableId);
        if (table) {
            const newTable = createTable(this.tableId);
            patch(table, newTable);
        }
    }

    protected initHtml(identifier: string, headers: string[]): void {
        this.identifier = identifier;
        this.tableId = this.identifier + "_table";
        const mainDiv = document.getElementById(identifier + '_container');
        if (mainDiv) {
            // Create text and selector element for selecting a control action
            addText(mainDiv, "Choose a Control Action:");
            addSelector(mainDiv, this.actionSelectorId, 0, [], "13px", "170px");

            // Create text and selector element for selecting the action type
            addText(mainDiv, "Choose a Type:");
            addSelector(mainDiv, this.typeSelectorId, this.selectedType, ["provided", "not provided", "both"], "43px", "115px");

            // add listener
            const htmlTypeSelector = document.getElementById(this.typeSelectorId) as HTMLSelectElement;
            htmlTypeSelector.addEventListener('change', () => {
                switch (htmlTypeSelector.selectedIndex) {
                    case 0:
                        this.selectedType = Type.PROVIDED;
                        break;
                    case 1:
                        this.selectedType = Type.NOT_PROVIDED;
                        break;
                    case 2:
                        this.selectedType = Type.BOTH;
                        break;
                }
                this.updateTable();
            });

            // Create text element for table
            addText(mainDiv, "Hover over the UCAs to see their associated hazards!");
            // create a table
            const placeholderTable = document.createElement("div");
            mainDiv.append(placeholderTable);
            const table = createTable(this.tableId);
            patch(placeholderTable, table);
        }
    }

    /**
     * Initializes the action selector with the available actions.
     */
    protected updateActionSelector(): void {
        const selector = document.getElementById(this.actionSelectorId) as HTMLSelectElement;
        if (selector) {
            // translate control actions to strings and add them to the selector
            const actions = convertControlActionsToStrings(this.controlActions);
            replaceSelector(selector, actions, 0);

            // update currently selected control action
            this.updateControlActionSelection(0);

            // add listener
            const htmlActionSelector = document.getElementById(this.actionSelectorId) as HTMLSelectElement;
            htmlActionSelector.addEventListener('change', () => {
                this.updateControlActionSelection(htmlActionSelector.selectedIndex);
                this.updateTable();
            });
        }
    }

    /**
     * Sets the current variables based on the current controller.
     */
    protected setCurrentVariables(): void {
        const variables = this.systemVariables.find(systemVariable => systemVariable.system === this.selectedControlAction.controller)?.variables;
        if (variables) {
            this.currentVariables = variables;
        } else {
            console.log("No system component selected");
        }
    }

    /**
     * Creates the header (first table row) of the context table.
     */
    protected createHeader(): VNode {
        const headers: VNode[] = [];
        // the first header column is for the context and needs to span as many columns as there are context variables
        if (this.currentVariables.length > 0) {
            const contextVariablesHeader = createHeaderElement("Context Variables", "0px", undefined, this.currentVariables.length);
            headers.push(contextVariablesHeader);
        }

        // The second header column is the hazardous column
        // The column-/row-span depends on what action type has been selected
        let colSpan: number | undefined = undefined;
        let rowSpan: number | undefined = undefined;
        switch (this.selectedType) {
            case Type.PROVIDED:
                colSpan = 3;
                break;
            case Type.NOT_PROVIDED:
                rowSpan = 2;
                break;
            case Type.BOTH:
                colSpan = 4;
                break;
        }
        const hazardousHeader = createHeaderElement("Hazardous?", "0px", rowSpan, colSpan);
        headers.push(hazardousHeader);

        // create the header row
        return createHeaderRow(headers);
    }

    /**
     * Creates the sub-header (second table row) of the context table.
     */
    protected createSubHeader(): VNode {
        const headers: VNode[] = [];
        // sub-headers for the context variables
        this.currentVariables.forEach(variable => {
            const header = createHeaderElement(variable.name, this.stickValue);
            headers.push(header);
        });
        // hazardous sub-options, which depend on the selected action type
        let times: string[] = [];
        switch (this.selectedType) {
            case Type.PROVIDED:
                times = ["Anytime", "Too Early / Too Late", "Stopped Too Soon / Applied Too Long"];
                break;
            case Type.BOTH:
                times = ["Anytime", "Too Early / Too Late", "Stopped Too Soon / Applied Too Long", "Never"];
                break;
        }
        times.forEach(time => {
            const header = createHeaderElement(time, this.stickValue);
            headers.push(header);
        });
        // create the header row
        return createHeaderRow(headers);
    }

    /**
     * Updates the currently selected control action.
     * @param index Index determining which control action is selected.
     */
    protected updateControlActionSelection(index: number): void {
        this.selectedControlAction = this.controlActions[index];
        this.setCurrentVariables();
    }

    /**
     * Creates the content of the table.
     */
    protected updateTable(): void {
        // reset old table
        this.handleResetTable();
        const table = document.getElementById(this.tableId) as HTMLTableElement;
        if (table) {
            // create and add a header placeholder
            const placeholderHeader = document.createElement("thead");
            table.appendChild(placeholderHeader);
            // replace with correct header
            const newTHead = createTHead([this.createHeader(), this.createSubHeader()]);
            patch(placeholderHeader, newTHead);

            // fill the table
            if (this.currentVariables.length > 0) {
                // generate all possible contexts
                this.contexts = this.createContexts(0, this.currentVariables, []);
                // determine the results for each context
                this.determineResults();
                // create the rows
                const rows = this.determineRows();
                // add the rows to the html table
                rows.forEach(row => this.addRow(table, row, "context"));
            } else {
                // table is empty
                this.addRow(table, { variables: [], results: [] }, "empty-table");
            }
        }
    }

    /**
     * Determine the results for each context.
     */
    protected determineResults() {
        for (let i = 0; i < this.contexts.length; i++) {
            const variables = this.contexts[i];
            // determine the used rules
            const usedRules = determineUsedRules(variables, this.rules, this.selectedControlAction.controller,
                this.selectedControlAction.action, this.selectedType);
            // save them and map to the current context
            this.resultsRules.push(usedRules);
            this.resultRulesToContext.set(this.resultsRules.length - 1, i);

            // if (this.logicalSimplification) {
            //     // determine the hazard text
            //     let hazards = "";
            //     usedRules.forEach(rules => {
            //         const text = rules.map(rule => rule.hazards).toString();
            //         if (text !== "") {
            //             hazards += text + "; ";
            //         }
            //     });
            //     // save the resultRules to which this hazard text belongs
            //     this.resultRulesToHazards.set(this.resultsRules.length - 1, hazards);
            //     // save which contexts belong to the hazard text
            //     if (this.resultToResultRules.has(hazards)) {
            //         this.resultToResultRules.get(hazards)?.push(this.resultsRules.length - 1);
            //     } else {
            //         this.resultToResultRules.set(hazards, [this.resultsRules.length - 1]);
            //     }
            // }
        }
    }

    /**
     * Creates the row instances.
     * @returns the rows containing the possible contexts and their result columns values.
     */
    protected determineRows(): Row[] {
        const rows: Row[] = [];

        // if (!this.logicalSimplification) {
            // go through the save results and create a row for each
            for (let i = 0; i < this.resultsRules.length; i++) {
                // add the row
                rows.push(this.createRowInstance(i));
            }
        // } else {
            // do logical simplification
            // for (let i = 0; i < this.resultsRules.length; i++) {
                // const hazards = this.resultRulesToHazards.get(i)!;
                // const indices = this.resultToResultRules.get(hazards);
                // if (indices?.length === 1 || !this.merge(hazards, i, indices!)) {
                    // no simplification
                    // add the row
                    // rows.push(this.createRowInstance(i));
                // } else {

                // }
            // }
        // }

        return rows;
    }

    // protected merge(hazards: string, resultRulesIndex: number, indices: number[]): boolean {
    //     if (hazards === "") {
    //         return this.mergeNos;
    //     } else {
    //         // TODO: this is currently not correct, it does not suffice that all values of one variables occur. all other variables must have the same value in all contexts. maybe just check the rules for missing/ANY variables
    //         let found = false;
    //         // get the contexts for which the hazards string is equal
    //         const contexts = this.contexts.filter((_, index) => indices.includes(index));
    //         // go through all variables
    //         for (let i = 0; i < this.currentVariables.length && !found; i++) {
    //             let mergeable = true;
    //             const currentVariable = this.currentVariables[i];
    //             // collect the corresponding variables in the contexts
    //             const contextsVariable = contexts.map(context => context.find(variable => variable.name === currentVariable.name));
    //             // go through all possible values for the variable and check whether one of the context variables has this value
    //             for (let valueIndex = 0; valueIndex < currentVariable.values.length && mergeable; valueIndex++) {
    //                 const currentValue = currentVariable.values[valueIndex];
    //                 mergeable = contextsVariable.find(variable => variable?.value === currentValue) !== undefined;
    //             }
    //             // if all values of the variable occur, the rows can be merged
    //             if (mergeable) {
    //                 found = true;
    //             }
    //         }
    //         return found;
    //     }
    // }

    /**
     * Creates a row instance based on the {@code resultRulesIndex}. 
     * @param resultRulesIndex Determines which resultsRule should be used.
     * @returns a row instance with the context and the result determines by {@code resultRulesIndex}.
     */
    protected createRowInstance(resultRulesIndex: number): Row {
        // get the context
        const context = this.contexts[this.resultRulesToContext.get(resultRulesIndex)!];
        // get the hazards and rules
        const results: { hazards: string[], rules: ContextTableRule[]; }[] = [];
        this.resultsRules[resultRulesIndex].forEach(resultRules => {
            results.push({ hazards: resultRules.map(rule => rule.hazards.toString()), rules: resultRules });
        });
        return { variables: context, results: results };
    }


    /**
     * Creates and appends one non-header row to the table. 
     * @param table The HTMLTableElement to apply the row to.
     * @param row The row to add.
     * @param id The id of the row.
     */
    protected addRow(table: HTMLTableElement, row: Row, id: string): void {
        // create row placeholder
        const placeholderRow = document.createElement("tr");
        table.appendChild(placeholderRow);

        let cells: ContextCell[] = [];
        if (row.variables.length > 0) {
            // values of the context variables
            cells = row.variables.map(variable => { return { cssClass: "context-variable", value: variable.value, colSpan: 1 }; });
            // append the result cells
            cells = cells.concat(createResults(row.results));
        } else {
            // no variables exist
            let colSpan: number = 0;
            switch (this.selectedType) {
                case Type.PROVIDED:
                    colSpan = 3;
                    break;
                case Type.NOT_PROVIDED:
                    colSpan = 1;
                    break;
                case Type.BOTH:
                    colSpan = 4;
                    break;
            }
            cells.push({ cssClass: "result", value: "No", colSpan: colSpan });
        }

        // create the row
        const htmlRow = createRow(id, cells);
        patch(placeholderRow, htmlRow);
    }


    /**
     * Generates all possible value combinations of the given variables.
     * @param variableIndex Index to determine from which variable to apply a value next.
     * @param variableValues All variables with their possible values for which the combinations should be generated.
     * @param determinedValues The already determined variable values.
     * @returns All possible value combinations of the given variables.
     */
    protected createContexts(variableIndex: number, variableValues: ContextTableVariableValues[], determinedValues: ContextTableVariable[]): (ContextTableVariable[])[] {
        let result: (ContextTableVariable[])[] = [];
        // load the values of the current recursion's variable
        const currentValues = variableValues[variableIndex].values;
        const lastVariable = variableIndex == variableValues.length - 1;
        // go through all the values of the current variable
        for (let valueIndex = 0; valueIndex < currentValues.length; valueIndex++) {
            // push the currently indexed value
            determinedValues.push({ name: variableValues[variableIndex].name, value: currentValues[valueIndex] });
            // if this was the last value to be added, a complete collection of values has been assembled
            if (lastVariable) {
                const context: ContextTableVariable[] = [];
                determinedValues.forEach(variable => context.push(variable));
                result.push(context);
            } else {
                // else, go to the next variable and call the method on it
                result = result.concat(this.createContexts(variableIndex + 1, variableValues, determinedValues));
            }
            // remove the currently indexed value afterward, when all possible contexts with it have been collected
            determinedValues.pop();
        }
        return result;
    }


}

new ContextTable();