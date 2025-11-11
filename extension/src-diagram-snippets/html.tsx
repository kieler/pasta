/*
 * KIELER - Kiel Integrated Environment for Layout Eclipse RichClient
 *
 * http://rtsys.informatik.uni-kiel.de/kieler
 *
 * Copyright 2022-2024 by
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

/** @jsx html */
import { attributesModule, classModule, eventListenersModule, init, propsModule, styleModule, VNode } from 'snabbdom';
import { html } from './jsx';

/** IDs for the main elements in the panel. */
const placeholderForSnippetsID = 'snippetPlaceholder';
export const textFieldID = 'snippetAddTextField';
export const buttonID = 'snippetAddBnt';

/**
 * PASTA panel for the activity bar.
 * Consists of a text field and button to add custom diagram snippets.
 * The actual snippets are patched into the placeholder later.
 */
export const panel: VNode = <div class-sidebar__content="true">
    <h3 class-sidebar__title="true">{"Diagram Blueprints"}</h3>
    <input type="text" id={textFieldID} />
    <button type="button" id={buttonID}>Add Diagram Blueprint</button>
    <div class-sidebar__panel-content="true" id="snippets"><div id={placeholderForSnippetsID}></div></div>
</div>;

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
 * Adds the given {@code snippets} to the panel by patching them into the placeholder.
 * @param snippets The snippets to add to the panel.
 */
export function addSnippetsToPanel(snippets: VNode[]): void {
    const placeholder = document.getElementById(placeholderForSnippetsID);
    if (placeholder) {
        const divSnippets = <div id={placeholderForSnippetsID}>{...snippets}</div>;
        patch(placeholder, divSnippets);
        // add mouselistener for highlighting focused snippet
        const curSnippets = document.getElementById(placeholderForSnippetsID);
        if (curSnippets) {
            curSnippets.childNodes.forEach(child => {
                (child as HTMLElement).addEventListener('mouseover', () => (child as HTMLElement).classList.add('focused'));
                (child as HTMLElement).addEventListener('mouseleave', () => (child as HTMLElement).classList.remove('focused'));
            });
        }
    }
}
