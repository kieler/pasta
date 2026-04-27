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


import { attributesModule, Classes, classModule, eventListenersModule, init, jsx, propsModule, styleModule, VNode } from 'snabbdom';
import { createVarMap, getRowData, getUCATypeString, postAddRule } from './utils';
import { ContextTableVariableValues, ContextTableControlAction, Type, ContextCell } from './utils-classes';

/** Needed to update the html document */
export const patch = init([
    // Init patch function with chosen modules
    propsModule, // for setting properties on DOM elements
    styleModule, // handles styling on elements with support for animations
    eventListenersModule, // attaches event listeners
    attributesModule, // for using attributes on svg elements
    // IMPORTANT: classModule must be after attributesModule. Otherwise it does not work when classes are also in the attributes list.
    classModule // makes it easy to toggle classes
]);

/**
 * Creates a selector with the given attributes.
 * @param id ID of the selector.
 * @param index Selected Index of the selector.
 * @param options The options the selector contains.
 * @param topDistance The distance of the text to the top border.
 * @param leftDistance The distance of the text to the left border.
 * @returns A selector VNode.
 */
export function createSelector(id: string, index: number, options: string[], topDistance?: string, leftDistance?: string): VNode {
    const optionHtmls = options.map(option => createOption(option));
    if (topDistance && leftDistance) {
        return <select attrs={{ id: id, selectedIndex: index }} style={{ position: "absolute", top: topDistance, left: leftDistance }}>{optionHtmls}</select>;
    } else if (topDistance) {
        return <select attrs={{ id: id, selectedIndex: index }} style={{ position: "absolute", top: topDistance }}>{optionHtmls}</select>;
    } else if (leftDistance) {
        return <select attrs={{ id: id, selectedIndex: index }} style={{ position: "absolute", left: leftDistance }}>{optionHtmls}</select>;
    } else {
        return <select attrs={{ id: id, selectedIndex: index }} style={{ position: "absolute" }}>{optionHtmls}</select>;
    }
}

/**
 * Creates a table VNode enclosed by a div element with the 'context table' class.
 * @param id The id of the table.
 * @returns A table VNode enclosed by a div element.
 */
export function initContextTable(id: string): VNode {
    return <div class={{contextTable: true}}>{createTable(id)}</div>;
}

/**
 * Creates a table VNode.
 * @param id The id of the table.
 * @returns A table VNode.
 */
export function createTable(id: string): VNode {
    return <table attrs={{ id: id }}></table>;
}

/**
 * Creates an option for a selector.
 * @param option The text of the option.
 * @returns An option VNode.
 */
function createOption(option: string): VNode {
    return <option attrs={{ value: option }}>{option}</option>;
}

/**
 * Creates a text VNode.
 * @param text The text that should be displayed.
 * @returns A text VNode.
 */
export function createText(text: string): VNode {
    return <pre>{text}</pre>;
}

/**
 * Creates a header element.
 * @param header The text of the header.
 * @param top The distance to the table origin, where the header should stick.
 * @param rowspan The rowspan of the header.
 * @param colspan The colspan of the header.
 * @returns A header element.
 */
export function createHeaderElement(header: string, top: string, rowspan?: number, colspan?: number): VNode {
    if (rowspan && colspan) {
        return <th attrs={{ rowspan: rowspan, colspan: colspan }} style={{ top: top }}>{header}</th>;
    } else if (rowspan) {
        return <th attrs={{ rowspan: rowspan }} style={{ top: top }}>{header}</th>;
    } else if (colspan) {
        return <th attrs={{ colspan: colspan }} style={{ top: top }}>{header}</th>;
    } else {
        return <th style={{ top: top }}>{header}</th>;
    }
}

/**
 * Creates a header row with the given children.
 * @param headers The headers of the header row.
 * @returns A header row element.
 */
export function createHeaderRow(headers: VNode[]): VNode {
    return <tr>
        {...headers}
    </tr>;
}

/**
 * Create the header of a table.
 * @param headers The header rows
 * @returns A thead element containing the given header rows.
 */
export function createTHead(headers: VNode[]): VNode {
    return <thead>{...headers}</thead>;
}

/**
 * Function to create a plus button for a result cell. When the button is clicked, an add rule event is posted to the extension with the details of the clicked cell.
 * @param classes The classes of the cell.
 * @param tdAttrs The attributes of the cell.
 * @param val The current cell value.
 * @param selectedType The currently selected type of the context table.
 * @param counter The index of the result column for which the button is rendered.
 * @param currentVariables The current process variables of the context table.
 * @param selectedControlAction The currently selected control action.
 * @returns a cell of a table as VNode
 */
function addPlusButton(classes: Classes, tdAttrs: any, val: ContextCell, selectedType: Type, counter: number, currentVariables: ContextTableVariableValues[], selectedControlAction: ContextTableControlAction): VNode {
    return <td class={classes} attrs={{...tdAttrs, ucatype: getUCATypeString(selectedType, counter)}}>
        <div class={{ resultCell: true }}>
            <pre>{val.value}</pre>
            <button
                class={{ "result-plus": true }}
                attrs={{ type: "button", title: "Hazardous actions", "aria-label": "Hazardous actions" }}
                on={{
                    click: (e: Event) => {
                        // Prevent row-level handlers from being triggered
                        e.stopPropagation();
                        
                        const target = e.currentTarget as HTMLElement;
                        const type = (target.parentNode?.parentNode as HTMLElement)?.attributes.getNamedItem("ucatype")?.value;
                        const details = {
                            type: type ?? "",
                            controlAction: selectedControlAction,
                            varMap: createVarMap(currentVariables, getRowData(target))
                        };
                        postAddRule(details);
                    },
                }}
            >
                { "+" }
            </button>
        </div>
    </td>
}

/**
 * Creates a row of a table as VNode.
 * @param id Id of the row.
 * @param values The values of the row in the correct ordering.
 * @param currentVariables The current process variables of the context table.
 * @param selectedControlAction The currently selected control action.
 * @param selectedType The currently selected type of the context table.
 * @returns a row of a table as VNode.
 */
export function createRow(id: string, values: ContextCell[], currentVariables: ContextTableVariableValues[], selectedControlAction: ContextTableControlAction, selectedType: Type): VNode {
    const children: VNode[] = [];

    let counter: number = 0;

    for (const val of values) {
        const classes: Classes = {};
        classes[val.cssClass] = true;

        // prepare attributes for the td (colspan, optional title)
        const tdAttrs: any = { colspan: val.colSpan };
        if (val.title) {
            tdAttrs.title = val.title;
        }

        // Render a small plus button for every result cell
        if (val.cssClass.startsWith("result")) {
            children.push(addPlusButton(classes, tdAttrs, val, selectedType, counter, currentVariables, selectedControlAction));
            counter++;
        } else {
            // default rendering for non-result cells
            children.push(<td class={classes} attrs={{...tdAttrs}}>{val.value}</td>);
        }
    }
    const row = <tr attrs={{ id: id }}>{children}</tr>;
    return row;
}