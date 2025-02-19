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

import { Table } from "@kieler/table-webview/lib/table";
import { VNode } from "snabbdom";
import { SendContextTableDataAction } from "./actions";
import { createResults, determineUsedRules } from "./context-table-logic";
import "./css/table.css";
import { createHeaderElement, createHeaderRow, createRow, createTable, createTHead, initContextTable, patch } from "./html";
import {
    addSelector,
    addText,
    ContextCell,
    convertControlActionsToStrings,
    replaceSelector,
} from "./utils";
import { ContextTableControlAction, ContextTableRule, ContextTableSystemVariables, ContextTableVariable, ContextTableVariableValues, Row, Type } from './utils-classes';

interface vscode {
    postMessage(message: any): void;
}
declare const vscode: vscode;

export class ContextTable extends Table {
    /** Ids for the html elements */
    protected actionSelectorId = "select_action";
    protected typeSelectorId = "select_type";
    protected tableId = "context_table";

    /** Offsets for the selectors */
    protected selectorControlActionOffset = { top: "13px", left: "170px" };
    protected selectorTypeOffset = { top: "43px", left: "115px" };

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

    // used for highlighting selected element
    protected lastSelected: HTMLElement;

    constructor() {
        super();
        document.addEventListener("click", event => {
            const node = event.target;
            const owner = (node as HTMLElement).parentElement;
            if (owner) {
                if (this.lastSelected) {
                    this.lastSelected.parentElement?.classList.remove("focused");
                    this.lastSelected.classList.remove("selected");
                }
                this.lastSelected = node as HTMLElement;
                owner.classList.add("focused");
                (node as HTMLElement).classList.add("selected");
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

    protected initHtml(identifier: string): void {
        this.identifier = identifier;
        this.tableId = this.identifier + "_table";
        const mainDiv = document.getElementById(identifier + "_container");
        if (mainDiv) {
            // Create text and selector element for selecting a control action
            addText(mainDiv, "Choose a Control Action:");
            addSelector(mainDiv, this.actionSelectorId, 0, [], this.selectorControlActionOffset.top, this.selectorControlActionOffset.left);

            // Create text and selector element for selecting the action type
            addText(mainDiv, "Choose a Type:");
            addSelector(
                mainDiv,
                this.typeSelectorId,
                this.selectedType,
                ["provided", "not provided", "both"],
                this.selectorTypeOffset.top,
                this.selectorTypeOffset.left
            );

            // add listener
            const htmlTypeSelector = document.getElementById(this.typeSelectorId) as HTMLSelectElement;
            htmlTypeSelector.addEventListener("change", () => {
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
            const table = initContextTable(this.tableId);
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
            // set the selector to the previously selected action if it still exists
            const currentSelected = selector.value;
            const newIndex = actions.findIndex(action => action === currentSelected);
            replaceSelector(selector, actions, newIndex === -1 ? 0 : newIndex);

            // update currently selected control action
            this.updateControlActionSelection(newIndex === -1 ? 0 : newIndex);

            // add listener
            const htmlActionSelector = document.getElementById(this.actionSelectorId) as HTMLSelectElement;
            if (newIndex !== -1) {
                // update the selected control action to the one before the change
                htmlActionSelector.value = actions[newIndex];
            }
            htmlActionSelector.addEventListener("change", () => {
                this.updateControlActionSelection(htmlActionSelector.selectedIndex);
                this.updateTable();
            });
        }
    }

    /**
     * Sets the current variables based on the current controller.
     */
    protected setCurrentVariables(): void {
        const variables = this.systemVariables.find(
            systemVariable => systemVariable.system === this.selectedControlAction.controller
        )?.variables;
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
            const contextVariablesHeader = createHeaderElement(
                "Context Variables",
                "0px",
                undefined,
                this.currentVariables.length
            );
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
    protected determineResults(): void {
        for (let i = 0; i < this.contexts.length; i++) {
            const variables = this.contexts[i];
            // determine the used rules
            const usedRules = determineUsedRules(
                variables,
                this.rules,
                this.selectedControlAction.controller,
                this.selectedControlAction.action,
                this.selectedType
            );
            // save them and map to the current context
            this.resultsRules.push(usedRules);
            this.resultRulesToContext.set(this.resultsRules.length - 1, i);
        }
    }

    /**
     * Creates the row instances.
     * @returns the rows containing the possible contexts and their result columns values.
     */
    protected determineRows(): Row[] {
        const rows: Row[] = [];
        for (let i = 0; i < this.resultsRules.length; i++) {
            // add the row
            rows.push(this.createRowInstance(i));
        }
        return rows;
    }

    /**
     * Creates a row instance based on the {@code resultRulesIndex}.
     * @param resultRulesIndex Determines which resultsRule should be used.
     * @returns a row instance with the context and the result determines by {@code resultRulesIndex}.
     */
    protected createRowInstance(resultRulesIndex: number): Row {
        // get the context
        const context = this.contexts[this.resultRulesToContext.get(resultRulesIndex)!];
        // get the hazards and rules
        const results: { hazards: string[]; rules: ContextTableRule[] }[] = [];
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
            cells = row.variables.map(variable => {
                return { cssClass: "context-variable", value: variable.value, colSpan: 1 };
            });
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
    protected createContexts(
        variableIndex: number,
        variableValues: ContextTableVariableValues[],
        determinedValues: ContextTableVariable[]
    ): ContextTableVariable[][] {
        let result: ContextTableVariable[][] = [];
        // load the values of the current recursion's variable
        const currentValues = variableValues[variableIndex].values;
        const lastVariable = variableIndex === variableValues.length - 1;
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
