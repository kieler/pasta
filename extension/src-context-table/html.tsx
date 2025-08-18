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
import { ContextCell } from './utils';

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
 * Creates a row of a table as VNode.
 * @param id Id of the row.
 * @param values The values of the row in the correct ordering.
 * @returns a row of a table as VNode.
 */
export function createRow(id: string, values: ContextCell[]): VNode {
    const children: VNode[] = [];
    for (const val of values) {
        const classes: Classes = {};
        classes[val.cssClass] = true;
        if (val.title) {
            children.push(<td class={classes} attrs={{ colspan: val.colSpan, title: val.title, contenteditable: val.editable }}>{val.value}</td>);
        } else {
            children.push(<td class={classes} attrs={{ colspan: val.colSpan, contenteditable: val.editable }}>{val.value}</td>);
        }
    }
    const row = <tr attrs={{ id: id }}>{children}</tr>;
    return row;
}